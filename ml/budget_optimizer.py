"""
ml/budget_optimizer.py
======================
EconoCausal — Week 3: Prescriptive Budget Optimisation Engine
Project Reference: ITS/DSML/1147

Objective
---------
Select *which* customers receive a fixed-amount discount so that the sum of
estimated incremental conversions × contribution margin − discount cost is
maximised, subject to a hard marketing-budget constraint.

Treatment contrast
------------------
Week 2 delivers a **binary** treatment ITE:
    τ_i = E[Y_i(1) − Y_i(0) | X_i]
representing the causal effect of "receiving a discount vs no discount" on
purchase probability.  We therefore support **one** discount level per run.
Multi-level dose-response requires a separate causal model (not in scope here).

Objective function
------------------
For customer i with estimated effect τ_i, discount amount d, and contribution
margin M (average order value, used as an upper-bound proxy):

    incremental_contribution_i = τ_i × M_i − d        (₹)

This measures the *net* incremental value: the extra revenue driven by the
discount minus the cost of that discount.  Customers with τ_i × M_i < d have a
negative net incremental value and will naturally not be selected.

Optimisation problem (binary integer programme)
-----------------------------------------------
    max  Σ_i  x_i × net_value_i
    s.t. Σ_i  x_i × d ≤ budget
         x_i ∈ {0, 1}
         net_value_i ≥ min_net_value_threshold  (eligibility gate)

Solved with scipy.optimize.milp (LP relaxation with integrality constraints).
"""

from __future__ import annotations

import logging
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy.optimize import LinearConstraint, milp, Bounds

# ── Paths ──────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[1]
ITE_PREDICTIONS_PATH   = _ROOT / "data" / "processed" / "ite_predictions.csv"
CLEANED_DATA_PATH      = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
ALLOCATION_OUTPUT_PATH = _ROOT / "data" / "processed" / "discount_allocation.csv"

log = logging.getLogger(__name__)


# ── Business constants (documented assumptions) ────────────────────────────────
# These values are used when column-level data is unavailable.
DEFAULT_CONTRIBUTION_MARGIN_INR = 55.0   # ₹ mean avg_order_value in cleaned dataset
DEFAULT_DISCOUNT_AMOUNT_INR     = 10.0   # ₹ cost of one discount coupon (matches real discount_amount data mean ~₹7.5, rounded up)
DEFAULT_BUDGET_INR              = 5_000.0   # ₹ default total campaign budget
# Customers with non-positive lower CI are flagged as uncertain but still
# included unless explicitly excluded by the caller.
MIN_ITE_THRESHOLD = 0.0   # τ_i > 0 required to be considered for selection


# ── Validation ─────────────────────────────────────────────────────────────────

class OptimisationError(ValueError):
    """Raised when the optimisation problem is infeasible or inputs are invalid."""


def validate_predictions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate the ITE predictions DataFrame and return a cleaned copy.

    Raises
    ------
    OptimisationError
        If required columns are missing, all rows are invalid, or the data
        contains duplicate customer IDs.
    """
    required_cols = ["customer_id", "treatment_effect"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise OptimisationError(f"ITE predictions are missing required columns: {missing}")

    n_in = len(df)

    # Duplicate customer IDs
    dup = df["customer_id"].duplicated()
    if dup.any():
        warnings.warn(
            f"Found {dup.sum()} duplicate customer_id rows; keeping first occurrence.",
            stacklevel=2,
        )
        df = df[~dup].copy()

    # Non-finite treatment effects
    mask_finite = np.isfinite(df["treatment_effect"])
    if not mask_finite.all():
        n_bad = (~mask_finite).sum()
        warnings.warn(f"Dropping {n_bad} rows with non-finite treatment_effect.", stacklevel=2)
        df = df[mask_finite].copy()

    if df.empty:
        raise OptimisationError("No valid rows remain after cleaning ITE predictions.")

    log.info("ITE validation: %d rows in, %d valid rows out.", n_in, len(df))
    return df.reset_index(drop=True)


# ── Feature enrichment ──────────────────────────────────────────────────────────

def enrich_with_financials(
    ite_df: pd.DataFrame,
    cleaned_df: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Join ITE predictions with financial features from the cleaned dataset.

    Uses `avg_order_value` as the contribution-margin proxy (see docstring).
    If the cleaned data is unavailable, falls back to the default constant.
    """
    if cleaned_df is not None and "avg_order_value" in cleaned_df.columns:
        merge_cols = ["customer_id", "avg_order_value"]
        if "discount_amount" in cleaned_df.columns:
            merge_cols.append("discount_amount")
        fin = cleaned_df[merge_cols].drop_duplicates("customer_id")
        df = ite_df.merge(fin, on="customer_id", how="left")
    else:
        df = ite_df.copy()

    # Fill missing financial columns with documented defaults
    if "avg_order_value" not in df.columns or df["avg_order_value"].isna().all():
        df["avg_order_value"] = DEFAULT_CONTRIBUTION_MARGIN_INR
    else:
        df["avg_order_value"] = df["avg_order_value"].fillna(DEFAULT_CONTRIBUTION_MARGIN_INR)

    return df


