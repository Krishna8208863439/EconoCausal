# Changelog

All notable changes to the **EconoCausal** platform are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] - 2026-10-15

### Added
- **Infotact Compliance & Audit Documentation**:
  - `PROJECT_AUDIT_REPORT.md`: Comprehensive 16-section audit against Infotact SOP requirements.
  - `WEEK_WISE_IMPLEMENTATION_CHECKLIST.md`: Complete 107-task tracking across Weeks 1 to 4.
  - `GITHUB_COMPLIANCE_REPORT.md`: Repository health and compliance evaluation.
  - `WORK_DISTRIBUTION.md`: Matrix of module ownership and team role accountability.
  - `TESTING_REPORT.md`: Detailed test architecture, 153-case inventory, and environment diagnostics.
  - `VIVA_PREPARATION.md`: 35 extensive technical oral defense questions and answers.
  - `DEPLOYMENT_GUIDE.md`: Multi-environment deployment, containerization, and operations manual.
  - `ACTION_PLAN.md`: Prioritized P0/P1/P2 remediation and review-day checklist.
  - `REVIEW_READINESS_REPORT.md`: Final grading projections and readiness self-assessment.
- **Git Tracking of Critical Artifacts**:
  - Unlocked `ml/models/causal_forest_dml.joblib` (6.9MB) and `data/processed/discount_allocation.csv` in `.gitignore`.

### Changed
- `backend/main.py`: Updated `BudgetConfigPayload` default currency from `"GBP"` to `"INR"`.
- `frontend/src/services/api.js`: Updated offline fallback version from `3.0.0` (week 3) to `4.0.0` (week 4).

---

## [3.5.0] - 2026-10-14 (`2c04c4e`)

### Added
- Enterprise SaaS dashboard redesign for React frontend.
- Modern glassmorphism, responsive navigation bar, and dark mode palette.
- Interactive KPI cards, ATE hero banner, and quick action panels on `OverviewPage.jsx`.

---

## [3.0.0] - 2026-10-14 (`7f30239`, `aa0959b`)

### Added
- **Week 3 & Week 4 Major Milestone Release**:
  - SciPy Mixed-Integer Linear Programming (`milp` / `linprog`) solver in `src/optimization/budget_optimizer.py`.
  - Benchmark policy engine comparing Optimal MILP, Greedy ITE, Blanket Targeting, and Random Allocation.
  - Two-sample Kolmogorov-Smirnov (KS) test and Population Stability Index (PSI) drift engine in `src/monitoring/drift_detector.py`.
  - FastAPI v4.0.0 application (`backend/main.py`) with 21 REST API endpoints.
  - React frontend 8-page analytics dashboard.
  - Comprehensive unit test suites (`tests/test_budget_optimizer.py`, `tests/test_drift_detector.py`, `tests/test_optimization_api.py`, `tests/test_week4_api.py`).

### Fixed
- Baseline self-comparison calibration in drift monitoring report.

---

## [2.0.0] - 2026-10-12 (`84d3189`, `1c90dee`)

### Added
- **Week 2 Causal Inference & Double Machine Learning (DML) Milestone**:
  - EconML `CausalForestDML` implementation with XGBoost nuisance estimators in `ml/dml_estimation.py`.
  - Pipeline training script `ml/train_causal_model.py` producing `causal_forest_dml.joblib`.
  - Causal evaluation engine `ml/evaluate_causal.py` generating Uplift curves, Qini coefficient (+0.6839), Cumulative Gain, and AUUC.
  - Refutation test suites (Placebo Treatment and Random Common Cause confounder tests).
  - Milestone report `reports/week2_causal_inference_report.md`.

---

## [1.0.0] - 2026-10-10 (`c60db1e`, `77c2202`, `8d6e94a`, `6eaa112`, `57dfbd5`)

### Added
- **Week 1 Data Architecture & DAG Milestone**:
  - Synthetic data generation script `src/data/generate_mock_data.py` (100,000 samples, 12 features, non-linear propensity).
  - Preprocessing pipeline `src/data/preprocess.py` with leakage-free train/test split.
  - Directed Acyclic Graph (DAG) specification `src/causal/dag.py` and graph visualization figure.
  - Project documentation (`README.md`, `.env.example`, `CONTRIBUTING.md`).
  - Milestone report `reports/week1_eda_and_dag_report.md`.
