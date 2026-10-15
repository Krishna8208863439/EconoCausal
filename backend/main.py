"""
backend/main.py
===============
EconoCausal — Week 2 & 3: FastAPI Backend
Project Reference: ITS/DSML/1147

Provides REST API endpoints for:
- Model health and status
- DML model training and evaluation
- Real-time customer treatment effect (ITE) inference
- Causal evaluation results, uplift curves, and Qini diagnostics
- Dataset management (upload, preview, summary, load default)
- Campaign budget configuration
- Week 3: Prescriptive optimisation (budget allocation, discount matrix)

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
from ml.budget_optimizer import (
    ALLOCATION_OUTPUT_PATH,
    DEFAULT_BUDGET_INR,
    DEFAULT_DISCOUNT_AMOUNT_INR,
    MIN_ITE_THRESHOLD,
    ITE_PREDICTIONS_PATH,
    OptimisationError,
    run_optimisation,
)
from ml.drift_detector import (
    REFERENCE_DATA_PATH,
    LATEST_REPORT_JSON,
    LATEST_REPORT_MD,
    evaluate_data_drift,
    export_drift_reports,
    run_drift_analysis,
)
from ml.business_summary import (
    generate_prescriptive_business_summary,
    generate_drift_business_summary,
    generate_full_executive_briefing,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

app = FastAPI(
    title="EconoCausal API",
    description="Double Machine Learning, Prescriptive Optimization & Data-Drift API — ITS/DSML/1147",
    version="4.0.0",
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
    "budget": 5000.0,
    "currency": "INR",
    "discount_amount": 10.0,
    "target_segment": "All",
    "treatment_col": "discount_offered",
    "outcome_col": "purchased",
    "covariates": DEFAULT_NUMERIC_COLS + DEFAULT_CATEGORICAL_COLS,
}

# Week 3: Optimisation run state
optimisation_state: Dict[str, Any] = {
    "status": "idle",          # idle | running | completed | error
    "last_run_at": None,
    "error_message": None,
    "summary": None,
    "baselines": None,
    "config_used": None,
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
    currency: str = "INR"
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
        "version": "4.0.0",
        "week": 4,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


@app.get("/project/status")
def get_project_status() -> Dict[str, Any]:
    """
    Returns end-to-end implementation status and artifact readiness across Weeks 1 to 4.
    """
    cleaned_data_exists = Path(DATA_PATH).exists()
    model_exists = MODEL_SAVE_PATH.exists()
    predictions_exists = ITE_PREDICTIONS_PATH.exists()
    evaluation_exists = RESULTS_JSON_PATH.exists()
    allocation_exists = ALLOCATION_OUTPUT_PATH.exists()
    drift_report_exists = LATEST_REPORT_JSON.exists()

    drift_status = "not_evaluated"
    if drift_report_exists:
        try:
            with open(LATEST_REPORT_JSON, "r", encoding="utf-8") as f:
                d = json.load(f)
                drift_status = d.get("overall_drift_status", "STABLE")
        except Exception:
            drift_status = "error_reading_report"

    return {
        "project": "EconoCausal — Dynamic Pricing via Double Machine Learning",
        "reference": "ITS/DSML/1147",
        "version": "4.0.0",
        "active_week": 4,
        "readiness": {
            "week_1_data_and_dag": {
                "status": "ready" if cleaned_data_exists else "missing",
                "dataset_path": str(DATA_PATH),
                "records": 2200 if cleaned_data_exists else 0,
            },
            "week_2_causal_dml": {
                "status": "ready" if (model_exists and predictions_exists) else "pending",
                "model_artifact": str(MODEL_SAVE_PATH),
                "estimator_type": training_state.get("estimator_type", "causal_forest"),
                "predictions_available": predictions_exists,
            },
            "week_3_prescriptive_optimization": {
                "status": "ready" if allocation_exists else "pending",
                "allocation_file": str(ALLOCATION_OUTPUT_PATH),
                "last_run_status": optimisation_state.get("status", "idle"),
            },
            "week_4_drift_and_delivery": {
                "status": "ready" if drift_report_exists else "pending",
                "drift_report_file": str(LATEST_REPORT_JSON),
                "latest_drift_status": drift_status,
                "api_packaging": "complete",
            },
        },
        "all_milestones_ready": all([cleaned_data_exists, model_exists, predictions_exists, allocation_exists]),
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


# ── Week 3: Optimisation Endpoints ───────────────────────────────────────────

class OptimisationRequest(BaseModel):
    budget: float = Field(default=5000.0, gt=0, description="Total marketing budget (Rs.)")
    discount_amount: float = Field(default=10.0, gt=0, description="Fixed discount cost per offer (Rs.)")
    min_treatment_effect: float = Field(default=0.0, ge=0, description="Minimum ITE threshold for eligibility")
    random_seed: int = Field(default=42, description="Random seed for reproducible baseline comparison")


def _run_optimisation_task(req_dict: dict):
    """Background task: run optimisation and update global state."""
    global optimisation_state
    try:
        optimisation_state["status"] = "running"
        optimisation_state["error_message"] = None
        log.info("Starting optimisation: budget=%.0f, discount=%.0f", req_dict["budget"], req_dict["discount_amount"])

        result = run_optimisation(
            budget=req_dict["budget"],
            discount_amount=req_dict["discount_amount"],
            min_treatment_effect=req_dict["min_treatment_effect"],
            random_seed=req_dict["random_seed"],
        )

        optimisation_state["status"] = "completed"
        optimisation_state["last_run_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        optimisation_state["summary"] = result["summary"]
        optimisation_state["baselines"] = result["baselines"]
        optimisation_state["config_used"] = req_dict
        log.info("Optimisation complete: %s", result["status_message"])
    except OptimisationError as e:
        log.error("Optimisation failed (business rule): %s", e)
        optimisation_state["status"] = "error"
        optimisation_state["error_message"] = str(e)
    except Exception as e:
        log.exception("Optimisation failed (unexpected): %s", e)
        optimisation_state["status"] = "error"
        optimisation_state["error_message"] = f"Unexpected error: {e}"


@app.get("/optimization/config")
def get_optimisation_config() -> Dict[str, Any]:
    """Return current optimisation configuration and defaults."""
    return {
        "default_budget": budget_config_state.get("budget", DEFAULT_BUDGET_INR),
        "default_discount_amount": budget_config_state.get("discount_amount", DEFAULT_DISCOUNT_AMOUNT_INR),
        "default_min_treatment_effect": MIN_ITE_THRESHOLD,
        "ite_predictions_available": ITE_PREDICTIONS_PATH.exists(),
        "allocation_results_available": ALLOCATION_OUTPUT_PATH.exists(),
        "current_status": optimisation_state["status"],
        "last_run_at": optimisation_state["last_run_at"],
        "assumptions": {
            "treatment_contrast": "Binary: discount offered vs no discount (Week 2 DML)",
            "objective": "Maximise sum of (ITE_i x avg_order_value_i - discount_amount) for selected customers",
            "eligibility": "ITE_i > min_treatment_effect AND net_value_i > 0",
            "solver": "scipy.optimize.milp (binary integer programme)",
            "note": "Estimates are model-based predictions, NOT observed revenue.",
        },
    }


@app.post("/optimization/run")
def run_optimisation_endpoint(
    req: OptimisationRequest,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """
    Trigger a budget optimisation run.
    Validates inputs, then executes the MILP optimiser in a background task.
    """
    global optimisation_state

    if optimisation_state["status"] == "running":
        raise HTTPException(status_code=409, detail="An optimisation run is already in progress.")

    if not ITE_PREDICTIONS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="ITE predictions file not found. Please run Week 2 DML estimation first.",
        )

    if req.discount_amount > req.budget:
        raise HTTPException(
            status_code=422,
            detail=f"discount_amount ({req.discount_amount}) must not exceed budget ({req.budget}).",
        )

    req_dict = req.model_dump()
    background_tasks.add_task(_run_optimisation_task, req_dict)
    optimisation_state["status"] = "running"

    return {
        "message": "Optimisation started. Poll GET /optimization/results for status.",
        "status": "running",
        "config": req_dict,
    }


@app.get("/optimization/results")
def get_optimisation_results(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Return the current optimisation status and, if complete (or pre-generated),
    a paginated slice of the discount allocation.
    """
    global optimisation_state

    response: Dict[str, Any] = {
        "status": optimisation_state["status"],
        "last_run_at": optimisation_state["last_run_at"],
        "error_message": optimisation_state["error_message"],
    }

    if optimisation_state["status"] == "error":
        raise HTTPException(status_code=500, detail=optimisation_state["error_message"])

    if ALLOCATION_OUTPUT_PATH.exists():
        df = pd.read_csv(ALLOCATION_OUTPUT_PATH)
        total = len(df)
        # Exclude sensitive columns from the paginated response
        cols_to_drop = [c for c in ["actual_treatment", "actual_outcome"] if c in df.columns]
        df_safe = df.drop(columns=cols_to_drop, errors="ignore")
        page = df_safe.iloc[offset: offset + limit].replace({np.nan: None})
        response["total_rows"] = total
        response["offset"] = offset
        response["limit"] = limit
        response["allocation"] = page.to_dict(orient="records")
        if optimisation_state["status"] == "idle":
            response["status"] = "completed"
    else:
        response["allocation"] = []

    return response


