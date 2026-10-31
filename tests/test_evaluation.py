"""
tests/test_evaluation.py
========================
EconoCausal — Week 2: Causal Evaluation Tests
Project Reference: ITS/DSML/1147

Tests:
- Propensity score overlap and positivity diagnostics.
- Nuisance model cross-validation metrics (ROC-AUC, RMSE, Brier score).
- Cumulative Uplift and Qini curve calculations.
- Policy comparison calculations (Causal vs Random vs Blanket).
- Ground truth Data-Generating Process (DGP) evaluation.
"""

import numpy as np
import pandas as pd
import pytest

from ml.evaluation import (
    compute_policy_comparison,
    compute_true_dgp_effects,
    compute_uplift_and_qini,
)
from ml.train_nuisance_models import (
    build_preprocessor,
    evaluate_outcome_model,
    evaluate_treatment_model,
    train_and_evaluate_nuisance_models,
)


@pytest.fixture
def sample_evaluation_data() -> pd.DataFrame:
    """Fixture with synthetic customer data and predictions for evaluation tests."""
    rng = np.random.default_rng(42)
    n = 150
    past_purchases = rng.integers(0, 20, size=n)
    avg_order_value = rng.uniform(25.0, 100.0, size=n)
    website_visits = rng.integers(1, 12, size=n)
    age_groups = rng.choice(["18-24", "25-34", "35-44", "45-54", "55+"], size=n)
    segments = rng.choice(["Premium", "Regular", "Occasional", "Lapsed"], size=n)
    
    treatment = rng.binomial(1, 0.55, size=n)
    outcome = rng.binomial(1, 0.45, size=n)
    ite_pred = rng.normal(0.18, 0.04, size=n)

    return pd.DataFrame({
        "customer_id": [f"EVAL_{i:04d}" for i in range(n)],
        "past_purchases": past_purchases,
        "avg_order_value": np.round(avg_order_value, 2),
        "website_visits": website_visits,
        "age_group": age_groups,
        "customer_segment": segments,
        "discount_offered": treatment,
        "purchased": outcome,
        "actual_treatment": treatment,
        "actual_outcome": outcome,
        "treatment_effect": np.round(ite_pred, 5),
        "treatment_effect_lower": np.round(ite_pred - 0.08, 5),
        "treatment_effect_upper": np.round(ite_pred + 0.08, 5),
    })


def test_dgp_ground_truth_computation(sample_evaluation_data):
    """compute_true_dgp_effects outputs probabilities in [0, 1] and positive true ATE."""
    true_ite, true_ate = compute_true_dgp_effects(sample_evaluation_data)
    assert len(true_ite) == len(sample_evaluation_data)
    assert np.all(true_ite > 0)
    assert np.all(true_ite < 1.0)
    assert 0.05 < true_ate < 0.25


def test_uplift_and_qini_calculation(sample_evaluation_data):
    """compute_uplift_and_qini produces valid cumulative gain curves and Qini score."""
    propensities = np.full(len(sample_evaluation_data), 0.55)
    res = compute_uplift_and_qini(sample_evaluation_data, propensities=propensities, n_bins=5)

    assert "fractions" in res
    assert "causal_gain" in res
    assert "random_gain" in res
    assert "qini_score" in res
    assert len(res["fractions"]) == 6  # 0.0 + 5 bins
    assert res["fractions"][0] == 0.0
    assert res["fractions"][-1] == 1.0
    assert isinstance(res["qini_score"], float)


def test_policy_comparison_metrics(sample_evaluation_data):
    """compute_policy_comparison evaluates all 4 policies under a budget constraint."""
    res = compute_policy_comparison(
        sample_evaluation_data,
        budget=1000.0,
        cost_per_discount=10.0,
        margin_per_conversion=40.0,
    )
    assert "policies" in res
    assert len(res["policies"]) == 4

    policy_names = [p["name"] for p in res["policies"]]
    assert "Causal DML Targeting" in policy_names
    assert "Random Targeting" in policy_names
    assert "Blanket Discount (All)" in policy_names
    assert "No Discount (Baseline)" in policy_names

    causal_policy = next(p for p in res["policies"] if "Causal" in p["name"])
    assert causal_policy["targeted_customers"] <= 100
    assert causal_policy["spend"] <= 1000.0
    assert causal_policy["incremental_conversions"] >= 0


def test_nuisance_model_cross_validation(sample_evaluation_data):
    """train_and_evaluate_nuisance_models computes ROC-AUC, Brier score, and overlap."""
    prep = build_preprocessor()
    X = sample_evaluation_data[["past_purchases", "avg_order_value", "website_visits", "age_group", "customer_segment"]]
    T = sample_evaluation_data["discount_offered"].to_numpy()
    Y = sample_evaluation_data["purchased"].to_numpy()

    t_res = evaluate_treatment_model(X, T, prep, cv=2)
    assert "roc_auc" in t_res["metrics"]
    assert "brier_score" in t_res["metrics"]
    assert "common_support_fraction" in t_res["metrics"]
    assert len(t_res["propensities"]) == len(sample_evaluation_data)

    y_res = evaluate_outcome_model(X, Y, prep, cv=2)
    assert "rmse" in y_res["metrics"]
    assert "brier_score" in y_res["metrics"]
    assert len(y_res["predictions"]) == len(sample_evaluation_data)
