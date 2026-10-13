"""
preprocess.py
=============
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Cleaning and validation pipeline for the synthetic retail campaign dataset.

Steps
-----
1.  Load raw CSV.
2.  Validate required columns and data types.
3.  Remove exact duplicate rows.
4.  Handle missing values (median imputation for numeric, mode for categorical).
5.  Enforce binary range for treatment and outcome columns.
6.  Flag and report outliers (IQR method) — rows are retained but flagged.
7.  Tag column roles (identifier / confounder / treatment / outcome / admin).
8.  Save cleaned CSV.

Usage
-----
    python src/data/preprocess.py

Output
------
    data/processed/cleaned_retail_campaign.csv
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]
RAW_PATH: Path = _ROOT / "data" / "raw" / "mock_retail_campaign.csv"
PROCESSED_DIR: Path = _ROOT / "data" / "processed"
OUTPUT_FILE: str = "cleaned_retail_campaign.csv"

# ── Schema definition ─────────────────────────────────────────────────────────
#   Each entry: column_name → (pandas dtype category, role, nullable)
COLUMN_SCHEMA: dict[str, tuple[str, str, bool]] = {
    "customer_id":       ("object",   "identifier",  False),
    "age_group":         ("category", "confounder",  False),
    "past_purchases":    ("float64",  "confounder",  True),   # nullable before imputation
    "avg_order_value":   ("float64",  "confounder",  True),
    "website_visits":    ("float64",  "confounder",  True),
    "customer_segment":  ("category", "confounder",  False),
    "discount_offered":  ("int64",    "treatment",   False),
    "discount_amount":   ("float64",  "treatment",   False),
    "purchased":         ("int64",    "outcome",     False),
    "revenue":           ("float64",  "post_treatment", False),
    "campaign_date":     ("object",   "admin",       False),
}

REQUIRED_COLUMNS: list[str] = list(COLUMN_SCHEMA.keys())

VALID_AGE_GROUPS: set[str] = {"18-24", "25-34", "35-44", "45-54", "55+"}
VALID_SEGMENTS: set[str] = {"Premium", "Regular", "Occasional", "Lapsed"}
BINARY_COLUMNS: list[str] = ["discount_offered", "purchased"]

# Columns to include in the outlier inspection (numeric confounders only)
OUTLIER_COLUMNS: list[str] = ["past_purchases", "avg_order_value", "website_visits"]


# ── Validation ────────────────────────────────────────────────────────────────

def validate_columns(df: pd.DataFrame) -> None:
    """Raise ValueError if any required column is missing."""
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Raw dataset is missing required columns: {missing}")
    log.info("Column validation passed — all %d required columns present.", len(REQUIRED_COLUMNS))


def validate_binary_columns(df: pd.DataFrame) -> None:
    """Raise ValueError if binary columns contain values outside {0, 1}."""
    for col in BINARY_COLUMNS:
        invalid = df[col].dropna()
        bad_vals = set(invalid.unique()) - {0, 1}
        if bad_vals:
            raise ValueError(
                f"Column '{col}' contains invalid values: {bad_vals}. "
                "Expected only 0 and 1."
            )
    log.info("Binary column validation passed.")


def validate_categoricals(df: pd.DataFrame) -> None:
    """Log warnings for unexpected categorical levels."""
    bad_age = set(df["age_group"].dropna().unique()) - VALID_AGE_GROUPS
    if bad_age:
        log.warning("Unexpected age_group values: %s", bad_age)

    bad_seg = set(df["customer_segment"].dropna().unique()) - VALID_SEGMENTS
    if bad_seg:
        log.warning("Unexpected customer_segment values: %s", bad_seg)


def validate_business_logic(df: pd.DataFrame) -> None:
    """
    Validate causal and business integrity constraints:
    1. Control customers (discount_offered == 0) must have discount_amount == 0.
    2. Non-purchasing customers (purchased == 0) must have revenue == 0.
    3. Log warning if discount exceeds revenue for purchasing customers (promotional loss).
    """
    control_leaks = df.loc[(df["discount_offered"] == 0) & (df["discount_amount"] > 0)]
    if not control_leaks.empty:
        raise ValueError(
            f"Business logic violation: {len(control_leaks)} control customers have discount_amount > 0."
        )

    unpurchased_rev = df.loc[(df["purchased"] == 0) & (df["revenue"] > 0)]
    if not unpurchased_rev.empty:
        raise ValueError(
            f"Business logic violation: {len(unpurchased_rev)} unpurchased customers have revenue > 0."
        )

    loss_making = df.loc[
        (df["purchased"] == 1)
        & (df["discount_offered"] == 1)
        & (df["discount_amount"] > df["revenue"])
    ]
    if not loss_making.empty:
        log.warning(
            "Promotional integrity notice: %d customers purchased with discount_amount exceeding revenue "
            "(negative promotional margin). Min net revenue: %.2f.",
            len(loss_making),
            (loss_making["revenue"] - loss_making["discount_amount"]).min(),
        )

    log.info("Business logic validation passed.")


def validate_campaign_dates(df: pd.DataFrame) -> None:
    """
    Validate that campaign_date contains valid ISO-8601 YYYY-MM-DD date strings.
    """
    try:
        parsed_dates = pd.to_datetime(df["campaign_date"], format="%Y-%m-%d", errors="raise")
    except Exception as e:
        raise ValueError(f"Invalid campaign_date format encountered: {e}")

    log.info(
        "Campaign date validation passed: %d records ranging from %s to %s.",
        len(parsed_dates),
        parsed_dates.min().strftime("%Y-%m-%d"),
        parsed_dates.max().strftime("%Y-%m-%d"),
    )


def compute_margin_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute unit economics and margin metrics for business impact analysis:
    - net_revenue: observed revenue minus discount amount
    - is_negative_margin: indicator (1/0) for transactions where discount exceeded revenue
    """
    df = df.copy()
    df["net_revenue"] = np.round(df["revenue"] - df["discount_amount"], 2)
    df["is_negative_margin"] = (
        (df["purchased"] == 1) & (df["discount_amount"] > df["revenue"])
    ).astype(int)
    return df


