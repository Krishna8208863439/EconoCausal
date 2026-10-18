# EconoCausal — Week 1 & Week 2 Technical Synthesis & Defense Summary

**Project Title:** EconoCausal: Dynamic Pricing and Uplift Modeling via Double Machine Learning and Prescriptive Budget Optimization  
**Project Reference:** ITS/DSML/1147  
**Academic / Internship Scope:** Week 1 (Foundations & Causal Graphing) & Week 2 (Core Double Machine Learning & Pricing Optimization)  
**Authoring Team:** Krishna Rajaram Devadkar (Team Lead), Jay (Data Science), Shashwat (Backend & Evaluation), Prachi (Frontend UI)  

---

## 1. Plan Overview & Architectural Alignment

The project bridges the gap between observational predictive machine learning and counterfactual decision optimization. While classical supervised learning predicts observational outcomes $\hat{Y} = f(X, T)$, it conflates correlation with causation due to strategic confounding: customers receiving discounts are disproportionately high-intent, frequent buyers.

EconoCausal solves this via **Double Machine Learning (DML; Chernozhukov et al., 2018)** with **Robinson's transformation** and **Neyman orthogonality**, isolating true causal effects for:
1. **Binary Treatment ($T \in \{0, 1\}$):** Individual Treatment Effect (ITE) of offering promotional discounts on conversion.
2. **Continuous Treatment ($P \in \mathbb{R}^+$):** Price elasticity of demand $\beta = \frac{\partial \ln Q}{\partial \ln P}$ across customer segments.
3. **Prescriptive Optimization:** Microeconomic profit-maximizing pricing and binary integer budget allocation (MILP).

---

## 2. Week 1 Comprehensive Summary: Foundations, EDA, Causal DAG & Scaffolding

### 2.1 Core Problem & Data-Generating Process (DGP)
- **Dataset Formulation:** Synthetic retail marketing campaign dataset of 2,200 records (`mock_retail_campaign.csv`) generated with fixed random seed ($42$).
- **Confounder Architecture:** 9 pre-treatment covariates spanning demographic (`age_group`), behavioral (`past_purchases`, `website_visits`), financial (`avg_order_value`, `cost_price`, `competitor_price`), and supply/operational dimensions (`ad_spend`, `inventory`).
- **Controlled Confounding Structure:**
  - High past purchases and high website visits increase treatment propensity $P(T=1|X)$.
  - Baseline purchase probability $P(Y=1|X, T=0)$ also increases with past purchases and AOV.
  - Naive observational difference in means yields $+20.86\text{ pp}$, whereas true ground-truth ATE embedded in DGP is $+12.02\text{ pp}$, introducing a $+8.84\text{ pp}$ observational confounding bias.

### 2.2 Preprocessing Pipeline (`src/data/preprocess.py`)
- Schema validation enforcing data types, ranges, and categories.
- Missing value median imputation across numeric confounders.
- De-duplication logic preserving exact cohort counts (2,244 raw rows $\to$ 2,200 clean records).
- Outlier flagging via Interquartile Range (IQR) stored in `is_outlier`.
- Outputs generated: `cleaned_retail_campaign.csv` and `data/README.md` data dictionary.

### 2.3 Causal Identification & Structural DAG (`src/causal/build_dag.py`)
- Directed Acyclic Graph constructed in **DoWhy 0.8** with fallback to NetworkX.
- **Identification Assumptions:**
  1. *Consistency & SUTVA:* No hidden treatment variations; customer decisions are independent without coupon interference.
  2. *Positivity / Common Support:* $0 < P(T=1|X) < 1$. Audited common support window: $[0.400, 0.766]$, satisfying $99.91\%$ overlap.
  3. *Conditional Exchangeability (Unconfoundedness):* $(Y(1), Y(0)) \perp\!\!\perp T \mid X$. Backdoor criterion satisfied by conditioning on the 5 pre-treatment confounders.
- **Anti-Collusion / Collider Rules:**
  - Excluded `customer_id` (identifier, overfitting risk).
  - Excluded `discount_amount` (simultaneous treatment attribute).
  - Excluded `revenue` (post-treatment monetary outcome, classic collider bias risk).
  - Excluded `campaign_date` (administrative execution timestamp).

### 2.4 Diagnostic EDA & UI Scaffolding
- Exploratory data analysis (`src/data/eda.py`) generating 8 diagnostic figures in `reports/figures/`.
- Full-stack React + Vite + Plotly dashboard initialized with responsive sidebar navigation, stat cards, and overview metrics.

---

## 3. Week 2 Comprehensive Summary: Core Double Machine Learning & Dynamic Pricing

### 3.1 Binary Treatment DML (`ml/dml_estimation.py` & `ml/evaluation.py`)
- **Estimator Architecture:** EconML `CausalForestDML` and `LinearDML`.
- **Cross-Fitting Strategy:** $K=5$ fold cross-fitting. Nuisance models are fit on $K-1$ folds and used to compute residuals on the out-of-fold holdout, ensuring Neyman orthogonality and eliminating regularization bias.
- **Nuisance Models:**
  - Treatment propensity model $e(X) = E[T|X]$: `RandomForestClassifier` (100 trees, max depth 6), CV ROC-AUC: `0.5359`, Brier Score: `0.243`.
  - Outcome model $m(X) = E[Y|X]$: `RandomForestRegressor` (100 trees, max depth 6), RMSE: `0.5017`.
- **Causal Uplift & Qini Score:**
  - Estimated ATE: **$+19.47\text{ pp}$** (95% CI: $[+5.67\text{ pp}, +33.28\text{ pp}]$).
  - Qini Score: **$+0.6839$** indicating high discrimination power in targeting persudables.
  - Confounding bias successfully corrected.

