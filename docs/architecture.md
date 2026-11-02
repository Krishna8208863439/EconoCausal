# EconoCausal — System Architecture & Component Design
**Project Title:** EconoCausal — Dynamic Pricing via Double Machine Learning  
**Internship Reference:** ITS/DSML/1147  
**Organization:** Infotact Solutions  
**Version:** 4.0.0 (Day 5-6 Freeze & Review Readiness)  
**Date:** November 2026  

---

## 1. System Overview & Core Dataflow

EconoCausal is an end-to-end econometric and prescriptive machine-learning platform engineered to eliminate promotional margin cannibalization. The architecture transforms observational retail campaign data into customer-level causal treatment effects, applies a constrained 0-1 knapsack binary integer program (BIP), audits covariate distribution stability, and exposes insights via an enterprise SaaS analytics dashboard.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EconoCausal Dataflow                              │
└─────────────────────────────────────────────────────────────────────────────┘
  [Raw Campaign Data]
         │
         ▼
  [Layer 1: Preprocessing & Cohort Validation] ──> cleaned_retail_campaign.csv
         │
         ▼
  [Layer 2: Structural Causal DAG & Overlap Audit] ──> causal_dag_schema.json
         │
         ▼
  [Layer 3: Double Machine Learning (EconML)]
         ├── Outcome Model: E[Y | X] (Random Forest Regressor)
         ├── Propensity Model: E[T | X] (Random Forest Classifier)
         └── Robinson Residualization with 5-Fold Cross-Fitting
         │
         ▼  Output: effects.csv / dml_pricing_results.json (τ_hat, CI, p0_hat)
  [Layer 4: Prescriptive Knapsack Optimizer (SciPy HiGHS MILP)]
         ├── Objective: Maximize Σ x_i · [ τ_i · (Margin_i − d) − p_{0,i} · d ]
         ├── Hard Spend Constraint: Σ x_i · d ≤ Budget
         └── Strategic Constraints: Segment Caps, Conservative Mode (τ_lo > 0)
         │
         ▼  Output: discount_allocation.csv / pricing_optimization_results.json
  [Layer 5: Automated Drift Detector & Governance]
         ├── Two-Sample KS Tests & Chi-Square Tests
         └── Decile Population Stability Index (PSI) ──> latest_drift_report.json
         │
         ▼
  [Layer 6: Production REST API (FastAPI) & SQLite Run Store]
         │
         ▼
  [Layer 7: Enterprise React Dashboard (Vite + Plotly)]
         ├── Overview KPIs & Milestones
         ├── Exploratory Data Analysis (EDA)
         ├── Structural DAG & Identification
         ├── Uplift & Qini Curve Diagnostics
         ├── Prescriptive Knapsack Optimizer & Budget Sweep
         ├── Covariate Drift Monitor
         └── Executive Presentation Deck & Review Hub
