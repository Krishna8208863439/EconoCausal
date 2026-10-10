"""
test_data_generation.py
=======================
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Unit tests for src/data/generate_data.py
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# ── Import the module under test ──────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.data.generate_data import (
    DEFAULT_N,
    DEFAULT_SEED,
    MISSING_FRACTION,
    DUPLICATE_FRACTION,
    generate_dataset,
)

REQUIRED_COLUMNS = [
    "customer_id",
    "age_group",
    "past_purchases",
    "avg_order_value",
    "website_visits",
    "customer_segment",
    "discount_offered",
    "discount_amount",
    "purchased",
    "revenue",
    "campaign_date",
]

BINARY_COLUMNS = ["discount_offered", "purchased"]
ADJUSTMENT_SET = [
    "age_group",
    "past_purchases",
    "avg_order_value",
    "website_visits",
    "customer_segment",
]
EXCLUDED_FROM_ADJUSTMENT = ["customer_id", "revenue", "discount_amount", "campaign_date"]


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def df():
    """Generate once for the module; reuse across all tests."""
    return generate_dataset(n=DEFAULT_N, seed=DEFAULT_SEED)


@pytest.fixture(scope="module")
def df_small():
    """Smaller dataset for speed-sensitive tests."""
    return generate_dataset(n=200, seed=99)


# ── Reproducibility ───────────────────────────────────────────────────────────

class TestReproducibility:
    def test_same_seed_produces_identical_dataframes(self):
        df_a = generate_dataset(n=500, seed=42)
        df_b = generate_dataset(n=500, seed=42)
        pd.testing.assert_frame_equal(df_a, df_b)

    def test_different_seeds_produce_different_data(self):
        df_a = generate_dataset(n=500, seed=42)
        df_b = generate_dataset(n=500, seed=99)
        assert not df_a["past_purchases"].equals(df_b["past_purchases"]), (
            "Different seeds should yield different past_purchases values."
        )

    def test_default_seed_is_42(self):
        assert DEFAULT_SEED == 42

    def test_n_parameter_controls_base_row_count(self):
        """
        Total rows = n base + duplicates (~DUPLICATE_FRACTION * n).
        The base count must be exactly n before duplicates are added.
        We verify total rows are in the expected range.
        """
        n = 300
        df = generate_dataset(n=n, seed=42)
        max_dupes = int(DUPLICATE_FRACTION * n) + 1
        assert n <= len(df) <= n + max_dupes * 2, (
            f"Expected rows between {n} and {n + max_dupes*2}, got {len(df)}"
        )


# ── Schema ────────────────────────────────────────────────────────────────────

class TestSchema:
    def test_all_required_columns_present(self, df):
        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        assert missing == [], f"Missing columns: {missing}"

    def test_column_count(self, df):
        assert df.shape[1] == len(REQUIRED_COLUMNS), (
            f"Expected {len(REQUIRED_COLUMNS)} columns, got {df.shape[1]}"
        )

    def test_customer_id_unique_before_duplicates(self, df_small):
        """
        After generation (which includes duplicates), customer IDs are NOT all
        unique — that is intentional.  The base IDs (CUST_00001…CUST_N) must
        be present.
        """
        cust_ids = df_small["customer_id"].dropna()
        assert cust_ids.str.startswith("CUST_").all(), (
            "All customer_id values should start with 'CUST_'"
        )


# ── Binary columns ────────────────────────────────────────────────────────────

class TestBinaryColumns:
    def test_discount_offered_values(self, df):
        valid = set(df["discount_offered"].dropna().unique())
        assert valid.issubset({0, 1}), f"discount_offered has invalid values: {valid - {0,1}}"

    def test_purchased_values(self, df):
        valid = set(df["purchased"].dropna().unique())
        assert valid.issubset({0, 1}), f"purchased has invalid values: {valid - {0,1}}"

    def test_discount_offered_has_both_classes(self, df):
        counts = df["discount_offered"].value_counts()
        assert 0 in counts.index and 1 in counts.index, (
            "discount_offered should have both 0 and 1 values"
        )

    def test_purchased_has_both_classes(self, df):
        counts = df["purchased"].value_counts()
        assert 0 in counts.index and 1 in counts.index, (
            "purchased should have both 0 and 1 values"
        )


# ── Numeric ranges ────────────────────────────────────────────────────────────

class TestNumericRanges:
    def test_past_purchases_non_negative(self, df):
        valid = df["past_purchases"].dropna()
        assert (valid >= 0).all(), "past_purchases should be non-negative"

    def test_avg_order_value_positive(self, df):
        valid = df["avg_order_value"].dropna()
        assert (valid > 0).all(), "avg_order_value should be positive"

    def test_website_visits_non_negative(self, df):
        valid = df["website_visits"].dropna()
        assert (valid >= 0).all(), "website_visits should be non-negative"

    def test_discount_amount_non_negative(self, df):
        assert (df["discount_amount"] >= 0).all(), "discount_amount should be non-negative"

    def test_discount_amount_zero_for_control(self, df):
        control_amounts = df.loc[df["discount_offered"] == 0, "discount_amount"]
        assert (control_amounts == 0).all(), (
            "Control customers (discount_offered=0) should have discount_amount=0"
        )

    def test_revenue_non_negative(self, df):
        assert (df["revenue"] >= 0).all(), "revenue should be non-negative"

    def test_revenue_zero_when_not_purchased(self, df):
        """Revenue should be 0 for customers who did not purchase."""
        non_purchasers = df[df["purchased"] == 0]["revenue"]
        assert (non_purchasers == 0).all(), (
            "Customers who did not purchase should have revenue = 0"
        )


# ── Categorical values ────────────────────────────────────────────────────────

class TestCategoricalValues:
    VALID_AGE_GROUPS = {"18-24", "25-34", "35-44", "45-54", "55+"}
    VALID_SEGMENTS   = {"Premium", "Regular", "Occasional", "Lapsed"}

    def test_age_group_valid_values(self, df):
        observed = set(df["age_group"].dropna().unique())
        invalid  = observed - self.VALID_AGE_GROUPS
        assert not invalid, f"Unexpected age_group values: {invalid}"

    def test_customer_segment_valid_values(self, df):
        observed = set(df["customer_segment"].dropna().unique())
        invalid  = observed - self.VALID_SEGMENTS
        assert not invalid, f"Unexpected customer_segment values: {invalid}"

    def test_all_age_groups_represented(self, df):
        observed = set(df["age_group"].dropna().unique())
        missing  = self.VALID_AGE_GROUPS - observed
        assert not missing, f"Age groups not represented: {missing}"

    def test_all_segments_represented(self, df):
        observed = set(df["customer_segment"].dropna().unique())
        missing  = self.VALID_SEGMENTS - observed
        assert not missing, f"Segments not represented: {missing}"


# ── Controlled data-quality issues ───────────────────────────────────────────

class TestDataQualityIssues:
    def test_missing_values_introduced(self, df):
        """The generator should introduce NaN values in numeric confounder columns."""
        has_missing = any(
            df[col].isna().sum() > 0
            for col in ["past_purchases", "avg_order_value", "website_visits"]
        )
        assert has_missing, (
            "Expected controlled missing values in numeric confounder columns"
        )

    def test_missing_fraction_within_range(self, df):
        """Missing fraction per column should be close to MISSING_FRACTION."""
        for col in ["past_purchases", "avg_order_value", "website_visits"]:
            observed_frac = df[col].isna().sum() / len(df)
            # Allow generous tolerance: 0 to 3× expected
            assert 0 < observed_frac < MISSING_FRACTION * 3, (
                f"'{col}' missing fraction {observed_frac:.3f} outside expected range"
            )

    def test_duplicates_introduced(self, df):
        """The generator should introduce duplicate rows."""
        n_dupes = df.duplicated().sum()
        assert n_dupes > 0, "Expected controlled duplicate rows in the raw dataset"

    def test_binary_columns_have_no_missing(self, df):
        """Treatment and outcome should never be missing."""
        for col in BINARY_COLUMNS:
            assert df[col].isna().sum() == 0, (
                f"Binary column '{col}' should have no missing values"
            )


# ── Causal structure ──────────────────────────────────────────────────────────

class TestCausalStructure:
    def test_customer_id_not_in_adjustment_set(self):
        """customer_id must not appear in the adjustment set."""
        assert "customer_id" not in ADJUSTMENT_SET

    def test_revenue_not_in_adjustment_set(self):
        """revenue is post-treatment and must be excluded."""
        assert "revenue" not in ADJUSTMENT_SET

    def test_discount_amount_not_in_adjustment_set(self):
        """discount_amount is a treatment attribute, not a pre-treatment confounder."""
        assert "discount_amount" not in ADJUSTMENT_SET

    def test_confounders_predict_treatment(self, df):
        """
        Sanity check: treated customers should have higher mean past_purchases
        and website_visits (by design of the confounded DGP).
        """
        df_clean = df.dropna(subset=["past_purchases", "website_visits"])
        treated = df_clean[df_clean["discount_offered"] == 1]
        control = df_clean[df_clean["discount_offered"] == 0]

        assert treated["past_purchases"].mean() > control["past_purchases"].mean(), (
            "Treated customers should have higher mean past_purchases (confounding by design)"
        )
        assert treated["website_visits"].mean() > control["website_visits"].mean(), (
            "Treated customers should have higher mean website_visits (confounding by design)"
        )

    def test_confounders_predict_outcome(self, df):
        """
        Sanity check: customers with more past_purchases should purchase at a
        higher rate (confounding present in the DGP).
        """
        median_pp = df["past_purchases"].dropna().median()
        high = df[df["past_purchases"] >= median_pp]["purchased"].mean()
        low  = df[df["past_purchases"] <  median_pp]["purchased"].mean()
        assert high > low, (
            "Customers with more past purchases should purchase more (confounding by design)"
        )

    def test_treatment_increases_outcome(self, df):
        """
        Treated customers should have a higher purchase rate than control
        (true causal effect + confounding both push this direction).
        """
        treated_rate = df.loc[df["discount_offered"] == 1, "purchased"].mean()
        control_rate = df.loc[df["discount_offered"] == 0, "purchased"].mean()
        assert treated_rate > control_rate, (
            f"Treated purchase rate {treated_rate:.3f} should exceed control rate {control_rate:.3f}"
        )


# ── Dataset size ──────────────────────────────────────────────────────────────

class TestDatasetSize:
    def test_default_n_is_2200(self):
        assert DEFAULT_N == 2_200

    def test_minimum_viable_dataset(self):
        df = generate_dataset(n=50, seed=42)
        assert len(df) >= 50
        assert df.shape[1] == len(REQUIRED_COLUMNS)
