"""
backend/main.py
===============
EconoCausal — Week 2: FastAPI Backend
Project Reference: ITS/DSML/1147

Provides REST API endpoints for:
- Model health and status
- DML model training and evaluation
- Real-time customer treatment effect (ITE) inference
- Causal evaluation results, uplift curves, and Qini diagnostics
- Dataset management (upload, preview, summary, load default)
- Campaign budget configuration

Run with:
    uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from ml.dml_estimation import (
    DEFAULT_CATEGORICAL_COLS,
    DEFAULT_NUMERIC_COLS,
    DMLEstimatorWrapper,
    MODEL_SAVE_PATH,
    OUTPUT_PREDICTIONS_PATH,
    train_and_export_dml,
)
from ml.evaluation import (
    DATA_PATH,
    RESULTS_JSON_PATH,
    evaluate_full_causal_system,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

app = FastAPI(
    title="EconoCausal API",
    description="Double Machine Learning & Uplift Estimation API — ITS/DSML/1147",
    version="2.0.0",
)

# Enable CORS for React frontend (Vite default: http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory training state
training_state: Dict[str, Any] = {
    "status": "idle",
    "estimator_type": "causal_forest",
    "last_trained_at": None,
    "error_message": None,
    "summary_stats": None,
}

# Budget configuration storage
budget_config_state: Dict[str, Any] = {
    "budget": 5000,
    "currency": "GBP",
    "discount_amount": 10.0,
    "target_segment": "All",
    "treatment_col": "discount_offered",
    "outcome_col": "purchased",
    "covariates": DEFAULT_NUMERIC_COLS + DEFAULT_CATEGORICAL_COLS,
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    estimator: str = Field(default="causal_forest", description="Estimator type: causal_forest or linear")
    cv: int = Field(default=5, ge=2, le=10, description="Cross-fitting folds")
    seed: int = Field(default=42, description="Random seed")


class CustomerProfile(BaseModel):
    customer_id: Optional[str] = "CUSTOM_001"
    past_purchases: float = Field(..., ge=0)
    avg_order_value: float = Field(..., ge=0)
    website_visits: float = Field(..., ge=0)
    age_group: str = Field(default="25-34")
    customer_segment: str = Field(default="Regular")


class EstimateRequest(BaseModel):
    customers: List[CustomerProfile]


class BudgetConfigPayload(BaseModel):
    budget: float = 5000.0
    currency: str = "GBP"
    discount_amount: float = 10.0
    target_segment: str = "All"
    treatment_col: str = "discount_offered"
    outcome_col: str = "purchased"
    covariates: Optional[List[str]] = None


# ── Health & Info ─────────────────────────────────────────────────────────────

@app.get("/health")
def get_health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "app": "EconoCausal API",
        "reference": "ITS/DSML/1147",
        "version": "2.0.0",
        "week": 2,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


# ── Model Endpoints ───────────────────────────────────────────────────────────

def _run_training(estimator: str, cv: int, seed: int):
    global training_state
    try:
        training_state["status"] = "training"
        training_state["error_message"] = None
        log.info("Starting background DML training with %s (cv=%d, seed=%d)", estimator, cv, seed)
        wrapper, _ = train_and_export_dml(
            estimator_type=estimator,
            cv=cv,
            random_state=seed,
        )
        # Evaluate model & recompute metrics
        evaluate_full_causal_system()

        training_state["status"] = "trained"
        training_state["estimator_type"] = estimator
        training_state["last_trained_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        training_state["summary_stats"] = wrapper.summary_stats
        log.info("DML training and causal evaluation completed successfully.")
    except Exception as e:
        log.exception("Training failed: %s", e)
        training_state["status"] = "error"
        training_state["error_message"] = str(e)


@app.post("/model/train")
def train_model(req: TrainRequest, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    global training_state
    if training_state["status"] == "training":
        raise HTTPException(status_code=409, detail="A training run is already in progress.")

    background_tasks.add_task(_run_training, req.estimator, req.cv, req.seed)
    training_state["status"] = "training"
    training_state["estimator_type"] = req.estimator
    return {
        "message": f"Training initiated with {req.estimator} (cv={req.cv}). Check /model/status for progress.",
        "status": "training",
    }


@app.get("/model/status")
def get_model_status() -> Dict[str, Any]:
    global training_state
    # If trained artifact already exists on disk and status is idle, update state
    if training_state["status"] == "idle" and MODEL_SAVE_PATH.exists():
        try:
            wrapper = DMLEstimatorWrapper.load(MODEL_SAVE_PATH)
            training_state["status"] = "trained"
            training_state["estimator_type"] = wrapper.estimator_type
            training_state["summary_stats"] = wrapper.summary_stats
        except Exception as e:
            log.warning("Could not load existing model artifact: %s", e)

    return training_state


# ── Causal Estimation Endpoints ───────────────────────────────────────────────

@app.post("/causal/estimate")
def estimate_treatment_effect(req: EstimateRequest) -> Dict[str, Any]:
    """
    Predict Individual Treatment Effect (ITE) and 95% confidence intervals
    for customer profiles.
    """
    if not MODEL_SAVE_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Trained DML model artifact not found. Please train the model via POST /model/train first.",
        )

    try:
        wrapper = DMLEstimatorWrapper.load(MODEL_SAVE_PATH)
        df = pd.DataFrame([c.model_dump() for c in req.customers])
        effects, lb, ub = wrapper.predict_ite(df)

        results = []
        for i, c in enumerate(req.customers):
            results.append(
                {
                    "customer_id": c.customer_id,
                    "treatment_effect": round(float(effects[i]), 5),
                    "treatment_effect_lower": round(float(lb[i]), 5),
                    "treatment_effect_upper": round(float(ub[i]), 5),
                    "recommended_action": "Offer Discount" if effects[i] > 0.15 else "Standard Pricing",
                }
            )

        return {
            "estimator": wrapper.estimator_type,
            "predictions_count": len(results),
            "predictions": results,
        }
    except Exception as e:
        log.exception("Inference error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/causal/results")
def get_causal_results() -> Dict[str, Any]:
    """
    Return comprehensive causal evaluation results including distribution bins,
    segment summaries, and ATE estimates.
    """
    if not RESULTS_JSON_PATH.exists():
        # Try generating results if ite_predictions exist
        if OUTPUT_PREDICTIONS_PATH.exists():
            evaluate_full_causal_system()
        else:
            raise HTTPException(
                status_code=404,
                detail="Causal evaluation results not found. Please train the model first.",
            )

    with open(RESULTS_JSON_PATH, "r") as f:
        data = json.load(f)

    return data


@app.get("/causal/diagnostics")
def get_causal_diagnostics() -> Dict[str, Any]:
    """
    Return detailed diagnostics: propensity overlap, nuisance metrics,
    Qini curves, and policy comparisons.
    """
    results = get_causal_results()
    return {
        "nuisance_diagnostics": results.get("nuisance_diagnostics", {}),
        "dgp_validation": results.get("dgp_validation", {}),
        "uplift_evaluation": results.get("uplift_evaluation", {}),
        "policy_comparison": results.get("policy_comparison", {}),
    }


# ── Data & EDA Endpoints ──────────────────────────────────────────────────────

@app.get("/data/summary")
def get_data_summary() -> Dict[str, Any]:
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = pd.read_csv(DATA_PATH)
    n = len(df)
    treated = int(np.sum(df["discount_offered"] == 1))
    control = int(np.sum(df["discount_offered"] == 0))
    purchased_all = int(np.sum(df["purchased"] == 1))
    t_purchased = int(np.sum((df["discount_offered"] == 1) & (df["purchased"] == 1)))
    c_purchased = int(np.sum((df["discount_offered"] == 0) & (df["purchased"] == 1)))

    p_treated = t_purchased / max(treated, 1)
    p_control = c_purchased / max(control, 1)
    naive_ate = p_treated - p_control
    revenue = float(df["revenue"].sum()) if "revenue" in df.columns else 0.0

    return {
        "n": n,
        "treated": treated,
        "control": control,
        "purchase_rate": round(purchased_all / n, 4),
        "purchase_rate_treated": round(p_treated, 4),
        "purchase_rate_control": round(p_control, 4),
        "naive_ate": round(naive_ate, 4),
        "total_revenue": round(revenue, 2),
        "columns": list(df.columns),
        "numeric_features": DEFAULT_NUMERIC_COLS,
        "categorical_features": DEFAULT_CATEGORICAL_COLS,
    }


@app.get("/data/preview")
def get_data_preview(limit: int = 20) -> List[Dict[str, Any]]:
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = pd.read_csv(DATA_PATH)
    preview = df.head(limit).replace({np.nan: None}).to_dict(orient="records")
    return preview


@app.post("/data/upload")
async def upload_dataset(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    upload_path = _ROOT / "data" / "processed" / "uploaded_dataset.csv"
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        df = pd.read_csv(upload_path)
        required = DEFAULT_NUMERIC_COLS + DEFAULT_CATEGORICAL_COLS + ["discount_offered", "purchased"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            upload_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded CSV is missing required columns: {missing}",
            )

        # Overwrite active dataset with uploaded file
        shutil.copyfile(upload_path, DATA_PATH)
        return {
            "message": f"Successfully uploaded {len(df):,} rows from {file.filename}.",
            "rows": len(df),
            "columns": list(df.columns),
        }
    except Exception as e:
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {e}")


@app.post("/data/load-default")
def load_default_dataset() -> Dict[str, Any]:
    raw_path = _ROOT / "data" / "raw" / "mock_retail_campaign.csv"
    cleaned_path = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
    if not cleaned_path.exists():
        raise HTTPException(status_code=404, detail="Default cleaned dataset not found.")

    return {
        "message": "Default synthetic retail campaign dataset loaded.",
        "path": str(cleaned_path),
        "status": "success",
    }


# ── Causal DAG & Budget Config ───────────────────────────────────────────────

@app.post("/causal/dag")
def get_causal_dag() -> Dict[str, Any]:
    """Return DAG nodes, edges, and causal assumptions."""
    nodes = [
        {"id": "discount_offered", "label": "Discount Offered (Treatment)", "type": "treatment"},
        {"id": "purchased", "label": "Purchased (Outcome)", "type": "outcome"},
    ]
    for c in DEFAULT_NUMERIC_COLS + DEFAULT_CATEGORICAL_COLS:
        nodes.append({"id": c, "label": c.replace("_", " ").title(), "type": "confounder"})

    edges = []
    for c in DEFAULT_NUMERIC_COLS + DEFAULT_CATEGORICAL_COLS:
        edges.append({"from": c, "to": "discount_offered", "label": "Selection bias"})
        edges.append({"from": c, "to": "purchased", "label": "Confounding"})
    edges.append({"from": "discount_offered", "to": "purchased", "label": "Causal Effect (tau)"})

    return {
        "treatment": "discount_offered",
        "outcome": "purchased",
        "confounders": DEFAULT_NUMERIC_COLS + DEFAULT_CATEGORICAL_COLS,
        "nodes": nodes,
        "edges": edges,
        "assumptions": [
            "Unconfoundedness: No unobserved common causes.",
            "Positivity: Overlap between treated and control groups.",
            "SUTVA: No interference between customers.",
        ],
    }


@app.post("/budget/config")
def save_budget_config(cfg: BudgetConfigPayload) -> Dict[str, Any]:
    global budget_config_state
    budget_config_state.update(cfg.model_dump())
    return {
        "message": "Budget configuration saved successfully.",
        "config": budget_config_state,
    }


@app.get("/budget/config")
def get_budget_config() -> Dict[str, Any]:
    return budget_config_state