# ── Core optimiser ──────────────────────────────────────────────────────────────

def run_optimisation(
    budget: float = DEFAULT_BUDGET_INR,
    discount_amount: float = DEFAULT_DISCOUNT_AMOUNT_INR,
    min_treatment_effect: float = MIN_ITE_THRESHOLD,
    ite_path: Path = ITE_PREDICTIONS_PATH,
    cleaned_data_path: Path = CLEANED_DATA_PATH,
    output_path: Path = ALLOCATION_OUTPUT_PATH,
    random_seed: int = 42,
) -> Dict[str, Any]:
    """
    Run the MILP budget-optimisation engine.

    Parameters
    ----------
    budget              : Total marketing budget (₹).
    discount_amount     : Fixed cost of one discount offer (₹).
    min_treatment_effect: Minimum ITE for a customer to be eligible.
    ite_path            : Path to Week 2 ITE predictions CSV.
    cleaned_data_path   : Path to cleaned retail campaign CSV (for financials).
    output_path         : Where to save discount_allocation.csv.
    random_seed         : For reproducible baseline comparisons.

    Returns
    -------
    dict with keys:
        allocation_df   pd.DataFrame   Full customer-level allocation
        summary         dict           Budget utilisation summary
        baselines       dict           Policy comparison baselines
        feasible        bool           Whether a feasible solution was found
        status_message  str            Human-readable status
    """
    # ── Input validation ──────────────────────────────────────────────────────
    if budget <= 0:
        raise OptimisationError(f"Budget must be positive; got {budget}.")
    if discount_amount <= 0:
        raise OptimisationError(f"discount_amount must be positive; got {discount_amount}.")
    if discount_amount > budget:
        raise OptimisationError(
            f"discount_amount (₹{discount_amount}) exceeds budget (₹{budget}). "
            "No customer can be selected."
        )

    # ── Load and validate ITE predictions ─────────────────────────────────────
    if not ite_path.exists():
        raise OptimisationError(
            f"ITE predictions file not found at {ite_path}. "
            "Please run Week 2 DML estimation first."
        )
    ite_df = pd.read_csv(ite_path)
    ite_df = validate_predictions(ite_df)

    # ── Load financial data ────────────────────────────────────────────────────
    cleaned_df = None
    if cleaned_data_path.exists():
        cleaned_df = pd.read_csv(cleaned_data_path)

    df = enrich_with_financials(ite_df, cleaned_df)

    n_total = len(df)

    # ── Eligibility ────────────────────────────────────────────────────────────
    # A customer is eligible if:
    #   1. Their point estimate τ_i > min_treatment_effect
    #   2. Their net incremental contribution = τ_i × M_i − d > 0
    #      (otherwise offering a discount is expected to lose money)
    df["eligible"] = (df["treatment_effect"] > min_treatment_effect).astype(bool)

    # Net incremental contribution (₹):
    #   = estimated purchase-probability uplift × avg order value − discount cost
    # NOTE: avg_order_value is used as a contribution-margin *proxy* — it is
    #       the observed average basket revenue, not a true net margin.  This
    #       over-estimates contribution if variable costs are significant.
    df["net_incremental_contribution"] = (
        df["treatment_effect"] * df["avg_order_value"] - discount_amount
    )

    # Estimated incremental conversions (dimensionless probability uplift)
    df["estimated_incremental_conversions"] = df["treatment_effect"].clip(lower=0)

    # Only customers with positive net value AND above ITE threshold are candidates
    eligible_mask = df["eligible"] & (df["net_incremental_contribution"] > 0)
    # Update eligible to reflect the full gate (ITE > threshold AND net_value > 0)
    df["eligible"] = eligible_mask
    n_eligible = int(eligible_mask.sum())

    log.info(
        "Eligible customers: %d / %d (ITE > %.3f and net_value > 0)",
        n_eligible, n_total, min_treatment_effect,
    )

    if n_eligible == 0:
        log.warning("No eligible customers found. Budget=%.0f, discount=%.0f", budget, discount_amount)
        df = _build_output_df(df, selected=np.zeros(n_total, dtype=bool),
                              discount_amount=discount_amount)
        _save_allocation(df, output_path)
        return _build_result(
            df=df, budget=budget, discount_amount=discount_amount,
            selected=np.zeros(n_total, dtype=bool), feasible=False,
            status="infeasible_no_eligible",
            status_message="No eligible customers found with positive net incremental contribution.",
            random_seed=random_seed,
        )

    # ── MILP formulation ───────────────────────────────────────────────────────
    # Decision variables: x_i ∈ {0, 1} for each eligible customer.
    eligible_idx = df.index[eligible_mask].tolist()
    n_vars = len(eligible_idx)

    obj_values = df.loc[eligible_idx, "net_incremental_contribution"].values.astype(float)
    max_feasible = int(budget // discount_amount)

    # Objective: MILP minimises by convention → negate to maximise
    c = -obj_values

    # Budget constraint: Σ x_i × d ≤ budget
    # Rewritten as: Σ x_i ≤ floor(budget / d)
    A_budget = np.ones((1, n_vars))
    budget_constraint = LinearConstraint(A_budget, -np.inf, float(max_feasible))

    # Variable bounds: 0 ≤ x_i ≤ 1
    bounds = Bounds(lb=0, ub=1)

    # Integrality: 1 = integer variable
    integrality = np.ones(n_vars)

    log.info(
        "Solving MILP: %d binary vars, budget capacity = %d offers.",
        n_vars, max_feasible,
    )

    result = milp(
        c=c,
        constraints=budget_constraint,
        integrality=integrality,
        bounds=bounds,
    )

    if result.status not in (0, 1, 3):  # 0=optimal, 1=iteration_limit, 3=solution_found
        # scipy milp status: 0=optimal, 1=iteration limit, 2=infeasible, 3=unbounded, 4=numerical
        log.error("MILP solver returned status %d: %s", result.status, result.message)
        df = _build_output_df(df, selected=np.zeros(n_total, dtype=bool),
                              discount_amount=discount_amount)
        _save_allocation(df, output_path)
        return _build_result(
            df=df, budget=budget, discount_amount=discount_amount,
            selected=np.zeros(n_total, dtype=bool), feasible=False,
            status=f"solver_failed_{result.status}",
            status_message=f"MILP solver failed: {result.message}",
            random_seed=random_seed,
        )

    # Round binary solution (MILP should produce integer values)
    x_opt = np.round(result.x).astype(bool)
    selected_global = np.zeros(n_total, dtype=bool)
    for k, idx in enumerate(eligible_idx):
        selected_global[idx] = x_opt[k]

    # Validate budget constraint was satisfied
    actual_spend = float(selected_global.sum() * discount_amount)
    if actual_spend > budget + 1e-6:
        raise OptimisationError(
            f"CRITICAL: Solver selected spend ₹{actual_spend:.2f} which exceeds "
            f"budget ₹{budget:.2f}. This is a solver integrity failure."
        )

    df = _build_output_df(df, selected=selected_global, discount_amount=discount_amount)
    _save_allocation(df, output_path)

    log.info(
        "Optimisation complete: %d customers selected, spend=₹%.0f / ₹%.0f.",
        int(selected_global.sum()), actual_spend, budget,
    )

    return _build_result(
        df=df, budget=budget, discount_amount=discount_amount,
        selected=selected_global, feasible=True,
        status="optimal",
        status_message=f"Optimal solution found. {int(selected_global.sum())} customers selected.",
        random_seed=random_seed,
    )


# ── Output helpers ─────────────────────────────────────────────────────────────

def _build_output_df(
    df: pd.DataFrame,
    selected: np.ndarray,
    discount_amount: float,
) -> pd.DataFrame:
    """Construct the full customer-level output DataFrame."""
    out = pd.DataFrame()
    out["customer_id"]                    = df["customer_id"]
    out["eligible"]                       = df.get("eligible", False)
    out["estimated_treatment_effect"]     = df["treatment_effect"].round(6)
    out["treatment_effect_lower"]         = df.get("treatment_effect_lower", np.nan)
    out["treatment_effect_upper"]         = df.get("treatment_effect_upper", np.nan)
    out["recommended_discount"]           = np.where(selected, discount_amount, 0.0)
    out["selected_for_campaign"]          = selected.astype(bool)
    out["estimated_discount_cost"]        = np.where(selected, discount_amount, 0.0)
    out["estimated_incremental_conversions"] = (
        df["estimated_incremental_conversions"].round(6)
        if "estimated_incremental_conversions" in df.columns
        else df["treatment_effect"].clip(lower=0).round(6)
    )
    out["estimated_incremental_contribution"] = np.where(
        selected,
        df.get("net_incremental_contribution", 0.0).round(2),
        0.0,
    )
    out["avg_order_value_proxy"]          = df["avg_order_value"].round(2)
    out["optimization_status"]            = np.where(
        selected, "selected",
        np.where(df.get("eligible", False), "eligible_not_selected", "ineligible"),
    )
    # Uncertainty flag: lower CI includes zero or is negative
    if "treatment_effect_lower" in df.columns:
        out["uncertain_estimate"] = (df["treatment_effect_lower"] <= 0).astype(bool)
    else:
        out["uncertain_estimate"] = False

    # Additional feature columns for transparency
    for col in ["actual_treatment", "actual_outcome", "customer_segment",
                "age_group", "past_purchases", "website_visits"]:
        if col in df.columns:
            out[col] = df[col]

    return out.reset_index(drop=True)


def _save_allocation(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    log.info("Allocation saved to %s (%d rows).", path, len(df))


def _build_result(
    df: pd.DataFrame,
    budget: float,
    discount_amount: float,
    selected: np.ndarray,
    feasible: bool,
    status: str,
    status_message: str,
    random_seed: int,
) -> Dict[str, Any]:
    """Assemble the full return dictionary including baselines."""
    n_eligible  = int(df["eligible"].sum()) if "eligible" in df.columns else 0
    n_selected  = int(selected.sum())
    actual_spend = n_selected * discount_amount
    remaining   = budget - actual_spend

    # Objective value: sum of net incremental contribution for selected
    obj_value = float(df.loc[selected.astype(bool), "estimated_incremental_contribution"].sum()) \
        if selected.any() else 0.0

    # Estimated incremental conversions from selected customers
    inc_conversions = float(df.loc[selected.astype(bool), "estimated_incremental_conversions"].sum()) \
        if selected.any() else 0.0

    # ── Baselines ──────────────────────────────────────────────────────────────
    rng = np.random.default_rng(random_seed)
    eligible_mask = df["eligible"].values if "eligible" in df.columns else np.ones(len(df), dtype=bool)
    eligible_idx  = np.where(eligible_mask)[0]
    max_capacity  = int(budget // discount_amount)

    # 1. No-discount policy
    no_discount = {
        "name": "No-Discount Policy",
        "n_selected": 0,
        "actual_spend": 0.0,
        "estimated_incremental_conversions": 0.0,
        "estimated_incremental_contribution": 0.0,
        "description": "Baseline: offer no discounts.",
    }

    # 2. Blanket-discount policy (all eligible, up to budget)
    blanket_n = min(n_eligible, max_capacity)
    blanket_rows = df[eligible_mask].head(blanket_n)
    blanket_conv = float(blanket_rows["estimated_incremental_conversions"].sum())
    if "avg_order_value_proxy" in blanket_rows.columns:
        blanket_contrib = float(
            (blanket_rows["estimated_incremental_conversions"] * blanket_rows["avg_order_value_proxy"] - discount_amount).sum()
        )
    else:
        blanket_contrib = 0.0
    blanket = {
        "name": "Blanket-Discount Policy (all eligible, budget-capped)",
        "n_selected": blanket_n,
        "actual_spend": blanket_n * discount_amount,
        "estimated_incremental_conversions": round(blanket_conv, 4),
        "estimated_incremental_contribution": round(blanket_contrib, 2),
        "description": f"Offer discounts to first {blanket_n} eligible customers (no ranking).",
    }

    # 3. Random targeting (same budget capacity)
    random_n = min(len(eligible_idx), max_capacity)
    if random_n > 0 and len(eligible_idx) > 0:
        rand_idx = rng.choice(eligible_idx, size=random_n, replace=False)
        rand_conv = float(df.iloc[rand_idx]["estimated_incremental_conversions"].sum())
        if "avg_order_value_proxy" in df.columns:
            rand_contrib = float(
                (df.iloc[rand_idx]["estimated_incremental_conversions"] *
                 df.iloc[rand_idx]["avg_order_value_proxy"] - discount_amount).sum()
            )
        else:
            rand_contrib = 0.0
    else:
        rand_conv, rand_contrib = 0.0, 0.0
    random_baseline = {
        "name": "Random Targeting (same budget)",
        "n_selected": random_n,
        "actual_spend": random_n * discount_amount,
        "estimated_incremental_conversions": round(rand_conv, 4),
        "estimated_incremental_contribution": round(rand_contrib, 2),
        "description": f"Randomly select {random_n} eligible customers (seed={random_seed}).",
    }

    # 4. Causal-effect targeting (this run)
    causal = {
        "name": "Causal DML Targeting (MILP Optimal)",
        "n_selected": n_selected,
        "actual_spend": actual_spend,
        "estimated_incremental_conversions": round(inc_conversions, 4),
        "estimated_incremental_contribution": round(obj_value, 2),
        "description": "MILP optimisation: select customers with highest net causal effect.",
    }

    baselines = [no_discount, random_baseline, blanket, causal]

    summary = {
        "total_budget": budget,
        "discount_amount_per_offer": discount_amount,
        "n_total_customers": len(df),
        "n_eligible_customers": n_eligible,
        "n_selected_customers": n_selected,
        "actual_spend": actual_spend,
        "remaining_budget": remaining,
        "budget_utilisation_pct": round(actual_spend / budget * 100, 2) if budget > 0 else 0,
        "avg_recommended_discount": discount_amount if n_selected > 0 else 0.0,
        "estimated_incremental_conversions": round(inc_conversions, 4),
        "estimated_incremental_contribution_inr": round(obj_value, 2),
        "objective_value": round(obj_value, 4),
        "feasible": feasible,
        "status": status,
        "status_message": status_message,
        "assumptions": {
            "treatment_contrast": "Binary: discount offered vs no discount (Week 2 DML)",
            "contribution_margin_proxy": "avg_order_value from cleaned_retail_campaign.csv",
            "objective": "Maximise sum of (ITE_i x avg_order_value_i - discount_amount) for selected customers",
            "budget_constraint": f"Total spend <= Rs.{budget:,.0f}",
            "eligibility_rule": f"ITE_i > {MIN_ITE_THRESHOLD} AND net_value_i > 0",
            "solver": "scipy.optimize.milp (binary integer programming)",
            "note": "Estimated values are model-based predictions, NOT observed revenue.",
        },
    }

    return {
        "allocation_df": df,
        "summary": summary,
        "baselines": baselines,
        "feasible": feasible,
        "status_message": status_message,
    }


# ── CLI / standalone execution ─────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse, json

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s  %(levelname)-8s  %(message)s")

    parser = argparse.ArgumentParser(description="EconoCausal Week 3 Budget Optimiser")
    parser.add_argument("--budget",          type=float, default=DEFAULT_BUDGET_INR)
    parser.add_argument("--discount",        type=float, default=DEFAULT_DISCOUNT_AMOUNT_INR)
    parser.add_argument("--min-ite",         type=float, default=MIN_ITE_THRESHOLD)
    parser.add_argument("--output",          type=str,   default=str(ALLOCATION_OUTPUT_PATH))
    parser.add_argument("--seed",            type=int,   default=42)
    args = parser.parse_args()

    result = run_optimisation(
        budget=args.budget,
        discount_amount=args.discount,
        min_treatment_effect=args.min_ite,
        output_path=Path(args.output),
        random_seed=args.seed,
    )

    print("\n=== Week 3 Budget Optimisation Summary ===")
    s = result["summary"]
    for k, v in s.items():
        if k != "assumptions":
            print(f"  {k:<45}: {v}")
    print("\nAssumptions:")
    for k, v in s["assumptions"].items():
        print(f"  {k:<45}: {v}")

    print("\n=== Baseline Comparison ===")
    for b in result["baselines"]:
        print(f"  {b['name']}")
        print(f"    Selected: {b['n_selected']}  Spend: ₹{b['actual_spend']:,.0f}  "
              f"Inc.Conv: {b['estimated_incremental_conversions']:.3f}  "
              f"Inc.Contrib: ₹{b['estimated_incremental_contribution']:,.2f}")

    alloc = result["allocation_df"]
    print(f"\nAllocation CSV preview ({len(alloc)} rows):")
    print(alloc[alloc["selected_for_campaign"]].head(10).to_string(index=False))
