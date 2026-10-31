"""
ml/drift_detector.py
====================
EconoCausal — Week 4: Automated Data-Drift Detection & Quality Monitoring
Project Reference: ITS/DSML/1147

Purpose:
--------
Monitors customer feature distributions, missingness rates, treatment propensity,
and schema compatibility between an approved baseline reference dataset and newly
incoming campaign or customer cohorts.

Methodology:
------------
1. Schema & Data Quality:
   - Column presence and type compatibility.
   - Unexpected category detection.
   - Missing-value rate comparisons.
2. Numerical Covariates (past_purchases, avg_order_value, website_visits):
   - Two-Sample Kolmogorov-Smirnov (KS) test (distribution shape equality).
   - Population Stability Index (PSI) using reference decile binning.
3. Categorical Covariates (age_group, customer_segment):
   - Chi-Square contingency test (category frequency independence).
   - Discrete Population Stability Index (PSI).
4. Treatment & Outcome Monitoring:
   - Treatment rate shift (|P_curr(T) - P_ref(T)|).
   - Purchase conversion rate shift (|P_curr(Y) - P_ref(Y)|), when available.

Thresholds (Standard Econometric & Risk Guidelines):
-----------------------------------------------------
- PSI < 0.10: Stable / Negligible Shift
- 0.10 <= PSI < 0.25: Moderate Drift / Monitoring Advised
- PSI >= 0.25: Significant Drift / Action & Audit Recommended
- KS / Chi-Square p-value < 0.05: Statistically Significant Distribution Shift

Important Policy & Causal Caveat:
---------------------------------
A statistical drift warning indicates a change in customer covariates or data collection.
It does NOT by itself prove model degradation or invalidate causal Double Machine
Learning estimates. Automated retraining must NOT be triggered solely by drift warnings.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats

# ── Paths ──────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[1]
REFERENCE_DATA_PATH = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
DRIFT_REPORT_DIR = _ROOT / "reports" / "drift"
LATEST_REPORT_JSON = DRIFT_REPORT_DIR / "latest_drift_report.json"
LATEST_REPORT_MD = DRIFT_REPORT_DIR / "latest_drift_report.md"

log = logging.getLogger(__name__)

# ── Feature Definitions ────────────────────────────────────────────────────────
NUMERICAL_COLS = ["past_purchases", "avg_order_value", "website_visits"]
CATEGORICAL_COLS = ["age_group", "customer_segment"]
TREATMENT_COL = "discount_offered"
OUTCOME_COL = "purchased"

# ── PSI & Statistical Thresholds ───────────────────────────────────────────────
PSI_STABLE_THRESHOLD = 0.10
PSI_MODERATE_THRESHOLD = 0.25
P_VALUE_SIGNIFICANCE = 0.05
MISSING_RATE_ALERT_DELTA = 0.05   # 5 percentage point change in missingness


class DriftDetectionError(ValueError):
    """Raised when datasets cannot be parsed or have incompatible schemas."""


# ── Statistical Calculation Functions ─────────────────────────────────────────

def calculate_numerical_psi(
    ref_series: pd.Series,
    curr_series: pd.Series,
    n_bins: int = 10,
    eps: float = 1e-4,
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Calculate Population Stability Index (PSI) for numerical features.
    Bins are defined using the reference distribution quantiles.
    """
    ref_clean = ref_series.dropna()
    curr_clean = curr_series.dropna()

    if len(ref_clean) < 10 or len(curr_clean) < 10:
        return 0.0, []

    # Calculate quantile-based bin edges on reference dataset
    quantiles = np.linspace(0, 1, n_bins + 1)
    bin_edges = np.percentile(ref_clean, quantiles * 100)
    bin_edges = np.unique(bin_edges)  # handle duplicates

    if len(bin_edges) < 2:
        return 0.0, []

    # Adjust edges to span -inf to +inf so extreme/shifted values are captured
    bin_edges[0] = -np.inf
    bin_edges[-1] = np.inf

    ref_counts, _ = np.histogram(ref_clean, bins=bin_edges)
    curr_counts, _ = np.histogram(curr_clean, bins=bin_edges)

    ref_props = ref_counts / len(ref_clean)
    curr_props = curr_counts / len(curr_clean)

    # Apply Laplace smoothing to avoid division by zero or log(0)
    ref_props = np.where(ref_props == 0, eps, ref_props)
    curr_props = np.where(curr_props == 0, eps, curr_props)

    # Re-normalize
    ref_props = ref_props / np.sum(ref_props)
    curr_props = curr_props / np.sum(curr_props)

    psi_per_bin = (curr_props - ref_props) * np.log(curr_props / ref_props)
    total_psi = float(np.sum(psi_per_bin))

    bin_details = []
    for i in range(len(ref_counts)):
        low_str = f"{bin_edges[i]:.2f}" if np.isfinite(bin_edges[i]) else "-inf"
        high_str = f"{bin_edges[i+1]:.2f}" if np.isfinite(bin_edges[i+1]) else "+inf"
        bin_details.append({
            "bin_range": f"[{low_str}, {high_str})",
            "ref_pct": round(float(ref_props[i] * 100), 2),
            "curr_pct": round(float(curr_props[i] * 100), 2),
            "psi_contribution": round(float(psi_per_bin[i]), 5),
        })

    return round(total_psi, 4), bin_details


