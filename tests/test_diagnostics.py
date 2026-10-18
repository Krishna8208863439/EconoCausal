"""
tests/test_diagnostics.py
=========================
EconoCausal — Week 2: Day 3 Causal Diagnostics & Refutation Tests
Project Reference: ITS/DSML/1147

Unit & integration tests verifying:
- Continuous overlap & positivity (real variation in price residuals)
- Residual orthogonality to pre-treatment confounders (Robinson orthogonalization)
- DoWhy refutation falsification tests:
  1. Placebo Treatment Refutation
  2. Random Common Cause Refutation
  3. Data Subset Refutation (80% holdout subsampling)
- Sensitivity across learner configurations and cross-fitting fold counts
- Ground truth recovery validation and JSON artifact generation
"""

import json
from pathlib import Path
import pytest

from src.causal.diagnostics import (
    CausalDiagnosticsRunner,
    _fit_ols,
    _pearson_r,
    DIAG_JSON_PATH,
    FRONTEND_DIAG_PATH,
    REPORTS_DIAG_PATH,
)

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "data" / "processed" / "cleaned_retail_campaign.csv"


@pytest.fixture
def diagnostics_runner():
    assert DATA_PATH.exists(), f"Cleaned data must exist at {DATA_PATH}"
    return CausalDiagnosticsRunner(data_path=DATA_PATH, random_state=42)


class TestCausalDiagnostics:
    def test_runner_initialization(self, diagnostics_runner):
        assert diagnostics_runner.data_path == DATA_PATH
        assert diagnostics_runner.random_state == 42
        assert diagnostics_runner.results == {}

    def test_pearson_r_helper(self):
        # Perfectly correlated
        x = [1.0, 2.0, 3.0, 4.0, 5.0]
        y = [2.0, 4.0, 6.0, 8.0, 10.0]
        r, p = _pearson_r(x, y)
        assert abs(r - 1.0) < 1e-5

        # Uncorrelated noise
        x_uncorr = [1.0, 2.0, 3.0, 4.0, 5.0]
        y_uncorr = [5.0, 1.0, 4.0, 2.0, 3.0]
        r_uncorr, _ = _pearson_r(x_uncorr, y_uncorr)
        assert abs(r_uncorr) < 0.6

    def test_fit_ols_ridge_stabilization(self):
        X = [[1.0, 1.0], [1.0, 2.0], [1.0, 3.0], [1.0, 4.0]]
        y = [2.0, 4.0, 6.0, 8.0]
        beta = _fit_ols(X, y)
        assert len(beta) == 2
        # Slope close to 2.0
        assert abs(beta[1] - 2.0) < 0.1

    def test_residual_variation_positivity(self, diagnostics_runner):
        X, d, y, segments = diagnostics_runner._load_data()
        d_res, _ = diagnostics_runner._get_residuals(X, d, y, n_folds=5)
        res_check = diagnostics_runner.run_residual_variation_check(d_res)

        assert res_check["has_real_variation"] is True
        assert res_check["variance"] > 0.001
        assert res_check["std_deviation"] > 0.02
        assert res_check["iqr"] > 0.01

    def test_residual_orthogonality(self, diagnostics_runner):
        X, d, y, _ = diagnostics_runner._load_data()
        d_res, _ = diagnostics_runner._get_residuals(X, d, y, n_folds=5)
        ortho_check = diagnostics_runner.run_residual_orthogonality_check(X, d_res)

        assert ortho_check["all_orthogonal"] is True
        assert ortho_check["max_absolute_correlation"] < 0.08
        for feat, details in ortho_check["feature_correlations"].items():
            assert details["is_orthogonal"] is True

    def test_refutations_execution(self, diagnostics_runner):
        X, d, y, _ = diagnostics_runner._load_data()
        d_res, y_res = diagnostics_runner._get_residuals(X, d, y, n_folds=5)
        ref_results = diagnostics_runner.run_refutation_tests(d_res, y_res)

        # Placebo treatment refutation
        placebo = ref_results["placebo_treatment"]
        assert placebo["passed"] is True
        assert abs(placebo["estimated_effect"]) < 0.15

        # Random common cause refutation
        rcc = ref_results["random_common_cause"]
        assert rcc["passed"] is True
        assert rcc["absolute_shift"] < 0.08

        # Data subset refutation
        subset = ref_results["data_subset"]
        assert subset["passed"] is True
        assert abs(subset["mean_subset_effect"] - ref_results["baseline_dml_beta"]) < 0.10

    def test_learner_fold_sensitivity(self, diagnostics_runner):
        X, d, y, _ = diagnostics_runner._load_data()
        sens = diagnostics_runner.run_learner_and_fold_comparison(X, d, y)
        comparisons = sens["learner_fold_sensitivity"]
        assert len(comparisons) >= 3
        for comp in comparisons:
            assert comp["folds"] in (3, 5, 10)
            assert -2.0 <= comp["price_elasticity"] <= -0.5
            assert comp["ci_lower"] <= comp["price_elasticity"] <= comp["ci_upper"]

    def test_execute_all_and_artifacts(self, diagnostics_runner):
        results = diagnostics_runner.execute_all()
        assert results["all_tests_passed"] is True
        assert "continuous_positivity" in results
        assert "residual_orthogonality" in results
        assert "refutations" in results
        assert "ground_truth_validation" in results

        # Verify artifacts exist on disk
        for p in (DIAG_JSON_PATH, FRONTEND_DIAG_PATH, REPORTS_DIAG_PATH):
            assert p.exists(), f"Expected artifact {p} should exist"
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            assert data["all_tests_passed"] is True
