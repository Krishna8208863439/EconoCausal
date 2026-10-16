# Work Distribution & Team Contribution Matrix

**Project Title:** EconoCausal — Enterprise Causal ML & Budget Optimization Platform  
**Internship Ref:** ITS/DSML/1147  
**Organization:** Infotact Solutions  
**Review Type:** Mid-Review & Final Review Documentation  
**Repository:** [https://github.com/Krishna8208863439/EconoCausal](https://github.com/Krishna8208863439/EconoCausal)  

---

## 1. Team Roster & Roles

| Team Member | GitHub Username | Role & Focus Area | Assigned Modules |
|:---|:---|:---|:---|
| **Krishna** (Lead) | `Krishna8208863439` | **Project Lead & Full-Stack Architect** | Architecture design, Causal Forest DML, MILP optimization, FastAPI v4 backend, React frontend orchestrations, system integration |
| **Jay** | `jay-infotact` / `Jay` | **Data Science & Feature Engineering** | Synthetic data generation engine, causal DAG specification, preprocessing pipelines, propensity score diagnostics |
| **Shashwat** | `shashwat230710` | **Backend & API Systems Engineer** | FastAPI route implementation, Pydantic schemas, drift detection services (KS & PSI), batch inference endpoints |
| **Prachi** | `prachi185` / `prachi4325` | **Frontend & UI/UX Developer** | React UI pages (Overview, Causal Estimation, Policy Optimizer, Data Drift), Recharts visualizations, CSS theme systems |

---

## 2. Module Ownership & Contribution Matrix

### Module 1: Data Architecture & Directed Acyclic Graph (Week 1)
- **Primary Owner:** Jay
- **Supporting:** Krishna
- **Deliverables:**
  - `src/data/generate_mock_data.py`: 100,000 synthetic customer records with confounders, non-linear propensity, and ground-truth heterogeneous uplift.
  - `src/data/preprocess.py`: Leakage-free split, standard scaling, and one-hot encoding pipelines.
  - `src/causal/dag.py`: Structural Causal Model (SCM) specification and NetworkX DAG visualization.
  - Deliverable reports: `reports/week1_eda_and_dag_report.md`.

### Module 2: Causal ML & Double Machine Learning (Week 2)
- **Primary Owner:** Krishna
- **Supporting:** Jay
- **Deliverables:**
  - `ml/dml_estimation.py`: EconML `CausalForestDML` with XGBoost first-stage residualizers for $Y$ and $T$.
  - `ml/train_causal_model.py`: Cross-validated Causal Forest training pipeline saving artifact `ml/models/causal_forest_dml.joblib`.
  - `ml/evaluate_causal.py`: Uplift curve generation, Qini coefficient computation (+0.6839), Cumulative Gain charts, Placebo treatment refutation, and Random Common Cause tests.
  - Deliverable reports: `reports/week2_causal_inference_report.md`.

### Module 3: Constrained Optimization & Decision Engine (Week 3)
- **Primary Owner:** Krishna
- **Supporting:** Shashwat
- **Deliverables:**
  - `src/optimization/budget_optimizer.py`: SciPy Mixed-Integer Linear Programming (`scipy.optimize.milp` / `linprog`) solver optimizing incremental revenue under budget and capacity constraints.
  - Comparison benchmarks: Optimal MILP vs Greedy ITE vs Random Allocation vs Blanket Targeting.
  - Export artifact: `data/processed/discount_allocation.csv`.
  - Deliverable reports: `reports/week3_budget_allocation_report.md`.

### Module 4: Production Engine, Drift Monitoring & Dashboard (Week 4)
- **Primary Owner:** Shashwat (Backend/Drift) & Prachi (Frontend) & Krishna (Architecture)
- **Supporting:** Team
- **Deliverables:**
  - `backend/main.py`: FastAPI v4.0.0 microservice with 21 REST endpoints, health monitoring, dynamic simulation, and export handlers.
  - `src/monitoring/drift_detector.py`: Two-sample Kolmogorov-Smirnov test and Population Stability Index (PSI) drift engine.
  - `frontend/src/`: 8-page React dashboard with interactive policy sliders, live counterfactual simulator, export CSV triggers, and responsive dark glassmorphic styling.
  - Deliverable reports: `reports/week4_production_and_dashboard_report.md`.

---

## 3. Weekly Task Allocation Breakdown

```
Week 1 (Data & DAG)
├── Jay       : Synthetic generation logic (N=100k, 12 features)
├── Krishna   : SCM formulation, confounding structure & DAG validation
├── Shashwat  : Preprocessing validation & baseline unit tests
└── Prachi    : EDA charts, data distribution visualizations

Week 2 (Causal Forest & DML)
├── Krishna   : EconML CausalForestDML, XGBoost residualizers, cross-fitting
├── Jay       : Propensity score diagnostics & overlap/positivity checks
├── Shashwat  : Refutation tests (Placebo, Random Cause, Subset validation)
└── Prachi    : Uplift and Qini curve plotting scripts

Week 3 (Policy Optimizer)
├── Krishna   : SciPy MILP formulation, objective functions, knapsack solvers
├── Shashwat  : Policy comparison engine (Greedy vs MILP vs Blanket)
├── Jay       : Segment sensitivity analysis (Churn risk vs Tenure buckets)
└── Prachi    : ROI and allocation breakdown reports

Week 4 (Production API & Dashboard)
├── Shashwat  : FastAPI endpoints, Pydantic payloads, drift engine
├── Prachi    : React pages (Overview, Estimates, Policy, Drift, Simulator)
├── Krishna   : End-to-end integration, performance optimization, API-client glue
└── Team      : System integration testing, test suite stabilization
```

---

## 4. Git Commit Distribution & Accountability Notice

- **Commit Authors:** Commits in git history represent active multi-author participation across `Krishna8208863439`, `Jay`, `shashwat230710`, and `prachi185`.
- **Peer Review:** Core ML models and optimization algorithms underwent multi-party verification before main branch integration.
- **Project Governance:** All architectural and interface decisions were documented in weekly progress reports and signed off by the team lead.

---

## 5. Day 1 (Thu 15 Oct 2026): Data Alignment & Member Branch Roster

Per the Week 2 5-Day Plan, Day 1 settles the core treatment/outcome alignment between the assigned brief image and the baseline repository:
- **Treatment Alignment:** Continuous treatment `price` established alongside `discount_amount`.
- **Outcome Alignment:** Continuous demand outcome `units_sold` established alongside binary `purchased`.
- **Confounder Set:** Added `cost_price`, `competitor_price`, `ad_spend`, `inventory`, and `date` to pre-treatment covariates.
- **Ground Truth Storage:** Ground truth price elasticity ($\beta = -1.50$) stored in `data/raw/true_price_effect.json` and `data/processed/true_price_effect.json`.
- **EconML Environment:** `econml>=0.17.0` verified and imported on Python 3.11.

### Team Member Git Branches (Created Day 1)

| Member | Assigned Git Branch | Active Deliverable Scope |
|:---|:---|:---|
| **Krishna** | `krishna-lead` | DML residualization & estimator cross-fitting (Day 2) |
| **Jay** | `jay-data-science` | Data alignment, true price effect verification, DAG extension |
| **Shashwat** | `shashwat-backend` | Test suite execution, CI compliance, API validation schemas |
| **Prachi** | `prachi-frontend` | Demand curves, price vs elasticity visualization components |
| **Active Integration** | `patch1` | Day 1 merged staging branch (preserving clean `main`) |

---

## 6. GitHub Commit Calendar & Streak Audit (Since 9 Oct 2026)

Target for Mid-Review Window (20–27 Oct): **10 distinct commit days**.

| Date | Day | Active Work Summary | Primary Author | Status |
|:---|:---|:---|:---|:---|
| **09 Oct 2026** | Day 1 | Sprint kickoff, problem brief analysis, repo setup | Krishna | Verified |
| **10 Oct 2026** | Day 2 | Synthetic data generation engine & confounding logic | Jay | Verified |
| **11 Oct 2026** | Day 3 | Structural Causal DAG & DoWhy identification | Jay / Krishna | Verified |
| **12 Oct 2026** | Day 4 | Data preprocessing pipeline, median imputation, tests | Shashwat | Verified |
| **13 Oct 2026** | Day 5 | Exploratory Data Analysis & 8 visual diagnostic charts | Prachi | Verified |
| **14 Oct 2026** | Day 6 | Week 1 audit, review readiness report & baseline commits | Team | Verified |
| **15 Oct 2026** | Day 7 | Week 2 Day 1: Continuous pricing alignment & EconML setup | Team | Verified |
| **16 Oct 2026** | Day 8 | Member branch creation, 163 pytest suite passes, patch1 commit | Team | Verified |

- **Current Progress:** **8 / 10 days completed** (Streak maintained without gaps).
- **Remaining Days to Mid Review:** 2 days remaining (Days 9 & 10 on 17 & 18 Oct).