@app.get("/optimization/summary")
def get_optimisation_summary() -> Dict[str, Any]:
    """Return the budget utilisation summary and baseline comparison."""
    global optimisation_state

    if optimisation_state["status"] == "error":
        raise HTTPException(status_code=500, detail=optimisation_state["error_message"])

    # Auto-load or compute if allocation exists but state is empty
    if optimisation_state["summary"] is None and ALLOCATION_OUTPUT_PATH.exists():
        try:
            result = run_optimisation(
                budget=budget_config_state.get("budget", DEFAULT_BUDGET_INR),
                discount_amount=budget_config_state.get("discount_amount", DEFAULT_DISCOUNT_AMOUNT_INR),
                min_treatment_effect=MIN_ITE_THRESHOLD,
            )
            optimisation_state["status"] = "completed"
            optimisation_state["last_run_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            optimisation_state["summary"] = result["summary"]
            optimisation_state["baselines"] = result["baselines"]
            optimisation_state["config_used"] = {
                "budget": budget_config_state.get("budget", DEFAULT_BUDGET_INR),
                "discount_amount": budget_config_state.get("discount_amount", DEFAULT_DISCOUNT_AMOUNT_INR),
                "min_treatment_effect": MIN_ITE_THRESHOLD,
                "random_seed": 42,
            }
        except Exception as e:
            log.warning("Could not auto-generate optimisation summary: %s", e)

    if optimisation_state["summary"] is None:
        raise HTTPException(
            status_code=404,
            detail="Optimisation not yet completed. POST /optimization/run to start.",
        )

    return {
        "summary": optimisation_state["summary"],
        "baselines": optimisation_state["baselines"],
        "config_used": optimisation_state["config_used"],
    }


@app.get("/optimization/export")
def export_allocation() -> Dict[str, Any]:
    """
    Return the full discount allocation as a list of records for CSV export.
    Only exposes non-sensitive fields.
    """
    if not ALLOCATION_OUTPUT_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="No allocation file found. Run POST /optimization/run first.",
        )

    df = pd.read_csv(ALLOCATION_OUTPUT_PATH)
    # Drop actual treatment/outcome (sensitive observed data)
    cols_to_drop = [c for c in ["actual_treatment", "actual_outcome"] if c in df.columns]
    df_safe = df.drop(columns=cols_to_drop, errors="ignore").replace({np.nan: None})

    return {
        "filename": "discount_allocation.csv",
        "total_rows": len(df_safe),
        "columns": list(df_safe.columns),
        "data": df_safe.to_dict(orient="records"),
    }


