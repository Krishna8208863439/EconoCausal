"""
test_diagnostics.py
===================
EconoCausal — Week 2
Project reference: ITS/DSML/1147

Unit tests for covariate balance, SMD calculations, variance ratio, Love plot
generation, and positivity diagnostics in src/causal/diagnostics.py.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

# ── Import modules under test ─────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.causal.diagnostics import (
    SMD_ACCEPTABLE_THRESHOLD,
    SMD_EXCELLENT_THRESHOLD,
    calculate_covariate_balance,
    compute_smd,
    compute_variance_ratio,
    export_balance_json,
    generate_balance_markdown_report,
    generate_love_plot,
    run_balance_diagnostics,
)
from src.data.generate_data import generate_dataset
from src.data.preprocess import run_pipeline


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def sample_cleaned_df() -> pd.DataFrame:
    """Provide a small, valid cleaned DataFrame for testing."""
    raw = generate_dataset(n=200, seed=42)
    return run_pipeline(raw)


# ── Test Suites ───────────────────────────────────────────────────────────────

class TestSmdCalculation:
    """Verify Standardized Mean Difference (SMD) mathematical correctness."""

    def test_smd_identical_distributions_is_zero(self):
        vals = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        smd, m1, m0, sd = compute_smd(vals, vals)
        assert smd == 0.0
        assert m1 == m0 == 3.0
        assert sd > 0.0

    def test_smd_known_shift(self):
        # Two normal samples with known difference in mean
        v1 = np.array([10.0, 10.0, 10.0])
        v0 = np.array([8.0, 8.0, 8.0])
        # Pooled SD if provided
        smd, m1, m0, _ = compute_smd(v1, v0, pooled_sd=2.0)
        assert smd == pytest.approx(1.0, abs=1e-5)
        assert m1 == 10.0
        assert m0 == 8.0

    def test_smd_empty_arrays(self):
        smd, m1, m0, sd = compute_smd(np.array([]), np.array([]))
        assert smd == 0.0
        assert m1 == 0.0
        assert m0 == 0.0
        assert sd == 0.0

    def test_smd_zero_variance_handled(self):
        v1 = np.array([5.0, 5.0])
        v0 = np.array([5.0, 5.0])
        smd, m1, m0, sd = compute_smd(v1, v0)
        assert smd == 0.0
        assert sd == 0.0

    def test_weighted_smd_adjusts_means(self):
        # Treated: [10, 20], weights [1, 3] -> mean = (10*1 + 20*3)/4 = 17.5
        v1 = np.array([10.0, 20.0])
        w1 = np.array([1.0, 3.0])
        v0 = np.array([10.0, 10.0])
        w0 = np.array([1.0, 1.0])
        smd, m1, m0, _ = compute_smd(v1, v0, w_1=w1, w_0=w0, pooled_sd=5.0)
        assert m1 == pytest.approx(17.5)
        assert m0 == pytest.approx(10.0)
        assert smd == pytest.approx((17.5 - 10.0) / 5.0)


class TestVarianceRatio:
    """Verify variance ratio calculations."""

    def test_equal_variance_ratio_is_one(self):
        v1 = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        v0 = np.array([10.0, 11.0, 12.0, 13.0, 14.0])
        vr = compute_variance_ratio(v1, v0)
        assert vr == pytest.approx(1.0, abs=1e-4)

    def test_unequal_variance_ratio(self):
        v1 = np.array([1.0, 5.0])   # var = 8
        v0 = np.array([1.0, 3.0])   # var = 2
        vr = compute_variance_ratio(v1, v0)
        assert vr == pytest.approx(4.0, abs=1e-4)

    def test_single_element_array_returns_one(self):
        vr = compute_variance_ratio(np.array([1.0]), np.array([2.0]))
        assert vr == 1.0


class TestCalculateCovariateBalance:
    """Verify covariate balance table generation on real datasets."""

    def test_balance_table_columns(self, sample_cleaned_df: pd.DataFrame):
        balance_df = calculate_covariate_balance(sample_cleaned_df)
        expected_cols = {
            "covariate",
            "covariate_type",
            "treated_mean_raw",
            "control_mean_raw",
            "pooled_sd",
            "smd_raw",
            "var_ratio_raw",
            "treated_mean_weighted",
            "control_mean_weighted",
            "smd_weighted",
            "var_ratio_weighted",
            "smd_reduction_pct",
            "balance_status",
        }
        assert expected_cols.issubset(set(balance_df.columns))

    def test_all_confounders_represented(self, sample_cleaned_df: pd.DataFrame):
        balance_df = calculate_covariate_balance(sample_cleaned_df)
        covariates = set(balance_df["covariate"])
        # Numeric confounders
        assert "past_purchases" in covariates
        assert "avg_order_value" in covariates
        assert "website_visits" in covariates
        # Dummies for categories
        assert any(c.startswith("age_group_") for c in covariates)
        assert any(c.startswith("customer_segment_") for c in covariates)

    def test_valid_balance_statuses(self, sample_cleaned_df: pd.DataFrame):
        balance_df = calculate_covariate_balance(sample_cleaned_df)
        valid_statuses = {
            "Well-balanced (SMD < 0.10)",
            "Acceptable (SMD < 0.25)",
            "Imbalanced (SMD >= 0.25)",
        }
        for status in balance_df["balance_status"]:
            assert status in valid_statuses

    def test_weighting_reduces_confounder_smd(self, sample_cleaned_df: pd.DataFrame):
        from src.causal.propensity import compute_ipw_weights, fit_propensity_model
        _, scores = fit_propensity_model(sample_cleaned_df)
        weights = compute_ipw_weights(scores, sample_cleaned_df["discount_offered"])

        balance_df = calculate_covariate_balance(sample_cleaned_df, weights=weights)
        # Average weighted SMD should be significantly lower than raw SMD
        mean_raw = balance_df["smd_raw"].mean()
        mean_w = balance_df["smd_weighted"].mean()
        assert mean_w < mean_raw
        assert mean_w < SMD_EXCELLENT_THRESHOLD


class TestArtifactGeneration:
    """Verify figure, markdown report, and JSON exports."""

    def test_generate_love_plot(self, sample_cleaned_df: pd.DataFrame, tmp_path: Path):
        balance_df = calculate_covariate_balance(sample_cleaned_df)
        out_plot = tmp_path / "love_plot.png"
        generate_love_plot(balance_df, output_path=out_plot)

        assert out_plot.exists()
        assert out_plot.stat().st_size > 1000

    def test_generate_markdown_report(self, sample_cleaned_df: pd.DataFrame, tmp_path: Path):
        balance_df = calculate_covariate_balance(sample_cleaned_df)
        mock_diag = {
            "auc_roc": 0.58,
            "brier_score": 0.24,
            "overall_min": 0.35,
            "overall_max": 0.85,
            "positivity_violations_count": 0,
            "positivity_violations_pct": 0.0,
            "common_support_share_pct": 100.0,
        }
        out_md = tmp_path / "covariate_balance.md"
        generate_balance_markdown_report(balance_df, mock_diag, output_path=out_md)

        assert out_md.exists()
        content = out_md.read_text(encoding="utf-8")
        assert "EconoCausal" in content
        assert "Love Plot" in content
        assert "Comprehensive Covariate Balance Table" in content

    def test_export_balance_json(self, sample_cleaned_df: pd.DataFrame, tmp_path: Path):
        balance_df = calculate_covariate_balance(sample_cleaned_df)
        mock_diag = {"auc_roc": 0.58, "common_support_share_pct": 100.0}
        out_json = tmp_path / "covariate_balance.json"
        export_balance_json(balance_df, mock_diag, output_path=out_json)

        assert out_json.exists()
        with open(out_json, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "overlap_diagnostics" in data
        assert "covariates" in data
        assert len(data["covariates"]) > 0


class TestRunBalanceDiagnosticsWorkflow:
    """Verify end-to-end diagnostics execution."""

    def test_run_balance_diagnostics_executes(self, tmp_path: Path):
        from src.data.generate_data import generate_dataset, save_dataset
        raw = generate_dataset(n=120, seed=99)
        raw_p = save_dataset(raw, output_dir=tmp_path)
        clean = run_pipeline(raw_p)
        clean_p = tmp_path / "clean.csv"
        clean.to_csv(clean_p, index=False)

        summary = run_balance_diagnostics(
            data_path=clean_p,
            figures_dir=tmp_path / "figures",
            reports_dir=tmp_path / "reports",
        )

        assert "max_smd_raw" in summary
        assert "max_smd_weighted" in summary
        assert summary["max_smd_weighted"] < summary["max_smd_raw"]
        assert summary["max_smd_weighted"] < SMD_ACCEPTABLE_THRESHOLD
