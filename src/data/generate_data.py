"""
generate_data.py
================
EconoCausal — Week 1 & 2
Project reference: ITS/DSML/1147

Generates a reproducible synthetic retail marketing campaign dataset with
pricing-domain variables for Double Machine Learning (DML) estimation.

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

Week 2 additions
----------------
The dataset now includes pricing-domain columns required for continuous-
treatment DML estimation (price elasticity):
    - price:            Retail price (continuous treatment)
    - units_sold:       Sales volume outcome (driven by TRUE_PRICE_ELASTICITY)
    - cost_price:       Cost of goods (confounder — affects price-setting)
    - competitor_price: Competitor's price (confounder — affects firm pricing)
    - ad_spend:         Advertising expenditure (confounder — drives demand)
    - inventory:        Available stock (confounder — affects pricing decisions)

The constant TRUE_PRICE_ELASTICITY is stored so that DML can verify
whether it recovers the planted causal effect.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
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
OUTPUT_FILE: str = "mock_retail_campaign.csv"

# Fraction of rows that will have introduced data-quality issues
MISSING_FRACTION: float = 0.03   # ~3 % of rows get a missing value
DUPLICATE_FRACTION: float = 0.02  # ~2 % of rows are duplicated

# ── Ground truth for DML verification ─────────────────────────────────────────
# TRUE_PRICE_ELASTICITY is the planted causal coefficient: when we regress
# log(units_sold) on log(price) controlling for confounders, DML should
# recover a value close to this.  A value of −0.4 means a 1 % price
# increase causes a 0.4 % decrease in units sold.
TRUE_PRICE_ELASTICITY: float = -0.4


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
        Contains both the original binary-treatment columns (discount_offered,
        purchased) and the new pricing-domain columns (price, units_sold,
        cost_price, competitor_price, ad_spend, inventory).
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

    # ── 4. Outcome generation (binary) ────────────────────────────────────────
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

    # ══════════════════════════════════════════════════════════════════════════
    # ── 7. WEEK 2: Pricing-domain columns for continuous-treatment DML ────────
    # ══════════════════════════════════════════════════════════════════════════
    #
    # The project image (assigned brief) treats price as the continuous
    # treatment and units_sold as the outcome.  We generate these with a
    # known causal structure so DML can be evaluated:
    #
    #   Confounders → price  (treatment)
    #   Confounders → units_sold  (outcome)
    #   price → units_sold  (causal, elasticity = TRUE_PRICE_ELASTICITY)

    # -- 7a. Additional confounders that influence both price & demand --------

    # cost_price: wholesale / COGS — drives retailer's price floor
    #   log-normal centred around £15–£80
    cost_price = np.round(rng.lognormal(mean=3.4, sigma=0.5, size=n), 2)

    # competitor_price: market benchmark — correlated with cost structure
    competitor_price = np.round(
        cost_price * rng.uniform(1.05, 1.60, size=n), 2
    )

    # ad_spend: advertising £ per customer — drives demand independently
    ad_spend = np.round(rng.exponential(scale=8.0, size=n), 2)

    # inventory: units in stock — low inventory may push price up
    inventory = rng.poisson(lam=120, size=n).astype(int)

    # -- 7b. Price (continuous treatment) — confounded, not exogenous ---------
    # Price is set as a markup on cost, influenced by competition, inventory,
    # and segment.  This confounding means naive OLS of sales on price is
    # biased — exactly the problem DML solves.
    log_base_price = (
        np.log(cost_price)
        + 0.30                                               # base markup
        + 0.15 * (competitor_price / cost_price - 1.3)       # competitive pressure
        - 0.002 * (inventory - 120)                          # low stock → higher price
        + np.where(np.isin(customer_segment, ["Premium"]), 0.10, 0.0)
        + rng.normal(0, 0.08, size=n)                        # idiosyncratic noise
    )
    price = np.round(np.exp(log_base_price), 2)
    # Enforce price ≥ cost_price (retailer doesn't sell below cost)
    price = np.maximum(price, cost_price + 0.01)

    # -- 7c. Units sold (continuous outcome) — driven by price + confounders --
    # DGP:  log(units) = α + β·log(price) + γ·X + ε
    #   where β = TRUE_PRICE_ELASTICITY = −0.4
    log_units = (
        5.5                                                  # intercept
        + TRUE_PRICE_ELASTICITY * np.log(price)              # ← causal effect
        + 0.03 * ad_spend                                    # ad spend boosts demand
        + 0.005 * past_purchases                             # loyal customers buy more
        + 0.002 * website_visits                             # engagement effect
        - 0.10 * np.log(competitor_price / price + 0.01)     # relative price effect
        + np.where(np.isin(customer_segment, ["Premium"]), 0.15, 0.0)
        + np.where(np.isin(customer_segment, ["Lapsed"]), -0.20, 0.0)
        + rng.normal(0, 0.25, size=n)                        # demand shock
    )
    units_sold = np.clip(np.round(np.exp(log_units)).astype(int), 0, None)

    log.info(
        "Pricing DGP planted: TRUE_PRICE_ELASTICITY = %.2f  "
        "(mean price = £%.2f, mean units = %.1f)",
        TRUE_PRICE_ELASTICITY, price.mean(), units_sold.mean(),
    )

    # ── 8. Assemble DataFrame ─────────────────────────────────────────────────
    df = pd.DataFrame(
        {
            "customer_id": customer_ids,
            "age_group": age_groups,
            "past_purchases": past_purchases,
            "avg_order_value": avg_order_value,
            "website_visits": website_visits,
            "customer_segment": customer_segment,
            # Binary treatment / outcome (Week 1)
            "discount_offered": discount_offered,
            "discount_amount": discount_amount,
            "purchased": purchased,
            "revenue": revenue,
            # Pricing-domain columns (Week 2)
            "price": price,
            "units_sold": units_sold,
            "cost_price": cost_price,
            "competitor_price": competitor_price,
            "ad_spend": ad_spend,
            "inventory": inventory,
            # Admin
            "campaign_date": campaign_dates,
        }
    )

    # ── 9. Introduce controlled data-quality issues ───────────────────────────
    # Missing values — randomly blank a small fraction of numeric fields
    n_missing = max(1, int(MISSING_FRACTION * n))
    for col in ["past_purchases", "avg_order_value", "website_visits",
                "ad_spend", "inventory"]:
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


def save_dataset(df: pd.DataFrame, output_dir: Path = RAW_DIR) -> Path:
    """Save the dataset to CSV and return the output path."""
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / OUTPUT_FILE
    df.to_csv(out_path, index=False)
    log.info("Saved raw dataset → %s", out_path)
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
