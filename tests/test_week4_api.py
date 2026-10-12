"""
tests/test_week4_api.py
=======================
EconoCausal — Week 4: FastAPI Integration Tests for Drift & Readiness
Project Reference: ITS/DSML/1147

Tests:
- GET /health version 4.0.0 and week 4 validation.
- GET /project/status readiness across all 4 project milestones.
- GET /drift/report retrieval of latest drift analysis.
- POST /drift/check multipart CSV evaluation.
- POST /drift/check non-CSV file rejection (400).
- GET /summary/business natural-language executive briefing generation.
"""

import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health_endpoint_week4():
    """GET /health must reflect Week 4 and version 4.0.0."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["version"] == "4.0.0"
    assert data["week"] == 4
    assert data["reference"] == "ITS/DSML/1147"


def test_project_status_endpoint():
    """GET /project/status must report readiness across all 4 weeks."""
    resp = client.get("/project/status")
    assert resp.status_code == 200
    data = resp.json()

    assert data["active_week"] == 4
    assert "readiness" in data
    readiness = data["readiness"]

    assert "week_1_data_and_dag" in readiness
    assert "week_2_causal_dml" in readiness
    assert "week_3_prescriptive_optimization" in readiness
    assert "week_4_drift_and_delivery" in readiness

    assert readiness["week_1_data_and_dag"]["status"] == "ready"
    assert readiness["week_2_causal_dml"]["status"] == "ready"
    assert readiness["week_3_prescriptive_optimization"]["status"] == "ready"
    assert readiness["week_4_drift_and_delivery"]["status"] == "ready"
    assert data["all_milestones_ready"] is True


def test_drift_report_endpoint():
    """GET /drift/report returns valid drift metrics."""
    resp = client.get("/drift/report")
    assert resp.status_code == 200
    data = resp.json()

    assert "overall_drift_status" in data
    assert "features" in data
    assert "reference_sample_size" in data
    assert "current_sample_size" in data

    # Verify key features are present
    assert "avg_order_value" in data["features"]
    assert "past_purchases" in data["features"]
    assert "customer_segment" in data["features"]


def test_drift_check_endpoint():
    """POST /drift/check evaluates uploaded CSV for distribution shift."""
    csv_content = (
        "customer_id,past_purchases,avg_order_value,website_visits,age_group,customer_segment,discount_offered,purchased\n"
        "CUST_9001,8,55.0,5,25-34,Regular,1,1\n"
        "CUST_9002,12,65.0,9,35-44,Premium,0,0\n"
        "CUST_9003,3,40.0,2,18-24,Occasional,1,0\n"
        "CUST_9004,15,80.0,11,45-54,Regular,0,1\n"
        "CUST_9005,6,50.0,4,55+,Churn-Risk,1,0\n"
    )
    files = {"file": ("test_cohort.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/drift/check", files=files)

    assert resp.status_code == 200
    data = resp.json()
    assert data["dataset_name"] == "test_cohort.csv"
    assert data["current_sample_size"] == 5
    assert "overall_drift_status" in data


def test_drift_check_rejects_non_csv():
    """POST /drift/check rejects non-CSV files with 400 Bad Request."""
    files = {"file": ("malicious.txt", io.BytesIO(b"not a csv"), "text/plain")}
    resp = client.post("/drift/check", files=files)
    assert resp.status_code == 400
    assert "Only CSV files are accepted" in resp.json()["detail"]


def test_business_summary_endpoint():
    """GET /summary/business returns plain-language briefing."""
    resp = client.get("/summary/business")
    assert resp.status_code == 200
    data = resp.json()

    assert "title" in data
    assert "narrative" in data
    assert "prescriptive_summary" in data
    assert "drift_summary" in data
    assert len(data["narrative"]) > 50
    assert "Double Machine Learning" in data["narrative"]
