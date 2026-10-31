"""
src/optimization/__init__.py
============================
EconoCausal — Prescriptive Budget Optimization Package (Week 3)
"""
from .budget_optimizer import (
    run_budget_optimization,
    run_budget_sweep,
    compare_policies,
    DEFAULT_BUDGET_INR,
    DEFAULT_DISCOUNT_AMOUNT_INR,
    EFFECTS_CSV_PATH,
)

__all__ = [
    "run_budget_optimization",
    "run_budget_sweep",
    "compare_policies",
    "DEFAULT_BUDGET_INR",
    "DEFAULT_DISCOUNT_AMOUNT_INR",
    "EFFECTS_CSV_PATH",
]
