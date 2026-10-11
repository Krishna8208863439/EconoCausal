"""
ml/dml_estimation.py
====================
EconoCausal — Week 2: Double Machine Learning (DML)
Project Reference: ITS/DSML/1147

Implements Double Machine Learning (DML) using EconML for Conditional Average
Treatment Effect (CATE) / Individual Treatment Effect (ITE) estimation.

Estimator:
- Primary: CausalForestDML (supports non-parametric heterogeneous treatment effects)
- Alternative: LinearDML (interpretable parametric treatment effect)

Nuisance Models:
- Outcome model: RandomForestRegressor (estimates continuous expectation E[Y|X] ∈ [0, 1])
- Treatment model: RandomForestClassifier (estimates propensity P(T=1|X) ∈ [0, 1])
- Cross-fitting: K-fold cross-fitting (cv=5) to avoid regularisation bias and overfitting.

Outputs:
- Artifact: ml/models/causal_forest_dml.joblib
- Customer predictions: data/processed/ite_predictions.csv
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from econml.dml import CausalForestDML, LinearDML
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
OUTPUT_PREDICTIONS_PATH = _ROOT / "data" / "processed" / "ite_predictions.csv"
MODELS_DIR = _ROOT / "ml" / "models"
MODEL_SAVE_PATH = MODELS_DIR / "causal_forest_dml.joblib"

DEFAULT_NUMERIC_COLS: List[str] = ["past_purchases", "avg_order_value", "website_visits"]
DEFAULT_CATEGORICAL_COLS: List[str] = ["age_group", "customer_segment"]
DEFAULT_TREATMENT_COL: str = "discount_offered"
DEFAULT_OUTCOME_COL: str = "purchased"


class DMLEstimatorWrapper:
    """
    Wrapper around EconML's DML estimators (CausalForestDML and LinearDML)
    providing consistent preprocessing, cross-fitting, ITE prediction,
    and uncertainty estimation.
    """

    def __init__(
        self,
        estimator_type: str = "causal_forest",
        numeric_cols: Optional[List[str]] = None,
        categorical_cols: Optional[List[str]] = None,
        cv: int = 5,
        random_state: int = 42,
        n_estimators: int = 100,
        max_depth: int = 6,
    ):
        self.estimator_type = estimator_type.lower()
        self.numeric_cols = numeric_cols or DEFAULT_NUMERIC_COLS
        self.categorical_cols = categorical_cols or DEFAULT_CATEGORICAL_COLS
        self.feature_cols = self.numeric_cols + self.categorical_cols
        self.cv = cv
        self.random_state = random_state
        self.n_estimators = n_estimators
        self.max_depth = max_depth

        self.preprocessor: Optional[ColumnTransformer] = None
        self.model: Optional[Union[CausalForestDML, LinearDML]] = None
        self.summary_stats: Dict[str, Any] = {}
        self.is_fitted: bool = False

    def _build_preprocessor(self) -> ColumnTransformer:
        return ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), self.numeric_cols),
                (
                    "cat",
                    OneHotEncoder(drop="first", sparse_output=False, handle_unknown="ignore"),
                    self.categorical_cols,
                ),
            ],
            remainder="drop",
        )

    def fit(
        self,
        df: pd.DataFrame,
        treatment_col: str = DEFAULT_TREATMENT_COL,
        outcome_col: str = DEFAULT_OUTCOME_COL,
    ) -> "DMLEstimatorWrapper":
        """
        Fit the DML model on the provided dataset.
        """
        required = self.feature_cols + [treatment_col, outcome_col]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns in input DataFrame: {missing}")

        # Check binary values
        t_vals = set(df[treatment_col].unique())
        if not t_vals.issubset({0, 1}):
            raise ValueError(f"Treatment column '{treatment_col}' must be binary {0, 1}, got {t_vals}")

        y_vals = set(df[outcome_col].unique())
        if not y_vals.issubset({0, 1}):
            raise ValueError(f"Outcome column '{outcome_col}' must be binary {0, 1}, got {y_vals}")

        if len(t_vals) < 2:
            raise ValueError(f"Treatment column has only 1 unique value: {t_vals}. Both treated and control are required.")

        log.info(
            "Fitting DML estimator: %s  n=%d  cv=%d  random_state=%d",
            self.estimator_type,
            len(df),
            self.cv,
            self.random_state,
        )

        self.preprocessor = self._build_preprocessor()
        X_df = df[self.feature_cols]
        X_trans = self.preprocessor.fit_transform(X_df)

        T = df[treatment_col].to_numpy().astype(int)
        Y = df[outcome_col].to_numpy().astype(float)

        # Nuisance models:
        # Outcome model: RandomForestRegressor estimating continuous expectation E[Y|X] ∈ [0, 1]
        model_y = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_leaf=10,
            random_state=self.random_state,
            n_jobs=-1,
        )

        # Treatment model: RandomForestClassifier estimating propensity score E[T|X] ∈ [0, 1]
        model_t = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_leaf=10,
            random_state=self.random_state,
            n_jobs=-1,
        )

        if self.estimator_type in ("causal_forest", "causal_forest_dml"):
            self.model = CausalForestDML(
                model_y=model_y,
                model_t=model_t,
                discrete_treatment=True,
                n_estimators=self.n_estimators,
                max_depth=self.max_depth,
                cv=self.cv,
                random_state=self.random_state,
                n_jobs=-1,
            )
        elif self.estimator_type in ("linear", "linear_dml"):
            self.model = LinearDML(
                model_y=model_y,
                model_t=model_t,
                discrete_treatment=True,
                cv=self.cv,
                random_state=self.random_state,
            )
        else:
            raise ValueError(f"Unsupported estimator type: '{self.estimator_type}'. Choose 'causal_forest' or 'linear'.")

        self.model.fit(Y, T, X=X_trans)
        self.is_fitted = True

        # Generate sample effects for training summary
        effects = self.model.effect(X_trans)
        try:
            lb, ub = self.model.effect_interval(X_trans, alpha=0.05)
        except Exception as e:
            log.warning("Could not compute confidence interval: %s", e)
            lb, ub = effects, effects

        self.summary_stats = {
            "estimator_type": self.estimator_type,
            "sample_size": len(df),
            "cv_folds": self.cv,
            "mean_ate": float(np.mean(effects)),
            "median_ate": float(np.median(effects)),
            "std_ite": float(np.std(effects)),
            "min_ite": float(np.min(effects)),
            "max_ite": float(np.max(effects)),
            "ci_lower_mean": float(np.mean(lb)),
            "ci_upper_mean": float(np.mean(ub)),
            "positive_effect_fraction": float(np.mean(effects > 0)),
        }

        log.info(
            "DML training completed. Estimated Population ATE: +%.4f (95%% CI: [+%.4f, +%.4f])",
            self.summary_stats["mean_ate"],
            self.summary_stats["ci_lower_mean"],
            self.summary_stats["ci_upper_mean"],
        )
        return self

    def predict_ite(
        self,
        df: pd.DataFrame,
        alpha: float = 0.05,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Predict Individual Treatment Effects (ITE) and confidence bounds.

        Returns:
            (effects, lower_bounds, upper_bounds)
        """
        if not self.is_fitted or self.model is None or self.preprocessor is None:
            raise RuntimeError("Model is not fitted yet. Call fit() first.")

        missing = [c for c in self.feature_cols if c not in df.columns]
        if missing:
            raise ValueError(f"Input DataFrame is missing required feature columns: {missing}")

        X_df = df[self.feature_cols]
        X_trans = self.preprocessor.transform(X_df)

        effects = self.model.effect(X_trans).flatten()
        try:
            lb, ub = self.model.effect_interval(X_trans, alpha=alpha)
            lb = lb.flatten()
            ub = ub.flatten()
        except Exception as e:
            log.warning("Could not calculate interval: %s. Defaulting to point estimates.", e)
            lb = effects.copy()
            ub = effects.copy()

        return effects, lb, ub

    def save(self, filepath: Union[str, Path] = MODEL_SAVE_PATH) -> Path:
        """Save fitted model and preprocessor to disk."""
        if not self.is_fitted:
            raise RuntimeError("Cannot save unfitted model.")
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "estimator_type": self.estimator_type,
            "numeric_cols": self.numeric_cols,
            "categorical_cols": self.categorical_cols,
            "feature_cols": self.feature_cols,
            "cv": self.cv,
            "random_state": self.random_state,
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "preprocessor": self.preprocessor,
            "model": self.model,
            "summary_stats": self.summary_stats,
            "is_fitted": self.is_fitted,
        }
        joblib.dump(payload, path)
        log.info("Saved DML model artifact to %s", path)
        return path

    @classmethod
    def load(cls, filepath: Union[str, Path] = MODEL_SAVE_PATH) -> "DMLEstimatorWrapper":
        """Load fitted model artifact from disk."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Model artifact not found at {path}")
        payload = joblib.load(path)
        instance = cls(
            estimator_type=payload["estimator_type"],
            numeric_cols=payload["numeric_cols"],
            categorical_cols=payload["categorical_cols"],
            cv=payload["cv"],
            random_state=payload["random_state"],
            n_estimators=payload["n_estimators"],
            max_depth=payload["max_depth"],
        )
        instance.preprocessor = payload["preprocessor"]
        instance.model = payload["model"]
        instance.summary_stats = payload["summary_stats"]
        instance.is_fitted = payload["is_fitted"]
        log.info("Loaded DML model artifact from %s", path)
        return instance


def train_and_export_dml(
    data_path: Union[str, Path] = DATA_PATH,
    output_predictions_path: Union[str, Path] = OUTPUT_PREDICTIONS_PATH,
    model_save_path: Union[str, Path] = MODEL_SAVE_PATH,
    estimator_type: str = "causal_forest",
    cv: int = 5,
    random_state: int = 42,
) -> Tuple[DMLEstimatorWrapper, pd.DataFrame]:
    """
    Load cleaned dataset, train DML model, export customer-level ITE predictions,
    and save model artifact.
    """
    df = pd.read_csv(data_path)
    log.info("Loaded %d rows from %s", len(df), data_path)

    wrapper = DMLEstimatorWrapper(
        estimator_type=estimator_type,
        cv=cv,
        random_state=random_state,
    )
    wrapper.fit(df)

    # Compute predictions
    effects, lb, ub = wrapper.predict_ite(df)

    # Build predictions dataframe
    predictions_df = pd.DataFrame(
        {
            "customer_id": df["customer_id"],
            "treatment_effect": np.round(effects, 6),
            "treatment_effect_lower": np.round(lb, 6),
            "treatment_effect_upper": np.round(ub, 6),
            "actual_treatment": df[DEFAULT_TREATMENT_COL].astype(int),
            "actual_outcome": df[DEFAULT_OUTCOME_COL].astype(int),
            "past_purchases": df["past_purchases"],
            "avg_order_value": df["avg_order_value"],
            "website_visits": df["website_visits"],
            "age_group": df["age_group"],
            "customer_segment": df["customer_segment"],
        }
    )

    # Save CSV
    out_csv = Path(output_predictions_path)
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    predictions_df.to_csv(out_csv, index=False)
    log.info("Saved customer-level ITE predictions to %s", out_csv)

    # Save model artifact
    wrapper.save(model_save_path)

    return wrapper, predictions_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train EconML Double Machine Learning Model")
    parser.add_argument("--estimator", choices=["causal_forest", "linear"], default="causal_forest")
    parser.add_argument("--cv", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    wrapper, preds = train_and_export_dml(
        estimator_type=args.estimator,
        cv=args.cv,
        random_state=args.seed,
    )

    print("\n================ DML ESTIMATION SUMMARY ================")
    for k, v in wrapper.summary_stats.items():
        print(f"  {k}: {v}")
    print(f"Predictions saved to: {OUTPUT_PREDICTIONS_PATH}")
    print(f"Model saved to: {MODEL_SAVE_PATH}")
    print("========================================================\n")
