"""
tests/test_optimization_api.py
==============================
EconoCausal — Week 3: Optimization API Endpoint Tests
Project Reference: ITS/DSML/1147

Tests:
- GET /optimization/config schema and defaults
- POST /optimization/run input validation (valid, discount > budget, negative values)
- Background optimization execution and state transition
- GET /optimization/results pagination, schema, and sensitive column stripping
- GET /optimization/summary metrics, budget utilization, and baseline policies
- GET /optimization/export CSV data structure
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.main import app, optimisation_state, _run_optimisation_task

client = TestClient(app)


def test_optimization_config_endpoint():
    """GET /optimization/config returns 200 and expected schema."""
    resp = client.get("/optimization/config")
    assert resp.status_code == 200
    data = resp.json()

    assert "default_budget" in data
    assert "default_discount_amount" in data
    assert "default_min_treatment_effect" in data
    assert "ite_predictions_available" in data
    assert "allocation_results_available" in data
    assert "current_status" in data
    assert "assumptions" in data

    assert data["default_budget"] > 0
    assert data["default_discount_amount"] > 0
    assert "solver" in data["assumptions"]
    assert "objective" in data["assumptions"]


def test_optimization_run_validation():
    """POST /optimization/run validates budget and discount values."""
    # 1. Discount amount > budget should fail with 422
    resp = client.post("/optimization/run", json={
        "budget": 50.0,
        "discount_amount": 100.0,
        "min_treatment_effect": 0.0,
        "random_seed": 42,
    })
    assert resp.status_code == 422

    # 2. Non-positive budget should fail with 422
    resp = client.post("/optimization/run", json={
        "budget": -500.0,
        "discount_amount": 10.0,
    })
    assert resp.status_code == 422

    # 3. Non-positive discount should fail with 422
    resp = client.post("/optimization/run", json={
        "budget": 5000.0,
        "discount_amount": 0.0,
    })
    assert resp.status_code == 422


def test_optimization_run_and_results_flow():
    """Test full execution, polling results, and summary verification."""
    # Run synchronously using task helper for deterministic testing
    req = {
        "budget": 5000.0,
        "discount_amount": 10.0,
        "min_treatment_effect": 0.0,
        "random_seed": 42,
    }
    _run_optimisation_task(req)

    assert optimisation_state["status"] == "completed"
    assert optimisation_state["summary"] is not None
    assert optimisation_state["baselines"] is not None

    # Test GET /optimization/summary
    summary_resp = client.get("/optimization/summary")
    assert summary_resp.status_code == 200
    sum_data = summary_resp.json()

    assert "summary" in sum_data
    assert "baselines" in sum_data

    s = sum_data["summary"]
    assert s["total_budget"] == 5000.0
    assert s["actual_spend"] <= s["total_budget"]
    assert s["actual_spend"] == 5000.0
    assert s["n_selected_customers"] == 500
    assert s["remaining_budget"] == 0.0
    assert s["budget_utilisation_pct"] == 100.0
    assert s["estimated_incremental_conversions"] > 0
    assert s["estimated_incremental_contribution_inr"] > 0
    assert s["feasible"] is True

    # Verify 4 baseline policies
    baselines = sum_data["baselines"]
    assert len(baselines) == 4
    policy_names = [b["name"] for b in baselines]
    assert any("No-Discount" in name for name in policy_names)
    assert any("Random" in name for name in policy_names)
    assert any("Blanket" in name for name in policy_names)
    assert any("Causal DML" in name for name in policy_names)

    # Causal DML must dominate random targeting in incremental contribution
    causal_policy = next(b for b in baselines if "Causal DML" in b["name"])
    random_policy = next(b for b in baselines if "Random" in b["name"])
    assert (
        causal_policy["estimated_incremental_contribution"]
        > random_policy["estimated_incremental_contribution"]
    )


def test_optimization_results_pagination_and_security():
    """GET /optimization/results tests pagination and sensitive column omission."""
    # Test limit=10, offset=0
    resp = client.get("/optimization/results?limit=10&offset=0")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "completed"
    assert data["limit"] == 10
    assert data["offset"] == 0
    assert data["total_rows"] == 2200
    assert len(data["allocation"]) == 10

    first = data["allocation"][0]
    expected_fields = [
        "customer_id",
        "eligible",
        "estimated_treatment_effect",
        "recommended_discount",
        "selected_for_campaign",
        "estimated_discount_cost",
        "estimated_incremental_conversions",
        "estimated_incremental_contribution",
        "optimization_status",
    ]
    for field in expected_fields:
        assert field in first, f"Missing field: {field}"

    # Verify sensitive observed columns are NOT exposed
    assert "actual_treatment" not in first
    assert "actual_outcome" not in first

    # Test pagination offset
    resp_page2 = client.get("/optimization/results?limit=10&offset=10")
    assert resp_page2.status_code == 200
    data_page2 = resp_page2.json()
    assert len(data_page2["allocation"]) == 10
    assert data_page2["allocation"][0]["customer_id"] != first["customer_id"]


def test_optimization_export_endpoint():
    """GET /optimization/export returns full safe allocation data."""
    resp = client.get("/optimization/export")
    assert resp.status_code == 200
    data = resp.json()

    assert data["filename"] == "discount_allocation.csv"
    assert data["total_rows"] == 2200
    assert "data" in data
    assert len(data["data"]) == 2200

    sample = data["data"][0]
    assert "customer_id" in sample
    assert "selected_for_campaign" in sample
    assert "actual_treatment" not in sample
    assert "actual_outcome" not in sample
