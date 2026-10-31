"""
test_causal_dag.py
==================
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Unit tests for src/causal/build_dag.py
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

# Skip this test module if dowhy is not installed in the environment
pytest.importorskip("dowhy", reason="DoWhy is required to run causal DAG tests")

# ── Import modules under test ─────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.causal.build_dag import (
    COMMON_CAUSES,
    OUTCOME,
    TREATMENT,
    build_causal_model,
    visualise_dag_networkx,
)
from src.data.generate_data import generate_dataset
from src.data.preprocess import run_pipeline


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def sample_cleaned_df() -> pd.DataFrame:
    """Provide a small, valid cleaned DataFrame for testing."""
    raw = generate_dataset(n=150, seed=42)
    return run_pipeline(raw)


# ── Test suites ───────────────────────────────────────────────────────────────

class TestCausalConstants:
    """Verify core variable specifications according to the causal design."""

    def test_treatment_variable(self):
        assert TREATMENT == "discount_offered"

    def test_outcome_variable(self):
        assert OUTCOME == "purchased"

    def test_common_causes_count(self):
        assert len(COMMON_CAUSES) == 5

    def test_common_causes_members(self):
        expected = {
            "age_group",
            "past_purchases",
            "avg_order_value",
            "website_visits",
            "customer_segment",
        }
        assert set(COMMON_CAUSES) == expected

    def test_post_treatment_and_identifiers_excluded(self):
        """Ensure post-treatment and non-causal columns are not common causes."""
        excluded = ["customer_id", "revenue", "discount_amount", "campaign_date", "is_outlier"]
        for col in excluded:
            assert col not in COMMON_CAUSES, f"{col} should not be in COMMON_CAUSES"


class TestBuildCausalModel:
    """Verify DoWhy CausalModel construction and attributes."""

    def test_model_creation(self, sample_cleaned_df: pd.DataFrame):
        model = build_causal_model(sample_cleaned_df)
        assert model is not None

    def test_model_treatment_and_outcome(self, sample_cleaned_df: pd.DataFrame):
        model = build_causal_model(sample_cleaned_df)
        assert model._treatment == [TREATMENT]
        assert model._outcome == [OUTCOME]

    def test_model_common_causes(self, sample_cleaned_df: pd.DataFrame):
        model = build_causal_model(sample_cleaned_df)
        assert set(model._common_causes) == set(COMMON_CAUSES)


class TestDagVisualisation:
    """Verify DAG visualisation export using networkx fallback."""

    def test_visualise_dag_networkx_creates_image(self, sample_cleaned_df: pd.DataFrame, tmp_path: Path):
        model = build_causal_model(sample_cleaned_df)
        out_file = tmp_path / "test_causal_dag.png"
        visualise_dag_networkx(model, output_path=out_file)

        assert out_file.exists()
        assert out_file.stat().st_size > 0
