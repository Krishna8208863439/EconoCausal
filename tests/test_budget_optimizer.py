"""
tests/test_budget_optimizer.py
==============================
EconoCausal — Week 3 Automated Tests: Budget Optimiser
Project Reference: ITS/DSML/1147

Covers:
- Valid and invalid budget/discount inputs
- Missing/invalid treatment-effect estimates
- Customer eligibility rules
- Budget constraint enforcement (spend never exceeds budget)
- Duplicate customer IDs
- Empty and insufficient datasets
- Non-finite values
- Reproducibility of deterministic results
- CSV output generation
- Baseline comparisons with controlled fixtures
"""
from __future__ import annotations

import io
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Make sure the project root is on sys.path
_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT))

from ml.budget_optimizer import (
    DEFAULT_BUDGET_INR,
    DEFAULT_DISCOUNT_AMOUNT_INR,
    MIN_ITE_THRESHOLD,
    ALLOCATION_OUTPUT_PATH,
    OptimisationError,
    enrich_with_financials,
    run_optimisation,
    validate_predictions,
    _build_output_df,
)


# ── Test fixtures ──────────────────────────────────────────────────────────────

def make_ite_df(n: int = 10, seed: int = 0) -> pd.DataFrame:
    """Create a minimal valid ITE predictions DataFrame."""
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "customer_id": [f"C{i:04d}" for i in range(n)],
        "treatment_effect": rng.uniform(0.05, 0.35, n),
        "treatment_effect_lower": rng.uniform(-0.05, 0.15, n),
        "treatment_effect_upper": rng.uniform(0.15, 0.45, n),
        "actual_treatment": rng.integers(0, 2, n),
        "actual_outcome": rng.integers(0, 2, n),
        "avg_order_value": rng.uniform(30.0, 120.0, n),
        "customer_segment": rng.choice(["Regular", "Premium", "Occasional", "Lapsed"], n),
    })


def make_cleaned_df(customer_ids: list) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    n = len(customer_ids)
    return pd.DataFrame({
        "customer_id": customer_ids,
        "avg_order_value": rng.uniform(30.0, 120.0, n),
        "discount_amount": rng.uniform(5.0, 20.0, n),
    })


# ── validate_predictions ───────────────────────────────────────────────────────

class TestValidatePredictions:
    def test_valid_input_passes(self):
        df = make_ite_df(20)
        result = validate_predictions(df)
        assert len(result) == 20

    def test_missing_customer_id_raises(self):
        df = make_ite_df(5).drop(columns=["customer_id"])
        with pytest.raises(OptimisationError, match="missing required columns"):
            validate_predictions(df)

    def test_missing_treatment_effect_raises(self):
        df = make_ite_df(5).drop(columns=["treatment_effect"])
        with pytest.raises(OptimisationError, match="missing required columns"):
            validate_predictions(df)

    def test_duplicate_customer_ids_warns_and_deduplicates(self):
        df = make_ite_df(5)
        df = pd.concat([df, df.head(2)], ignore_index=True)  # 7 rows, 2 duplicates
        with pytest.warns(UserWarning, match="duplicate customer_id"):
            result = validate_predictions(df)
        assert len(result) == 5
        assert result["customer_id"].is_unique

    def test_non_finite_treatment_effects_dropped(self):
        df = make_ite_df(5)
        df.loc[0, "treatment_effect"] = np.nan
        df.loc[1, "treatment_effect"] = np.inf
        with pytest.warns(UserWarning, match="non-finite"):
            result = validate_predictions(df)
        assert len(result) == 3
        assert np.isfinite(result["treatment_effect"]).all()

    def test_all_non_finite_raises(self):
        df = make_ite_df(3)
        df["treatment_effect"] = np.nan
        with pytest.warns(UserWarning):
            with pytest.raises(OptimisationError, match="No valid rows"):
                validate_predictions(df)

    def test_empty_dataframe_raises(self):
        df = pd.DataFrame({"customer_id": [], "treatment_effect": []})
        with pytest.raises(OptimisationError, match="No valid rows"):
            validate_predictions(df)


# ── run_optimisation (integration-style, uses temp files) ─────────────────────

