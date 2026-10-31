"""
eda.py
======
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Exploratory Data Analysis script for the cleaned synthetic retail campaign
dataset.  Saves all figures to reports/figures/ and writes a summary of
key findings to stdout (captured in reports/week1_eda_report.md via the
build step).

Usage
-----
    python src/data/eda.py

Outputs
-------
    reports/figures/01_treatment_control_counts.png
    reports/figures/02_purchase_rate_by_treatment.png
    reports/figures/03_numeric_distributions.png
    reports/figures/04_categorical_distributions.png
    reports/figures/05_correlation_heatmap.png
    reports/figures/06_purchase_rate_by_segment.png
    reports/figures/07_purchase_rate_by_age_group.png
    reports/figures/08_propensity_by_confounder.png

NOTE: Correlation is computed as a descriptive tool only.
      Correlation does not imply causation.
"""

from __future__ import annotations

import logging
from pathlib import Path

import matplotlib
matplotlib.use("Agg")          # non-interactive backend — safe on any machine
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import numpy as np
import pandas as pd
import seaborn as sns

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]
CLEANED_PATH = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
FIGURES_DIR  = _ROOT / "reports" / "figures"
REPORT_PATH  = _ROOT / "reports" / "week1_eda_report.md"

# ── Style ─────────────────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", palette="muted", font_scale=1.1)
PALETTE = {"Treated (discount=1)": "#2196F3", "Control (discount=0)": "#FF9800"}
BLUE, ORANGE = "#2196F3", "#FF9800"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _save(fig: plt.Figure, name: str) -> Path:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIGURES_DIR / name
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Saved figure → %s", path)
    return path


def _pct_fmt(ax: plt.Axes) -> None:
    ax.yaxis.set_major_formatter(mtick.PercentFormatter(xmax=1, decimals=0))


# ── Plot functions ────────────────────────────────────────────────────────────

def plot_treatment_counts(df: pd.DataFrame) -> None:
    counts = df["discount_offered"].map({1: "Treated (discount=1)", 0: "Control (discount=0)"}).value_counts()
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(counts.index, counts.values,
                  color=[PALETTE.get(k, BLUE) for k in counts.index], width=0.5)
    for bar in bars:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 15,
                f"{int(bar.get_height()):,}", ha="center", va="bottom", fontsize=11)
    ax.set_title("Treatment vs. Control Group Sizes", fontweight="bold")
    ax.set_ylabel("Number of customers")
    ax.set_xlabel("")
    ax.set_ylim(0, max(counts.values) * 1.15)
    fig.tight_layout()
    _save(fig, "01_treatment_control_counts.png")


def plot_purchase_rate_by_treatment(df: pd.DataFrame) -> None:
    rates = df.groupby("discount_offered")["purchased"].mean().rename(
        index={1: "Treated (discount=1)", 0: "Control (discount=0)"}
    )
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(rates.index, rates.values,
                  color=[PALETTE.get(k, BLUE) for k in rates.index], width=0.5)
    for bar in bars:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                f"{bar.get_height():.1%}", ha="center", va="bottom", fontsize=12, fontweight="bold")
    ax.set_title("Purchase Rate: Treated vs. Control\n"
                 "(naïve difference — potentially biased due to confounding)",
                 fontweight="bold")
    ax.set_ylabel("Purchase rate")
    _pct_fmt(ax)
    ax.set_ylim(0, min(1.0, max(rates.values) * 1.25))
    fig.tight_layout()
    _save(fig, "02_purchase_rate_by_treatment.png")


def plot_numeric_distributions(df: pd.DataFrame) -> None:
    numeric_cols = ["past_purchases", "avg_order_value", "website_visits", "revenue"]
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    axes = axes.flatten()
    for ax, col in zip(axes, numeric_cols):
        treated = df.loc[df["discount_offered"] == 1, col]
        control = df.loc[df["discount_offered"] == 0, col]
        ax.hist(control, bins=30, alpha=0.6, color=ORANGE, label="Control", density=True)
        ax.hist(treated, bins=30, alpha=0.6, color=BLUE, label="Treated", density=True)
        ax.set_title(col.replace("_", " ").title(), fontweight="bold")
        ax.set_xlabel(col)
        ax.set_ylabel("Density")
        ax.legend(fontsize=9)
    fig.suptitle("Numeric Feature Distributions by Treatment Group\n"
                 "(pre-treatment confounders differ across groups → confounding)",
                 fontweight="bold", y=1.01)
    fig.tight_layout()
    _save(fig, "03_numeric_distributions.png")