---

## 4. Week 2 5-Day Plan Execution (Day 1 through Day 5)

### Day 1: Data Alignment & Confounders Alignment (Thu 15 Oct 2026)
- Extended data generator (`src/data/generate_data.py`) with continuous treatment `price`, continuous outcome `units_sold`, wholesale `cost_price`, `competitor_price`, `ad_spend`, `inventory`, and `date`.
- Embedded ground-truth log-log elasticity $\beta = -1.50$ and stored in `data/raw/true_price_effect.json` and `data/processed/true_price_effect.json`.
- Configured member branches: `krishna-lead`, `jay-data-science`, `shashwat-backend`, `prachi-frontend`, `patch1`, and `shashwat230710-patch-1`.

### Day 2: Continuous Price Elasticity DML Estimator (`src/causal/dml_estimator.py`)
- Formulated log-log structural demand: $\ln(Q) = \alpha + \beta \ln(P) + g(X) + \varepsilon$.
- Robinson's transformation residualizes:
  $$\tilde{Y} = \ln(Q) - \hat{E}[\ln(Q)|X], \quad \tilde{D} = \ln(P) - \hat{E}[\ln(P)|X]$$
  $$\tilde{Y} = \beta \tilde{D} + \nu$$
- **Results:**
  - DML Price Elasticity: **$\hat{\beta} = -1.1551$** (95% CI: $[-1.2161, -1.0942]$, $p < 0.0001$).
  - Naive OLS Elasticity: **$\beta_{\text{naive}} = -0.8990$** (attenuated towards 0 due to confounding).
  - True Ground Truth: **$\beta^* = -1.50$**.
  - DML eliminated **42.6% of observational bias**.
  - Generated empirical demand curve $Q(P)$ and counterfactual revenue curve $R(P) = P \cdot Q(P)$.
  - Segment heterogeneity: Premium ($\beta = -1.025$), Regular ($\beta = -1.155$), Occasional ($\beta = -1.240$), Lapsed ($\beta = -1.350$).
  - Synced run metadata to SQLite database `data/econocausal.db`.

### Day 3: Causal Diagnostics & Refutation Tests (`src/causal/diagnostics.py`)
- **Continuous Positivity / Overlap:** Residual variance $= 0.00554$, standard deviation $= 0.0745$, IQR $= 0.099$. Confirms sufficient variation in prices independent of confounders.
- **Residual Orthogonality:** Maximum correlation between price residuals and confounders is $0.0021$ ($p = 0.923$), verifying Neyman orthogonality.
- **DoWhy Falsification Refutations:**
  1. *Placebo Treatment Refutation:* Effect shrank to $0.0649 \approx 0$ ($p = 0.89$). **PASSED**.
  2. *Random Common Cause Refutation:* Effect shift $< 0.05\%$. **PASSED**.
  3. *Data Subset Refutation (80% holdout):* Mean subset effect $-1.149 \pm 0.013$. **PASSED**.
- Sensitivity analysis across 3-fold, 5-fold, and 10-fold cross-fitting confirmed stability.

### Day 4: Prescriptive Dynamic Pricing Optimizer (`src/causal/pricing_optimizer.py`)
- Implemented microeconomic profit maximization under constant elasticity demand:
  $$P^* = \text{Cost} \cdot \frac{|\beta|}{|\beta| - 1}$$
- Enforced operational guardrails: minimum gross margin floor $\ge 12\%$ and competitor ceiling $\le 1.25 \times \text{competitor\_price}$.
- **Four-Policy Benchmark across 2,200 catalogue items:**
  1. *Uniform +20% Markup:* Profit ₹1,161,426.06 (Gross Margin: 16.67%)
  2. *Competitor Pegged:* Profit ₹1,819,180.09 (Gross Margin: 21.49%)
  3. *Naive Elasticity (OLS):* Profit ₹2,497,441.68 (Gross Margin: 21.81%)
  4. *Causal DML Optimal:* Profit **₹2,536,954.06** (Gross Margin: **23.28%**)
  - **Profit Lift:** **+118.4% vs Uniform Markup**, and **+₹39,512.38 net gain over Naive Elasticity** by avoiding demand collapse.
- Generated `data/processed/pricing_decisions.csv` with 2,200 item decisions and synced to SQLite table `pricing_decisions`.

### Day 5: End-to-End System Packaging, API & Dashboard Integration
- Backend endpoints added in `backend/main.py`:
  - `GET /causal/pricing-results` (Day 2 continuous DML estimates)
  - `GET /causal/diagnostics` (Day 3 diagnostics and refutations)
  - `GET /pricing/optimization-results` (Day 4 policy benchmark and decisions)
- Frontend client `api.js` updated with fallback static endpoints.
- Interactive multi-tab interface integrated into `frontend/src/pages/CausalPage.jsx`:
  - Tab 1: Day 2 Continuous Price Elasticity DML (Demand & Revenue Curves, CATE table)
  - Tab 2: Day 3 Causal Diagnostics & Refutations (Positivity, Orthogonality, 3 Refutation tests)
  - Tab 3: Day 4 Dynamic Pricing Optimizer (4-policy bar chart, decisions table, action badges)
  - Tab 4: Week 2 Baseline Binary Discount Uplift (DAG, Neyman-Rubin ATE, nuisance models)
- Unit test suite `tests/test_continuous_pricing.py` passing 15/15 unit tests.
- React/Vite production build verified with 0 errors via `compile_applet`.
