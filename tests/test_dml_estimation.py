"""
tests/test_dml_estimation.py
============================
EconoCausal — Week 2: DML Unit & Integration Tests
Project Reference: ITS/DSML/1147

Tests:
- Schema and column validation.
- Binary treatment and outcome validation.
- Handling of invalid or missing columns.
- Estimator initialization for CausalForestDML and LinearDML.
- Model fitting on synthetic test fixtures.
- ITE prediction shapes, non-emptiness, and finite values.
- Confidence intervals consistency (lower <= upper).
- Model artifact serialization and reloading (joblib).
- Predictions CSV export format and schema.
"""

from pathlib import Path
import tempfile
import numpy as np
import pandas as pd
import pytest

from ml.dml_estimation import (
    DEFAULT_CATEGORICAL_COLS,
    DEFAULT_NUMERIC_COLS,
    DMLEstimatorWrapper,
    train_and_export_dml,
)


@pytest.fixture
def sample_causal_data() -> pd.DataFrame:
    """Fast synthetic dataset fixture for testing."""
    rng = np.random.default_rng(42)
    n = 200
    past_purchases = rng.integers(0, 20, size=n)
    avg_order_value = rng.uniform(20.0, 150.0, size=n)
    website_visits = rng.integers(1, 15, size=n)
    age_groups = rng.choice(["18-24", "25-34", "35-44", "45-54", "55+"], size=n)
    segments = rng.choice(["Premium", "Regular", "Occasional", "Lapsed"], size=n)
    
    # Treatment with mild confounding
    propensity = 1 / (1 + np.exp(-(-0.5 + 0.05 * past_purchases + 0.03 * website_visits)))
    discount_offered = rng.binomial(1, propensity, size=n)

    # Outcome with treatment effect
    outcome_prob = 1 / (1 + np.exp(-(-1.0 + 0.04 * past_purchases + 0.6 * discount_offered)))
    purchased = rng.binomial(1, outcome_prob, size=n)

    return pd.DataFrame({
        "customer_id": [f"TEST_{i:04d}" for i in range(n)],
        "past_purchases": past_purchases,
        "avg_order_value": np.round(avg_order_value, 2),
        "website_visits": website_visits,
        "age_group": age_groups,
        "customer_segment": segments,
        "discount_offered": discount_offered,
        "purchased": purchased,
    })


def test_estimator_initialization():
    """Verify initialization options for CausalForestDML and LinearDML."""
    wrapper_cf = DMLEstimatorWrapper(estimator_type="causal_forest", cv=3)
    assert wrapper_cf.estimator_type == "causal_forest"
    assert wrapper_cf.cv == 3
    assert not wrapper_cf.is_fitted

    wrapper_lin = DMLEstimatorWrapper(estimator_type="linear", cv=2)
    assert wrapper_lin.estimator_type == "linear"


def test_missing_feature_columns_raises_error(sample_causal_data):
    """Wrapper should raise ValueError when required feature columns are absent."""
    wrapper = DMLEstimatorWrapper()
    bad_df = sample_causal_data.drop(columns=["past_purchases"])
    with pytest.raises(ValueError, match="Missing required columns"):
        wrapper.fit(bad_df)


def test_invalid_treatment_values_raises_error(sample_causal_data):
    """Treatment must strictly be binary {0, 1}."""
    wrapper = DMLEstimatorWrapper()
    bad_df = sample_causal_data.copy()
    bad_df["discount_offered"] = bad_df["discount_offered"] + 2
    with pytest.raises(ValueError, match="must be binary"):
        wrapper.fit(bad_df)


def test_single_treatment_class_raises_error(sample_causal_data):
    """Treatment must contain both treated and control groups."""
    wrapper = DMLEstimatorWrapper()
    bad_df = sample_causal_data.copy()
    bad_df["discount_offered"] = 1
    with pytest.raises(ValueError, match="only 1 unique value"):
        wrapper.fit(bad_df)


def test_linear_dml_training_and_prediction(sample_causal_data):
    """LinearDML trains cleanly and produces finite treatment effects."""
    wrapper = DMLEstimatorWrapper(estimator_type="linear", cv=2, random_state=42)
    wrapper.fit(sample_causal_data)
    assert wrapper.is_fitted

    effects, lb, ub = wrapper.predict_ite(sample_causal_data)
    assert len(effects) == len(sample_causal_data)
    assert np.all(np.isfinite(effects))
    assert np.all(np.isfinite(lb))
    assert np.all(np.isfinite(ub))
    # Upper bound should be >= lower bound
    assert np.all(ub >= lb - 1e-6)


def test_causal_forest_dml_training_and_prediction(sample_causal_data):
    """CausalForestDML trains and computes CATE and confidence intervals."""
    wrapper = DMLEstimatorWrapper(
        estimator_type="causal_forest",
        cv=2,
        n_estimators=20,
        max_depth=4,
        random_state=42,
    )
    wrapper.fit(sample_causal_data)
    assert wrapper.is_fitted

    effects, lb, ub = wrapper.predict_ite(sample_causal_data)
    assert len(effects) == len(sample_causal_data)
    assert np.all(np.isfinite(effects))
    assert "mean_ate" in wrapper.summary_stats
    assert wrapper.summary_stats["sample_size"] == len(sample_causal_data)


def test_model_artifact_save_and_load(sample_causal_data):
    """Model wrapper serializes to disk with joblib and reloads with matching predictions."""
    wrapper = DMLEstimatorWrapper(estimator_type="linear", cv=2, random_state=42)
    wrapper.fit(sample_causal_data)
    orig_effects, _, _ = wrapper.predict_ite(sample_causal_data)

    with tempfile.TemporaryDirectory() as tmp_dir:
        save_file = Path(tmp_dir) / "test_model.joblib"
        wrapper.save(save_file)
        assert save_file.exists()

        loaded_wrapper = DMLEstimatorWrapper.load(save_file)
        assert loaded_wrapper.is_fitted
        assert loaded_wrapper.estimator_type == "linear"

        loaded_effects, _, _ = loaded_wrapper.predict_ite(sample_causal_data)
        np.testing.assert_allclose(orig_effects, loaded_effects, rtol=1e-5)


def test_train_and_export_dml_pipeline(sample_causal_data):
    """End-to-end function train_and_export_dml outputs CSV with expected schema."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        input_csv = Path(tmp_dir) / "cleaned_data.csv"
        sample_causal_data.to_csv(input_csv, index=False)

        pred_csv = Path(tmp_dir) / "ite_predictions.csv"
        model_file = Path(tmp_dir) / "model.joblib"

        wrapper, df_preds = train_and_export_dml(
            data_path=input_csv,
            output_predictions_path=pred_csv,
            model_save_path=model_file,
            estimator_type="linear",
            cv=2,
            random_state=42,
        )

        assert pred_csv.exists()
        assert model_file.exists()
        assert "treatment_effect" in df_preds.columns
        assert "treatment_effect_lower" in df_preds.columns
        assert "treatment_effect_upper" in df_preds.columns
        assert "actual_treatment" in df_preds.columns
        assert "actual_outcome" in df_preds.columns
        assert len(df_preds) == len(sample_causal_data)
