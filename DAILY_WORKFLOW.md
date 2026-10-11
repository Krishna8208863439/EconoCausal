# EconoCausal — Daily Workflow & Progress Log

> **Project Reference:** ITS/DSML/1147  
> **Target Branch:** `shashwat230710-patch-1` (Locked rule: All work is committed and pushed directly to this branch; never to `main`, no new branches created).

---

## Roadmap Overview

| Day | Focus Area | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Day 1** | Onboarding & Repository Hardening | ✅ Completed | `.env.example`, `CONTRIBUTING.md`, `tests/test_causal_dag.py` |
| **Day 2** | Propensity Scoring & Overlap Diagnostics | ✅ Completed | `src/causal/propensity.py`, `tests/test_propensity.py`, `src/run_pipeline.py` |
| **Day 3** | Covariate Balance & Positivity Diagnostics | ⏳ Planned | Covariate balance tables, SMD (Standardized Mean Difference) checks |
| **Day 4** | DML Outcome & Treatment Nuisance Models | ⏳ Planned | Cross-fitting regression models ($m(X)$ and $e(X)$) |
| **Day 5** | Initial Double Machine Learning Estimator | ⏳ Planned | Partialing-out DML / Robinson transformation for Treatment Effects |

---

## Day 1 — Onboarding, Environment & Guidelines (Completed)
- **Goal:** Establish standard configuration, branching enforcement, and missing causal DAG tests.
- **Tasks Completed:**
  - [x] Analyzed `README.md` and repository structure.
  - [x] Created [`.env.example`](file:///.env.example) with environment variable templates.
  - [x] Created [`CONTRIBUTING.md`](file:///CONTRIBUTING.md) enforcing branch policies (no pushes to `main`).
  - [x] Created [`tests/test_causal_dag.py`](file:///tests/test_causal_dag.py) testing DoWhy causal graph definition and variables.
  - [x] Verified test suite: 78 tests passing + 1 optional skipped.
  - [x] Pushed commit `77c2202` to `shashwat230710-patch-1`.

---

## Day 2 — Propensity Scoring & Overlap Diagnostics (Completed)
- **Goal:** Implement the propensity score estimation nuisance model $e(X) = P(T=1 \mid X)$ and overlap diagnostics foundational for Double Machine Learning (DML).
- **Tasks Completed:**
  - [x] **Task 2.1 — Workflow Documentation:** Created and maintained this [`DAILY_WORKFLOW.md`](file:///DAILY_WORKFLOW.md) for day-wise tracking.
  - [x] **Task 2.2 — Propensity Engine ([`src/causal/propensity.py`](file:///src/causal/propensity.py)):**
    - Built scikit-learn pipeline for confounder transformation (one-hot encoding categoricals, scaling numerics).
    - Fitted logistic regression propensity model predicting `discount_offered` from `COMMON_CAUSES`.
    - Computed overlap diagnostics (AUC-ROC: 0.5613, Brier score: 0.2401, Positivity violations: 0.00%, Common support: 100%).
    - Implemented Inverse Propensity Weights (IPW) with stabilization.
  - [x] **Task 2.3 — Unit Tests ([`tests/test_propensity.py`](file:///tests/test_propensity.py)):**
    - 10 unit tests covering pipeline steps, score boundaries $[0, 1]$, index preservation, overlap metrics, and IPW weights.
    - Updated [`src/data/preprocess.py`](file:///src/data/preprocess.py) to accept in-memory DataFrames directly.
  - [x] **Task 2.4 — Pipeline Orchestrator ([`src/run_pipeline.py`](file:///src/run_pipeline.py)):**
    - Created single CLI entry-point to execute the complete pipeline sequentially.
  - [x] **Task 2.5 — Full Test Suite Verification:**
    - Ran all 89 unit tests (88 passed, 1 skipped). All passing in 1.35s.

---

## Day 3 Preview — Covariate Balance & Refutation
- Calculate Standardized Mean Differences (SMD) before and after propensity weighting.
- Check Love plots / balance tables to verify adjustment removes observable confounding.
