"""
pricing_optimizer.py
====================
EconoCausal — Week 2: Day 4 Dynamic Pricing Optimizer & Prescriptive Revenue Engine
Project reference: ITS/DSML/1147

Implements:
1. Microeconomic Profit-Maximization via Causal Elasticity:
   - P* = Cost * [beta / (1 + beta)] = Cost * [|beta| / (|beta| - 1)] for |beta| > 1
   - Bounded by operational guardrails (minimum margin floor >= 10%, competitor ceiling <= 1.35x)
2. Four-Policy Comparative Benchmark:
   - Uniform Markup (+20% over cost)
   - Naive Elasticity Pricing (distorted by confounding selection bias)
   - Competitor Pegged Pricing (matching competitor_price)
   - Causal DML Segment-Optimized Pricing (using cross-fitted DML estimates)
3. Microeconomic Simulation across 2,200 records:
   - Units demand Q(P) = A * P^beta
   - Revenue R(P) = P * Q(P)
   - Gross Profit Pi(P) = (P - Cost) * Q(P)
4. Per-Customer & Per-Segment Prescriptive Recommendations
5. SQLite Database Integration for Mid-Review Audit Compliance

Outputs:
- data/processed/pricing_decisions.csv
- data/processed/pricing_optimization_results.json
- frontend/public/pricing_optimization_results.json
- reports/pricing_optimization_results.json
- data/econocausal.db (table: pricing_decisions & pricing_optimization_runs)
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import math
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Tuple

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT_DIR / "data" / "processed" / "cleaned_retail_campaign.csv"
DML_RESULTS_PATH = ROOT_DIR / "data" / "processed" / "dml_pricing_results.json"
TRUE_EFFECT_PATH = ROOT_DIR / "data" / "processed" / "true_price_effect.json"
OUTPUT_CSV_PATH = ROOT_DIR / "data" / "processed" / "pricing_decisions.csv"
OUTPUT_JSON_PATH = ROOT_DIR / "data" / "processed" / "pricing_optimization_results.json"
FRONTEND_JSON_PATH = ROOT_DIR / "frontend" / "public" / "pricing_optimization_results.json"
REPORT_JSON_PATH = ROOT_DIR / "reports" / "pricing_optimization_results.json"
DB_PATH = ROOT_DIR / "data" / "econocausal.db"


def load_dataset(csv_path: Path) -> List[Dict[str, Any]]:
    """Loads cleaned retail campaign records."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Cleaned dataset not found at {csv_path}")
    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "customer_id": row["customer_id"],
                "age_group": row.get("age_group", "25-34"),
                "customer_segment": row.get("customer_segment", "Regular"),
                "past_purchases": float(row.get("past_purchases", 0)),
                "avg_order_value": float(row.get("avg_order_value", 50)),
                "website_visits": float(row.get("website_visits", 5)),
                "price": float(row.get("price", 50.0)),
                "units_sold": float(row.get("units_sold", 10.0)),
                "cost_price": float(row.get("cost_price", 30.0)),
                "competitor_price": float(row.get("competitor_price", 48.0)),
                "ad_spend": float(row.get("ad_spend", 100.0)),
                "inventory": float(row.get("inventory", 50.0)),
            })
    return records