def add_causal_nuisance_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add mathematically stabilized transformations for DML nuisance modeling:
    - log_avg_order_value: log1p transformed order value to handle right-skewness.
    """
    df = df.copy()
    df["log_avg_order_value"] = np.round(np.log1p(df["avg_order_value"]), 4)
    return df


# ── Cleaning steps ────────────────────────────────────────────────────────────

def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Drop exact duplicate rows and report counts."""
    n_before = len(df)
    df = df.drop_duplicates()
    n_removed = n_before - len(df)
    log.info("Duplicate removal: %d rows dropped, %d rows remaining.", n_removed, len(df))
    return df.reset_index(drop=True)


def impute_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Impute missing values:
    - Numeric confounders  → median (robust to skew)
    - Categorical columns  → mode
    """
    report: dict[str, int] = {}

    # Numeric imputation
    for col in ["past_purchases", "avg_order_value", "website_visits"]:
        n_missing = df[col].isna().sum()
        if n_missing > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            report[col] = int(n_missing)
            log.info("  Imputed %d missing values in '%s' with median=%.2f", n_missing, col, median_val)

    # Categorical imputation
    for col in ["age_group", "customer_segment"]:
        n_missing = df[col].isna().sum()
        if n_missing > 0:
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)
            report[col] = int(n_missing)
            log.info("  Imputed %d missing values in '%s' with mode='%s'", n_missing, col, mode_val)

    total_imputed = sum(report.values())
    log.info("Missing-value imputation complete: %d values imputed across %d columns.", total_imputed, len(report))
    return df


def enforce_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Cast columns to their schema-defined types."""
    # Use nullable integer types to safely handle any residual NaN before clip
    df["past_purchases"] = df["past_purchases"].round(0).astype("Int64").astype(int)
    df["website_visits"] = df["website_visits"].round(0).astype("Int64").astype(int)
    df["avg_order_value"] = df["avg_order_value"].astype(float).round(2)
    df["discount_amount"] = df["discount_amount"].astype(float).round(2)
    df["revenue"] = df["revenue"].astype(float).round(2)
    df["discount_offered"] = df["discount_offered"].astype(int)
    df["purchased"] = df["purchased"].astype(int)
    df["age_group"] = df["age_group"].astype("category")
    df["customer_segment"] = df["customer_segment"].astype("category")
    log.info("Data-type enforcement complete.")
    return df


