"""
tests/test_allocation_constraints.py
=====================================
EconoCausal — Week 3: Allocation Constraint Tests
Project Reference: ITS/DSML/1147

Tests the _build_output_df and constraint-level behaviour of the allocation engine:
- Output schema validation
- Optimization_status column correctness
- Budget never exceeded
- Ineligible customers never selected
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT))

from ml.budget_optimizer import (
    OptimisationError,
    _build_output_df,
    run_optimisation,
    validate_predictions,
)


def make_ite_df(n=20, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "customer_id": [f"C{i:04d}" for i in range(n)],
        "treatment_effect": rng.uniform(0.05, 0.35, n),
        "treatment_effect_lower": rng.uniform(-0.05, 0.15, n),
        "treatment_effect_upper": rng.uniform(0.15, 0.45, n),
        "avg_order_value": rng.uniform(30, 120, n),
        "estimated_incremental_conversions": rng.uniform(0.05, 0.35, n),
        "net_incremental_contribution": rng.uniform(1.0, 10.0, n),
        "eligible": True,
        "customer_segment": "Regular",
    })


class TestBuildOutputDf:
    def test_output_has_all_required_columns(self):
        df = make_ite_df(10)
        selected = np.zeros(10, dtype=bool)
        selected[:3] = True
        out = _build_output_df(df, selected=selected, discount_amount=10.0)
        required = [
            "customer_id", "eligible", "estimated_treatment_effect",
            "recommended_discount", "selected_for_campaign",
            "estimated_discount_cost", "estimated_incremental_conversions",
            "estimated_incremental_contribution", "optimization_status",
        ]
        for col in required:
            assert col in out.columns, f"Missing: {col}"

    def test_selected_customers_have_nonzero_discount(self):
        df = make_ite_df(10)
        selected = np.array([True, False] * 5)
        out = _build_output_df(df, selected=selected, discount_amount=15.0)
        assert (out.loc[selected, "recommended_discount"] == 15.0).all()
        assert (out.loc[~selected, "recommended_discount"] == 0.0).all()

    def test_unselected_have_zero_cost(self):
        df = make_ite_df(10)
        selected = np.zeros(10, dtype=bool)
        selected[0] = True
        out = _build_output_df(df, selected=selected, discount_amount=10.0)
        assert (out.loc[~selected, "estimated_discount_cost"] == 0.0).all()

    def test_optimization_status_values(self):
        df = make_ite_df(6)
        df.loc[4:, "eligible"] = False  # 2 ineligible
        selected = np.array([True, True, False, False, False, False])
        out = _build_output_df(df, selected=selected, discount_amount=10.0)
        assert (out.loc[[0, 1], "optimization_status"] == "selected").all()
        assert (out.loc[[2, 3], "optimization_status"] == "eligible_not_selected").all()
        assert (out.loc[[4, 5], "optimization_status"] == "ineligible").all()

    def test_row_count_preserved(self):
        df = make_ite_df(50)
        selected = np.zeros(50, dtype=bool)
        out = _build_output_df(df, selected=selected, discount_amount=10.0)
        assert len(out) == 50


class TestConstraintEnforcement:
    def _run(self, df, budget, discount, tmp_path):
        p = tmp_path / "ite.csv"
        df.to_csv(p, index=False)
        out = tmp_path / "alloc.csv"
        return run_optimisation(
            budget=budget, discount_amount=discount,
            ite_path=p, output_path=out, random_seed=0,
        )

    def test_spend_never_exceeds_budget_small(self, tmp_path):
        rng = np.random.default_rng(55)
        df = pd.DataFrame({
            "customer_id": [f"C{i}" for i in range(30)],
            "treatment_effect": rng.uniform(0.1, 0.4, 30),
            "avg_order_value": rng.uniform(40, 100, 30),
        })
        result = self._run(df, budget=100.0, discount=10.0, tmp_path=tmp_path)
        assert result["summary"]["actual_spend"] <= 100.0 + 1e-6

    def test_spend_never_exceeds_budget_large(self, tmp_path):
        rng = np.random.default_rng(77)
        df = pd.DataFrame({
            "customer_id": [f"C{i}" for i in range(500)],
            "treatment_effect": rng.uniform(0.05, 0.40, 500),
            "avg_order_value": rng.uniform(20, 150, 500),
        })
        result = self._run(df, budget=2000.0, discount=10.0, tmp_path=tmp_path)
        assert result["summary"]["actual_spend"] <= 2000.0 + 1e-6

    def test_ineligible_never_selected(self, tmp_path):
        rng = np.random.default_rng(11)
        n = 40
        df = pd.DataFrame({
            "customer_id": [f"C{i}" for i in range(n)],
            "treatment_effect": rng.uniform(0.05, 0.35, n),
            "avg_order_value": rng.uniform(30, 90, n),
        })
        # Force first 10 to have tiny ITE → ineligible
        df.loc[:9, "treatment_effect"] = 0.001
        df.loc[:9, "avg_order_value"] = 2.0
        result = self._run(df, budget=500.0, discount=10.0, tmp_path=tmp_path)
        alloc = pd.read_csv(tmp_path / "alloc.csv")
        ineligible_ids = alloc.loc[alloc["optimization_status"] == "ineligible", "customer_id"].tolist()
        selected_ids = alloc.loc[alloc["selected_for_campaign"], "customer_id"].tolist()
        assert not any(cid in selected_ids for cid in ineligible_ids), \
            "Ineligible customer was selected for the campaign!"

    def test_infeasible_status_when_no_eligible(self, tmp_path):
        df = pd.DataFrame({
            "customer_id": ["A", "B", "C"],
            "treatment_effect": [0.001, 0.002, 0.001],  # too small
            "avg_order_value": [3.0, 3.0, 3.0],
        })
        result = self._run(df, budget=500.0, discount=10.0, tmp_path=tmp_path)
        assert result["feasible"] is False
        assert result["summary"]["n_selected_customers"] == 0
        assert result["summary"]["actual_spend"] == 0.0

    def test_output_csv_spend_consistent_with_summary(self, tmp_path):
        rng = np.random.default_rng(22)
        df = pd.DataFrame({
            "customer_id": [f"C{i}" for i in range(80)],
            "treatment_effect": rng.uniform(0.1, 0.35, 80),
            "avg_order_value": rng.uniform(40, 100, 80),
        })
        result = self._run(df, budget=400.0, discount=10.0, tmp_path=tmp_path)
        alloc = pd.read_csv(tmp_path / "alloc.csv")
        csv_spend = alloc["estimated_discount_cost"].sum()
        summary_spend = result["summary"]["actual_spend"]
        assert abs(csv_spend - summary_spend) < 1e-4, \
            f"CSV spend {csv_spend} != summary spend {summary_spend}"
