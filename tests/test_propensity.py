"""
test_propensity.py
==================
EconoCausal — Week 1 & 2
Project reference: ITS/DSML/1147

Unit tests for src/causal/propensity.py
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# ── Import modules under test ─────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.causal.propensity import (
    CATEGORICAL_CONFOUNDERS,
    COMMON_CAUSES,
    NUMERIC_CONFOUNDERS,
    TREATMENT,
    build_propensity_pipeline,
    compute_ipw_weights,
    estimate_cross_fitted_propensities,
    evaluate_overlap,
    fit_propensity_model,
)
from src.data.generate_data import generate_dataset
from src.data.preprocess import run_pipeline


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def sample_cleaned_df() -> pd.DataFrame:
    """Provide a reproducible cleaned dataset for propensity testing."""
    raw = generate_dataset(n=200, seed=42)
    return run_pipeline(raw)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestPropensityPipeline:
    """Verify construction and composition of the propensity model pipeline."""

    def test_pipeline_steps(self):
        pipe = build_propensity_pipeline()
        assert "preprocessor" in pipe.named_steps
        assert "classifier" in pipe.named_steps

    def test_confounder_lists(self):
        assert set(NUMERIC_CONFOUNDERS + CATEGORICAL_CONFOUNDERS) == set(COMMON_CAUSES)
        assert len(COMMON_CAUSES) == 5


class TestPropensityFitting:
    """Verify propensity model training and predictions."""

    def test_scores_in_probability_range(self, sample_cleaned_df: pd.DataFrame):
        _, scores = fit_propensity_model(sample_cleaned_df)
        assert len(scores) == len(sample_cleaned_df)
        assert (scores >= 0.0).all() and (scores <= 1.0).all()

    def test_scores_preserve_index(self, sample_cleaned_df: pd.DataFrame):
        _, scores = fit_propensity_model(sample_cleaned_df)
        assert (scores.index == sample_cleaned_df.index).all()

    def test_cross_fitted_scores(self, sample_cleaned_df: pd.DataFrame):
        cv_scores = estimate_cross_fitted_propensities(sample_cleaned_df, n_splits=3)
        assert len(cv_scores) == len(sample_cleaned_df)
        assert (cv_scores >= 0.0).all() and (cv_scores <= 1.0).all()


class TestOverlapEvaluation:
    """Verify overlap and positivity diagnostics."""

    def test_overlap_metric_keys(self, sample_cleaned_df: pd.DataFrame):
        _, scores = fit_propensity_model(sample_cleaned_df)
        diagnostics = evaluate_overlap(scores, sample_cleaned_df[TREATMENT])

        expected_keys = {
            "auc_roc",
            "brier_score",
            "overall_mean",
            "overall_min",
            "overall_max",
            "treated_mean",
            "control_mean",
            "positivity_violations_count",
            "positivity_violations_pct",
            "common_support_share_pct",
        }
        assert set(diagnostics.keys()) == expected_keys

    def test_overlap_range_values(self, sample_cleaned_df: pd.DataFrame):
        _, scores = fit_propensity_model(sample_cleaned_df)
        diag = evaluate_overlap(scores, sample_cleaned_df[TREATMENT])

        assert 0.0 <= diag["auc_roc"] <= 1.0
        assert 0.0 <= diag["brier_score"] <= 1.0
        assert 0.0 <= diag["common_support_share_pct"] <= 100.0

    def test_positivity_violation_detection(self):
        synthetic_scores = np.array([0.02, 0.04, 0.50, 0.96, 0.99])
        synthetic_treat = np.array([0, 0, 1, 1, 1])

        diag = evaluate_overlap(synthetic_scores, synthetic_treat, lower_bound=0.05, upper_bound=0.95)
        assert diag["positivity_violations_count"] == 4
        assert diag["common_support_share_pct"] == 20.0


class TestIpwWeights:
    """Verify Inverse Propensity Weighting computation."""

    def test_weights_strictly_positive(self, sample_cleaned_df: pd.DataFrame):
        _, scores = fit_propensity_model(sample_cleaned_df)
        weights = compute_ipw_weights(scores, sample_cleaned_df[TREATMENT])

        assert len(weights) == len(sample_cleaned_df)
        assert (weights > 0.0).all()
        assert not np.isinf(weights).any()

    def test_unstabilized_vs_stabilized(self, sample_cleaned_df: pd.DataFrame):
        _, scores = fit_propensity_model(sample_cleaned_df)
        w_unstabilized = compute_ipw_weights(scores, sample_cleaned_df[TREATMENT], stabilized=False)
        w_stabilized = compute_ipw_weights(scores, sample_cleaned_df[TREATMENT], stabilized=True)

        assert len(w_unstabilized) == len(w_stabilized)
        # Stabilized weights should have a mean closer to 1.0
        assert abs(w_stabilized.mean() - 1.0) < abs(w_unstabilized.mean() - 1.0)
