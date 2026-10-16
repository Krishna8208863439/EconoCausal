"""
generate_data.py
================
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Generates a reproducible synthetic retail marketing campaign dataset.

IMPORTANT
---------
All data produced by this script is ENTIRELY SYNTHETIC.  It does not
represent real customers, real organisations, or real business outcomes.
It is provided solely for pipeline validation and educational purposes.

Usage
-----
    python src/data/generate_data.py

Output
------
    data/raw/mock_retail_campaign.csv   (2 200 rows by default)

Design notes
------------
Treatment assignment is confounded — customers with more past purchases
and higher engagement are more likely to be offered a discount AND more
likely to purchase.  This intentional confounding means that a naive
difference in purchase rates between treated and untreated groups will
over-estimate the true discount effect, which is exactly the challenge
Double Machine Learning is designed to address in Week 2.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
DEFAULT_N: int = 2_200
DEFAULT_SEED: int = 42
RAW_DIR: Path = Path(__file__).resolve().parents[2] / "data" / "raw"
PROCESSED_DIR: Path = Path(__file__).resolve().parents[2] / "data" / "processed"
OUTPUT_FILE: str = "mock_retail_campaign.csv"
TRUE_EFFECTS_FILE: str = "true_price_effect.json"

# ── Causal Pricing Ground Truth (Day 1 Specification) ────────────────────────
# Continuous treatment: Price
# Outcome: Units Sold (sales / demand)
# In log(units_sold) ~ alpha + beta * log(price) + gamma * X:
# The true price elasticity of demand is -1.50 (elastic pricing)
TRUE_PRICE_ELASTICITY: float = -1.50
TRUE_PRICE_EFFECT: float = -1.50

# Fraction of rows that will have introduced data-quality issues
MISSING_FRACTION: float = 0.03   # ~3 % of rows get a missing value
DUPLICATE_FRACTION: float = 0.02  # ~2 % of rows are duplicated


# ── Helpers ───────────────────────────────────────────────────────────────────

def _age_group_from_age(ages: np.ndarray) -> list[str]:
    """Map integer ages to labelled bands."""
    bands = []
    for a in ages:
        if a < 25:
            bands.append("18-24")
        elif a < 35:
            bands.append("25-34")
        elif a < 45:
            bands.append("35-44")
        elif a < 55:
            bands.append("45-54")
        else:
            bands.append("55+")
    return bands


# ── Main generator ────────────────────────────────────────────────────────────

def generate_dataset(n: int = DEFAULT_N, seed: int = DEFAULT_SEED) -> pd.DataFrame:
    """
    Generate a synthetic retail campaign dataset with realistic confounding.

    Parameters
    ----------
    n : int
        Number of base customer records to generate.
    seed : int
        NumPy random seed for reproducibility.

    Returns
    -------
    pd.DataFrame
        Raw dataset including controlled missing values and duplicates.
    """
    rng = np.random.default_rng(seed)
    log.info("Generating synthetic dataset  n=%d  seed=%d", n, seed)

    # ── 1. Identifiers ────────────────────────────────────────────────────────
    customer_ids = [f"CUST_{i:05d}" for i in range(1, n + 1)]

    # ── 2. Pre-treatment customer characteristics (confounders) ───────────────
    ages = rng.integers(18, 66, size=n)
    age_groups = _age_group_from_age(ages)

    # past_purchases: right-skewed; higher-value customers purchase more often
    past_purchases = rng.negative_binomial(n=5, p=0.35, size=n).astype(int)
    past_purchases = np.clip(past_purchases, 0, 50)

    # avg_order_value: log-normal to reflect spending heterogeneity
    avg_order_value = np.round(
        rng.lognormal(mean=3.8, sigma=0.6, size=n), 2
    )  # roughly £20–£200

    # website_visits: Poisson; more engaged customers visit more
    website_visits = rng.poisson(lam=6, size=n).astype(int)

    # customer_segment: correlated with past_purchases
    segment_probs = np.array([0.20, 0.40, 0.25, 0.15])   # Premium / Regular / Occasional / Lapsed
    customer_segment = rng.choice(
        ["Premium", "Regular", "Occasional", "Lapsed"],
        size=n,
        p=segment_probs,
    )

    # ── 3. Treatment assignment (confounded, not randomised) ──────────────────
    # Propensity is a function of pre-treatment confounders:
    #   high past_purchases, high website_visits, Premium/Regular segment
    #   → higher probability of being offered a discount.
    segment_boost = np.where(
        np.isin(customer_segment, ["Premium", "Regular"]), 0.15, -0.10
    )
    propensity_logit = (
        -0.5
        + 0.04 * past_purchases
        + 0.06 * website_visits
        + 0.003 * avg_order_value
        + segment_boost
    )
    propensity = 1 / (1 + np.exp(-propensity_logit))
    discount_offered = rng.binomial(1, propensity, size=n).astype(int)

    # discount_amount: £5–£20 for treated, £0 for control
    discount_amount = np.where(
        discount_offered == 1,
        np.round(rng.uniform(5, 20, size=n), 2),
        0.0,
    )

    # ── 4. Outcome generation ─────────────────────────────────────────────────
    # True average treatment effect (ATE) on purchase probability: +0.08
    # Outcome also driven by pre-treatment features (confounding).
    outcome_logit = (
        -1.2
        + 0.05 * past_purchases
        + 0.04 * website_visits
        + 0.002 * avg_order_value
        + np.where(np.isin(customer_segment, ["Premium"]), 0.30, 0.0)
        + np.where(np.isin(customer_segment, ["Lapsed"]), -0.40, 0.0)
        + 0.5 * discount_offered          # true causal effect of discount
    )
    purchase_prob = 1 / (1 + np.exp(-outcome_logit))
    purchased = rng.binomial(1, purchase_prob, size=n).astype(int)

    # ── 5. Post-treatment outcome: revenue ────────────────────────────────────
    # Revenue is only observed when purchased == 1; it is a post-treatment
    # variable and must NOT be used as a confounder.
    base_revenue = avg_order_value * rng.uniform(0.8, 1.5, size=n)
    revenue = np.where(purchased == 1, np.round(base_revenue, 2), 0.0)

    # ── 6. Campaign date ──────────────────────────────────────────────────────
    # Spread across a single 90-day campaign window
    base_date = np.datetime64("2024-01-15")
    day_offsets = rng.integers(0, 90, size=n)
    campaign_dates = [
        str((base_date + np.timedelta64(int(d), "D")).astype("datetime64[D]"))
        for d in day_offsets
    ]

    # ── 6b. Continuous pricing engine data (Day 1 Specification) ─────────────
    # Sub-stream RNG initialized deterministically with seed + 1000
    rng_price = np.random.default_rng(seed + 1000)

    # Cost price (£20 - £75): wholesale cost per unit
    cost_price = np.round(rng_price.uniform(20.0, 75.0, size=n), 2)

    # Competitor price (£25 - £110): market reference price correlated with cost
    competitor_markup = rng_price.uniform(1.15, 1.60, size=n)
    competitor_price = np.round(cost_price * competitor_markup + rng_price.normal(0, 1.5, size=n), 2)
    competitor_price = np.maximum(competitor_price, np.round(cost_price * 1.05, 2))

    # Ad spend (£10 - £150): marketing spend for product/campaign
    ad_spend = np.round(rng_price.gamma(shape=3.5, scale=12.0, size=n), 2)

    # Inventory level (40 - 500 units): available stock
    inventory = rng_price.integers(40, 500, size=n).astype(int)

    # Price (continuous treatment): determined by cost, competitor price, inventory, ad spend
    # Higher inventory induces promotional discounts; higher costs/competitor prices raise price
    log_price = (
        0.55 * np.log(cost_price)
        + 0.35 * np.log(competitor_price)
        + 0.04 * np.log(ad_spend + 1.0)
        - 0.05 * np.log(inventory)
        + 0.15
        + rng_price.normal(0, 0.05, size=n)
    )
    price = np.round(np.exp(log_price), 2)

    # Units sold (outcome): log-log demand curve with true price elasticity = -1.50
    # Confounders: competitor_price (+0.55 cross-price elasticity), ad_spend (+0.20), past_purchases (+0.12), inventory (+0.08)
    log_units = (
        6.20
        + TRUE_PRICE_ELASTICITY * np.log(price)
        + 0.55 * np.log(competitor_price)
        + 0.20 * np.log(ad_spend + 1.0)
        + 0.12 * np.log(past_purchases + 1.0)
        + 0.08 * np.log(inventory)
        + np.where(customer_segment == "Premium", 0.15, 0.0)
        + np.where(customer_segment == "Lapsed", -0.20, 0.0)
        + rng_price.normal(0, 0.08, size=n)
    )
    units_sold = np.maximum(1, np.round(np.exp(log_units))).astype(int)
    date_col = list(campaign_dates)

    # ── 7. Assemble DataFrame ─────────────────────────────────────────────────
    df = pd.DataFrame(
        {
            "customer_id": customer_ids,
            "date": date_col,
            "campaign_date": campaign_dates,
            "price": price,
            "units_sold": units_sold,
            "cost_price": cost_price,
            "competitor_price": competitor_price,
            "ad_spend": ad_spend,
            "inventory": inventory,
            "age_group": age_groups,
            "past_purchases": past_purchases,
            "avg_order_value": avg_order_value,
            "website_visits": website_visits,
            "customer_segment": customer_segment,
            "discount_offered": discount_offered,
            "discount_amount": discount_amount,
            "purchased": purchased,
            "revenue": revenue,
        }
    )

    # ── 8. Introduce controlled data-quality issues ───────────────────────────
    # Missing values — randomly blank a small fraction of numeric fields
    n_missing = max(1, int(MISSING_FRACTION * n))
    for col in ["past_purchases", "avg_order_value", "website_visits"]:
        missing_idx = rng.choice(n, size=n_missing, replace=False)
        df.loc[missing_idx, col] = np.nan

    # Duplicates — repeat a small fraction of rows
    n_dupes = max(1, int(DUPLICATE_FRACTION * n))
    dupe_idx = rng.choice(n, size=n_dupes, replace=False)
    dupe_rows = df.iloc[dupe_idx].copy()
    df = pd.concat([df, dupe_rows], ignore_index=True)

    log.info(
        "Dataset assembled: %d rows (%d base + %d duplicates), %d columns",
        len(df),
        n,
        n_dupes,
        df.shape[1],
    )
    return df


def save_true_price_effect(output_dir: Path = RAW_DIR) -> Path:
    """Save the true price effect ground truth metadata to JSON."""
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / TRUE_EFFECTS_FILE
    data = {
        "true_price_elasticity": TRUE_PRICE_ELASTICITY,
        "true_price_effect": TRUE_PRICE_EFFECT,
        "functional_form": "log(units_sold) ~ alpha + beta * log(price) + confounders",
        "treatment": "price",
        "outcome": "units_sold",
        "confounders": [
            "cost_price",
            "competitor_price",
            "ad_spend",
            "inventory",
            "past_purchases",
            "website_visits",
            "customer_segment",
            "age_group",
        ],
        "seed": DEFAULT_SEED,
        "timestamp": "2026-10-15T00:00:00+00:00",
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    log.info("Saved true price effect ground truth → %s", out_path)
    return out_path


def save_dataset(df: pd.DataFrame, output_dir: Path = RAW_DIR) -> Path:
    """Save the dataset to CSV and return the output path."""
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / OUTPUT_FILE
    df.to_csv(out_path, index=False)
    log.info("Saved raw dataset → %s", out_path)
    save_true_price_effect(output_dir)
    save_true_price_effect(PROCESSED_DIR)
    return out_path


# ── CLI entry-point ───────────────────────────────────────────────────────────

def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic EconoCausal retail campaign dataset."
    )
    parser.add_argument(
        "--n", type=int, default=DEFAULT_N,
        help=f"Number of base records (default: {DEFAULT_N}).",
    )
    parser.add_argument(
        "--seed", type=int, default=DEFAULT_SEED,
        help=f"Random seed (default: {DEFAULT_SEED}).",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=RAW_DIR,
        help="Directory to write the CSV file.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)
    df = generate_dataset(n=args.n, seed=args.seed)
    path = save_dataset(df, output_dir=args.output_dir)
    log.info("Done.  Rows: %d  Columns: %d  Path: %s", len(df), df.shape[1], path)


if __name__ == "__main__":
    main()