class TestRunOptimisation:
    """Integration tests using controlled synthetic fixtures."""

    def _write_fixture(self, df: pd.DataFrame, tmp_path: Path) -> Path:
        p = tmp_path / "ite_predictions.csv"
        df.to_csv(p, index=False)
        return p

    def test_valid_run_returns_feasible(self, tmp_path):
        df = make_ite_df(50, seed=1)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "allocation.csv"
        result = run_optimisation(
            budget=500.0,
            discount_amount=10.0,
            ite_path=ite_path,
            output_path=out_path,
            random_seed=42,
        )
        assert result["feasible"] is True
        assert result["summary"]["actual_spend"] <= 500.0
        assert out_path.exists()

    def test_budget_constraint_never_violated(self, tmp_path):
        """Core constraint: total spend MUST NOT exceed the budget."""
        for seed in range(5):
            df = make_ite_df(100, seed=seed)
            ite_path = self._write_fixture(df, tmp_path)
            out_path = tmp_path / f"alloc_{seed}.csv"
            budget = 300.0
            discount = 10.0
            result = run_optimisation(
                budget=budget,
                discount_amount=discount,
                ite_path=ite_path,
                output_path=out_path,
                random_seed=42,
            )
            actual_spend = result["summary"]["actual_spend"]
            assert actual_spend <= budget + 1e-6, (
                f"Seed {seed}: spend {actual_spend} exceeds budget {budget}"
            )

    def test_csv_output_has_required_columns(self, tmp_path):
        df = make_ite_df(20)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "allocation.csv"
        run_optimisation(
            budget=200.0, discount_amount=10.0,
            ite_path=ite_path, output_path=out_path,
        )
        alloc = pd.read_csv(out_path)
        required = [
            "customer_id", "eligible", "estimated_treatment_effect",
            "recommended_discount", "selected_for_campaign",
            "estimated_discount_cost", "estimated_incremental_conversions",
            "estimated_incremental_contribution", "optimization_status",
        ]
        for col in required:
            assert col in alloc.columns, f"Missing column: {col}"

    def test_zero_budget_raises(self, tmp_path):
        df = make_ite_df(10)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        with pytest.raises(OptimisationError, match="Budget must be positive"):
            run_optimisation(budget=0.0, discount_amount=10.0,
                             ite_path=ite_path, output_path=out_path)

    def test_negative_budget_raises(self, tmp_path):
        df = make_ite_df(10)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        with pytest.raises(OptimisationError, match="Budget must be positive"):
            run_optimisation(budget=-100.0, discount_amount=10.0,
                             ite_path=ite_path, output_path=out_path)

    def test_zero_discount_raises(self, tmp_path):
        df = make_ite_df(10)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        with pytest.raises(OptimisationError, match="discount_amount must be positive"):
            run_optimisation(budget=500.0, discount_amount=0.0,
                             ite_path=ite_path, output_path=out_path)

    def test_discount_exceeds_budget_raises(self, tmp_path):
        df = make_ite_df(10)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        with pytest.raises(OptimisationError, match="exceeds budget"):
            run_optimisation(budget=5.0, discount_amount=100.0,
                             ite_path=ite_path, output_path=out_path)

    def test_ite_file_not_found_raises(self, tmp_path):
        out_path = tmp_path / "alloc.csv"
        with pytest.raises(OptimisationError, match="not found"):
            run_optimisation(
                budget=500.0, discount_amount=10.0,
                ite_path=tmp_path / "nonexistent.csv",
                output_path=out_path,
            )

    def test_no_eligible_customers_returns_infeasible(self, tmp_path):
        """Customers with tiny ITE where ITE × M < discount are ineligible."""
        df = make_ite_df(10)
        df["treatment_effect"] = 0.001  # very small ITE
        df["avg_order_value"] = 5.0     # small basket → net_value < discount
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        result = run_optimisation(
            budget=500.0, discount_amount=10.0,
            ite_path=ite_path, output_path=out_path,
        )
        assert result["feasible"] is False
        assert result["summary"]["n_selected_customers"] == 0
        assert out_path.exists()

    def test_non_finite_ite_rows_excluded_from_allocation(self, tmp_path):
        """Customers without valid ITE estimates must not be recommended."""
        df = make_ite_df(10)
        df.loc[0, "treatment_effect"] = np.nan
        df.loc[1, "treatment_effect"] = np.inf
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        with pytest.warns(UserWarning, match="non-finite"):
            result = run_optimisation(
                budget=500.0, discount_amount=10.0,
                ite_path=ite_path, output_path=out_path,
            )
        alloc = pd.read_csv(out_path)
        # The two dropped customers should not be in the output at all
        assert len(alloc) == 8

    def test_reproducibility(self, tmp_path):
        """Same inputs and seed must produce identical allocations."""
        df = make_ite_df(50, seed=7)
        ite_path = self._write_fixture(df, tmp_path)
        out1 = tmp_path / "alloc1.csv"
        out2 = tmp_path / "alloc2.csv"
        run_optimisation(budget=300.0, discount_amount=10.0,
                         ite_path=ite_path, output_path=out1, random_seed=42)
        run_optimisation(budget=300.0, discount_amount=10.0,
                         ite_path=ite_path, output_path=out2, random_seed=42)
        df1 = pd.read_csv(out1).sort_values("customer_id").reset_index(drop=True)
        df2 = pd.read_csv(out2).sort_values("customer_id").reset_index(drop=True)
        pd.testing.assert_frame_equal(df1, df2)

    def test_baseline_comparison_returns_four_policies(self, tmp_path):
        df = make_ite_df(50)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        result = run_optimisation(
            budget=200.0, discount_amount=10.0,
            ite_path=ite_path, output_path=out_path,
        )
        baselines = result["baselines"]
        names = [b["name"] for b in baselines]
        assert any("No-Discount" in n for n in names)
        assert any("Random" in n for n in names)
        assert any("Blanket" in n for n in names)
        assert any("Causal" in n for n in names)

    def test_causal_targeting_outperforms_random(self, tmp_path):
        """Causal targeting should achieve >= incremental contribution vs random."""
        df = make_ite_df(200, seed=99)
        df["avg_order_value"] = np.random.default_rng(99).uniform(30, 100, 200)
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        result = run_optimisation(
            budget=500.0, discount_amount=10.0,
            ite_path=ite_path, output_path=out_path,
            random_seed=0,
        )
        causal_contrib = result["summary"]["estimated_incremental_contribution_inr"]
        random_contrib = next(
            b["estimated_incremental_contribution"]
            for b in result["baselines"] if "Random" in b["name"]
        )
        # Optimised solution should be at least as good as random
        assert causal_contrib >= random_contrib - 1e-3

    def test_duplicate_customer_ids_in_file(self, tmp_path):
        df = make_ite_df(10)
        df_dup = pd.concat([df, df.head(3)], ignore_index=True)
        ite_path = self._write_fixture(df_dup, tmp_path)
        out_path = tmp_path / "alloc.csv"
        with pytest.warns(UserWarning, match="duplicate"):
            result = run_optimisation(
                budget=200.0, discount_amount=10.0,
                ite_path=ite_path, output_path=out_path,
            )
        alloc = pd.read_csv(out_path)
        assert alloc["customer_id"].is_unique

    def test_single_eligible_customer(self, tmp_path):
        """Edge case: only one customer is eligible."""
        df = make_ite_df(10)
        df["treatment_effect"] = 0.001  # ineligible
        df["avg_order_value"] = 5.0
        # Make one eligible
        df.loc[5, "treatment_effect"] = 0.25
        df.loc[5, "avg_order_value"] = 80.0
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        result = run_optimisation(
            budget=200.0, discount_amount=10.0,
            ite_path=ite_path, output_path=out_path,
        )
        assert result["feasible"] is True
        assert result["summary"]["n_selected_customers"] == 1
        assert result["summary"]["actual_spend"] <= 200.0

    def test_selected_customers_all_have_positive_ite(self, tmp_path):
        """No customer with ITE <= 0 should be selected."""
        df = make_ite_df(30, seed=3)
        df.loc[:4, "treatment_effect"] = -0.1  # 5 negative-ITE customers
        ite_path = self._write_fixture(df, tmp_path)
        out_path = tmp_path / "alloc.csv"
        result = run_optimisation(
            budget=300.0, discount_amount=10.0,
            ite_path=ite_path, output_path=out_path,
        )
        alloc = pd.read_csv(out_path)
        selected = alloc[alloc["selected_for_campaign"]]
        assert (selected["estimated_treatment_effect"] > 0).all()


# ── enrich_with_financials ─────────────────────────────────────────────────────

class TestEnrichWithFinancials:
    def test_merges_avg_order_value(self):
        ite = make_ite_df(5).drop(columns=["avg_order_value"])
        cleaned = make_cleaned_df(ite["customer_id"].tolist())
        enriched = enrich_with_financials(ite, cleaned)
        assert "avg_order_value" in enriched.columns
        assert enriched["avg_order_value"].notna().all()

    def test_fallback_to_default_when_no_cleaned(self):
        from ml.budget_optimizer import DEFAULT_CONTRIBUTION_MARGIN_INR
        ite = make_ite_df(5).drop(columns=["avg_order_value"])
        enriched = enrich_with_financials(ite, cleaned_df=None)
        assert (enriched["avg_order_value"] == DEFAULT_CONTRIBUTION_MARGIN_INR).all()
