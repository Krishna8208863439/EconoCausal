"""
tests/test_drift_detector.py
============================
EconoCausal — Week 4: Data-Drift Detection Unit Tests
Project Reference: ITS/DSML/1147

Tests:
- Identical datasets produce zero drift (PSI ~ 0.0, KS p=1.0, STABLE).
- Numerical distribution shift (perturbed mean/variance) detected via KS & PSI.
- Categorical distribution shift (altered class proportions) detected via Chi² & PSI.
- Missing-value rate spike triggers data quality warning.
- Missing required columns triggers schema incompatibility failure.
- Small sample sizes handled gracefully without division by zero.
- Empty DataFrame raises DriftDetectionError.
- Report export creates valid JSON and Markdown files.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from ml.drift_detector import (
    DriftDetectionError,
    calculate_numerical_psi,
    calculate_categorical_psi,
    evaluate_data_drift,
    export_drift_reports,
)


@pytest.fixture
def baseline_fixture() -> pd.DataFrame:
    """Standard reference dataset fixture."""
    rng = np.random.default_rng(42)
    n = 300
    return pd.DataFrame({
        "customer_id": [f"CUST_{i:04d}" for i in range(n)],
        "past_purchases": rng.integers(1, 20, size=n),
        "avg_order_value": rng.uniform(20.0, 100.0, size=n),
        "website_visits": rng.integers(1, 15, size=n),
        "age_group": rng.choice(["18-24", "25-34", "35-44", "45-54", "55+"], size=n),
        "customer_segment": rng.choice(["Regular", "Occasional", "Premium", "Churn-Risk"], size=n),
        "discount_offered": rng.choice([0, 1], size=n),
        "purchased": rng.choice([0, 1], size=n),
    })


def test_identical_datasets_produce_zero_drift(baseline_fixture):
    """When reference and current are identical, all PSIs must be ~0 and status STABLE."""
    report = evaluate_data_drift(baseline_fixture, baseline_fixture.copy())

    assert report["overall_drift_status"] == "STABLE"
    assert report["schema_status"] == "valid"
    assert len(report["high_drift_features"]) == 0
    assert len(report["moderate_drift_features"]) == 0

    for feat, stats in report["features"].items():
        assert stats["psi"] < 0.05
        assert stats["drift_detected"] is False


def test_numerical_distribution_shift_detected(baseline_fixture):
    """Perturbing a numerical covariate should trigger KS rejection and high PSI."""
    curr = baseline_fixture.copy()
    # Heavily shift avg_order_value distribution
    curr["avg_order_value"] = curr["avg_order_value"] * 3.5 + 50.0

    report = evaluate_data_drift(baseline_fixture, curr)

    aov_stats = report["features"]["avg_order_value"]
    assert aov_stats["psi"] > 0.25
    assert aov_stats["p_value"] < 0.001
    assert aov_stats["drift_detected"] is True
    assert "avg_order_value" in report["high_drift_features"]
    assert report["overall_drift_status"] in ["DRIFT_DETECTED", "MODERATE_DRIFT"]


def test_categorical_distribution_shift_detected(baseline_fixture):
    """Distorting categorical proportions should trigger Chi-Square and categorical PSI."""
    curr = baseline_fixture.copy()
    # Force 95% of records into 'Premium'
    curr["customer_segment"] = ["Premium" if i % 10 != 0 else "Regular" for i in range(len(curr))]

    report = evaluate_data_drift(baseline_fixture, curr)

    seg_stats = report["features"]["customer_segment"]
    assert seg_stats["psi"] > 0.10
    assert seg_stats["p_value"] < 0.01
    assert seg_stats["drift_detected"] is True
    assert ("customer_segment" in report["high_drift_features"] or
            "customer_segment" in report["moderate_drift_features"])


def test_missing_value_spike_triggers_warning(baseline_fixture):
    """Injecting missing values exceeding threshold triggers an alert."""
    curr = baseline_fixture.copy()
    # Introduce 15% NaN into past_purchases
    mask = np.random.default_rng(42).random(len(curr)) < 0.15
    curr.loc[mask, "past_purchases"] = np.nan

    report = evaluate_data_drift(baseline_fixture, curr)

    miss_entry = report["missingness_summary"]["past_purchases"]
    assert miss_entry["alert"] is True
    assert any("past_purchases" in w for w in report["schema_warnings"])


def test_schema_mismatch_fails_cleanly(baseline_fixture):
    """Missing expected covariate triggers incompatible schema status and critical drift."""
    curr = baseline_fixture.drop(columns=["avg_order_value"])

    report = evaluate_data_drift(baseline_fixture, curr)

    assert report["schema_status"] == "incompatible"
    assert report["overall_drift_status"] == "CRITICAL_DRIFT"
    assert any("avg_order_value" in w for w in report["schema_warnings"])


def test_small_sample_edge_case(baseline_fixture):
    """Sample sizes under 5 should not crash with division by zero."""
    tiny_curr = baseline_fixture.iloc[:3].copy()
    report = evaluate_data_drift(baseline_fixture, tiny_curr)

    assert report["current_sample_size"] == 3
    # Check numerical test gracefully handled
    assert "past_purchases" in report["features"]


def test_empty_dataframe_raises():
    """Empty datasets must raise DriftDetectionError."""
    empty = pd.DataFrame()
    with pytest.raises(DriftDetectionError):
        evaluate_data_drift(empty, empty)


def test_export_drift_reports(baseline_fixture, tmp_path):
    """Report export must output both JSON and Markdown files."""
    report = evaluate_data_drift(baseline_fixture, baseline_fixture.copy())
    json_path, md_path = export_drift_reports(report, output_dir=tmp_path)

    assert json_path.exists()
    assert md_path.exists()
    assert json_path.stat().st_size > 0
    assert md_path.stat().st_size > 0
    assert "EconoCausal" in md_path.read_text(encoding="utf-8")