# ── Week 4: Data Drift Detection & Business Briefing Endpoints ─────────────────

@app.get("/drift/report")
def get_drift_report() -> Dict[str, Any]:
    """
    Retrieve the latest automated data drift detection report.
    If no report exists, executes a baseline drift evaluation against the approved reference dataset.
    """
    if LATEST_REPORT_JSON.exists():
        try:
            with open(LATEST_REPORT_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log.warning("Could not read existing drift report: %s. Re-running drift analysis.", e)

    try:
        report = run_drift_analysis()
        return report
    except Exception as e:
        log.exception("Drift analysis execution failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate drift report: {e}")


@app.post("/drift/check")
async def check_dataset_drift(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Evaluate an uploaded candidate dataset CSV against the approved baseline reference dataset.
    Performs Kolmogorov-Smirnov, Chi-Square, and Population Stability Index (PSI) audits.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted for drift analysis.")

    # Read and enforce size limit (max 50MB)
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds the 50MB limit.")

    try:
        import io
        curr_df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {e}")

    if not REFERENCE_DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Baseline reference dataset not found.")

    ref_df = pd.read_csv(REFERENCE_DATA_PATH)
    try:
        report = evaluate_data_drift(
            reference_df=ref_df,
            current_df=curr_df,
            dataset_name=file.filename,
        )
        export_drift_reports(report)
        return report
    except Exception as e:
        log.exception("Drift evaluation error: %s", e)
        raise HTTPException(status_code=422, detail=f"Drift evaluation failed: {e}")


@app.get("/summary/business")
def get_business_summary() -> Dict[str, Any]:
    """
    Generate plain-language executive business briefings from verified model,
    prescriptive optimization, and data drift diagnostic results.
    """
    opt_sum = optimisation_state.get("summary")
    if opt_sum is None and ALLOCATION_OUTPUT_PATH.exists():
        try:
            res = run_optimisation(
                budget=budget_config_state.get("budget", DEFAULT_BUDGET_INR),
                discount_amount=budget_config_state.get("discount_amount", DEFAULT_DISCOUNT_AMOUNT_INR),
            )
            opt_sum = res["summary"]
        except Exception:
            pass

    drift_rep = None
    if LATEST_REPORT_JSON.exists():
        try:
            with open(LATEST_REPORT_JSON, "r", encoding="utf-8") as f:
                drift_rep = json.load(f)
        except Exception:
            pass

    causal_res = None
    if RESULTS_JSON_PATH.exists():
        try:
            with open(RESULTS_JSON_PATH, "r", encoding="utf-8") as f:
                causal_res = json.load(f)
        except Exception:
            pass

    return generate_full_executive_briefing(
        opt_summary=opt_sum,
        drift_report=drift_rep,
        causal_results=causal_res,
    )
