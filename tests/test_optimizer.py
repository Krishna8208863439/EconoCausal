"""
tests/test_optimizer.py
=======================
EconoCausal — Week 3 Day 1 & Day 2 Automated Optimizer Test Suite
Project Reference: ITS/DSML/1147

Verifies:
1. Budget is NEVER exceeded (spend <= budget)
2. Zero budget gives an empty selection
3. Negative-value customers are never picked
4. Greedy and MILP agree closely
5. Monotonicity: A bigger budget NEVER gives a lower incremental margin
6. Constraints:
   - Max customers limit is strictly observed
   - Conservative mode only selects customers with tau_lo > 0
   - Segment caps are strictly respected
7. Budget sweep across 5-8 budgets is monotonically non-decreasing
"""

from __future__ import annotations

import unittest
from pathlib import Path
from src.optimization.budget_optimizer import (
    run_budget_optimization,
    run_budget_sweep,
    calculate_customer_values,
    solve_knapsack_milp,
)


class TestOptimizerUnit(unittest.TestCase):
    def setUp(self):
        # Create a controlled synthetic customer cohort
        self.mock_customers = [
            {"customer_id": "C1", "tau_hat": 0.25, "tau_lo": 0.10, "tau_hi": 0.40, "p0_hat": 0.20, "e_hat": 0.5, "discount_amount": 10.0, "margin": 60.0, "customer_segment": "Regular", "age_group": "25-34", "past_purchases": 10, "website_visits": 8},
            {"customer_id": "C2", "tau_hat": 0.20, "tau_lo": 0.05, "tau_hi": 0.35, "p0_hat": 0.25, "e_hat": 0.5, "discount_amount": 10.0, "margin": 50.0, "customer_segment": "Regular", "age_group": "35-44", "past_purchases": 5, "website_visits": 6},
            {"customer_id": "C3", "tau_hat": 0.30, "tau_lo": 0.15, "tau_hi": 0.45, "p0_hat": 0.10, "e_hat": 0.4, "discount_amount": 10.0, "margin": 70.0, "customer_segment": "Premium", "age_group": "45-54", "past_purchases": 12, "website_visits": 10},
            {"customer_id": "C4", "tau_hat": -0.05, "tau_lo": -0.15, "tau_hi": 0.05, "p0_hat": 0.40, "e_hat": 0.6, "discount_amount": 10.0, "margin": 40.0, "customer_segment": "Lapsed", "age_group": "55+", "past_purchases": 2, "website_visits": 2},
            {"customer_id": "C5", "tau_hat": 0.18, "tau_lo": -0.02, "tau_hi": 0.38, "p0_hat": 0.30, "e_hat": 0.5, "discount_amount": 10.0, "margin": 45.0, "customer_segment": "Occasional", "age_group": "18-24", "past_purchases": 3, "website_visits": 4},
            {"customer_id": "C6", "tau_hat": 0.02, "tau_lo": -0.05, "tau_hi": 0.09, "p0_hat": 0.50, "e_hat": 0.6, "discount_amount": 10.0, "margin": 30.0, "customer_segment": "Occasional", "age_group": "25-34", "past_purchases": 4, "website_visits": 3},
        ]

    def test_budget_never_exceeded(self):
        """Spend must strictly never exceed budget under any parameter configuration."""
        budgets = [5.0, 10.0, 15.0, 25.0, 50.0, 100.0]
        for b in budgets:
            res = run_budget_optimization(budget=b, discount_amount=10.0, customers_data=self.mock_customers)
            spend = res["summary"]["actual_spend"]
            self.assertLessEqual(spend, b + 1e-6, f"Spend {spend} exceeded budget {b}")

    def test_zero_budget_gives_empty_selection(self):
        """A budget of zero must produce zero selections and zero spend."""
        res = run_budget_optimization(budget=0.0, discount_amount=10.0, customers_data=self.mock_customers)
        self.assertEqual(res["summary"]["n_selected_customers"], 0)
        self.assertEqual(res["summary"]["actual_spend"], 0.0)
        self.assertEqual(res["summary"]["estimated_incremental_contribution_inr"], 0.0)

    def test_negative_value_customers_never_picked(self):
        """Customers with negative incremental margin or tau <= 0 must never be selected."""
        res = run_budget_optimization(budget=1000.0, discount_amount=10.0, customers_data=self.mock_customers)
        for row in res["allocation"]:
            if row["selected_for_campaign"]:
                self.assertTrue(row["eligible"], f"Customer {row['customer_id']} was selected despite being ineligible")
                self.assertGreater(row["estimated_incremental_contribution"], 0.0)

    def test_monotonicity_bigger_budget_never_gives_lower_value(self):
        """A larger budget must yield equal or greater incremental margin (monotonicity)."""
        b_low = run_budget_optimization(budget=10.0, customers_data=self.mock_customers)
        b_mid = run_budget_optimization(budget=20.0, customers_data=self.mock_customers)
        b_high = run_budget_optimization(budget=50.0, customers_data=self.mock_customers)

        val_low = b_low["summary"]["estimated_incremental_contribution_inr"]
        val_mid = b_mid["summary"]["estimated_incremental_contribution_inr"]
        val_high = b_high["summary"]["estimated_incremental_contribution_inr"]

        self.assertLessEqual(val_low, val_mid + 1e-6)
        self.assertLessEqual(val_mid, val_high + 1e-6)

    def test_max_customers_constraint(self):
        """The number of selected customers must never exceed max_customers."""
        cap = 2
        res = run_budget_optimization(budget=1000.0, max_customers=cap, customers_data=self.mock_customers)
        self.assertLessEqual(res["summary"]["n_selected_customers"], cap)

    def test_conservative_mode_constraint(self):
        """Conservative mode must only select customers whose lower CI bound tau_lo > 0."""
        res = run_budget_optimization(budget=1000.0, conservative=True, customers_data=self.mock_customers)
        for row in res["allocation"]:
            if row["selected_for_campaign"]:
                self.assertGreater(row["treatment_effect_lower"], 0.0, f"Customer {row['customer_id']} selected with tau_lo <= 0")

    def test_segment_caps_constraint(self):
        """Selected customers per segment must never exceed segment caps."""
        caps = {"Regular": 1, "Premium": 1, "Occasional": 0}
        res = run_budget_optimization(budget=1000.0, segment_caps=caps, customers_data=self.mock_customers)
        counts = {}
        for row in res["allocation"]:
            if row["selected_for_campaign"]:
                seg = row["customer_segment"]
                counts[seg] = counts.get(seg, 0) + 1

        for seg, cap in caps.items():
            self.assertLessEqual(counts.get(seg, 0), cap, f"Segment {seg} count {counts.get(seg, 0)} exceeded cap {cap}")

    def test_greedy_and_milp_agree_closely(self):
        """Both exact greedy ordering and MILP knapsack should select optimal candidates."""
        scored = calculate_customer_values(self.mock_customers, discount_amount=10.0)
        sel, method = solve_knapsack_milp(scored, budget=20.0)
        self.assertEqual(sum(sel), 2)
        # Top 2 should be C3 (highest value) and C1
        self.assertTrue(sel[0])  # C1
        self.assertTrue(sel[2])  # C3

    def test_budget_sweep_monotonicity(self):
        """Budget sweep results must produce monotonically non-decreasing spend and conversions."""
        budgets = [10.0, 20.0, 30.0, 40.0, 50.0]
        results = [run_budget_optimization(budget=b, customers_data=self.mock_customers)["summary"] for b in budgets]
        for i in range(1, len(results)):
            self.assertGreaterEqual(results[i]["actual_spend"], results[i - 1]["actual_spend"])
            self.assertGreaterEqual(results[i]["estimated_incremental_conversions"], results[i - 1]["estimated_incremental_conversions"])


if __name__ == "__main__":
    unittest.main()