def plot_categorical_distributions(df: pd.DataFrame) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    for ax, col in zip(axes, ["customer_segment", "age_group"]):
        order = df[col].value_counts().index.tolist()
        treated_pct = (
            df[df["discount_offered"] == 1][col]
            .value_counts(normalize=True)
            .reindex(order, fill_value=0)
        )
        control_pct = (
            df[df["discount_offered"] == 0][col]
            .value_counts(normalize=True)
            .reindex(order, fill_value=0)
        )
        x = np.arange(len(order))
        w = 0.35
        ax.bar(x - w / 2, treated_pct.values, width=w, color=BLUE, label="Treated", alpha=0.85)
        ax.bar(x + w / 2, control_pct.values, width=w, color=ORANGE, label="Control", alpha=0.85)
        ax.set_xticks(x)
        ax.set_xticklabels(order, rotation=20, ha="right")
        ax.set_title(col.replace("_", " ").title(), fontweight="bold")
        ax.set_ylabel("Proportion of group")
        _pct_fmt(ax)
        ax.legend()
    fig.suptitle("Categorical Feature Distributions by Treatment Group", fontweight="bold")
    fig.tight_layout()
    _save(fig, "04_categorical_distributions.png")


def plot_correlation_heatmap(df: pd.DataFrame) -> None:
    numeric_df = df[["past_purchases", "avg_order_value", "website_visits",
                      "discount_offered", "discount_amount", "purchased", "revenue"]]
    corr = numeric_df.corr()
    mask = np.triu(np.ones_like(corr, dtype=bool))
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(corr, mask=mask, annot=True, fmt=".2f", cmap="RdBu_r",
                center=0, vmin=-1, vmax=1, ax=ax, linewidths=0.5)
    ax.set_title("Correlation Matrix (descriptive only — correlation ≠ causation)",
                 fontweight="bold")
    fig.tight_layout()
    _save(fig, "05_correlation_heatmap.png")


def plot_purchase_rate_by_segment(df: pd.DataFrame) -> None:
    seg_order = ["Premium", "Regular", "Occasional", "Lapsed"]
    rates = (
        df.groupby(["customer_segment", "discount_offered"])["purchased"]
        .mean()
        .unstack()
        .reindex(seg_order)
        .rename(columns={0: "Control", 1: "Treated"})
    )
    fig, ax = plt.subplots(figsize=(8, 5))
    x = np.arange(len(rates))
    w = 0.35
    ax.bar(x - w / 2, rates["Treated"], width=w, color=BLUE, label="Treated", alpha=0.85)
    ax.bar(x + w / 2, rates["Control"],  width=w, color=ORANGE, label="Control", alpha=0.85)
    ax.set_xticks(x)
    ax.set_xticklabels(rates.index, fontsize=11)
    ax.set_title("Purchase Rate by Customer Segment and Treatment Status",
                 fontweight="bold")
    ax.set_ylabel("Purchase rate")
    _pct_fmt(ax)
    ax.legend()
    fig.tight_layout()
    _save(fig, "06_purchase_rate_by_segment.png")


def plot_purchase_rate_by_age(df: pd.DataFrame) -> None:
    age_order = ["18-24", "25-34", "35-44", "45-54", "55+"]
    rates = (
        df.groupby(["age_group", "discount_offered"])["purchased"]
        .mean()
        .unstack()
        .reindex(age_order)
        .rename(columns={0: "Control", 1: "Treated"})
    )
    fig, ax = plt.subplots(figsize=(9, 5))
    x = np.arange(len(rates))
    w = 0.35
    ax.bar(x - w / 2, rates["Treated"], width=w, color=BLUE, label="Treated", alpha=0.85)
    ax.bar(x + w / 2, rates["Control"],  width=w, color=ORANGE, label="Control", alpha=0.85)
    ax.set_xticks(x)
    ax.set_xticklabels(rates.index, fontsize=11)
    ax.set_title("Purchase Rate by Age Group and Treatment Status", fontweight="bold")
    ax.set_ylabel("Purchase rate")
    _pct_fmt(ax)
    ax.legend()
    fig.tight_layout()
    _save(fig, "07_purchase_rate_by_age_group.png")