def flag_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add a boolean column `is_outlier` using the IQR method for numeric
    confounders.  Rows are flagged but NOT removed — the analyst decides.
    """
    outlier_mask = pd.Series(False, index=df.index)
    for col in OUTLIER_COLUMNS:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        col_outliers = (df[col] < lower) | (df[col] > upper)
        n_flagged = col_outliers.sum()
        if n_flagged:
            log.info("  Outliers flagged in '%s': %d rows (IQR bounds [%.2f, %.2f])", col, n_flagged, lower, upper)
        outlier_mask |= col_outliers

    df["is_outlier"] = outlier_mask.astype(int)
    log.info("Outlier flagging complete: %d rows flagged total.", int(outlier_mask.sum()))
    return df


def validate_revenue_sign(df: pd.DataFrame) -> pd.DataFrame:
    """Clip negative revenue values to zero and log a warning."""
    neg_rev = (df["revenue"] < 0).sum()
    if neg_rev:
        log.warning("Clipping %d negative revenue values to 0.", neg_rev)
        df["revenue"] = df["revenue"].clip(lower=0.0)
    return df


# ── Column-role metadata ──────────────────────────────────────────────────────

def get_column_roles() -> dict[str, str]:
    """Return a mapping of column name → causal role."""
    return {col: schema[1] for col, schema in COLUMN_SCHEMA.items()}


def get_adjustment_set() -> list[str]:
    """
    Return the pre-treatment confounders that should enter the causal
    adjustment set.  Identifiers and post-treatment variables are excluded.
    """
    return [
        col for col, (_, role, _) in COLUMN_SCHEMA.items()
        if role == "confounder"
    ]


# ── Summary report ────────────────────────────────────────────────────────────

def print_summary(df: pd.DataFrame) -> None:
    """Print a concise data-quality summary to the log."""
    log.info("─" * 60)
    log.info("CLEANED DATASET SUMMARY")
    log.info("  Rows: %d", len(df))
    log.info("  Columns: %d", df.shape[1])
    log.info("  Missing values: %d", df.isnull().sum().sum())
    log.info("  Outlier-flagged rows: %d", df["is_outlier"].sum())
    log.info("  Treatment rate (discount_offered=1): %.1f%%",
             100 * df["discount_offered"].mean())
    log.info("  Purchase rate overall: %.1f%%", 100 * df["purchased"].mean())
    log.info("  Purchase rate | treated: %.1f%%",
             100 * df.loc[df["discount_offered"] == 1, "purchased"].mean())
    log.info("  Purchase rate | control: %.1f%%",
             100 * df.loc[df["discount_offered"] == 0, "purchased"].mean())
    log.info("  Adjustment set: %s", get_adjustment_set())
    log.info("─" * 60)


# ── Pipeline ──────────────────────────────────────────────────────────────────

def run_pipeline(raw_path: Path | str | pd.DataFrame = RAW_PATH) -> pd.DataFrame:
    """
    Execute the full preprocessing pipeline.

    Parameters
    ----------
    raw_path : Path | str | pd.DataFrame
        Path to the raw CSV file or an existing DataFrame.

    Returns
    -------
    pd.DataFrame
        Cleaned dataset ready for EDA and causal modelling.
    """
    if isinstance(raw_path, pd.DataFrame):
        df = raw_path.copy()
        log.info("Raw DataFrame provided directly: %d rows, %d columns.", len(df), df.shape[1])
    else:
        log.info("Loading raw data from %s", raw_path)
        df = pd.read_csv(raw_path)
        log.info("Raw dataset loaded: %d rows, %d columns.", len(df), df.shape[1])

    # Validation
    validate_columns(df)
    validate_binary_columns(df)
    validate_categoricals(df)
    validate_campaign_dates(df)

    # Cleaning
    df = remove_duplicates(df)
    df = impute_missing_values(df)
    df = enforce_dtypes(df)
    df = validate_revenue_sign(df)
    validate_business_logic(df)
    df = flag_outliers(df)

    print_summary(df)
    return df


def save_cleaned(df: pd.DataFrame, output_dir: Path = PROCESSED_DIR) -> Path:
    """Save the cleaned DataFrame to CSV."""
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / OUTPUT_FILE
    df.to_csv(out_path, index=False)
    log.info("Saved cleaned dataset → %s", out_path)
    return out_path


# ── CLI entry-point ───────────────────────────────────────────────────────────

def main() -> None:
    df = run_pipeline()
    save_cleaned(df)
    log.info("Preprocessing complete.")


if __name__ == "__main__":
    main()
