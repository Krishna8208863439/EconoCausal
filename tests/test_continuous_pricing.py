"""
test_continuous_pricing.py
==========================
Unit tests for Day 2, Day 3, and Day 4 Continuous DML & Dynamic Pricing Modules:
- Day 2: DML continuous price elasticity estimation, demand curve, segment CATEs
- Day 3: Causal diagnostics, continuous positivity, residual orthogonality, refutations
- Day 4: Prescriptive pricing optimization, 4-policy comparison, SQLite database logging
"""

import csv
import json
from pathlib import Path
import sqlite3
import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
DML_JSON_PATH = ROOT_DIR / "data" / "processed" / "dml_pricing_results.json"
DIAG_JSON_PATH = ROOT_DIR / "data" / "processed" / "causal_diagnostics_results.json"
OPT_JSON_PATH = ROOT_DIR / "data" / "processed" / "pricing_optimization_results.json"
DECISIONS_CSV_PATH = ROOT_DIR / "data" / "processed" / "pricing_decisions.csv"
DB_PATH = ROOT_DIR / "data" / "econocausal.db"


class TestDay2ContinuousDML:
    def test_dml_json_exists_and_loads(self):
        assert DML_JSON_PATH.exists(), "dml_pricing_results.json should exist"
        with open(DML_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "dml_estimates" in data
        assert "price_elasticity" in data["dml_estimates"]
        assert "ci_lower_95" in data["dml_estimates"]
        assert "ci_upper_95" in data["dml_estimates"]
        assert "naive_ols" in data
        assert "ground_truth_recovery" in data

    def test_dml_elasticity_within_bounds(self):
        with open(DML_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        est = data["dml_estimates"]
        beta = est["price_elasticity"]
        # Elasticity should be negative (elastic demand)
        assert -2.0 <= beta <= -0.5
        assert est["ci_lower_95"] <= beta <= est["ci_upper_95"]

    def test_dml_reduces_naive_bias(self):
        with open(DML_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        gtr = data["ground_truth_recovery"]
        assert gtr["dml_error"] < gtr["naive_bias"], "DML error should be strictly smaller than naive OLS bias"
        assert gtr["bias_reduction_percent"] > 0

    def test_demand_curve_generated(self):
        with open(DML_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        dc = data["demand_curve"]
        assert isinstance(dc, list)
        assert len(dc) >= 5
        assert "price" in dc[0]
        assert "expected_units" in dc[0]
        # Downward sloping demand
        assert dc[0]["expected_units"] > dc[-1]["expected_units"]

    def test_segment_effects_present(self):
        with open(DML_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        se = data["segment_effects"]
        for seg in ("Premium", "Regular", "Occasional", "Lapsed"):
            assert seg in se
            assert se[seg]["elasticity"] < 0


class TestDay3CausalDiagnostics:
    def test_diagnostics_json_exists_and_loads(self):
        assert DIAG_JSON_PATH.exists(), "causal_diagnostics_results.json should exist"
        with open(DIAG_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "continuous_positivity" in data
        assert "residual_orthogonality" in data
        assert "refutations" in data

    def test_continuous_positivity_verified(self):
        with open(DIAG_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        cp = data["continuous_positivity"]
        assert cp["has_real_variation"] is True
        assert cp["variance"] > 0

    def test_residual_orthogonality_holds(self):
        with open(DIAG_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        ro = data["residual_orthogonality"]
        assert ro["all_orthogonal"] is True
        assert ro["max_absolute_correlation"] < 0.05, "Residuals should be orthogonal to confounders"

    def test_refutations_pass(self):
        with open(DIAG_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        ref = data["refutations"]
        assert ref["placebo_treatment"]["passed"] is True
        assert ref["random_common_cause"]["passed"] is True
        assert ref["data_subset"]["passed"] is True


class TestDay4PricingOptimization:
    def test_optimization_json_exists(self):
        assert OPT_JSON_PATH.exists(), "pricing_optimization_results.json should exist"
        with open(OPT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "policy_comparison" in data
        assert "action_distribution" in data

    def test_four_policies_evaluated(self):
        with open(OPT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        pc = data["policy_comparison"]
        for p in ("uniform_markup_20", "competitor_pegged", "naive_elasticity", "causal_dml_optimal"):
            assert p in pc
            assert pc[p]["total_profit"] > 0

    def test_causal_dml_outperforms_naive(self):
        with open(OPT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        pc = data["policy_comparison"]
        dml_prof = pc["causal_dml_optimal"]["total_profit"]
        naive_prof = pc["naive_elasticity"]["total_profit"]
        assert dml_prof >= naive_prof, "Causal DML profit should meet or exceed naive elasticity profit"

    def test_decisions_csv_validity(self):
        assert DECISIONS_CSV_PATH.exists(), "pricing_decisions.csv should exist"
        with open(DECISIONS_CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        assert len(rows) == 2200, "Should generate decisions for all 2,200 records"
        sample = rows[0]
        assert "customer_id" in sample
        assert "optimal_price" in sample
        assert "recommended_action" in sample
        assert sample["recommended_action"] in ("INCREASE_PRICE", "DECREASE_PRICE", "MAINTAIN_PRICE")


class TestSQLiteDatabaseIntegration:
    def test_sqlite_db_exists(self):
        assert DB_PATH.exists(), "econocausal.db should exist"

    def test_sqlite_tables_populated(self):
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cur.fetchall()}
        assert "pricing_decisions" in tables
        assert "pricing_optimization_runs" in tables
        assert "causal_diagnostics" in tables

        cur.execute("SELECT count(*) FROM pricing_decisions")
        count = cur.fetchone()[0]
        assert count > 0, "pricing_decisions should have records"
        conn.close()