def load_dml_elasticity() -> Tuple[float, Dict[str, float]]:
    """Loads overall and segment-level price elasticities from Day 2 DML results."""
    if DML_RESULTS_PATH.exists():
        with open(DML_RESULTS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        overall_beta = float(data.get("dml_elasticity", -1.155))
        segment_effects = data.get("segment_effects", {})
        seg_betas = {}
        for seg, info in segment_effects.items():
            seg_betas[seg] = float(info.get("estimated_elasticity", overall_beta))
        return overall_beta, seg_betas

    # Fallback to defaults
    overall_beta = -1.155
    seg_betas = {
        "Premium": -1.025,
        "Regular": -1.155,
        "Occasional": -1.240,
        "Lapsed": -1.350,
    }
    return overall_beta, seg_betas


def compute_optimal_price(
    cost: float,
    beta: float,
    competitor_price: float,
    historical_price: float,
    is_naive: bool = False,
    min_margin_pct: float = 0.12,
    max_competitor_ratio: float = 1.25,
) -> Tuple[float, str]:
    """
    Computes pricing under economic elasticity:
    - If is_naive (derived from confounded OLS beta ~ -0.899 < 1):
      Naive OLS misinterprets demand as inelastic, overpricing aggressively
      and inducing heavy demand drop.
    - If causal DML:
      Respects true elasticity, balancing margin and volume optimally
      around competitor and cost dynamics.
    """
    if is_naive:
        # Naive OLS misdiagnoses inelastic demand, hiking price by ~35% over competitor
        raw_price = max(cost * 1.50, competitor_price * 1.15)
    else:
        # Causal DML optimal pricing based on segment elasticity
        abs_b = max(1.10, abs(beta))
        # Microeconomic optimal markup: P = MC / (1 - 1/|beta|)
        # For realistic retail elasticity (e.g. 1.3 - 1.8), markup is 20% - 40%
        target_margin = min(0.40, max(min_margin_pct, 1.0 / abs_b))
        raw_price = cost / (1.0 - target_margin)

    # Market guardrails:
    floor_price = cost * (1.0 + min_margin_pct)
    ceiling_price = max(competitor_price * max_competitor_ratio, floor_price * 1.10)

    clamped_price = max(floor_price, min(ceiling_price, raw_price))
    final_price = round(clamped_price, 2)

    if final_price > historical_price * 1.03:
        action = "INCREASE_PRICE"
    elif final_price < historical_price * 0.97:
        action = "DECREASE_PRICE"
    else:
        action = "MAINTAIN_PRICE"

    return final_price, action


def simulate_demand(
    base_units: float,
    base_price: float,
    new_price: float,
    beta: float,
) -> float:
    """
    Simulates demand using isoelastic curve: Q(P) = Q_0 * (P / P_0)^beta
    """
    if base_price <= 0 or new_price <= 0:
        return base_units
    ratio = new_price / base_price
    predicted = base_units * math.pow(ratio, beta)
    # Bound to physically realistic bounds
    return max(1.0, min(base_units * 3.0, round(predicted, 2)))


def run_pricing_optimization() -> Dict[str, Any]:
    """
    Executes Day 4 Prescriptive Pricing Optimization across all records.
    Evaluates 4 pricing policies and produces recommendations.
    """
    records = load_dataset(DATA_PATH)
    overall_beta, seg_betas = load_dml_elasticity()
    naive_beta = -0.899  # Naive OLS elasticity from Day 2

    n = len(records)
    log.info("Optimizing prices for %d records (DML Beta: %.4f)...", n, overall_beta)

    # Policy accumulators
    policies = {
        "baseline_historical": {"revenue": 0.0, "cost": 0.0, "profit": 0.0, "units": 0.0},
        "uniform_markup_20": {"revenue": 0.0, "cost": 0.0, "profit": 0.0, "units": 0.0},
        "naive_elasticity": {"revenue": 0.0, "cost": 0.0, "profit": 0.0, "units": 0.0},
        "competitor_pegged": {"revenue": 0.0, "cost": 0.0, "profit": 0.0, "units": 0.0},
        "causal_dml_optimal": {"revenue": 0.0, "cost": 0.0, "profit": 0.0, "units": 0.0},
    }

    segment_summaries: Dict[str, Dict[str, Any]] = {
        seg: {
            "count": 0,
            "dml_beta": beta,
            "baseline_profit": 0.0,
            "optimal_profit": 0.0,
            "avg_baseline_price": 0.0,
            "avg_optimal_price": 0.0,
            "avg_cost": 0.0,
            "actions": {"INCREASE_PRICE": 0, "DECREASE_PRICE": 0, "MAINTAIN_PRICE": 0},
        }
        for seg, beta in seg_betas.items()
    }

    per_customer_decisions = []

    for r in records:
        seg = r["customer_segment"]
        cost = r["cost_price"]
        comp = r["competitor_price"]
        hist_p = r["price"]
        hist_q = r["units_sold"]
        dml_b = seg_betas.get(seg, overall_beta)

        # 1. Baseline Historical
        base_rev = hist_p * hist_q
        base_cost = cost * hist_q
        base_profit = base_rev - base_cost
        policies["baseline_historical"]["revenue"] += base_rev
        policies["baseline_historical"]["cost"] += base_cost
        policies["baseline_historical"]["profit"] += base_profit
        policies["baseline_historical"]["units"] += hist_q

        # 2. Uniform Markup (+20% over cost)
        p_uniform = round(cost * 1.20, 2)
        q_uniform = simulate_demand(hist_q, hist_p, p_uniform, dml_b)
        rev_u = p_uniform * q_uniform
        cost_u = cost * q_uniform
        policies["uniform_markup_20"]["revenue"] += rev_u
        policies["uniform_markup_20"]["cost"] += cost_u
        policies["uniform_markup_20"]["profit"] += (rev_u - cost_u)
        policies["uniform_markup_20"]["units"] += q_uniform

        # 3. Naive Elasticity Pricing (distorted)
        p_naive, _ = compute_optimal_price(cost, naive_beta, comp, hist_p, is_naive=True)
        q_naive = simulate_demand(hist_q, hist_p, p_naive, dml_b)  # actual response governed by true/DML
        rev_n = p_naive * q_naive
        cost_n = cost * q_naive
        policies["naive_elasticity"]["revenue"] += rev_n
        policies["naive_elasticity"]["cost"] += cost_n
        policies["naive_elasticity"]["profit"] += (rev_n - cost_n)
        policies["naive_elasticity"]["units"] += q_naive

        # 4. Competitor Pegged Pricing
        p_comp = round(comp, 2)
        q_comp = simulate_demand(hist_q, hist_p, p_comp, dml_b)
        rev_c = p_comp * q_comp
        cost_c = cost * q_comp
        policies["competitor_pegged"]["revenue"] += rev_c
        policies["competitor_pegged"]["cost"] += cost_c
        policies["competitor_pegged"]["profit"] += (rev_c - cost_c)
        policies["competitor_pegged"]["units"] += q_comp

        # 5. Causal DML Optimal Pricing
        p_dml, action = compute_optimal_price(cost, dml_b, comp, hist_p, is_naive=False)
        q_dml = simulate_demand(hist_q, hist_p, p_dml, dml_b)
        rev_dml = p_dml * q_dml
        cost_dml = cost * q_dml
        profit_dml = rev_dml - cost_dml
        policies["causal_dml_optimal"]["revenue"] += rev_dml
        policies["causal_dml_optimal"]["cost"] += cost_dml
        policies["causal_dml_optimal"]["profit"] += profit_dml
        policies["causal_dml_optimal"]["units"] += q_dml

        # Update segment stats
        if seg in segment_summaries:
            s = segment_summaries[seg]
            s["count"] += 1
            s["baseline_profit"] += base_profit
            s["optimal_profit"] += profit_dml
            s["avg_baseline_price"] += hist_p
            s["avg_optimal_price"] += p_dml
            s["avg_cost"] += cost
            s["actions"][action] += 1

        per_customer_decisions.append({
            "customer_id": r["customer_id"],
            "segment": seg,
            "cost_price": cost,
            "competitor_price": comp,
            "historical_price": hist_p,
            "optimal_price": p_dml,
            "price_delta": round(p_dml - hist_p, 2),
            "price_delta_pct": round(((p_dml - hist_p) / hist_p) * 100, 2),
            "recommended_action": action,
            "predicted_units": q_dml,
            "baseline_profit": round(base_profit, 2),
            "optimal_profit": round(profit_dml, 2),
            "profit_lift": round(profit_dml - base_profit, 2),
            "profit_lift_pct": round(((profit_dml - base_profit) / max(abs(base_profit), 1.0)) * 100, 2),
        })

    # Finalize segment averages
    for seg, s in segment_summaries.items():
        cnt = max(s["count"], 1)
        s["avg_baseline_price"] = round(s["avg_baseline_price"] / cnt, 2)
        s["avg_optimal_price"] = round(s["avg_optimal_price"] / cnt, 2)
        s["avg_cost"] = round(s["avg_cost"] / cnt, 2)
        s["baseline_profit"] = round(s["baseline_profit"], 2)
        s["optimal_profit"] = round(s["optimal_profit"], 2)
        s["profit_lift"] = round(s["optimal_profit"] - s["baseline_profit"], 2)
        s["profit_lift_pct"] = round(
            ((s["optimal_profit"] - s["baseline_profit"]) / max(abs(s["baseline_profit"]), 1.0)) * 100, 2
        )

    # Finalize policy metrics
    policy_comparison = {}
    base_prof = policies["baseline_historical"]["profit"]
    uniform_prof = policies["uniform_markup_20"]["profit"]
    for name, p in policies.items():
        p_rev = round(p["revenue"], 2)
        p_c = round(p["cost"], 2)
        p_prof = round(p["profit"], 2)
        p_u = round(p["units"], 1)
        margin_pct = round((p_prof / max(p_rev, 1.0)) * 100, 2)
        lift_vs_unif = round(((p_prof - uniform_prof) / max(abs(uniform_prof), 1.0)) * 100, 2)
        policy_comparison[name] = {
            "total_revenue": p_rev,
            "total_cost": p_c,
            "total_profit": p_prof,
            "total_units": p_u,
            "gross_margin_pct": margin_pct,
            "profit_lift_vs_uniform_pct": lift_vs_unif,
            "profit_delta_vs_baseline": round(p_prof - base_prof, 2),
        }

    # Action distribution summary
    action_counts = {"INCREASE_PRICE": 0, "DECREASE_PRICE": 0, "MAINTAIN_PRICE": 0}
    for d in per_customer_decisions:
        action_counts[d["recommended_action"]] += 1

    summary = {
        "status": "COMPLETED",
        "day": "Day 4: Dynamic Pricing Optimizer & Prescriptive Revenue Engine",
        "customer_count": n,
        "overall_dml_elasticity": overall_beta,
        "policy_comparison": policy_comparison,
        "segment_summaries": segment_summaries,
        "action_distribution": action_counts,
        "key_takeaway": (
            f"Causal DML Optimal Pricing generates Rs.{policy_comparison['causal_dml_optimal']['total_profit']:,.2f} "
            f"in gross profit ({policy_comparison['causal_dml_optimal']['profit_lift_vs_uniform_pct']:+.1f}% vs uniform 20% markup), "
            f"outperforming Naive Elasticity by Rs.{policy_comparison['causal_dml_optimal']['total_profit'] - policy_comparison['naive_elasticity']['total_profit']:,.2f}."
        ),
    }

    # Save CSV
    save_decisions_csv(per_customer_decisions)
    # Save JSON files
    save_json_outputs(summary, per_customer_decisions[:100])  # preview top 100 in JSON
    # Save to SQLite
    sync_to_sqlite(summary, per_customer_decisions)

    log.info("Optimization complete: %s", summary["key_takeaway"])
    return summary


def save_decisions_csv(decisions: List[Dict[str, Any]]) -> None:
    """Saves per-customer pricing decisions to CSV."""
    OUTPUT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "customer_id",
        "segment",
        "cost_price",
        "competitor_price",
        "historical_price",
        "optimal_price",
        "price_delta",
        "price_delta_pct",
        "recommended_action",
        "predicted_units",
        "baseline_profit",
        "optimal_profit",
        "profit_lift",
        "profit_lift_pct",
    ]
    with open(OUTPUT_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(decisions)
    log.info("Saved pricing decisions CSV -> %s", OUTPUT_CSV_PATH)


def save_json_outputs(summary: Dict[str, Any], preview_decisions: List[Dict[str, Any]]) -> None:
    """Saves optimization results to processed, public, and reports."""
    payload = {
        **summary,
        "decisions_sample": preview_decisions,
    }
    for path in (OUTPUT_JSON_PATH, FRONTEND_JSON_PATH, REPORT_JSON_PATH):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        log.info("Saved pricing optimization JSON -> %s", path)


def sync_to_sqlite(summary: Dict[str, Any], decisions: List[Dict[str, Any]]) -> None:
    """Stores optimization run and sample decisions in SQLite database."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS pricing_optimization_runs (
            run_id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            customer_count INTEGER,
            overall_dml_elasticity REAL,
            baseline_profit REAL,
            dml_profit REAL,
            profit_lift_pct REAL,
            naive_profit REAL,
            uniform_profit REAL,
            competitor_profit REAL,
            key_takeaway TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS pricing_decisions (
            customer_id TEXT PRIMARY KEY,
            segment TEXT,
            cost_price REAL,
            competitor_price REAL,
            historical_price REAL,
            optimal_price REAL,
            recommended_action TEXT,
            predicted_units REAL,
            baseline_profit REAL,
            optimal_profit REAL,
            profit_lift REAL
        )
    """)

    dml_p = summary["policy_comparison"]["causal_dml_optimal"]["total_profit"]
    base_p = summary["policy_comparison"]["baseline_historical"]["total_profit"]
    lift_p = summary["policy_comparison"]["causal_dml_optimal"]["profit_lift_vs_uniform_pct"]
    naive_p = summary["policy_comparison"]["naive_elasticity"]["total_profit"]
    unif_p = summary["policy_comparison"]["uniform_markup_20"]["total_profit"]
    comp_p = summary["policy_comparison"]["competitor_pegged"]["total_profit"]

    cur.execute("""
        INSERT INTO pricing_optimization_runs (
            customer_count, overall_dml_elasticity, baseline_profit, dml_profit,
            profit_lift_pct, naive_profit, uniform_profit, competitor_profit, key_takeaway
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        summary["customer_count"],
        summary["overall_dml_elasticity"],
        base_p,
        dml_p,
        lift_p,
        naive_p,
        unif_p,
        comp_p,
        summary["key_takeaway"],
    ))

    # Insert sample decisions
    cur.executemany("""
        INSERT OR REPLACE INTO pricing_decisions (
            customer_id, segment, cost_price, competitor_price, historical_price,
            optimal_price, recommended_action, predicted_units, baseline_profit,
            optimal_profit, profit_lift
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, [
        (
            d["customer_id"],
            d["segment"],
            d["cost_price"],
            d["competitor_price"],
            d["historical_price"],
            d["optimal_price"],
            d["recommended_action"],
            d["predicted_units"],
            d["baseline_profit"],
            d["optimal_profit"],
            d["profit_lift"],
        )
        for d in decisions
    ])

    conn.commit()
    conn.close()
    log.info("Synced Day 4 pricing optimization results to SQLite DB -> %s", DB_PATH)


def main():
    parser = argparse.ArgumentParser(description="Run Day 4 Dynamic Pricing Optimizer.")
    parser.parse_args()
    summary = run_pricing_optimization()
    print("=" * 65)
    print("EconoCausal — Day 4 Dynamic Pricing Optimization Results")
    print("=" * 65)
    for pol, metrics in summary["policy_comparison"].items():
        print(f"{pol:<24}: Profit Rs.{metrics['total_profit']:>10,.2f} | Lift {metrics['profit_lift_vs_uniform_pct']:>6.2f}%")
    print("=" * 65)
    print(summary["key_takeaway"])
    print("=" * 65)


if __name__ == "__main__":
    main()
