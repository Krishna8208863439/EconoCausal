"""
ml/train_nuisance_models.py
===========================
EconoCausal — Week 2: Double Machine Learning
Project Reference: ITS/DSML/1147

Implements nuisance model training, cross-validation, and diagnostics for DML.

Under Robinson's transformation (Double Machine Learning):
    Y = θ(X) * T + g(X) + ε,   E[ε | X, T] = 0
    T = m(X) + η,               E[η | X] = 0

Nuisance models to estimate:
1. Outcome model g(X) = E[Y | X]: Expected purchase probability given customer features.
   For binary outcome Y ∈ {0, 1}, we use a regressor (RandomForestRegressor) or
   probability-calibrated model to predict continuous expectation E[Y | X] ∈ [0, 1],
   ensuring continuous residuals Y - E[Y | X].
2. Treatment model m(X) = E[T | X]: Propensity score model predicting probability
   of receiving a promotional discount given customer features.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    log_loss,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

DEFAULT_NUMERIC_COLS: List[str] = ["past_purchases", "avg_order_value", "website_visits"]
DEFAULT_CATEGORICAL_COLS: List[str] = ["age_group", "customer_segment"]


def build_preprocessor(
    numeric_cols: Optional[List[str]] = None,
    categorical_cols: Optional[List[str]] = None,
) -> ColumnTransformer:
    """
    Construct a scikit-learn ColumnTransformer for customer feature preprocessing.
    """
    num_cols = numeric_cols if numeric_cols is not None else DEFAULT_NUMERIC_COLS
    cat_cols = categorical_cols if categorical_cols is not None else DEFAULT_CATEGORICAL_COLS

    transformers = []
    if num_cols:
        transformers.append(
            ("num", StandardScaler(), num_cols)
        )
    if cat_cols:
        transformers.append(
            (
                "cat",
                OneHotEncoder(drop="first", sparse_output=False, handle_unknown="ignore"),
                cat_cols,
            )
        )

    return ColumnTransformer(transformers=transformers, remainder="drop")


def evaluate_treatment_model(
    X_df: pd.DataFrame,
    T: np.ndarray,
    preprocessor: ColumnTransformer,
    cv: int = 5,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Evaluate the treatment propensity model E[T | X] using cross-validated predictions.
    """
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=10,
        random_state=random_state,
        n_jobs=-1,
    )
    pipeline = Pipeline([("prep", preprocessor), ("clf", model)])

    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=random_state)
    propensity_probs = cross_val_predict(
        pipeline, X_df, T, cv=skf, method="predict_proba"
    )[:, 1]
    pred_labels = (propensity_probs >= 0.5).astype(int)

    auc = float(roc_auc_score(T, propensity_probs))
    brier = float(brier_score_loss(T, propensity_probs))
    loss = float(log_loss(T, propensity_probs))
    acc = float(accuracy_score(T, pred_labels))

    # Overlap diagnostics
    treated_mask = T == 1
    control_mask = T == 0

    treated_props = propensity_probs[treated_mask]
    control_props = propensity_probs[control_mask]

    overlap_min = float(max(np.min(treated_props), np.min(control_props)))
    overlap_max = float(min(np.max(treated_props), np.max(control_props)))
    common_support_fraction = float(
        np.mean((propensity_probs >= overlap_min) & (propensity_probs <= overlap_max))
    )

    metrics = {
        "model_type": "RandomForestClassifier",
        "cv_folds": cv,
        "roc_auc": round(auc, 4),
        "brier_score": round(brier, 4),
        "log_loss": round(loss, 4),
        "accuracy": round(acc, 4),
        "propensity_mean": round(float(np.mean(propensity_probs)), 4),
        "propensity_std": round(float(np.std(propensity_probs)), 4),
        "propensity_treated_mean": round(float(np.mean(treated_props)), 4),
        "propensity_control_mean": round(float(np.mean(control_props)), 4),
        "overlap_window": [round(overlap_min, 4), round(overlap_max, 4)],
        "common_support_fraction": round(common_support_fraction, 4),
        "overlap_passed": bool(overlap_min < overlap_max and common_support_fraction > 0.95),
    }

    log.info(
        "Treatment nuisance model evaluated: ROC-AUC=%.4f, Brier=%.4f, Common Support=%.2f%%",
        auc,
        brier,
        common_support_fraction * 100,
    )
    return {
        "metrics": metrics,
        "propensities": propensity_probs,
    }