```

---

## 2. Component Specifications

### 2.1 Layer 1: Data Ingestion & Sanitization
- **Source Scripts:** `src/data/generate_data.py`, `src/data/preprocess.py`
- **Output Artifact:** `data/processed/cleaned_retail_campaign.csv` ($N = 2,200$, 11 columns)
- **Feature Set:**
  - Identifiers: `customer_id` (excluded from training to prevent spurious memorization).
  - Covariates ($X$): `past_purchases`, `avg_order_value`, `website_visits`, `age_group`, `customer_segment`.
  - Treatment ($T$): `discount_offered` $\in \{0, 1\}$.
  - Treatment Magnitude ($d$): `discount_amount` (₹10 baseline).
  - Outcome ($Y$): `purchased` $\in \{0, 1\}$.
  - Auxiliary: `revenue`, `campaign_date`.
- **Validation Rules:** Zero missing values tolerance, numerical clipping on extreme outliers, strict train/test separation.

### 2.2 Layer 2: Structural Causal DAG & Identification
- **Source Scripts:** `src/causal/build_dag.py`, `src/causal/propensity.py`
- **Formal Identification Theorem:**
  - Backdoor Criterion: Conditioning on observable set $X = \{\text{past\_purchases}, \text{avg\_order\_value}, \text{website\_visits}, \text{age\_group}, \text{customer\_segment}\}$ blocks all spurious backdoor paths between $T$ and $Y$.
  - Positivity (Common Support): Propensity scores bounded in $[0.400, 0.766]$, with $99.91\%$ of records residing strictly within common support.
  - SUTVA: Independence of customer purchasing decisions (no coupon transferability).

### 2.3 Layer 3: Double Machine Learning (DML) Engine
- **Source Script:** `ml/dml_estimation.py`, `src/causal/dml_estimator.py`
- **Model:** `EconML CausalForestDML` with 5-fold cross-fitting ($K=5$).
- **Nuisance Estimators:**
  - $l(X) = \mathbb{E}[Y \mid X]$: Random Forest Regressor (500 trees, max depth 6).
  - $m(X) = \mathbb{E}[T \mid X]$: Random Forest Classifier with calibrated probabilities.
- **Robinson Residualization:**
  $$\tilde{Y} = Y - \hat{l}(X), \quad \tilde{T} = T - \hat{m}(X)$$
  $$\tilde{Y} = \tau(X) \cdot \tilde{T} + \varepsilon$$
- **Output Metrics:**
  - Population ATE: $+19.47\text{ pp}$ ($95\%\text{ CI: } [+5.67\text{ pp}, +33.28\text{ pp}]$).
  - Qini Score: $+0.6839$ (evaluated via `src/evaluation/metrics.py`).
  - True DGP Recovery: Confirmed recovery of synthetic ground truth within confidence bounds.

### 2.4 Layer 4: Prescriptive Knapsack Optimization
- **Source Script:** `ml/budget_optimizer.py`, `src/optimization/budget_optimizer.py`
- **Algorithm:** Mixed-Integer Linear Programming (MILP) solved via SciPy's HiGHS solver (`scipy.optimize.milp`).
- **Objective Function:**
  $$\max_{\mathbf{x}} \quad \sum_{i=1}^{N} x_i \cdot \Big[ \hat{\tau}_i \cdot (\text{Margin}_i - d) - p_{0,i} \cdot d \Big]$$
  - Where $p_{0,i} = \text{clip}\big(m(X_i) - e(X_i) \cdot \hat{\tau}_i, 0, 1\big)$ represents organic conversion likelihood.
  - The penalty $-p_{0,i} \cdot d$ subtracts the deadweight cost of rewarding organic converters who would have bought anyway.
- **Hard Constraints:**
  - Spend Ceiling: $\sum_{i=1}^{N} x_i \cdot d \le B$.
  - Total Target Cap: $\sum_{i=1}^{N} x_i \le N_{\max}$.
  - Segment Quotas: $\sum_{i \in \text{Segment}_k} x_i \le \text{Cap}_k$.
  - Conservative Confidence Filter: $x_i = 0$ if $\hat{\tau}_{\text{lo},i} \le 0$ (95% statistical significance gate).

### 2.5 Layer 5: Automated Drift Detector & Governance
- **Source Script:** `ml/drift_detector.py`, `src/evaluation/drift.py`
- **Auditing Methodology:**
  - Continuous Features: Two-sample Kolmogorov-Smirnov test ($D$-statistic, $p$-value) and 10-bin Population Stability Index (PSI).
  - Categorical Features: Chi-square test of homogeneity and discrete categorical PSI.
  - Operational Guardrail: Covariate drift alerts signal distribution shifts, but **autonomous retraining is prohibited** without randomized validation data to protect against feedback loop degradation.

### 2.6 Layer 6: REST API & Storage Layer
- **Source Script:** `backend/main.py`, `src/api/main.py`
- **Framework:** FastAPI with Uvicorn worker.
- **SQLite Database:** `data/econocausal.db` persisting pipeline runs, solver configurations, and execution summaries.

### 2.7 Layer 7: Interactive SaaS Frontend
- **Framework:** React 18 SPA built with Vite 5.
- **Visualizations:** Plotly.js (`react-plotly.js`) and Lucide React icons.
- **Client API Engine:** `frontend/src/services/api.js` provides seamless client-side execution with PapaParse CSV streaming and static artifact fallbacks.

---

## 3. Data Contracts & State Management

| Artifact Path | Format | Producing Module | Consuming Modules | Description |
|---|---|---|---|---|
| `data/processed/cleaned_retail_campaign.csv` | CSV | `preprocess.py` | `dml_estimator.py`, `drift_detector.py`, UI | Master sanitized campaign cohort (2,200 rows) |
| `data/processed/causal_dag_schema.json` | JSON | `build_dag.py` | UI, API | DAG nodes, edges, confounder classifications |
| `data/processed/causal_evaluation_results.json` | JSON | `dml_estimation.py` | UI, API | ATE, CATE distributions, Qini curves, nuisance scores |
| `data/processed/discount_allocation.csv` | CSV | `budget_optimizer.py` | UI, API, Marketers | 2,200 customer-level discount allocation decisions |
| `data/processed/pricing_optimization_results.json` | JSON | `budget_optimizer.py` | UI, API | 4-policy comparison matrix & budget sweep table |
| `reports/drift/latest_drift_report.json` | JSON | `drift_detector.py` | UI, API | KS statistics, $p$-values, decile PSIs, drift statuses |

---

## 4. Failure Recovery & Fault Tolerance

1. **Backend Offline Resilience:** If the Python FastAPI backend is stopped or unavailable, `frontend/src/services/api.js` automatically loads static artifacts and executes the MILP knapsack allocation client-side in pure JavaScript, guaranteeing zero UI downtime.
2. **Positivity Guard:** If an incoming customer has a propensity score $e(X) < 0.05$ or $e(X) > 0.95$, the system flags the estimate with an uncertainty warning.
3. **Budget Overflow Prevention:** The optimization solver strictly enforces integer constraints ($x_i \in \{0, 1\}$); actual spend mathematically cannot exceed the budget ceiling.
