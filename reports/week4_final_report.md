# EconoCausal — Week 4: API Packaging, Data Drift Detection, and Final Delivery Report
**Project Name:** EconoCausal — Dynamic Pricing via Double Machine Learning  
**Project Reference:** ITS/DSML/1147  
**Domain:** Economics, Causal AI, Data Science & Machine Learning  
**GitHub Repository:** [https://github.com/Krishna8208863439/EconoCausal](https://github.com/Krishna8208863439/EconoCausal)  
**Date:** October 2026  
**Status:** Complete  

---

## Executive Summary

Week 4 completes the development lifecycle of **EconoCausal**, transforming our causal Double Machine Learning estimator (Week 2) and prescriptive Mixed-Integer Linear Programming optimizer (Week 3) into an enterprise-ready, production-grade decision-support platform.

The core deliverables of Week 4 include:
1. **REST API Packaging (`backend/main.py`):** Upgraded to **FastAPI v4.0.0** with 14 modular endpoints covering model training, real-time counterfactual inference, budget allocation, automated data drift diagnostics, and executive business summaries.
2. **Automated Data-Drift Detection Engine (`ml/drift_detector.py`):** Statistical monitoring comparing live incoming cohorts against the approved reference dataset using Two-Sample Kolmogorov-Smirnov (KS) tests, Chi-Square contingency tests, and decile Population Stability Index (PSI).
3. **Deterministic Natural-Language Business Summaries (`ml/business_summary.py`):** Plain-language executive briefings populated strictly from verified artifacts—eliminating hallucination and providing transparent explanations of budget allocation, causal uplifts, and drift alerts.
4. **React Dashboard Refinement (`frontend/`):** Two new dedicated pages added:
   - **Data Drift Monitor (`DriftPage.jsx`):** Live cohort auditing, interactive CSV drag-and-drop audit, and per-feature stability matrices.
   - **Final Delivery & Deck (`FinalReportPage.jsx`):** Interactive 10-slide executive presentation viewer and end-to-end milestone inventory.
   - **Overview Page Refinement (`OverviewPage.jsx`):** Real-time executive decision intelligence summary card and drift status badge.
5. **Quality Assurance & Verification:** 63 automated unit, integration, and API tests passing with 100% success rate (`pytest`). Vite production bundle compiling in 23 seconds with zero errors.

---

## 1. REST API Architecture & Packaging

The backend is built with FastAPI and Uvicorn, structured for asynchronous task execution, input validation via Pydantic models, and cross-origin resource sharing (CORS).

### Implemented Endpoints Reference

| Method | Endpoint | Category | Description |
|---|---|---|---|
| `GET` | `/health` | Core | API health, version (`4.0.0`), active week (`4`), and timestamp. |
| `GET` | `/project/status` | Monitoring | Readiness status across Weeks 1–4 and artifact verification. |
| `GET` | `/data/summary` | Data | Active dataset record counts, treated/control split, and purchase rates. |
| `GET` | `/data/preview` | Data | First N records preview of active dataset. |
| `POST` | `/data/upload` | Data | Upload new dataset CSV with schema validation. |
| `POST` | `/data/load-default` | Data | Reset and reload baseline synthetic campaign dataset (2,200 rows). |
| `POST` | `/causal/dag` | Causal AI | Structural DAG node, edge, and identifiability assumptions. |
| `POST` | `/model/train` | Causal ML | Asynchronous Double Machine Learning training (`CausalForestDML`). |
| `GET` | `/model/status` | Causal ML | DML training status, estimator type, and nuisance diagnostics. |
| `POST` | `/causal/estimate` | Causal ML | Real-time out-of-fold ITE prediction and 95% CI for custom profiles. |
| `GET` | `/causal/results` | Evaluation | Complete causal evaluation metrics, ATE, Qini curve, and segments. |
| `GET` | `/causal/diagnostics`| Evaluation | Propensity overlap, nuisance scores, and balance diagnostics. |
| `POST` | `/budget/config` | Prescriptive | Save marketing budget, currency, and discount parameters. |
| `GET` | `/budget/config` | Prescriptive | Retrieve stored campaign budget settings. |
| `GET` | `/optimization/config`| Prescriptive | MILP solver defaults, constraints, and file availability. |
| `POST` | `/optimization/run` | Prescriptive | Background task triggering SciPy MILP budget optimizer. |
| `GET` | `/optimization/results`| Prescriptive | Paginated customer allocation matrix (sanitized for privacy). |
| `GET` | `/optimization/summary`| Prescriptive | Budget utilization percentage and 4-policy benchmark data. |
| `GET` | `/optimization/export` | Prescriptive | Full 2,200 customer allocation records for marketing export. |
| `GET` | `/drift/report` | Drift | Retrieve latest automated covariate drift diagnostic report. |
| `POST` | `/drift/check` | Drift | Multipart CSV audit evaluating candidate cohorts against reference baseline. |
| `GET` | `/summary/business` | Reporting | Deterministic natural-language executive briefings. |

### Security, Validation, and Data Governance Safeguards
- **Schema Sanitization:** Endpoints returning customer-level allocation matrices (`/optimization/results`, `/optimization/export`) automatically strip sensitive observed outcomes (`actual_treatment`, `actual_outcome`) to prevent data leakage.
- **Upload Guards:** Enforces file-type validation (`.csv` only) and a strict 50MB request body size cap (`HTTP 413 Payload Too Large`).
- **Mathematical Infeasibility Checks:** The optimizer rejects configurations where discount coupon cost exceeds the total budget (`HTTP 422 Unprocessable Entity`).
- **Model Deserialization Protection:** Loads model artifacts strictly from local, access-controlled directory paths (`ml/models/`) using `joblib`.

---

## 2. Automated Data-Drift Detection Methodology

In dynamic retail pricing, customer demographics, macroeconomic conditions, and seasonal behaviors shift over time. If the customer distribution shifts significantly from the training cohort, model uncertainty increases.

### 2.1 Statistical Testing Framework

The detector compares an incoming customer cohort $D_{\text{curr}}$ against the approved reference dataset $D_{\text{ref}}$ (`cleaned_retail_campaign.csv`, $N=2,200$):

1. **Continuous Features (`past_purchases`, `avg_order_value`, `website_visits`):**
   - **Two-Sample Kolmogorov-Smirnov (KS) Test:** Evaluates whether $F_{\text{curr}}(x) = F_{\text{ref}}(x)$.
     $$D = \sup_x |F_{\text{ref}}(x) - F_{\text{curr}}(x)|$$
     A rejection threshold of $p < 0.05$ flags statistically significant shape shifts.
   - **Population Stability Index (PSI) via Deciles:** Binned into 10 quantiles derived from the reference distribution, with extreme bin edges spanning $[-\infty, +\infty]$:
     $$\text{PSI} = \sum_{b=1}^{B} \Big( P_{\text{curr}, b} - P_{\text{ref}, b} \Big) \times \ln\left( \frac{P_{\text{curr}, b}}{P_{\text{ref}, b}} \right)$$
     Laplace smoothing ($\epsilon = 10^{-4}$) is applied to prevent division by zero.
2. **Categorical Features (`age_group`, `customer_segment`):**
   - **Chi-Square Contingency Test:** Tests independence of category frequencies across cohort periods:
     $$\chi^2 = \sum \frac{(O - E)^2}{E}$$
   - **Discrete Categorical PSI:** Evaluates stability across distinct demographic categories.
3. **Missingness Auditing:**
   - Detects missing-value rate spikes exceeding $\Delta \ge 5.0$ percentage points relative to baseline.

### 2.2 Operational Severity Thresholds

- **PSI < 0.10:** `STABLE` (Distribution shift is negligible; normal operations).
- **0.10 ≤ PSI < 0.25:** `MODERATE_DRIFT` (Noticeable shift; ongoing monitoring advised).
- **PSI ≥ 0.25:** `SIGNIFICANT_DRIFT` (Substantial distribution shift; investigate data sources and marketing channel changes).

### 2.3 Econometric Policy on Drift & Autonomous Retraining

> **CRITICAL CAUSAL ML GOVERNANCE PRINCIPLE:**  
> A statistical covariate drift alert indicates a distribution shift in customer characteristics. Under Robinson's residualization and unconfoundedness, **causal estimates remain asymptotically unbiased as long as common support (positivity) holds**. While out-of-support predictions carry higher variance, covariate drift does **NOT** by itself prove model degradation.  
> **Autonomous retraining is strictly prohibited.** Retraining without fresh randomized experimental or unconfounded observational data risks reinforcing feedback loops. Drift alerts require human econometric inspection.

---

## 3. Natural-Language Business Summaries

To bridge the gap between complex econometric models and commercial decision-makers, `ml/business_summary.py` converts verified analysis results into deterministic plain-language briefings.

### Prescriptive Campaign Briefing Template
```
"During this prescriptive campaign analysis, the system evaluated 1,420 eligible customers 
(out of 2,200 total evaluated customers) under a marketing budget of ₹5,000.00. 
The Mixed-Integer Linear Programming optimizer selected 500 high-uplift customers, 
allocating ₹5,000.00 of the budget (100.0% utilization) at a fixed coupon cost of ₹10.00 per offer. 
The remaining unallocated budget is ₹0.00. 
The estimated incremental business contribution is +₹1,887.45 with an expected uplift of 
+125.2 orders under the configured objective and causal Double Machine Learning assumptions."
```

### Operational Highlights
- **100% Verified:** All numerical values are pulled directly from validated outputs (`discount_allocation.csv`, `causal_evaluation_results.json`).
- **Clear Disclosures:** Explicitly labels incremental conversions (+125.2 orders) and contribution margins (+₹1,887.45) as statistical model estimates, not realized revenue.
- **Drift Context:** Translates statistical PSI values into actionable marketing guidance (e.g., advising channel auditing when high drift is detected).

---

## 4. Dashboard Refinement & User Experience

The React dashboard was refined to support the full 4-week decision workflow while preserving existing Week 1–3 views:

1. **Overview Page (`OverviewPage.jsx`):**
   - Displays real-time executive decision intelligence summary card.
   - Shows live system status badges (API Live v4.0.0, Drift Status: STABLE).
   - Milestone checklist updated with all 4 completed weeks.
2. **Data Drift Monitor (`DriftPage.jsx`):**
   - Live KPI cards (Overall Status, Reference records, Evaluated records, Drifted feature count).
   - Interactive cohort audit widget enabling instant drag-and-drop CSV auditing.
   - Per-feature stability matrix with decile breakdown table.
   - Data missingness and quality audit table.
3. **Discount Allocation Matrix (`BudgetOptimization.jsx`):**
   - Real-time parameter tuning (Budget, Coupon Cost, Min ITE Threshold).
   - Plotly budget utilization donut chart and 4-policy comparison chart.
   - 2,200 customer allocation table with search, sorting, filtering, and CSV download.
4. **Final Project Report & Deck (`FinalReportPage.jsx`):**
   - Interactive 10-slide executive presentation viewer with previous/next controls.
   - Deliverables inventory table.
   - Plain-language executive briefing synthesis.

---

## 5. End-to-End Automated Test Verification

The complete codebase was evaluated with **63 automated tests** across six distinct test suites:

```powershell
python -m pytest tests/test_budget_optimizer.py tests/test_allocation_constraints.py tests/test_optimization_api.py tests/test_api.py tests/test_drift_detector.py tests/test_week4_api.py -v
```

### Verified Test Results Breakdown
- **`tests/test_budget_optimizer.py` (25 passed):** Validates input schema, budget ceiling enforcement, reproducibility across random seeds, outperformance over random baseline, and edge cases.
- **`tests/test_allocation_constraints.py` (10 passed):** Validates output schema compliance, zero discount cost for unselected/ineligible customers, and CSV consistency.
- **`tests/test_optimization_api.py` (5 passed):** Validates HTTP status codes, payload rejection ($d > B \to 422$), pagination, and sensitive column suppression.
- **`tests/test_api.py` (9 passed):** Validates `/health`, `/data/summary`, `/data/preview`, `/causal/dag`, and model training endpoints.
- **`tests/test_drift_detector.py` (8 passed):** Validates zero drift on identical datasets, numerical shift detection, categorical shift detection, missingness warnings, schema incompatibility rejection, and small-sample edge cases.
- **`tests/test_week4_api.py` (6 passed):** Validates `/health` v4.0.0, `/project/status` 4-week readiness, `/drift/report`, `/drift/check` multipart CSV evaluation, and `/summary/business`.

**Pytest Output:**
```
======================= 63 passed, 1 warning in 9.31s ========================
```

### Frontend Build Verification
```powershell
cd frontend; npm run build
```
**Vite Build Output:**
```
✓ 75 modules transformed.
dist/index.html                     0.60 kB
dist/assets/index-CBMS0vVc.css     16.17 kB
dist/assets/index-BysEA5or.js   5,042.17 kB
✓ built in 23.25s
```

---

## 6. Executive Presentation Slide Deck Outline

### Slide 1: Title & Executive Vision
- **Title:** EconoCausal — Dynamic Pricing via Double Machine Learning
- **Subtitle:** Maximizing Incremental Campaign Margin under Strict Marketing Budgets
- **Vision:** Shifting from passive predictive scoring to prescriptive counterfactual optimization.

### Slide 2: The Core Problem — Predictive ML vs Causal AI
- **Predictive ML:** Predicts high-intent customers who would buy anyway, leading to promotional cannibalization.
- **Causal AI:** Isolates persuadables—customers whose behavior changes specifically because of the coupon offer.

### Slide 3: Econometric DAG & Confounder Identification
- **DoWhy DAG:** Formalizes structural relationships between past engagement, demographics, discount offers, and purchases.
- **Assumptions:** Unconfoundedness (no unobserved common causes) and Positivity (99.91% common support).

### Slide 4: Double Machine Learning (DML) Estimation
- **Method:** EconML `CausalForestDML` with Robinson's residualization and 5-fold cross-fitting.
- **Finding:** Removes +8.84 pp confounding bias; identifies true population ATE of +19.47 percentage points.

### Slide 5: Uplift & Qini Curve Diagnostics
- **Metric:** Validated Qini coefficient of **+0.6839**.
- **Efficiency:** Targeting top deciles delivers 2.4× the conversion rate of unranked blasts.

### Slide 6: Prescriptive Optimization (SciPy MILP)
- **Objective:** Maximize $\sum x_i \cdot (\tau_i \cdot M_i - d)$ subject to $\sum x_i \cdot d \le \text{₹5,000}$.
- **Result:** Exactly 500 customers selected, hitting 100% budget utilization with ₹0 deficit.

### Slide 7: 4-Policy Benchmark Comparison
- **Causal DML:** +₹1,887.45 net contribution margin (+125.2 incremental orders).
- **Random Baseline:** +₹933.51 net contribution margin (+95.8 incremental orders).
- **Commercial Lift:** **+102.2% net profit lift** over random targeting at identical expenditure.

### Slide 8: Automated Data-Drift Monitoring
- **Methods:** Kolmogorov-Smirnov continuous tests, Chi-Square categorical tests, and decile PSI.
- **Governance:** Covariate drift triggers human review, never autonomous retraining.

### Slide 9: FastAPI & Dashboard Architecture
- **API:** 14 REST endpoints (v4.0.0) with Pydantic validation, error handling, and upload protection.
- **Frontend:** React 18 dashboard with interactive Plotly visualizers and natural-language summaries.

### Slide 10: Final Acceptance & Next Steps
- **Status:** All Week 1–4 milestones verified and complete (63 tests passing).
- **Future Work:** Multi-tier discount dosage and off-policy reinforcement learning.

---

## 7. Known Limitations & Responsible Use

1. **Binary Treatment Contrast:** The causal model assesses binary coupon offers (offer vs no offer). Continuous price elasticity curves require multi-treatment causal models.
2. **Margin Proxy:** Historical average order value (`avg_order_value`, mean ₹55.00) is used as a proxy for customer contribution margins.
3. **Stable Unit Treatment Value Assumption (SUTVA):** Assumes no promotional spillovers or viral interactions between customers.
4. **Statistical Estimates Disclosure:** All predicted conversions and margin figures are statistical expectations subject to 95% confidence intervals, not guaranteed realized revenues.
