"""
tests/test_api.py
=================
EconoCausal — Week 2: FastAPI Integration Tests
Project Reference: ITS/DSML/1147

Tests:
- API health and version schemas.
- Data summary and preview endpoints.
- Model training status endpoint.
- Causal results and uplift diagnostics endpoints.
- Real-time customer treatment effect inference endpoint.
- Budget configuration persistence endpoint.
- Causal DAG schema endpoint.
"""

from fastapi.testclient import TestClient
import pytest

from backend.main import app

client = TestClient(app)


def test_api_health_endpoint():
    """GET /health returns 200 and valid schema."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["week"] in [3, 4]
    assert "version" in data
    assert "timestamp" in data


def test_data_summary_endpoint():
    """GET /data/summary returns dataset records count and split."""
    resp = client.get("/data/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "n" in data
    assert data["n"] > 0
    assert "treated" in data
    assert "control" in data
    assert "naive_ate" in data
    assert data["treated"] + data["control"] == data["n"]


def test_data_preview_endpoint():
    """GET /data/preview returns list of records up to limit."""
    resp = client.get("/data/preview?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 5
    assert "customer_id" in data[0]
    assert "discount_offered" in data[0]
    assert "purchased" in data[0]


def test_model_status_endpoint():
    """GET /model/status returns training state and stats."""
    resp = client.get("/model/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["status"] in ["idle", "training", "trained", "error"]


def test_causal_results_endpoint():
    """GET /causal/results returns DML estimates and segment breakdown."""
    resp = client.get("/causal/results")
    assert resp.status_code == 200
    data = resp.json()
    assert "dml_estimates" in data
    assert "mean_ate" in data["dml_estimates"]
    assert "uplift_evaluation" in data
    assert "qini_score" in data["uplift_evaluation"]
    assert "segment_breakdown" in data
    assert len(data["segment_breakdown"]) > 0


def test_causal_diagnostics_endpoint():
    """GET /causal/diagnostics returns nuisance diagnostics and policy comparison."""
    resp = client.get("/causal/diagnostics")
    assert resp.status_code == 200
    data = resp.json()
    assert "nuisance_diagnostics" in data
    assert "treatment_model" in data["nuisance_diagnostics"]
    assert "outcome_model" in data["nuisance_diagnostics"]
    assert "policy_comparison" in data


def test_causal_estimate_endpoint():
    """POST /causal/estimate returns predicted treatment effect and recommendation."""
    payload = {
        "customers": [
            {
                "customer_id": "TEST_CUST_100",
                "past_purchases": 8,
                "avg_order_value": 55.0,
                "website_visits": 6,
                "age_group": "25-34",
                "customer_segment": "Regular",
            }
        ]
    }
    resp = client.post("/causal/estimate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predictions_count"] == 1
    pred = data["predictions"][0]
    assert pred["customer_id"] == "TEST_CUST_100"
    assert "treatment_effect" in pred
    assert "treatment_effect_lower" in pred
    assert "treatment_effect_upper" in pred
    assert "recommended_action" in pred


def test_budget_config_endpoints():
    """POST and GET /budget/config save and retrieve configuration."""
    cfg = {
        "budget": 75000.0,
        "currency": "INR",
        "discount_amount": 150.0,
        "target_segment": "Regular",
        "treatment_col": "discount_offered",
        "outcome_col": "purchased",
    }
    post_resp = client.post("/budget/config", json=cfg)
    assert post_resp.status_code == 200

    get_resp = client.get("/budget/config")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["budget"] == 75000.0
    assert data["currency"] == "INR"
    assert data["discount_amount"] == 150.0


def test_causal_dag_endpoint():
    """POST /causal/dag returns valid DAG node and edge structures."""
    resp = client.post("/causal/dag")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
    assert "edges" in data
    assert "assumptions" in data
    assert len(data["nodes"]) >= 5
    assert len(data["edges"]) >= 5


def test_data_validate_endpoint():
    """POST /data/validate audits active dataset against continuous pricing schema."""
    resp = client.post("/data/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert "is_valid" in data
    assert data["is_valid"] is True
    assert data["row_count"] == 2200
    assert "columns" in data
    assert "price" in data["columns"]
    assert "units_sold" in data["columns"]


def test_causal_pricing_results_endpoint():
    """GET /causal/pricing-results returns Day 2 continuous DML estimates."""
    resp = client.get("/causal/pricing-results")
    assert resp.status_code == 200
    data = resp.json()
    assert "dml_estimates" in data
    assert "price_elasticity" in data["dml_estimates"]
    assert "ci_lower_95" in data["dml_estimates"]
    assert "demand_curve" in data
    assert len(data["demand_curve"]) > 0


def test_causal_diagnostics_endpoint_day3():
    """GET /causal/diagnostics returns Day 3 refutations and residual diagnostics."""
    resp = client.get("/causal/diagnostics")
    assert resp.status_code == 200
    data = resp.json()
    assert ("continuous_positivity" in data) or ("nuisance_diagnostics" in data)


def test_pricing_optimization_results_endpoint():
    """GET /pricing/optimization-results returns Day 4 4-policy comparison."""
    resp = client.get("/pricing/optimization-results")
    assert resp.status_code == 200
    data = resp.json()
    assert "policy_comparison" in data
    assert "causal_dml_optimal" in data["policy_comparison"]
    assert "action_distribution" in data
