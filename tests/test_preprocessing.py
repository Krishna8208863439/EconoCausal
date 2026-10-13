"""
test_preprocessing.py
=====================
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Unit tests for src/data/preprocess.py
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# ── Import modules under test ─────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.data.generate_data import generate_dataset
from src.data.preprocess import (
    BINARY_COLUMNS,
    COLUMN_SCHEMA,
    REQUIRED_COLUMNS,
    OUTLIER_COLUMNS,
    enforce_dtypes,
    flag_outliers,
    get_adjustment_set,
    get_column_roles,
    impute_missing_values,
    remove_duplicates,
    run_pipeline,
    validate_binary_columns,
    validate_business_logic,
    validate_campaign_dates,
    validate_categoricals,
    validate_columns,
    validate_revenue_sign,
    compute_margin_metrics,
    add_causal_nuisance_features,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def raw_df():
    """Raw (un-cleaned) synthetic dataset."""
    return generate_dataset(n=500, seed=42)


@pytest.fixture(scope="module")
def clean_df(raw_df, tmp_path_factory):
    """
    Run the full preprocessing pipeline using a temporary CSV.
    Uses tmp_path_factory because fixtures with scope='module' can't use tmp_path.
    """
    tmp_dir = tmp_path_factory.mktemp("data")
    raw_path = tmp_dir / "mock_retail_campaign.csv"
    raw_df.to_csv(raw_path, index=False)
    return run_pipeline(raw_path=raw_path)


# ── validate_columns ──────────────────────────────────────────────────────────

class TestValidateColumns:
    def test_passes_with_all_columns(self, raw_df):
        validate_columns(raw_df)  # Should not raise

    def test_raises_on_missing_column(self, raw_df):
        df_bad = raw_df.drop(columns=["purchased"])
        with pytest.raises(ValueError, match="purchased"):
            validate_columns(df_bad)

    def test_raises_on_multiple_missing_columns(self, raw_df):
        df_bad = raw_df.drop(columns=["discount_offered", "customer_segment"])
        with pytest.raises(ValueError):
            validate_columns(df_bad)


# ── validate_binary_columns ───────────────────────────────────────────────────

class TestValidateBinaryColumns:
    def test_passes_on_clean_data(self, raw_df):
        validate_binary_columns(raw_df)  # Should not raise

    def test_raises_on_invalid_discount_value(self, raw_df):
        df_bad = raw_df.copy()
        df_bad.loc[0, "discount_offered"] = 2
        with pytest.raises(ValueError, match="discount_offered"):
            validate_binary_columns(df_bad)

    def test_raises_on_invalid_purchased_value(self, raw_df):
        df_bad = raw_df.copy()
        df_bad.loc[0, "purchased"] = -1
        with pytest.raises(ValueError, match="purchased"):
            validate_binary_columns(df_bad)

    def test_accepts_zero_and_one(self, raw_df):
        """Should not raise when values are exactly {0, 1}."""
        df_ok = raw_df.copy()
        df_ok["discount_offered"] = df_ok["discount_offered"].clip(0, 1)
        validate_binary_columns(df_ok)  # Should not raise


# ── remove_duplicates ─────────────────────────────────────────────────────────

class TestRemoveDuplicates:
    def test_removes_exact_duplicates(self):
        base = pd.DataFrame({
            "customer_id": ["A", "B", "C"],
            "val": [1, 2, 3],
        })
        df_with_dupes = pd.concat([base, base.iloc[[0]]], ignore_index=True)
        result = remove_duplicates(df_with_dupes)
        assert len(result) == 3, "Exact duplicate row should be removed"

    def test_preserves_unique_rows(self):
        df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
        result = remove_duplicates(df)
        assert len(result) == 3

    def test_resets_index_after_removal(self, raw_df):
        df_with_dupes = pd.concat([raw_df, raw_df.iloc[:5]], ignore_index=True)
        result = remove_duplicates(df_with_dupes)
        assert list(result.index) == list(range(len(result))), "Index should be reset"

    def test_removes_all_controlled_duplicates(self, raw_df):
        """After deduplication the generated dataset should have no exact dupes."""
        cleaned = remove_duplicates(raw_df.copy())
        assert cleaned.duplicated().sum() == 0


# ── impute_missing_values ─────────────────────────────────────────────────────

class TestImputeMissingValues:
    def _make_df_with_missing(self):
        df = generate_dataset(n=200, seed=42)
        df = remove_duplicates(df)
        return df

    def test_no_missing_after_imputation(self):
        df = self._make_df_with_missing()
        result = impute_missing_values(df)
        missing = result[["past_purchases", "avg_order_value", "website_visits"]].isnull().sum().sum()
        assert missing == 0, f"Expected 0 missing after imputation, got {missing}"

    def test_imputes_with_median(self):
        """
        If we set a known column to NaN, it should be imputed with the column median
        (computed on non-missing values before imputation).
        """
        df = generate_dataset(n=200, seed=42)
        df = remove_duplicates(df)
        # Force all past_purchases NaN except first 10
        known_median = float(df["past_purchases"].dropna().median())
        df.loc[10:, "past_purchases"] = np.nan
        result = impute_missing_values(df.copy())
        # Rows 10+ should be filled with the median
        imputed_vals = result.loc[10:, "past_purchases"].unique()
        assert all(abs(v - known_median) < 1e-6 for v in imputed_vals), (
            f"Expected median={known_median}, got values: {imputed_vals}"
        )

    def test_binary_columns_unaffected(self, raw_df):
        """
        Binary treatment and outcome columns must not be touched by imputation.
        """
        df = raw_df.copy()
        original_discount = df["discount_offered"].copy()
        original_purchased = df["purchased"].copy()
        imputed = impute_missing_values(df)
        pd.testing.assert_series_equal(imputed["discount_offered"].reset_index(drop=True),
                                       original_discount.reset_index(drop=True))
        pd.testing.assert_series_equal(imputed["purchased"].reset_index(drop=True),
                                       original_purchased.reset_index(drop=True))


# ── enforce_dtypes ────────────────────────────────────────────────────────────

class TestEnforceDtypes:
    def _clean_df(self):
        df = generate_dataset(n=200, seed=42)
        df = remove_duplicates(df)
        df = impute_missing_values(df)
        return df

    def test_past_purchases_is_integer(self):
        df = enforce_dtypes(self._clean_df())
        assert df["past_purchases"].dtype == np.int64, (
            f"Expected int64, got {df['past_purchases'].dtype}"
        )

    def test_website_visits_is_integer(self):
        df = enforce_dtypes(self._clean_df())
        assert df["website_visits"].dtype == np.int64, (
            f"Expected int64, got {df['website_visits'].dtype}"
        )

    def test_avg_order_value_is_float(self):
        df = enforce_dtypes(self._clean_df())
        assert np.issubdtype(df["avg_order_value"].dtype, np.floating)

    def test_discount_offered_is_integer(self):
        df = enforce_dtypes(self._clean_df())
        assert np.issubdtype(df["discount_offered"].dtype, np.integer)

    def test_purchased_is_integer(self):
        df = enforce_dtypes(self._clean_df())
        assert np.issubdtype(df["purchased"].dtype, np.integer)


# ── flag_outliers ─────────────────────────────────────────────────────────────

class TestFlagOutliers:
    def test_is_outlier_column_added(self, raw_df):
        df = raw_df.copy().dropna()
        result = flag_outliers(df)
        assert "is_outlier" in result.columns

    def test_is_outlier_is_binary(self, raw_df):
        df = raw_df.copy().dropna()
        result = flag_outliers(df)
        valid = set(result["is_outlier"].unique())
        assert valid.issubset({0, 1}), f"is_outlier should be 0 or 1, got {valid}"

    def test_extreme_value_is_flagged(self):
        """Manually insert a clear outlier and verify it gets flagged."""
        df = generate_dataset(n=200, seed=42)
        df = remove_duplicates(df)
        df = impute_missing_values(df)
        df = enforce_dtypes(df)
        # Set first row's past_purchases to an extreme value far above Q3 + 1.5*IQR
        df.loc[0, "past_purchases"] = 9999
        result = flag_outliers(df)
        assert result.loc[0, "is_outlier"] == 1, (
            "Extreme past_purchases value should be flagged as outlier"
        )

    def test_rows_retained_not_removed(self, raw_df):
        df = raw_df.copy().dropna()
        n_before = len(df)
        result = flag_outliers(df)
        assert len(result) == n_before, "Outlier flagging should not remove rows"


# ── validate_revenue_sign ─────────────────────────────────────────────────────

class TestValidateRevenueSign:
    def test_clips_negative_revenue(self):
        df = pd.DataFrame({"revenue": [-10.0, 0.0, 5.0, -0.01, 100.0]})
        result = validate_revenue_sign(df)
        assert (result["revenue"] >= 0).all(), "All revenue values should be >= 0 after clipping"

    def test_positive_revenue_unchanged(self):
        df = pd.DataFrame({"revenue": [10.0, 20.5, 0.0, 100.0]})
        result = validate_revenue_sign(df)
        pd.testing.assert_series_equal(result["revenue"], df["revenue"])


# ── get_adjustment_set ────────────────────────────────────────────────────────

class TestAdjustmentSet:
    EXPECTED = {"age_group", "past_purchases", "avg_order_value", "website_visits", "customer_segment"}

    def test_adjustment_set_contains_expected_confounders(self):
        adj = set(get_adjustment_set())
        assert adj == self.EXPECTED, (
            f"Adjustment set mismatch.\nExpected: {self.EXPECTED}\nGot: {adj}"
        )

    def test_customer_id_excluded_from_adjustment_set(self):
        adj = get_adjustment_set()
        assert "customer_id" not in adj, "customer_id must not be in the adjustment set"

    def test_revenue_excluded_from_adjustment_set(self):
        adj = get_adjustment_set()
        assert "revenue" not in adj, "revenue (post-treatment) must not be in the adjustment set"

    def test_discount_amount_excluded_from_adjustment_set(self):
        adj = get_adjustment_set()
        assert "discount_amount" not in adj, (
            "discount_amount (treatment attribute) must not be in the adjustment set"
        )

    def test_treatment_excluded_from_adjustment_set(self):
        adj = get_adjustment_set()
        assert "discount_offered" not in adj, (
            "discount_offered is the treatment variable, not a confounder"
        )


# ── get_column_roles ──────────────────────────────────────────────────────────

class TestColumnRoles:
    def test_discount_offered_is_treatment(self):
        roles = get_column_roles()
        assert roles["discount_offered"] == "treatment"

    def test_purchased_is_outcome(self):
        roles = get_column_roles()
        assert roles["purchased"] == "outcome"

    def test_customer_id_is_identifier(self):
        roles = get_column_roles()
        assert roles["customer_id"] == "identifier"

    def test_revenue_is_post_treatment(self):
        roles = get_column_roles()
        assert roles["revenue"] == "post_treatment"

    def test_confounders_have_confounder_role(self):
        roles = get_column_roles()
        for col in ["age_group", "past_purchases", "avg_order_value", "website_visits", "customer_segment"]:
            assert roles[col] == "confounder", f"{col} should have role 'confounder'"


# ── Full pipeline ─────────────────────────────────────────────────────────────

class TestFullPipeline:
    def test_pipeline_returns_dataframe(self, clean_df):
        assert isinstance(clean_df, pd.DataFrame)

    def test_no_missing_values_after_pipeline(self, clean_df):
        # is_outlier is allowed; check only original columns
        original_cols = [c for c in REQUIRED_COLUMNS if c in clean_df.columns]
        missing = clean_df[original_cols].isnull().sum().sum()
        assert missing == 0, f"Expected 0 missing after pipeline, got {missing}"

    def test_no_duplicates_after_pipeline(self, clean_df):
        assert clean_df.duplicated().sum() == 0, "No duplicates expected after pipeline"

    def test_is_outlier_column_present(self, clean_df):
        assert "is_outlier" in clean_df.columns

    def test_pipeline_row_count_less_than_raw(self, raw_df, clean_df):
        """Duplicate removal means cleaned dataset should be smaller than raw."""
        assert len(clean_df) < len(raw_df), (
            "Cleaned dataset should be smaller than raw (duplicates removed)"
        )

    def test_pipeline_treatment_rate_in_range(self, clean_df):
        rate = clean_df["discount_offered"].mean()
        assert 0.3 < rate < 0.8, f"Treatment rate {rate:.2f} outside expected 0.3–0.8 range"

    def test_pipeline_purchase_rate_in_range(self, clean_df):
        rate = clean_df["purchased"].mean()
        assert 0.1 < rate < 0.9, f"Purchase rate {rate:.2f} outside expected 0.1–0.9 range"

    def test_pipeline_output_has_required_columns(self, clean_df):
        for col in REQUIRED_COLUMNS:
            assert col in clean_df.columns, f"Column '{col}' missing from cleaned dataset"

    def test_binary_columns_still_binary_after_pipeline(self, clean_df):
        for col in BINARY_COLUMNS:
            valid = set(clean_df[col].unique())
            assert valid.issubset({0, 1}), (
                f"Column '{col}' should only contain 0 and 1 after pipeline, got {valid}"
            )


# ── Business Logic & Integrity Validation Tests ───────────────────────────────

class TestValidateBusinessLogic:
    def test_passes_on_valid_data(self, clean_df):
        validate_business_logic(clean_df)  # Should not raise

    def test_raises_when_control_has_discount(self, clean_df):
        bad = clean_df.copy()
        ctrl_idx = bad[bad["discount_offered"] == 0].index[0]
        bad.loc[ctrl_idx, "discount_amount"] = 15.0
        with pytest.raises(ValueError, match="control customers have discount_amount > 0"):
            validate_business_logic(bad)

    def test_raises_when_unpurchased_has_revenue(self, clean_df):
        bad = clean_df.copy()
        unpurchased_idx = bad[bad["purchased"] == 0].index[0]
        bad.loc[unpurchased_idx, "revenue"] = 49.99
        with pytest.raises(ValueError, match="unpurchased customers have revenue > 0"):
            validate_business_logic(bad)


# ── Campaign Date Validation Tests ────────────────────────────────────────────

class TestValidateCampaignDates:
    def test_passes_on_valid_dates(self, clean_df):
        validate_campaign_dates(clean_df)  # Should not raise

    def test_raises_on_invalid_date_format(self, clean_df):
        bad = clean_df.copy()
        bad.loc[0, "campaign_date"] = "15/01/2024"  # DD/MM/YYYY instead of YYYY-MM-DD
        with pytest.raises(ValueError, match="Invalid campaign_date"):
            validate_campaign_dates(bad)


# ── Margin & Nuisance Metrics Tests ───────────────────────────────────────────

class TestMarginAndNuisanceFeatures:
    def test_compute_margin_metrics_net_revenue(self, clean_df):
        df_margin = compute_margin_metrics(clean_df)
        assert "net_revenue" in df_margin.columns
        assert "is_negative_margin" in df_margin.columns
        expected_net = np.round(df_margin["revenue"] - df_margin["discount_amount"], 2)
        pd.testing.assert_series_equal(df_margin["net_revenue"], expected_net, check_names=False)

    def test_compute_margin_metrics_negative_margin_flag(self):
        sample = pd.DataFrame({
            "discount_offered": [1, 1, 0],
            "purchased": [1, 1, 0],
            "discount_amount": [20.0, 5.0, 0.0],
            "revenue": [15.0, 50.0, 0.0],
        })
        df_margin = compute_margin_metrics(sample)
        assert df_margin.loc[0, "is_negative_margin"] == 1  # 20.0 > 15.0
        assert df_margin.loc[1, "is_negative_margin"] == 0  # 5.0 <= 50.0
        assert df_margin.loc[2, "is_negative_margin"] == 0

    def test_add_causal_nuisance_features(self, clean_df):
        df_nuisance = add_causal_nuisance_features(clean_df)
        assert "log_avg_order_value" in df_nuisance.columns
        expected_log = np.round(np.log1p(df_nuisance["avg_order_value"]), 4)
        pd.testing.assert_series_equal(df_nuisance["log_avg_order_value"], expected_log, check_names=False)