def evaluate_outcome_model(
    X_df: pd.DataFrame,
    Y: np.ndarray,
    preprocessor: ColumnTransformer,
    cv: int = 5,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Evaluate the outcome nuisance model E[Y | X] using cross-validated predictions.
    Uses RandomForestRegressor to yield continuous probabilities in [0, 1].
    """
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=10,
        random_state=random_state,
        n_jobs=-1,
    )
    pipeline = Pipeline([("prep", preprocessor), ("reg", model)])

    kf = KFold(n_splits=cv, shuffle=True, random_state=random_state)
    pred_y = cross_val_predict(pipeline, X_df, Y, cv=kf)
    pred_y = np.clip(pred_y, 0.0, 1.0)

    mse = float(mean_squared_error(Y, pred_y))
    rmse = float(np.sqrt(mse))
    mae = float(mean_absolute_error(Y, pred_y))
    r2 = float(r2_score(Y, pred_y))
    brier = float(brier_score_loss(Y, pred_y))

    metrics = {
        "model_type": "RandomForestRegressor",
        "cv_folds": cv,
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "r2_score": round(r2, 4),
        "brier_score": round(brier, 4),
        "outcome_mean_actual": round(float(np.mean(Y)), 4),
        "outcome_mean_pred": round(float(np.mean(pred_y)), 4),
    }

    log.info(
        "Outcome nuisance model evaluated: RMSE=%.4f, R2=%.4f, Brier=%.4f",
        rmse,
        r2,
        brier,
    )
    return {
        "metrics": metrics,
        "predictions": pred_y,
    }


def train_and_evaluate_nuisance_models(
    df: pd.DataFrame,
    treatment_col: str = "discount_offered",
    outcome_col: str = "purchased",
    numeric_cols: Optional[List[str]] = None,
    categorical_cols: Optional[List[str]] = None,
    cv: int = 5,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Orchestrate complete nuisance model fitting and diagnostics.
    """
    num_cols = numeric_cols if numeric_cols is not None else DEFAULT_NUMERIC_COLS
    cat_cols = categorical_cols if categorical_cols is not None else DEFAULT_CATEGORICAL_COLS

    feature_cols = num_cols + cat_cols
    missing = [c for c in feature_cols + [treatment_col, outcome_col] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in DataFrame: {missing}")

    X_df = df[feature_cols].copy()
    T = df[treatment_col].to_numpy().astype(int)
    Y = df[outcome_col].to_numpy().astype(int)

    preprocessor = build_preprocessor(num_cols, cat_cols)

    t_eval = evaluate_treatment_model(
        X_df=X_df, T=T, preprocessor=preprocessor, cv=cv, random_state=random_state
    )
    y_eval = evaluate_outcome_model(
        X_df=X_df, Y=Y, preprocessor=preprocessor, cv=cv, random_state=random_state
    )

    return {
        "treatment_model": t_eval["metrics"],
        "outcome_model": y_eval["metrics"],
        "propensities": t_eval["propensities"],
        "outcome_preds": y_eval["predictions"],
        "sample_size": len(df),
        "features": feature_cols,
    }


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "processed" / "cleaned_retail_campaign.csv"
    if not data_path.exists():
        log.error("Cleaned data not found at %s", data_path)
    else:
        df = pd.read_csv(data_path)
        res = train_and_evaluate_nuisance_models(df)
        print("\n--- Treatment Nuisance Model Diagnostics ---")
        for k, v in res["treatment_model"].items():
            print(f"  {k}: {v}")
        print("\n--- Outcome Nuisance Model Diagnostics ---")
        for k, v in res["outcome_model"].items():
            print(f"  {k}: {v}")