def plot_propensity_by_confounder(df: pd.DataFrame) -> None:
    """
    Show that pre-treatment confounders predict treatment assignment —
    confirming the need for causal adjustment.
    """
    fig, axes = plt.subplots(1, 3, figsize=(14, 5))
    conf_cols = ["past_purchases", "avg_order_value", "website_visits"]
    # matplotlib >= 3.9 uses tick_labels; fall back to labels for older versions
    import matplotlib
    mpl_version = tuple(int(x) for x in matplotlib.__version__.split(".")[:2])
    _tick_kwarg = "tick_labels" if mpl_version >= (3, 9) else "labels"

    for ax, col in zip(axes, conf_cols):
        treated = df.loc[df["discount_offered"] == 1, col].values
        control = df.loc[df["discount_offered"] == 0, col].values
        parts = ax.boxplot(
            [control, treated],
            patch_artist=True,
            medianprops=dict(color="black", linewidth=2),
            **{_tick_kwarg: ["Control", "Treated"]},
        )
        for patch, color in zip(parts["boxes"], [ORANGE, BLUE]):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        ax.set_title(col.replace("_", " ").title(), fontweight="bold")
        ax.set_ylabel(col)
    fig.suptitle(
        "Confounder Distributions by Treatment Status\n"
        "(differences confirm that treatment is not randomly assigned)",
        fontweight="bold",
    )
    fig.tight_layout()
    _save(fig, "08_propensity_by_confounder.png")


# ── Summary stats ──────────────────────────────────────────────────────────────

def compute_summary(df: pd.DataFrame) -> dict:
    treated = df[df["discount_offered"] == 1]
    control = df[df["discount_offered"] == 0]
    return {
        "n_total": len(df),
        "n_treated": len(treated),
        "n_control": len(control),
        "treatment_rate": df["discount_offered"].mean(),
        "purchase_rate_overall": df["purchased"].mean(),
        "purchase_rate_treated": treated["purchased"].mean(),
        "purchase_rate_control": control["purchased"].mean(),
        "naive_ate": treated["purchased"].mean() - control["purchased"].mean(),
        "avg_revenue_treated": treated.loc[treated["purchased"] == 1, "revenue"].mean(),
        "avg_revenue_control": control.loc[control["purchased"] == 1, "revenue"].mean(),
        "missing_before": 0,    # already cleaned
        "outlier_rows": int(df["is_outlier"].sum()),
        "segments": df["customer_segment"].value_counts().to_dict(),
        "age_groups": df["age_group"].value_counts().to_dict(),
    }


def print_descriptive_stats(df: pd.DataFrame) -> None:
    log.info("=" * 60)
    log.info("DESCRIPTIVE STATISTICS")
    log.info("%s", df.describe(include="all").to_string())
    log.info("=" * 60)


# ── EDA pipeline ──────────────────────────────────────────────────────────────

def run_eda(cleaned_path: Path = CLEANED_PATH) -> dict:
    log.info("Loading cleaned dataset from %s", cleaned_path)
    df = pd.read_csv(cleaned_path)
    log.info("Dataset loaded: %d rows, %d columns.", len(df), df.shape[1])

    print_descriptive_stats(df)
    summary = compute_summary(df)

    log.info("Generating figures …")
    plot_treatment_counts(df)
    plot_purchase_rate_by_treatment(df)
    plot_numeric_distributions(df)
    plot_categorical_distributions(df)
    plot_correlation_heatmap(df)
    plot_purchase_rate_by_segment(df)
    plot_purchase_rate_by_age(df)
    plot_propensity_by_confounder(df)

    log.info("All figures saved to %s", FIGURES_DIR)
    return summary


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    summary = run_eda()
    log.info("EDA complete.  Summary: %s", summary)


if __name__ == "__main__":
    main()
