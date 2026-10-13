# EconoCausal — Daily Workflow & Progress Log

> **Project Reference:** ITS/DSML/1147  
> **Target Branch:** `shashwat230710-patch-1` (Locked rule: All work is committed and pushed directly to this branch; never to `main`, no new branches created).

---

## Roadmap Overview

| Day | Focus Area | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Day 1** | Onboarding & Repository Hardening | ✅ Completed | `.env.example`, `CONTRIBUTING.md`, `tests/test_causal_dag.py` |
| **Day 2** | Propensity Scoring & Overlap Diagnostics | ✅ Completed | `src/causal/propensity.py`, `tests/test_propensity.py`, `src/run_pipeline.py` |
| **Data Study** | Empirical Data Audit & Quality Hardening | ✅ Completed | `src/data/data_study.py`, `reports/data_study_report.md`, business logic checks |
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

## Interstitial Milestone — Empirical Data Study & Quality Hardening (Completed)
- **Goal:** Conduct an empirical audit on the collected dataset, identify data characteristics and edge cases, and harden data processing without starting major causal estimator construction.
- **Tasks Completed:**
  - [x] **Empirical Data Study ([`src/data/data_study.py`](file:///src/data/data_study.py)):**
    - Built CLI audit tool generating [`reports/data_study_report.md`](file:///reports/data_study_report.md).
    - Audited confounder distributions, finding high right-skewness in `avg_order_value` (skewness: 1.81, kurtosis: 4.86).
    - Verified strict empirical positivity across all customer segments (54%–62% treatment probability) and age groups (56%–62%).
    - Discovered promotional unit economics leak: 17 treated purchasers (2.3%) had `discount_amount > revenue` (loss down to £-9.91).
  - [x] **Pipeline Invariant Guardrails ([`src/data/preprocess.py`](file:///src/data/preprocess.py)):**
    - Added `validate_business_logic()`: enforces control group discount = 0, non-purchaser revenue = 0, and warns on negative promotional margins.
    - Added `validate_campaign_dates()`: validates strict ISO-8601 YYYY-MM-DD date formats across the 90-day window.
    - Added `compute_margin_metrics()`: calculates `net_revenue` and flags `is_negative_margin`.
    - Added `add_causal_nuisance_features()`: creates `log_avg_order_value` (`np.log1p`) to stabilize DML linear nuisance models.
  - [x] **Pipeline Integration ([`src/run_pipeline.py`](file:///src/run_pipeline.py)):**
    - Added Step 3/6 executing the data study audit automatically during full pipeline runs.
  - [x] **Test Suite Expansion ([`tests/test_preprocessing.py`](file:///tests/test_preprocessing.py)):**
    - Added 7 new unit tests for business logic validation, campaign date validation, and margin metrics.
    - Total tests: 97 tests (96 passed, 1 skipped) passing in < 2 seconds.

---

## Day 3 Preview — Covariate Balance & Refutation
- Calculate Standardized Mean Differences (SMD) before and after propensity weighting.
- Check Love plots / balance tables to verify adjustment removes observable confounding.
