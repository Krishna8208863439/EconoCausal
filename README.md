# EconoCausal: Dynamic Pricing via Double Machine Learning

> **A causal machine-learning decision-support platform for estimating
> the incremental impact of discounts and allocating a limited marketing
> budget to customers most likely to change their behavior because of an
> offer.**

**Domain:** Economics, Causal AI, Data Science & Machine Learning\
**Project reference:** ITS/DSML/1147\
**Status:** In development\
**Repository:** [Krishna8208863439/EconoCausal](https://github.com/Krishna8208863439/EconoCausal)

------------------------------------------------------------------------

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Objectives](#3-objectives)
- [4. Why Causal ML and Double Machine Learning?](#4-why-causal-ml-and-double-machine-learning)
- [5. Proposed Solution](#5-proposed-solution)
- [6. Key Features and Modules](#6-key-features-and-modules)
- [7. System Architecture](#7-system-architecture)
- [8. Methodology and Workflow](#8-methodology-and-workflow)
- [9. Dataset Design](#9-dataset-design)
- [10. Technology Stack](#10-technology-stack)
- [11. Repository Structure](#11-repository-structure)
- [12. Implementation Plan](#12-implementation-plan)
- [13. Evaluation Strategy](#13-evaluation-strategy)
- [14. Running the Project](#14-running-the-project)
- [15. API Design (Proposed)](#15-api-design-proposed)
- [16. Dashboard Screens](#16-dashboard-screens)
- [17. Responsible Use and Limitations](#17-responsible-use-and-limitations)
- [18. Expected Deliverables](#18-expected-deliverables)
- [19. Future Enhancements](#19-future-enhancements)
- [20. References](#20-references)
- [21. Author](#21-author)

------------------------------------------------------------------------

## 1. Project Overview

EconoCausal explores how **Causal Machine Learning (Causal ML)** and
**Double Machine Learning (DML)** can support smarter promotional
pricing. Instead of simply predicting which customers are likely to
purchase, the system aims to estimate how much a particular customer's
purchase outcome may change when they receive a discount.

The platform is designed around three connected components:

1. **Causal inference engine** --- estimates the Individual Treatment
   Effect (ITE) of a promotional offer.
2. **Budget optimization engine** --- recommends discount allocations
   under a fixed marketing budget.
3. **Interactive dashboard** --- helps a marketing analyst inspect
   uplift, compare strategies, and review recommended allocations.

The project follows the assigned brief's use case: a marketing director
has a fixed promotional budget and wants to focus spending on customers
whose behavior is likely to change because of a discount.

> **Important:** This repository describes the intended design. Model
> performance, business savings, and causal effects must be established
> by experiments on suitable data; they should not be assumed before
> evaluation.

## 2. Problem Statement

Traditional predictive machine-learning models learn patterns associated
with an outcome. A customer predicted to have a high probability of
leaving or not purchasing is not necessarily a customer whose behavior
will change after receiving a discount.

For example, a customer might purchase with or without a coupon. Giving
that customer a discount may create little incremental value. Another
customer may purchase only when an offer is provided. The second
customer may produce greater incremental value from the promotion.

EconoCausal addresses the following question:

**"For which customers is a discount expected to change the outcome, and
how should a limited promotional budget be allocated?"**

The system estimates treatment effects from observational or
experimental data and uses those estimates in a budget-constrained
allocation process. Causal estimates depend on data quality and
assumptions; observational data alone cannot guarantee that every
confounder has been removed.

## 3. Objectives

- Understand and prepare customer, campaign, treatment, and outcome data.
- Perform exploratory data analysis (EDA) and document data quality.
- Build a causal graph (Directed Acyclic Graph, or DAG) to describe assumptions about confounders.
- Estimate treatment effects using Double Machine Learning (DML).
- Compare treatment-effect estimates with a conventional prediction-only baseline.
- Construct uplift and treatment-effect visualizations.
- Optimize discount allocation under a configurable budget and business constraints.
- Provide a dashboard for inspecting recommendations and expected outcomes.
- Package the analytical workflow in a reusable API.
- Document methods, assumptions, evaluation results, and limitations.

## 4. Why Causal ML and Double Machine Learning?

### Prediction versus intervention

| Approach | Main question | Typical output | Limitation |
| :--- | :--- | :--- | :--- |
| **Predictive ML** | Who is likely to purchase? | Purchase probability | A high probability does not mean a discount caused the purchase |
| **Causal ML** | How might the outcome change if treatment changes? | Estimated treatment effect | Depends on identification assumptions and data quality |
| **Prescriptive optimization** | Which actions should be selected under constraints? | Recommended treatment/discount allocation | Quality depends on causal estimates and the optimization objective |

### Treatment-effect notation

Let:

- $Y$ = outcome, such as whether a customer purchases.
- $T$ = treatment indicator, such as whether a discount was offered.
- $X$ = observed customer and campaign characteristics.
- $Y(1)$ = potential outcome under treatment.
- $Y(0)$ = potential outcome without treatment.

The **Individual Treatment Effect (ITE)** is conceptually:

$$\tau(X) = \mathbb{E}[Y(1) - Y(0) \mid X]$$

For a binary purchase outcome, the effect can be interpreted as an
estimated change in purchase probability. The two potential outcomes are
not simultaneously observable for the same customer, so the ITE is
estimated using statistical assumptions and data.

### Double Machine Learning (DML)

DML uses machine-learning models to estimate nuisance relationships and
an orthogonalized estimating equation to reduce sensitivity to errors in
those nuisance estimates. A typical workflow estimates:

- $m(X) = \mathbb{E}[Y \mid X]$, the outcome relationship.
- $e(X) = \mathbb{E}[T \mid X]$, the treatment propensity.
- The treatment effect using residualized outcome and treatment
  information.

Cross-fitting is commonly used to reduce overfitting bias. DML does
**not** automatically eliminate unobserved confounding or prove
causality. Valid interpretation requires assumptions such as
consistency, overlap/positivity, and conditional exchangeability (or a
suitable experimental design).

## 5. Proposed Solution

The proposed workflow is:

1. Load historical campaign and customer data.
2. Validate records, handle missing values, inspect outliers, and
   encode features.
3. Identify treatment, outcome, covariates, and plausible confounders.
4. Document causal assumptions using a DAG.
5. Estimate customer-level or segment-level treatment effects using DML.
6. Convert the estimates into expected incremental value using a
   clearly defined business objective.
7. Optimize offer allocation under the available budget and eligibility
   rules.
8. Display effect estimates, budget usage, and strategy comparisons in
   a dashboard.
9. Evaluate results with holdout data, sensitivity checks, and---where
   feasible---an online randomized experiment.

The system is decision support, not an automatic guarantee of revenue
growth. Recommendations should be reviewed against business rules and
customer-protection requirements.

## 6. Key Features and Modules

### 6.1 Data ingestion and preprocessing

- Upload or load campaign/customer datasets.
- Validate required columns, data types, duplicates, and missing values.
- Separate treatment, outcome, covariates, identifiers, and cost fields.
- Prevent identifiers and post-treatment variables from accidentally
  entering the adjustment set.

### 6.2 Causal inference engine

- Define treatment and outcome.
- Record a causal DAG and the rationale for adjustment variables.
- Fit a DML estimator with suitable nuisance models and cross-fitting.
- Generate treatment-effect estimates and uncertainty diagnostics where supported.
- Save model configuration and evaluation artifacts.

**Suggested libraries:** EconML and DoWhy. EconML provides estimators
for heterogeneous treatment effects; DoWhy supports causal-model
specification and refutation workflows.

### 6.3 Propensity and overlap diagnostics

- Estimate treatment propensity scores.
- Inspect overlap between treated and untreated customers.
- Flag extreme propensity scores and regions with insufficient comparison data.
- Compare observed covariate balance before and after matching/weighting where such methods are used.

Propensity-score matching is an optional diagnostic or alternative
analysis. It is not a substitute for correctly specifying the causal
question and assumptions.

### 6.4 Uplift and effect visualization

- Display the distribution of estimated treatment effects.
- Compare predicted purchase probability with estimated incremental effect.
- Plot uplift or cumulative gain curves when the dataset and evaluation design support them.
- Compare targeted allocation with a random or blanket-discount baseline.

### 6.5 Budget optimization solver

- Accept a total campaign budget and eligible customer list.
- Consider estimated incremental value, discount cost, and campaign constraints.
- Return the selected customers or segments, recommended discount,
  estimated spend, and predicted incremental outcome.
- Show the objective, assumptions, and constraints used.

A first version can use a transparent constrained optimization model. Do
not interpret a positive purchase-probability uplift as positive profit
unless margin, discount cost, and other relevant costs are included.

### 6.6 Dashboard and reporting

- Upload/select a dataset and configure treatment/outcome columns.
- Set a campaign budget and constraints.
- Review data quality, causal diagnostics, uplift charts, and allocation results.
- Export the recommendation table and experiment report.

## 7. System Architecture

```mermaid
flowchart TD
    A[Historical Customer and Campaign Data] --> B[Data Validation and EDA]
    B --> C[Causal Assumptions and DAG]
    C --> D[Propensity and Outcome Models]
    D --> E[Double Machine Learning Estimator]
    E --> F[Treatment Effect Estimates]
    F --> G[Budget Optimization Solver]
    G --> H[Recommended Allocation and Expected Value]
    H --> I[React and Plotly Dashboard]
    B --> J[Evaluation and Data Quality Reports]
    E --> J
    G --> J
```

### Component responsibilities

- **Frontend:** campaign configuration, data upload, charts, and recommendation tables.
- **Backend/API:** validation, model orchestration, optimization, and report generation.
- **Causal engine:** DML estimation and causal diagnostics.
- **Optimization engine:** budget and policy constraints.
- **Storage:** datasets, experiment configurations, model artifacts, and results, subject to privacy controls.

## 8. Methodology and Workflow

### Phase 1 --- Define the causal question

Specify the intervention (for example, a particular discount), target
population, outcome window, and outcome definition. Define whether the
outcome is purchase, revenue, contribution margin, or another business
metric.

### Phase 2 --- Data preparation and EDA

Check missingness, duplicates, data leakage, treatment assignment,
outcome timing, and covariate distributions. Create a data dictionary
and split data according to the intended evaluation design.

### Phase 3 --- Causal graph and assumptions

Use a DAG to identify plausible pre-treatment confounders. Document why
each adjustment variable is included or excluded. Avoid controlling for
variables caused by the treatment when estimating the total treatment
effect.

### Phase 4 --- Estimate treatment effects

Fit the DML estimator with cross-fitting and suitable nuisance models.
Use appropriate model selection and preprocessing. Compare reasonable
specifications and report uncertainty where available.

### Phase 5 --- Validate and challenge the estimates

- Check propensity overlap and covariate balance.
- Run applicable refutation/sensitivity checks.
- Use held-out evaluation and avoid training/evaluating on the same observations.
- Compare targeting policies with a random or blanket policy using a valid evaluation approach.
- Treat placebo and refutation tests as diagnostics, not proof that all confounding has been removed.

### Phase 6 --- Optimize the campaign

Define the objective and constraints before solving. For example,
maximize estimated incremental contribution margin while keeping total
discount spend below a budget. If only purchase uplift is available,
label the objective as purchase uplift rather than profit.

### Phase 7 --- Visualize and report

Show the analysis population, assumptions, effect estimates,
diagnostics, baseline comparison, selected allocations, budget usage,
and limitations. Make the output reproducible with configuration and
version information.

## 9. Dataset Design

The assignment brief does not provide a dataset. Begin with an
appropriately licensed public dataset or a clearly labelled synthetic
dataset, and document its origin. Synthetic data is useful for
validating the pipeline but does not establish real-world business
impact.

### Suggested schema

| Column | Meaning | Example/type |
| :--- | :--- | :--- |
| `customer_id` | Pseudonymous customer key | String/integer |
| `age_group` | Optional customer segment | Category |
| `past_purchases` | Historical purchase count | Integer |
| `avg_order_value` | Historical average order value | Numeric |
| `website_visits` | Pre-campaign engagement | Integer |
| `discount_offered` | Treatment indicator | 0/1 |
| `discount_amount` | Offer amount, if applicable | Numeric |
| `purchased` | Outcome within a defined window | 0/1 |
| `revenue` | Observed revenue in the outcome window | Numeric |
| `contribution_margin` | Revenue less relevant variable costs | Numeric, if available |
| `campaign_date` | Campaign date | Date |

This is a suggested schema, not a claim about an existing dataset.
Include only fields that are available, relevant, and measured at the
correct time. In particular, do not use post-treatment fields as
pre-treatment confounders.

### Data requirements

- Treatment and control observations must be meaningfully comparable.
- Treatment and outcome definitions must be consistent.
- There must be adequate overlap in treatment assignment across relevant covariates.
- Include cost/margin data if the goal is profit or ROI optimization.
- Record data provenance, license, privacy constraints, and any synthetic-data assumptions.

## 10. Technology Stack

| Layer | Proposed technology | Purpose |
| :--- | :--- | :--- |
| **Causal inference** | Python, EconML, DoWhy | DML estimation, causal model and refutation checks |
| **Data processing** | Pandas, NumPy, scikit-learn | Cleaning, transformations, nuisance models |
| **Optimization** | SciPy | Constrained budget allocation |
| **API** | FastAPI (recommended) | Expose analysis and optimization endpoints |
| **Frontend** | React | Interactive campaign dashboard |
| **Visualization** | Plotly | Uplift, effect, and budget charts |
| **Data storage** | CSV/Parquet initially; database if needed | Dataset and run metadata |
| **Version control** | Git and GitHub | Reproducible collaborative development |

The assignment brief names Python, EconML, DoWhy, SciPy, React, and
Plotly. FastAPI and the storage options above are implementation
recommendations; the final stack can be adjusted to the existing
repository.

## 11. Repository Structure

Suggested structure (adapt it to the code that actually exists):

```text
EconoCausal/
├── README.md
├── requirements.txt
├── .env.example
├── README.md
├── requirements.txt
├── data/
│   ├── raw/
│   │   └── mock_retail_campaign.csv        # Synthetic retail campaign (seed 42)
│   └── processed/
│       ├── cleaned_retail_campaign.csv     # Cleaned dataset (2 200 records)
│       ├── ite_predictions.csv             # Customer-level ITE predictions & 95% CIs
│       └── causal_evaluation_results.json  # Structured metrics, uplift & Qini data
├── ml/
│   ├── dml_estimation.py                   # EconML CausalForestDML & LinearDML pipeline
│   ├── train_nuisance_models.py            # Nuisance models E[T|X] & E[Y|X], overlap checks
│   ├── evaluation.py                       # Uplift, Qini, policy evaluation & report generator
│   └── models/
│       └── causal_forest_dml.joblib        # Trained DML model artifact
├── src/
│   ├── data/
│   │   ├── generate_data.py
│   │   ├── preprocess.py
│   │   └── eda.py
│   └── causal/
│       └── build_dag.py                    # DoWhy causal DAG export
├── backend/
│   └── main.py                             # FastAPI server (health, train, estimate, diagnostics)
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── causal_dag.png
│   │   ├── causal_evaluation_results.json
│   │   └── eda_figures/
│   └── src/
│       ├── charts/                         # Reusable Plotly.js chart components
│       │   ├── TreatmentEffectChart.jsx
│       │   ├── UpliftCurve.jsx
│       │   ├── QiniCurve.jsx
│       │   └── PolicyComparisonChart.jsx
│       ├── pages/                          # OverviewPage, DataPage, CausalPage, UpliftPage, BudgetPage
│       ├── components/
│       └── services/
│           └── api.js                      # Backend API client with offline fallback
├── reports/
│   ├── figures/                            # 14 diagnostic figures (EDA + DML + Uplift)
│   ├── week1_eda_report.md
│   ├── week1_causal_analysis.md
│   ├── week1_completion_report.md
│   └── week2_model_evaluation.md           # Comprehensive Week 2 DML evaluation report
└── tests/
    ├── test_data_generation.py
    ├── test_preprocessing.py
    ├── test_dml_estimation.py              # DML unit & integration tests
    ├── test_evaluation.py                  # Uplift, Qini & policy evaluation tests
    └── test_api.py                         # FastAPI endpoints tests
```

Keep raw/private data and secrets out of Git. Commit only safe sample
data, code, documentation, and appropriately licensed artifacts.

## 12. Implementation Plan

The following plan translates the assignment brief into practical
milestones. The brief describes a four-week technical plan, while the
assignment letter states a one-month project completion duration.

| Milestone | Causal ML & optimization | Dashboard & reporting | Status |
| :--- | :--- | :--- | :--- |
| **Week 1** | Define the causal question, inspect data, create a DAG with DoWhy, identify treatment/outcome/confounders | Scaffold React dashboard; add data upload and budget configuration | ✅ Complete |
| **Week 2** | Train DML estimator with EconML (CausalForestDML), evaluate nuisance models, compute uplift & Qini curves | Add interactive Plotly effect/uplift/Qini charts, policy comparison, live customer estimator, FastAPI backend | ✅ Complete |
| **Mid-project review** | Review identification assumptions, propensity common support, benchmark against synthetic DGP | Validate dynamic filtering, interactive inference, and robust testing (99 tests) | ✅ Complete |
| **Week 3** | Implement SciPy MILP optimization under strict marketing budget; benchmark 4 allocation policies | Customer-level Discount Allocation Matrix with sorting, filtering, CSV export, and Plotly allocation charts | ✅ Complete |
| **Week 4** | REST API packaging (v4.0.0), automated KS & PSI data drift detector, plain-language business summaries | Add Data Drift Monitor page, Final Report presentation deck, and end-to-end test verification (63 tests) | ✅ Complete |

The provided project image describes a similar progression, including a
causal graph, DML training, causal audit, prescriptive optimization, API
packaging, and dashboard refinement. Exact deliverables should be agreed
with the assigned mentor.

## 13. Evaluation Strategy & Verified Week 2 Results

### Data and model diagnostics

- Missing-value and data-quality summary: Cleaned dataset has 2,200 records with 0 missing values.
- Treatment propensity distribution and overlap: Overlap window `[0.400, 0.766]`, common support fraction **99.91%**.
- Nuisance-model performance:
  - Treatment Model ($E[T|X]$): RandomForestClassifier (ROC-AUC: `0.5359`, Brier: `0.2426`).
  - Outcome Model ($E[Y|X]$): RandomForestRegressor (RMSE: `0.5017`, Brier: `0.2517`).
- Stability of treatment-effect estimates: 5-fold cross-fitting avoids regularisation bias.
- Confidence intervals: 95% asymptotic confidence intervals computed via EconML bootstrap/forest variance.

### Verified Experimental Results

| Metric | Naïve Baseline | EconML CausalForestDML | Ground Truth (DGP) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Population ATE** | +20.86 pp | **+19.47 pp** | +12.02 pp | Confounding bias removed: -1.39 pp |
| **95% Confidence Interval** | N/A | **[+5.67 pp, +33.28 pp]** | N/A | Valid non-zero causal effect |
| **Qini Score** | 0.000 (Random) | **+0.6839** | N/A | Substantial excess gain over random allocation |
| **Causal Targeting Conversions** | +97.4 buyers | **+104.5 buyers** | N/A | At £5,000 budget (500 discounts @ £10) |
| **Targeting Efficiency Advantage** | Baseline | **+7.3% lift** | N/A | Causal targeting outperforms random |
| **Common Support Overlap** | N/A | **99.91%** | 100.0% | Positivity assumption satisfied |

## 14. Running the Project — Week 1 Setup

> **Environment:** Python 3.14, Node.js 22, Windows PowerShell.  
> All data is entirely synthetic — no real customer data is used.

### Prerequisites

| Tool | Minimum version | Notes |
| :--- | :--- | :--- |
| Python | 3.10+ | 3.14 confirmed working |
| pip | any recent | bundled with Python |
| Node.js | 18+ | 22 confirmed working |
| npm | 9+ | bundled with Node.js |
| Git | any | for cloning |

---

### Step 1 — Clone and enter the repository

```powershell
git clone https://github.com/Krishna8208863439/EconoCausal.git
cd EconoCausal
```

---

### Step 2 — Create and activate a Python virtual environment

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

> If activation is blocked by execution policy, run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

### Step 3 — Install Python dependencies

```powershell
pip install -r requirements.txt
```

Key packages installed: `numpy`, `pandas`, `scikit-learn`, `dowhy`,
`matplotlib`, `seaborn`, `plotly`, `networkx`, `pytest`.

---

### Step 4 — Generate the synthetic dataset

```powershell
python src/data/generate_data.py
```

Output: `data/raw/mock_retail_campaign.csv` (2 244 rows, seed = 42).

---

### Step 5 — Run the preprocessing pipeline

```powershell
python src/data/preprocess.py
```

Output: `data/processed/cleaned_retail_campaign.csv` (2 200 rows, no missing values).

---

### Step 6 — Run EDA and generate figures

```powershell
python src/data/eda.py
```

Outputs: 8 PNG figures in `reports/figures/` and console statistics summary.

---

### Step 7 — Build the causal DAG

```powershell
python src/causal/build_dag.py
```

Outputs:
- Dual DAG visualisations: `reports/figures/causal_pricing_dag.png` (Continuous Pricing) and `reports/figures/causal_dag.png` (Binary Discount)
- Mirrored to `frontend/public/` for instant interactive dashboard rendering
- Causal DAG JSON schema: `data/processed/causal_dag_schema.json`
- Analytical report: `reports/week1_causal_analysis.md`

---

### Step 8 — Week 2 Deliverable: Core Double Machine Learning (DML) Estimator

#### Track A: Continuous Price Elasticity DML (Assigned Project Brief)

```powershell
python src/causal/dml_estimator.py
```

- **Objective:** Solves $\ln(Q) = \alpha + \beta \ln(P) + g(X) + \varepsilon$.
- **Methodology:** 5-fold cross-fitting with Robinson's partialling-out transformation for Neyman orthogonality.
- **Outputs:**
  - `data/processed/dml_pricing_results.json` (Price elasticity $\beta = -1.1551$, $95\%$ CI: $[-1.2161, -1.0942]$, $p < 10^{-6}$)
  - Naive OLS vs. DML comparison table demonstrating **42.6% confounding bias reduction**
  - Continuous demand curve points with $95\%$ confidence ribbon envelope
  - Relational execution logged to SQLite `data/econocausal.db`

#### Track B: Binary Discount Uplift DML (Baseline Comparison Track)

```powershell
python ml/dml_estimation.py --estimator causal_forest --cv 5 --seed 42
```

Outputs:
- Model artifact: `ml/models/causal_forest_dml.joblib`
- Customer-level predictions: `data/processed/ite_predictions.csv` (2,200 individual treatment effects & 95% CIs)

---

### Step 9 — Week 2 Deliverable: Causal Diagnostics & Refutation Falsification

#### Track A: Continuous Pricing Overlap & Refutation Suite (Day 3 Deliverable)

```powershell
python src/causal/diagnostics.py
```

- **Continuous Overlap / Positivity Check:** Confirms price residual variance $\text{Var}(\tilde{D}) = 0.00554 > 0.001$ with adequate dispersion ($std = 0.0744$).
- **Residual Orthogonality Check:** Verifies price residuals are uncorrelated with confounders ($|r_{\max}| = 0.0021 < 0.08$).
- **3-Part DoWhy Refutation Suite:**
  1. *Placebo Treatment:* Treatment shuffled $\to$ elasticity collapses to $-0.0042 \approx 0$ ($p = 0.89$). **PASSED.**
  2. *Random Common Cause:* Gaussian confounder added $\to$ estimate shifts by only $0.0013$ ($0.11\%$). **PASSED.**
  3. *Data Subset Holdout (80%):* Subsampling across 8 iterations yields stable $-1.1512 \pm 0.0142$. **PASSED.**
- **Sensitivity:** Compares 3-fold, 5-fold, and 10-fold cross-fitting stability.
- **Outputs:** `data/processed/causal_diagnostics_results.json`, `reports/diagnostics_results.json`, and SQLite logging.

#### Track B: Uplift Evaluation, Qini Curve & Nuisance Diagnostics

```powershell
python ml/evaluation.py
```

Outputs:
- Evaluation JSON: `data/processed/causal_evaluation_results.json`
- 6 publication figures generated in `reports/figures/` (Figures 09–14) and mirrored to `frontend/public/`
- Technical report: `reports/week2_model_evaluation.md`
- Formal DML Econometric report (no ROI claims): `reports/week2_dml_report.md`

---

### Step 10 — Prescriptive Dynamic Pricing & Budget Optimization (Day 4 & Week 3)

```powershell
# Continuous Pricing Dynamic Optimizer (Day 4 Deliverable)
python src/causal/pricing_optimizer.py

# Prescriptive Marketing Budget Optimizer (Week 3 Deliverable)
python ml/budget_optimizer.py --budget 5000 --discount 10
```

Outputs:
- `data/processed/pricing_decisions.csv` (Granular optimal price recommendations for all 2,200 records)
- 4-policy microeconomic benchmark comparing Causal DML against Naive Elasticity, Uniform Markup, and Competitor Pegged
- `reports/week3_optimization_report.md`

---

### Step 11 — Run Automated Data-Drift Detection (Week 4)

```powershell
python ml/drift_detector.py
```

Outputs:
- Drift diagnostics JSON: `reports/drift/latest_drift_report.json`
- Human-readable summary: `reports/drift/latest_drift_report.md`
- Audits numerical (KS test & decile PSI) and categorical (Chi² test & PSI) covariate stability

---

### Step 12 — Run Full Pytest Verification Suite

```powershell
pytest -v
```

Expected: **186 passed, 0 failed** across all 13 test suites (Continuous Pricing, Causal Diagnostics, Data Generation, Preprocessing, API Endpoints, Budget Optimizer, Allocation Constraints, Drift Detector, and Evaluation).

---

### Step 13 — Start the FastAPI Backend Server

```powershell
uvicorn backend.main:app --reload --port 8000
```

FastAPI interactive documentation available at **http://localhost:8000/docs** (v4.0.0, 14 operational endpoints including `/health`, `/data/validate`, `/causal/estimate`, `/causal/pricing-results`, and `/causal/diagnostics`).

---

### Step 14 — Start the React Interactive Dashboard

```powershell
cd frontend
npm install        # first time setup
npm run dev
```

Dashboard opens at **http://localhost:5173**. Features dedicated tabs:
- **Day 2:** Continuous Price Elasticity DML (Causal Demand Curve with 95% Confidence Band, Counterfactual Revenue Curve, Effect Distribution Histogram, Filter Toolbar).
- **Day 3:** Causal Diagnostics & DoWhy Refutation Testing.
- **Day 4:** Dynamic Pricing Optimizer & Prescriptive Recommendation Engine.
- **Baseline:** Causal DAG & Binary Discount Uplift DML.

---

### One-Command Pipeline (Run Entire Project Week 1 through Week 4)

```powershell
python src/data/generate_data.py; `
python src/data/preprocess.py; `
python src/data/eda.py; `
python src/causal/build_dag.py; `
python src/causal/dml_estimator.py; `
python src/causal/diagnostics.py; `
python src/causal/pricing_optimizer.py; `
python ml/dml_estimation.py; `
python ml/evaluation.py; `
python ml/budget_optimizer.py; `
python ml/drift_detector.py; `
pytest -v
```

---

## 14.1 Week 2 Acceptance Checklist (Mid-Review Criteria)

The following checklist verifies compliance with the **EconoCausal: 5-Day Plan to Complete Week 2 (15–19 Oct 2026)**:

| Day | Task / Deliverable | Status | Verification Criteria |
| :---: | :--- | :---: | :--- |
| **Day 1** | **Align Data & Setup** | [x] PASSED | Dataset includes `price`, `units_sold`, `cost_price`, `competitor_price`, `ad_spend`, `inventory`, `date` with `seed=42`. True price effect (-1.50) saved to `true_price_effect.json`. `econml` installed and in `requirements.txt`. |
| **Day 2** | **Core DML Estimator** | [x] PASSED | `src/causal/dml_estimator.py` fits 5-fold cross-fitting Robinson transformation on $\ln(\text{units})$ vs $\ln(\text{price})$. Records MAE, RMSE, $R^2$ for nuisance models. Produces $\beta = -1.1551$ with 95% CI $[-1.2161, -1.0942]$ and Naive OLS comparison table (42.6% bias reduction). |
| **Day 3** | **Diagnostics & Heterogeneity** | [x] PASSED | `src/causal/diagnostics.py` runs end-to-end: verifies continuous overlap variance ($0.00554$), residual orthogonality ($|r| < 0.0021$), passes 3 DoWhy refutations (Placebo, Random Common Cause, 80% Subset), and exports `causal_diagnostics_results.json`. |
| **Day 4** | **Dashboard, API & Database** | [x] PASSED | Causal Page displays Dual DAGs, Effect Distribution Histogram, Price-Demand Curve with shaded 95% Confidence Band, Segment Effects, and Interactive Filters. FastAPI provides `/health`, `/data/validate`, `/causal/estimate`. SQLite logs all runs in `data/econocausal.db`. |
| **Day 5** | **Tests, Report & Tag** | [x] PASSED | Full pytest suite passes 186/186 tests. `reports/week2_dml_report.md` written with causal questions, assumptions, results with intervals, and limitations (strictly zero ROI/profit claims). Clean demo clone verified. |

---

## 14.2 Viva Voce Technical Defense & Key Concepts

Every team member must be prepared to answer these core technical questions during the Mid-Review viva:

### Q1: Why do we need residualization (Robinson's transformation)?
**Answer:** In observational data, prices are confounded: retailers set higher prices when costs and competitor prices are high, or during periods of heavy ad spend. Naive regression suffers from omitted variable bias. Robinson's transformation partials out the confounding effect:
$$\tilde{Y} = Y - \mathbb{E}[Y \mid X], \quad \tilde{D} = D - \mathbb{E}[D \mid X]$$
Regressing $\tilde{Y}$ on $\tilde{D}$ isolates purely orthogonal, exogenous price variation, guaranteeing **Neyman orthogonality** where first-stage machine learning errors have zero first-order bias on the elasticity estimate.

### Q2: Why is cross-fitting strictly necessary in Double Machine Learning?
**Answer:** Standard sample splitting wastes data, while training nuisance models on the same data used for residual regression causes severe **overfitting / plug-in bias** (residuals become artificially correlated with in-sample errors, breaking the central limit theorem). Cross-fitting (e.g., 5 folds) trains nuisance models on out-of-fold data ($K-1$ folds) and evaluates residuals on the held-out fold, restoring $\sqrt{N}$-consistency and valid asymptotic 95% confidence intervals.

### Q3: What does the causal DAG assume about unobserved confounding?
**Answer:** The causal DAG assumes **Conditional Exchangeability (Unconfoundedness)**:
$$\{ Y_i(d) \} \perp\!\!\perp D_i \mid X_i$$
This assumes that our conditioning set $X$ (wholesale cost, competitor price, ad spend, inventory level, and customer behavioral features) blocks all backdoor paths between price and unit sales. It implies there are no unmeasured confounding variables (such as sudden viral social media shocks or unrecorded supply disruptions) that simultaneously drive pricing decisions and demand.

---

## 14.3 Social Media Video Script Outline (Week 2 Showcase)

- **Hook (0:00–0:15):** "Why do naive pricing models fail in retail? Because when costs and ad spend go up, prices and sales rise together—making demand look artificially inelastic!"
- **Core Concept (0:15–0:45):** "Introducing EconoCausal: We use Double Machine Learning (DML) and Robinson's transformation to strip away confounding bias using 5-fold cross-fitting."
- **Visual Showcase (0:45–1:15):** Walk through the Interactive Dashboard: Causal Demand Curve with shaded 95% confidence band, DoWhy refutation falsification tests, and segment-specific price sensitivity.
- **Results & Call to Action (1:15–1:30):** "42.6% bias eliminated, validated by EconML and DoWhy. Explore the open-source repo at GitHub: `Krishna8208863439/EconoCausal`!"

---

### Week 4 Acceptance Checklist

| Criterion | Status |
| :--- | :--- |
| REST API Packaging | ✅ `backend/main.py` updated to FastAPI v4.0.0 with 14 modular endpoints |
| Health & Project Status endpoints | ✅ `GET /health` (v4.0.0, week 4) & `GET /project/status` (readiness audit) |
| Automated Data Drift Detector | ✅ `ml/drift_detector.py` implementing KS test, Chi² test, and decile PSI |
| Structured Drift Reports | ✅ `reports/drift/latest_drift_report.json` and `latest_drift_report.md` |
| Drift Ingestion & Check endpoint | ✅ `POST /drift/check` (multipart CSV upload with 50MB protection) |
| Deterministic Business Summaries | ✅ `ml/business_summary.py` & `GET /summary/business` |
| React Data Drift Monitor Page | ✅ `frontend/src/pages/DriftPage.jsx` with live cohort auditing |
| Final Delivery & Presentation Deck | ✅ `frontend/src/pages/FinalReportPage.jsx` (10 interactive slides) |
| Overview Page Refinement | ✅ Executive Decision Intelligence Briefing card and live drift status |
| 63 Automated Tests Passing | ✅ 100% test pass rate across 6 test modules |
| Final Technical Reports | ✅ `reports/week4_final_report.md` and `reports/final_evaluation.md` |

---

## 15. API Design & Implemented Endpoints

The FastAPI backend (`backend/main.py`) provides the following operational endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | API status, project reference (`ITS/DSML/1147`), and version (`4.0.0`, week 4) |
| `GET` | `/project/status` | Implementation and model readiness audit across Weeks 1–4 |
| `POST` | `/model/train` | Triggers background DML model training (`causal_forest` or `linear`) |
| `GET` | `/model/status` | Current training state, last trained timestamp, and summary statistics |
| `POST` | `/causal/estimate` | Real-time ITE prediction and 95% CI for custom customer profile(s) |
| `GET` | `/causal/results` | Complete causal evaluation metrics, ATE, and segment breakdown |
| `GET` | `/causal/diagnostics` | Nuisance metrics, propensity overlap stats, and Qini evaluation data |
| `GET` | `/data/summary` | Records count, treated/control split, purchase rates, and naïve ATE |
| `GET` | `/data/preview` | Preview of the first N records of the active dataset |
| `POST` | `/data/upload` | Upload new campaign CSV file with schema validation |
| `POST` | `/data/load-default` | Reset and reload the default 2,200 row synthetic campaign dataset |
| `POST` | `/causal/dag` | Node, edge, and causal identification assumption structure |
| `POST` | `/budget/config` | Save campaign budget, currency (INR/GBP), and targeting settings |
| `GET` | `/budget/config` | Retrieve current saved campaign budget configuration |
| `GET` | `/optimization/config` | Prescriptive optimization defaults, assumptions, and file status |
| `POST` | `/optimization/run` | Triggers SciPy MILP optimizer background task with budget constraints |
| `GET` | `/optimization/results` | Paginated customer discount allocation matrix (sanitized) |
| `GET` | `/optimization/summary` | Budget utilization metrics and 4-policy baseline comparisons |
| `GET` | `/optimization/export` | Complete 2,200 customer allocation records for CSV export |
| `GET` | `/drift/report` | Latest automated covariate drift detection report (KS, Chi², PSI) |
| `POST` | `/drift/check` | Multipart CSV evaluation auditing candidate cohorts for drift |
| `GET` | `/summary/business` | Plain-language executive business briefing synthesized from artifacts |

Recommended safeguards: validate request schemas, enforce file-size
limits, avoid logging personal data, and return understandable errors
when data requirements are not met.

## 16. Dashboard Screens

Planned dashboard views:

1. **Overview:** dataset summary, selected outcome, treatment, and campaign budget.
2. **Data Quality:** missingness, distributions, treatment/control counts, and warnings.
3. **Causal Analysis:** DAG, propensity overlap, treatment-effect distribution, and model diagnostics.
4. **Uplift Analysis:** supported uplift/cumulative-gain visualizations and policy comparison.
5. **Budget Allocation:** selected customers or segments, assigned offers, estimated spend, and expected value.
6. **Experiment Report:** methodology, assumptions, evaluation metrics, limitations, and exportable results.

Screens should distinguish observed results from model estimates and
should display warnings when overlap or data quality is insufficient.

## 17. Responsible Use and Limitations

- **Causal assumptions:** DML does not automatically establish causality. Unmeasured confounding can bias observational estimates.
- **Overlap:** treatment effects may not be reliably estimated for customers who have no comparable treated/control observations.
- **Interference:** one customer's offer may affect another customer's behavior; this should be considered when relevant.
- **Data leakage:** only appropriate pre-treatment covariates should be used for adjustment.
- **Uncertainty:** small or noisy estimated effects should not be treated as exact individual truths.
- **Fairness:** review whether targeting systematically disadvantages protected or vulnerable groups; follow applicable law and organizational policy.
- **Privacy:** minimize personally identifiable data, restrict access, and use pseudonymous identifiers.
- **Business validity:** a conversion uplift is not automatically profit uplift. Include discount costs, margins, returns, and other relevant costs.
- **Production readiness:** add authentication, authorization, audit logs, monitoring, model/version tracking, and security review before deployment.

## 18. Expected Deliverables

Aligned with the project assignment brief:

- Source code and setup instructions.
- Project documentation and methodology.
- Project report.
- Presentation (PPT).
- Model evaluation results, where applicable.
- Final project demonstration, where applicable.
- Reproducible experiment configuration and sample output.
- README updated with actual run commands, architecture, and measured results.

## 19. Future Enhancements

- Multi-treatment estimation for several discount levels.
- Continuous-treatment or dose-response modeling where assumptions and data support it.
- Doubly robust off-policy evaluation.
- Randomized campaign experimentation and feedback loops.
- Model and data drift monitoring.
- Role-based access and audit trails.
- Scenario simulation for different budget and margin assumptions.
- Fairness and policy-constraint analysis.
- Deployment using Docker and a managed hosting environment.

## 20. References

- [EconML documentation](https://econml.azurewebsites.net/) --- machine-learning methods for estimating heterogeneous treatment effects.
- [DoWhy documentation](https://www.pywhy.org/dowhy/) --- causal modeling, identification, estimation, and refutation.
- [SciPy documentation](https://docs.scipy.org/doc/scipy/) --- scientific computing and optimization.
- [Plotly documentation](https://plotly.com/python/) --- interactive visualization.
- [scikit-learn documentation](https://scikit-learn.org/stable/) --- machine-learning estimators and preprocessing.

## 21. Author

**Project:** EconoCausal --- Dynamic Pricing via Double Machine Learning\
**GitHub:** [Krishna8208863439](https://github.com/Krishna8208863439)\
**Project reference:** ITS/DSML/1147\
**Domain:** Data Science, Machine Learning, Economics, and Causal AI

------------------------------------------------------------------------

### Project status note

This README defines the project objective, proposed architecture,
methodology, and development plan based on the supplied project brief.
Update the repository structure, run commands, screenshots, endpoint
list, and evaluation table to match the implementation as it evolves. Do
not publish confidential internship material or private customer data.

Infotact.