def calculate_categorical_psi(
    ref_series: pd.Series,
    curr_series: pd.Series,
    eps: float = 1e-4,
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Calculate Population Stability Index (PSI) for discrete categorical variables.
    """
    ref_clean = ref_series.dropna().astype(str)
    curr_clean = curr_series.dropna().astype(str)

    all_categories = sorted(list(set(ref_clean.unique()) | set(curr_clean.unique())))
    if not all_categories:
        return 0.0, []

    ref_counts = ref_clean.value_counts()
    curr_counts = curr_clean.value_counts()

    ref_n = len(ref_clean)
    curr_n = len(curr_clean)

    bin_details = []
    total_psi = 0.0

    for cat in all_categories:
        r_c = ref_counts.get(cat, 0)
        c_c = curr_counts.get(cat, 0)

        r_prop = (r_c / ref_n) if ref_n > 0 else eps
        c_prop = (c_c / curr_n) if curr_n > 0 else eps

        r_prop = max(r_prop, eps)
        c_prop = max(c_prop, eps)

        psi_contrib = (c_prop - r_prop) * np.log(c_prop / r_prop)
        total_psi += psi_contrib

        bin_details.append({
            "category": cat,
            "ref_pct": round(float(r_prop * 100), 2),
            "curr_pct": round(float(c_prop * 100), 2),
            "psi_contribution": round(float(psi_contrib), 5),
        })

    return round(float(total_psi), 4), bin_details


def run_numerical_drift_test(
    ref_series: pd.Series,
    curr_series: pd.Series,
) -> Dict[str, Any]:
    """
    Execute Two-Sample Kolmogorov-Smirnov test and PSI for a numerical covariate.
    """
    ref_clean = ref_series.dropna()
    curr_clean = curr_series.dropna()

    if len(ref_clean) < 5 or len(curr_clean) < 5:
        return {
            "test": "Kolmogorov-Smirnov & PSI",
            "ks_statistic": 0.0,
            "p_value": 1.0,
            "psi": 0.0,
            "drift_detected": False,
            "severity": "insufficient_data",
            "message": "Sample size too small (<5 valid observations).",
        }

    # Two-sample KS test
    ks_res = stats.ks_2samp(ref_clean, curr_clean)
    ks_stat = float(ks_res.statistic)
    p_val = float(ks_res.pvalue)

    # PSI calculation
    psi_val, bin_details = calculate_numerical_psi(ref_clean, curr_clean)

    # Determine status
    if psi_val >= PSI_MODERATE_THRESHOLD:
        severity = "high"
        drift = True
        status_label = "Significant Drift"
    elif psi_val >= PSI_STABLE_THRESHOLD or p_val < P_VALUE_SIGNIFICANCE:
        severity = "moderate"
        drift = True
        status_label = "Moderate Drift"
    else:
        severity = "none"
        drift = False
        status_label = "Stable"

    return {
        "test": "Kolmogorov-Smirnov & Decile PSI",
        "ks_statistic": round(ks_stat, 4),
        "p_value": round(p_val, 5),
        "psi": psi_val,
        "ref_mean": round(float(ref_clean.mean()), 2),
        "curr_mean": round(float(curr_clean.mean()), 2),
        "ref_std": round(float(ref_clean.std()), 2) if len(ref_clean) > 1 else 0.0,
        "curr_std": round(float(curr_clean.std()), 2) if len(curr_clean) > 1 else 0.0,
        "drift_detected": drift,
        "severity": severity,
        "status_label": status_label,
        "bin_details": bin_details,
    }


def run_categorical_drift_test(
    ref_series: pd.Series,
    curr_series: pd.Series,
) -> Dict[str, Any]:
    """
    Execute Chi-Square contingency test and PSI for a categorical covariate.
    """
    ref_clean = ref_series.dropna().astype(str)
    curr_clean = curr_series.dropna().astype(str)

    cats = sorted(list(set(ref_clean.unique()) | set(curr_clean.unique())))
    if len(cats) < 2 or len(ref_clean) < 10 or len(curr_clean) < 10:
        return {
            "test": "Chi-Square & Categorical PSI",
            "chi2_statistic": 0.0,
            "p_value": 1.0,
            "psi": 0.0,
            "drift_detected": False,
            "severity": "insufficient_data",
            "status_label": "Insufficient Data",
        }

    # Build contingency table
    contingency = np.zeros((2, len(cats)), dtype=int)
    ref_counts = ref_clean.value_counts()
    curr_counts = curr_clean.value_counts()

    for j, cat in enumerate(cats):
        contingency[0, j] = ref_counts.get(cat, 0)
        contingency[1, j] = curr_counts.get(cat, 0)

    try:
        chi2_res = stats.chi2_contingency(contingency)
        chi2_stat = float(chi2_res.statistic)
        p_val = float(chi2_res.pvalue)
    except Exception:
        chi2_stat = 0.0
        p_val = 1.0

    psi_val, bin_details = calculate_categorical_psi(ref_clean, curr_clean)

    if psi_val >= PSI_MODERATE_THRESHOLD:
        severity = "high"
        drift = True
        status_label = "Significant Drift"
    elif psi_val >= PSI_STABLE_THRESHOLD or p_val < P_VALUE_SIGNIFICANCE:
        severity = "moderate"
        drift = True
        status_label = "Moderate Drift"
    else:
        severity = "none"
        drift = False
        status_label = "Stable"

    return {
        "test": "Chi-Square & Categorical PSI",
        "chi2_statistic": round(chi2_stat, 4),
        "p_value": round(p_val, 5),
        "psi": psi_val,
        "drift_detected": drift,
        "severity": severity,
        "status_label": status_label,
        "bin_details": bin_details,
    }


# ── Full Pipeline Evaluation ──────────────────────────────────────────────────

def evaluate_data_drift(
    reference_df: pd.DataFrame,
    current_df: pd.DataFrame,
    dataset_name: str = "incoming_campaign_cohort",
) -> Dict[str, Any]:
    """
    Run the end-to-end drift detection workflow between reference and current DataFrames.
    """
    n_ref = len(reference_df)
    n_curr = len(current_df)

    if n_ref == 0 or n_curr == 0:
        raise DriftDetectionError("Cannot perform drift analysis on empty datasets.")

    report: Dict[str, Any] = {
        "dataset_name": dataset_name,
        "timestamp": pd.Timestamp.now(tz="UTC").isoformat(),
        "reference_sample_size": n_ref,
        "current_sample_size": n_curr,
        "schema_status": "valid",
        "schema_warnings": [],
        "overall_drift_status": "STABLE",
        "high_drift_features": [],
        "moderate_drift_features": [],
        "features": {},
        "target_and_treatment_drift": {},
        "missingness_summary": {},
        "recommendations": [],
    }

    # 1. Schema & Column Checks
    expected_cols = NUMERICAL_COLS + CATEGORICAL_COLS
    missing_cols = [c for c in expected_cols if c not in current_df.columns]
    if missing_cols:
        report["schema_status"] = "incompatible"
        report["schema_warnings"].append(f"Missing required covariates: {missing_cols}")
        report["overall_drift_status"] = "CRITICAL_DRIFT"
        report["recommendations"].append(
            f"Dataset schema mismatch: Incoming data lacks columns {missing_cols}. Ingestion halted."
        )
        return report

    # 2. Missing-rate Checks
    for col in expected_cols:
        ref_miss = float(reference_df[col].isna().mean())
        curr_miss = float(current_df[col].isna().mean())
        delta = curr_miss - ref_miss

        report["missingness_summary"][col] = {
            "ref_missing_pct": round(ref_miss * 100, 2),
            "curr_missing_pct": round(curr_miss * 100, 2),
            "delta_pct": round(delta * 100, 2),
            "alert": delta >= MISSING_RATE_ALERT_DELTA,
        }
        if delta >= MISSING_RATE_ALERT_DELTA:
            report["schema_warnings"].append(
                f"Missingness rate for '{col}' rose by {delta*100:.1f} pp (exceeds {MISSING_RATE_ALERT_DELTA*100:.0f}% threshold)."
            )

    # 3. Numerical Covariates Drift
    for col in NUMERICAL_COLS:
        res = run_numerical_drift_test(reference_df[col], current_df[col])
        res["feature_type"] = "numerical"
        report["features"][col] = res

        if res["severity"] == "high":
            report["high_drift_features"].append(col)
        elif res["severity"] == "moderate":
            report["moderate_drift_features"].append(col)

    # 4. Categorical Covariates Drift
    for col in CATEGORICAL_COLS:
        res = run_categorical_drift_test(reference_df[col], current_df[col])
        res["feature_type"] = "categorical"
        report["features"][col] = res

        if res["severity"] == "high":
            report["high_drift_features"].append(col)
        elif res["severity"] == "moderate":
            report["moderate_drift_features"].append(col)

    # 5. Treatment and Outcome Rate Shifts (if available)
    if TREATMENT_COL in current_df.columns and TREATMENT_COL in reference_df.columns:
        p_ref_t = float(reference_df[TREATMENT_COL].mean())
        p_curr_t = float(current_df[TREATMENT_COL].mean())
        t_delta = abs(p_curr_t - p_ref_t)
        report["target_and_treatment_drift"]["treatment_rate"] = {
            "reference_rate": round(p_ref_t, 4),
            "current_rate": round(p_curr_t, 4),
            "absolute_diff": round(t_delta, 4),
            "alert": t_delta > 0.10,
        }

    if OUTCOME_COL in current_df.columns and OUTCOME_COL in reference_df.columns:
        p_ref_y = float(reference_df[OUTCOME_COL].mean())
        p_curr_y = float(current_df[OUTCOME_COL].mean())
        y_delta = abs(p_curr_y - p_ref_y)
        report["target_and_treatment_drift"]["conversion_rate"] = {
            "reference_rate": round(p_ref_y, 4),
            "current_rate": round(p_curr_y, 4),
            "absolute_diff": round(y_delta, 4),
            "alert": y_delta > 0.08,
        }

    # 6. Overall Status Determination
    if len(report["high_drift_features"]) > 0 or len(report["schema_warnings"]) > 0:
        report["overall_drift_status"] = "DRIFT_DETECTED"
    elif len(report["moderate_drift_features"]) > 0:
        report["overall_drift_status"] = "MODERATE_DRIFT"
    else:
        report["overall_drift_status"] = "STABLE"

    # 7. Actionable Recommendations & Causal Disclaimers
    if report["overall_drift_status"] == "STABLE":
        report["recommendations"].append(
            "All monitored covariates exhibit stable distributions (PSI < 0.10). No intervention needed."
        )
    elif report["overall_drift_status"] == "MODERATE_DRIFT":
        report["recommendations"].append(
            f"Moderate distribution shift detected in {report['moderate_drift_features']}. "
            "Recommend continuing monitoring over the next campaign cycle."
        )
    else:
        report["recommendations"].append(
            f"Significant distribution shift observed in {report['high_drift_features']}. "
            "Investigate possible seasonal behavioral changes or marketing channel source modifications."
        )

    report["recommendations"].append(
        "Governance Policy: Statistical covariate drift does not automatically imply causal model degradation. "
        "Do NOT automatically retrain without off-policy validation on new experimental data."
    )

    return report


# ── Report Export Functions ───────────────────────────────────────────────────

def export_drift_reports(report: Dict[str, Any], output_dir: Path = DRIFT_REPORT_DIR) -> Tuple[Path, Path]:
    """
    Save both JSON and Markdown drift reports to disk.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "latest_drift_report.json"
    md_path = output_dir / "latest_drift_report.md"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Format Markdown
    md_content = f"""# EconoCausal — Automated Data Drift & Quality Report
**Generated:** {report['timestamp']}  
**Status:** **{report['overall_drift_status']}**  
**Reference Records:** {report['reference_sample_size']:,} | **Current Records:** {report['current_sample_size']:,}  

---

## 1. Executive Summary

| Category | Assessment |
|---|---|
| **Overall Drift Status** | **{report['overall_drift_status']}** |
| **Schema Integrity** | {report['schema_status'].upper()} |
| **High Drift Features** | {', '.join(report['high_drift_features']) if report['high_drift_features'] else 'None'} |
| **Moderate Drift Features** | {', '.join(report['moderate_drift_features']) if report['moderate_drift_features'] else 'None'} |

---

## 2. Covariate Distribution Stability (PSI & Statistical Tests)

| Feature | Type | Test | PSI | p-value | Severity | Status |
|---|---|---|---|---|---|---|
"""
    for col, d in report["features"].items():
        psi_val = d.get("psi", 0.0)
        p_val = d.get("p_value", 1.0)
        sev = d.get("severity", "none").upper()
        stat_lbl = d.get("status_label", "Stable")
        test_lbl = "KS & PSI" if d.get("feature_type") == "numerical" else "Chi² & PSI"
        md_content += f"| `{col}` | {d.get('feature_type')} | {test_lbl} | **{psi_val:.4f}** | {p_val:.4f} | {sev} | {stat_lbl} |\n"

    md_content += """
---

## 3. Data Missingness & Quality Auditing

| Feature | Reference Missing % | Current Missing % | Net Change (pp) | Alert |
|---|---|---|---|---|
"""
    for col, m in report.get("missingness_summary", {}).items():
        alert_str = "⚠️ ALERT" if m.get("alert") else "✅ Normal"
        md_content += f"| `{col}` | {m.get('ref_missing_pct')}% | {m.get('curr_missing_pct')}% | {m.get('delta_pct'):+0.2f}% | {alert_str} |\n"

    md_content += f"""
---

## 4. Recommended Actions & Governance Notes

"""
    for rec in report.get("recommendations", []):
        md_content += f"- {rec}\n"

    md_content += """
> **Causal ML Governance Disclaimer:**  
> A drift warning indicates that the incoming customer covariate distribution has changed relative to the model training cohort. Under Robinson's residualization and unconfoundedness, causal estimators remain valid if overlap holds, but out-of-support predictions carry higher variance. Never trigger autonomous retraining without human and econometric review.
"""

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return json_path, md_path


def run_drift_analysis(
    current_data_path: Optional[Path] = None,
    reference_data_path: Path = REFERENCE_DATA_PATH,
) -> Dict[str, Any]:
    """
    Main entrypoint: load reference and current datasets, run drift analysis, and export.
    """
    if not reference_data_path.exists():
        raise FileNotFoundError(f"Reference dataset not found at {reference_data_path}")

    ref_df = pd.read_csv(reference_data_path)

    if current_data_path is not None and Path(current_data_path).exists():
        curr_df = pd.read_csv(current_data_path)
        dataset_name = Path(current_data_path).name
    else:
        # Default self-comparison / baseline verification
        curr_df = ref_df.copy()
        dataset_name = "reference_baseline_benchmark"

    report = evaluate_data_drift(ref_df, curr_df, dataset_name=dataset_name)
    export_drift_reports(report)
    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="EconoCausal Data Drift Detector")
    parser.add_argument("--current", type=str, default=None, help="Path to current dataset CSV")
    parser.add_argument("--ref", type=str, default=str(REFERENCE_DATA_PATH), help="Path to reference dataset CSV")
    args = parser.parse_args()

    curr_p = Path(args.current) if args.current else None
    ref_p = Path(args.ref)
    res = run_drift_analysis(curr_p, ref_p)
    print(f"\n[EconoCausal Drift Detector] Status: {res['overall_drift_status']}")
    print(f"Features audited: {list(res['features'].keys())}")
    print(f"Report written to: {LATEST_REPORT_JSON}\n")
