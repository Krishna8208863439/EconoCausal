"""
propensity.py
=============
EconoCausal — Week 1 & 2
Project reference: ITS/DSML/1147

Propensity score estimation and overlap diagnostics for causal inference.

In Double Machine Learning (DML), the propensity model e(X) = P(T=1 | X) is one of
the two primary nuisance models. Estimating e(X) is necessary for:
1. Orthogonalized residualization in DML.
2. Checking the overlap / positivity assumption (common support).
3. Inverse Propensity Weighting (IPW) and covariate balance assessment.

Usage
-----
    python src/causal/propensity.py
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

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

# ── Variable specifications ───────────────────────────────────────────────────
TREATMENT = "discount_offered"
OUTCOME = "purchased"

NUMERIC_CONFOUNDERS = [
    "past_purchases",
    "avg_order_value",
    "website_visits",
]

CATEGORICAL_CONFOUNDERS = [
    "age_group",
    "customer_segment",
]

COMMON_CAUSES = NUMERIC_CONFOUNDERS + CATEGORICAL_CONFOUNDERS


# ── Pipeline Construction ─────────────────────────────────────────────────────

def build_propensity_pipeline(
    random_state: int = 42,
    C: float = 1.0,
) -> Pipeline:
    """
    Construct a scikit-learn Pipeline for propensity estimation.

    Numeric features are standardized; categorical features are one-hot encoded
    with first dummy dropped to prevent collinearity.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_CONFOUNDERS),
            (
                "cat",
                OneHotEncoder(drop="first", handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_CONFOUNDERS,
            ),
        ]
    )

    clf = LogisticRegression(
        max_iter=1000,
        random_state=random_state,
        C=C,
        solver="lbfgs",
    )

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", clf),
    ])


# ── Model Fitting & Prediction ────────────────────────────────────────────────

def fit_propensity_model(
    df: pd.DataFrame,
    treatment_col: str = TREATMENT,
    confounders: list[str] | None = None,
    random_state: int = 42,
    C: float = 1.0,
) -> tuple[Pipeline, pd.Series]:
    """
    Fit the propensity model on observed data and return the pipeline and fitted probabilities.
    """
    cols = confounders or COMMON_CAUSES
    X = df[cols]
    y = df[treatment_col].astype(int)

    pipeline = build_propensity_pipeline(random_state=random_state, C=C)
    pipeline.fit(X, y)

    scores = pipeline.predict_proba(X)[:, 1]
    series_scores = pd.Series(scores, index=df.index, name="propensity_score")
    return pipeline, series_scores


def estimate_cross_fitted_propensities(
    df: pd.DataFrame,
    treatment_col: str = TREATMENT,
    confounders: list[str] | None = None,
    n_splits: int = 5,
    random_state: int = 42,
) -> pd.Series:
    """
    Generate out-of-fold propensity scores using stratified cross-fitting.

    Cross-fitting is required in Double Machine Learning to prevent
    overfitting bias in the nuisance estimates.
    """
    cols = confounders or COMMON_CAUSES
    X = df[cols]
    y = df[treatment_col].astype(int)

    pipeline = build_propensity_pipeline(random_state=random_state)
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)

    probs = cross_val_predict(
        pipeline,
        X,
        y,
        cv=cv,
        method="predict_proba",
    )[:, 1]

    return pd.Series(probs, index=df.index, name="cv_propensity_score")


# ── Overlap & Positivity Diagnostics ──────────────────────────────────────────

def evaluate_overlap(
    propensity_scores: pd.Series | np.ndarray,
    treatment: pd.Series | np.ndarray,
    lower_bound: float = 0.05,
    upper_bound: float = 0.95,
) -> dict[str, Any]:
    """
    Compute overlap and positivity diagnostics.

    Parameters
    ----------
    propensity_scores : pd.Series or np.ndarray
        Estimated propensity values P(T=1 | X).
    treatment : pd.Series or np.ndarray
        Observed binary treatment indicator (0 or 1).
    lower_bound : float
        Lower threshold below which positivity is deemed fragile.
    upper_bound : float
        Upper threshold above which positivity is deemed fragile.

    Returns
    -------
    dict
        Diagnostics including AUC-ROC, Brier score, min/max values, and positivity support.
    """
    scores = np.asarray(propensity_scores)
    t = np.asarray(treatment).astype(int)

    auc = float(roc_auc_score(t, scores))
    brier = float(brier_score_loss(t, scores))

    treated_scores = scores[t == 1]
    control_scores = scores[t == 0]

    violating_mask = (scores < lower_bound) | (scores > upper_bound)
    violating_count = int(np.sum(violating_mask))
    total_count = len(scores)

    return {
        "auc_roc": round(auc, 4),
        "brier_score": round(brier, 4),
        "overall_mean": round(float(np.mean(scores)), 4),
        "overall_min": round(float(np.min(scores)), 4),
        "overall_max": round(float(np.max(scores)), 4),
        "treated_mean": round(float(np.mean(treated_scores)), 4) if len(treated_scores) > 0 else 0.0,
        "control_mean": round(float(np.mean(control_scores)), 4) if len(control_scores) > 0 else 0.0,
        "positivity_violations_count": violating_count,
        "positivity_violations_pct": round((violating_count / total_count) * 100, 2),
        "common_support_share_pct": round(((total_count - violating_count) / total_count) * 100, 2),
    }


def compute_ipw_weights(
    propensity_scores: pd.Series | np.ndarray,
    treatment: pd.Series | np.ndarray,
    clip_min: float = 0.01,
    clip_max: float = 0.99,
    stabilized: bool = True,
) -> pd.Series:
    """
    Compute Inverse Propensity Weights (IPW).

    Parameters
    ----------
    propensity_scores : pd.Series or np.ndarray
        Propensity score values e(X).
    treatment : pd.Series or np.ndarray
        Binary treatment indicator (0 or 1).
    clip_min : float
        Lower clipping bound to avoid exploding weights.
    clip_max : float
        Upper clipping bound.
    stabilized : bool
        If True, multiply treated weights by P(T=1) and control weights by P(T=0).

    Returns
    -------
    pd.Series
        Weight array for each observation.
    """
    e = np.clip(np.asarray(propensity_scores), clip_min, clip_max)
    t = np.asarray(treatment).astype(int)

    p_t = np.mean(t) if stabilized else 1.0
    p_c = (1.0 - p_t) if stabilized else 1.0

    weights = np.where(t == 1, p_t / e, p_c / (1.0 - e))
    return pd.Series(weights, name="ipw_weight")


# ── CLI execution ─────────────────────────────────────────────────────────────

def run_propensity_analysis(data_path: Path = CLEANED_PATH) -> dict[str, Any]:
    """Run full propensity estimation and overlap diagnostics on cleaned data."""
    if not data_path.exists():
        raise FileNotFoundError(
            f"Cleaned dataset not found at {data_path}. Run preprocessing first."
        )

    log.info("Loading cleaned data from %s", data_path)
    df = pd.read_csv(data_path)

    log.info("Estimating in-sample and cross-fitted propensity scores …")
    _, in_sample_scores = fit_propensity_model(df)
    cv_scores = estimate_cross_fitted_propensities(df)

    diagnostics = evaluate_overlap(cv_scores, df[TREATMENT])
    log.info("── Propensity Overlap Diagnostics (Cross-Fitted) ──")
    log.info("  AUC-ROC: %.4f", diagnostics["auc_roc"])
    log.info("  Brier score: %.4f", diagnostics["brier_score"])
    log.info("  Treated mean propensity: %.4f", diagnostics["treated_mean"])
    log.info("  Control mean propensity: %.4f", diagnostics["control_mean"])
    log.info("  Positivity violations (<0.05 or >0.95): %d (%.2f%%)",
             diagnostics["positivity_violations_count"], diagnostics["positivity_violations_pct"])
    log.info("  Common support share: %.2f%%", diagnostics["common_support_share_pct"])

    return diagnostics


def main() -> None:
    run_propensity_analysis()


if __name__ == "__main__":
    main()
