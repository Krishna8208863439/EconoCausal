# EconoCausal — Executive Presentation Deck (6 Project Phases)
**Project Title:** EconoCausal — Dynamic Pricing via Double Machine Learning  
**Project Reference:** ITS/DSML/1147 | Infotact Solutions  
**Review Type:** Final Project Review (Day 6 Deliverable)  
**Authors:** Krishna (Team Lead), Shashwat, Jay, Prachi  
**Format:** Slide Deck Outline & Visual Walkthrough  

---

## Slide 1: Executive Vision & Problem Statement
### Phase 1: Problem Definition & Scientific Motivation
- **The Core Business Problem:** In promotional pricing, marketing directors operate under a fixed budget ($B = \text{₹5,000}$). Conventional predictive machine learning models answer *"Who has a high purchase probability?"*, systematically targeting organic buyers ("Sure Things") who would have purchased anyway without an offer.
- **The Financial Consequence:** Massive promotional margin cannibalization and wasted marketing capital.
- **The Causal AI Solution:** EconoCausal isolates the counterfactual Individual Treatment Effect (ITE): $\tau_i = \mathbb{E}[Y_i(1) - Y_i(0) \mid X_i]$, identifying *"Who will purchase specifically because of the discount?"* and directing promotional expenditure strictly to persuadable customers.

---

## Slide 2: Data Sourcing & Exploratory Diagnostics
### Phase 1: Data Architecture & Preprocessing
- **Cohort Scale:** 2,200 historical retail customer records with zero missing values.
- **Experimental Split:** 1,213 treated customers ($58.77\%$), 987 control customers ($41.23\%$).
- **Observed Conversion Rates:** Treated $= 57.54\%$, Control $= 36.47\%$.
- **Naïve Observed Difference:** $+21.07\text{ pp}$ ($+20.86\text{ pp}$ adjusted).
- **Confounder Set ($X$):**
  - Customer RFM Tier (`customer_segment`: Regular, Occasional, Premium, Lapsed)
  - Demographic Bracket (`age_group`: 18-25, 26-35, 36-50, 50+)
  - Engagement Intensity (`website_visits`, `past_purchases`, `avg_order_value`)
- **Key Finding:** Higher-tier and frequent customers receive more promotional offers, creating strong confounding bias.

---

## Slide 3: Causal Graph (DAG) & Identification Theorems
### Phase 2: Structural Causal Graph & Positivity
- **Backdoor Criterion:** Conditioning on observable covariates $X$ blocks all spurious non-causal paths between promotional offer $T$ and conversion outcome $Y$.
- **Core Identification Assumptions Satisfied:**
  1. *Unconfoundedness (Conditional Ignorability):* $\{Y(1), Y(0)\} \perp\!\!\perp T \mid X$.
  2. *Positivity (Common Support):* Propensity scores $e(X) \in [0.400, 0.766]$. Overlap analysis confirms **99.91% common support coverage**; only $0.09\%$ of extreme records trimmed.
  3. *SUTVA:* Stable Unit Treatment Value Assumption holds (no coupon sharing or market interference).
- **DoWhy Refutations:** Placebo treatment refutation estimate $= -0.0012$ ($p = 0.94$); Random common cause refutation effect change $< 0.5\%$, confirming causal stability.

---

## Slide 4: Double Machine Learning (DML) Estimation
### Phase 3: Robinson Residualization & Neyman Orthogonality
- **Why DML?** Traditional regression suffers from the curse of dimensionality when controlling for non-linear confounders; standard ML regularizers (Lasso/Forests) introduce severe shrinkage bias into treatment effect estimates.
- **DML Mechanism:**
  1. Fit $l(X) = \mathbb{E}[Y \mid X]$ via Random Forest Regressor.
  2. Fit $m(X) = \mathbb{E}[T \mid X]$ via Calibrated Random Forest Classifier.
  3. Orthogonalize residuals: $\tilde{Y} = Y - \hat{l}(X)$, $\tilde{T} = T - \hat{m}(X)$.
  4. Estimate $\tau(X)$ by regressing $\tilde{Y}$ on $\tilde{T}$.
- **Cross-Fitting:** 5-fold cross-fitting ($K=5$) guarantees that nuisance models predict strictly out-of-fold, achieving parametric $\sqrt{N}$ convergence.
- **Empirical Point Estimate:** Population Average Treatment Effect (ATE) $= \mathbf{+19.47\text{ pp}}$ ($95\%\text{ CI: } [+5.67\text{ pp}, +33.28\text{ pp}]$).
- **Confounding Bias Removed:** Naive observed $+20.86\text{ pp}$ was inflated by $+1.39\text{ pp}$ due to selection bias.

---

## Slide 5: Uplift Curves & Qini Score Validation
### Phase 3: Model Evaluation Beyond Predictive ROC-AUC
- **Evaluation Challenge:** Because potential outcomes are never simultaneously observable for an individual customer, traditional ROC-AUC or MSE cannot evaluate uplift models.
- **Evaluation Metric:** Cumulative Uplift Curve and Qini Curve on holdout folds.
- **Validated Qini Score:** $\mathbf{+0.6839}$ (statistically significant excess gain over random targeting).
- **Decile Targeting Gain:** Targeting the top decile generates $2.4\times$ the incremental conversion volume of blanket untargeted promotions.

---

## Slide 6: Prescriptive Knapsack Optimization
### Phase 4: SciPy HiGHS Mixed-Integer Linear Programming
- **The EconoCausal Value Formula:**
  $$\Delta \text{Margin}_i = \hat{\tau}_i \cdot (\text{Margin}_i - d) - p_{0,i} \cdot d$$
  Where $p_{0,i} = \text{clip}\big(m(X_i) - e(X_i) \cdot \hat{\tau}_i, 0, 1\big)$ is the organic baseline conversion probability.
  The penalty $-p_{0,i} \cdot d$ eliminates cannibalization of organic margin.
- **Binary Knapsack Problem:**
  $$\max_{\mathbf{x}} \sum_{i=1}^{N} x_i \cdot \Delta \text{Margin}_i \quad \text{s.t.} \quad \sum_{i=1}^{N} x_i \cdot d \le \text{₹5,000}, \quad x_i \in \{0, 1\}$$
- **Optimization Outcome:** Exactly 500 customers selected at ₹10 coupon cost, achieving **100.0% budget utilization** (₹5,000 spent, ₹0 unallocated).
- **Conservative Mode:** Optional $\hat{\tau}_{\text{lo},i} > 0$ filter guarantees 95% statistical confidence of non-negative uplift.

---

## Slide 7: Price, Sales, Revenue & Profit Budget Sweep Table
### Phase 4: Diminishing Marginal Returns Analysis (Project Image Specification)
The platform evaluates marketing budgets from ₹1,000 to ₹50,000:

| Budget Ceiling | Customers Targeted | Actual Spend | Budget Utilization | Incremental Purchases | Net Incr. Margin | ROI (%) |
|---|---|---|---|---|---|---|
| ₹1,000 | 100 | ₹1,000 | 100.0% | +28.4 | +₹784.20 | 78.4% |
| ₹2,500 | 250 | ₹2,500 | 100.0% | +68.1 | +₹1,620.50 | 64.8% |
| **₹5,000 (Base)** | **500** | **₹5,000** | **100.0%** | **+125.2** | **+₹2,698.40** | **54.0%** |
| ₹7,500 | 750 | ₹7,500 | 100.0% | +168.4 | +₹3,150.80 | 42.0% |
| ₹10,000 | 1,000 | ₹10,000 | 100.0% | +201.2 | +₹3,340.10 | 33.4% |
| ₹15,000 | 1,213 (Pool Cap) | ₹12,130 | 80.9% | +224.8 | +₹3,410.60 | 28.1% |
| ₹20,000 | 1,213 (Pool Cap) | ₹12,130 | 60.7% | +224.8 | +₹3,410.60 | 28.1% |
| ₹50,000 | 1,213 (Pool Cap) | ₹12,130 | 24.3% | +224.8 | +₹3,410.60 | 28.1% |

*Economic Insight:* Diminishing marginal returns set in past ₹5,000. Beyond ₹12,130, all eligible persuadable customers are targeted; unspent budget remains safely protected in reserve.

---

## Slide 8: 4-Policy Benchmark Comparison
### Phase 4: Demonstrating Superior Commercial Uplift
Comparing 4 allocation strategies under identical ₹5,000 marketing expenditure:

| Policy Strategy | Selected Customers | Actual Spend | Incremental Orders | Net Contribution Margin | Advantage vs Random |
|---|---|---|---|---|---|
| **No-Discount Baseline** | 0 | ₹0 | 0.0 | ₹0.00 | Baseline |
| **Random Targeting** | 500 | ₹5,000 | 97.4 | +₹1,336.80 | — |
| **Blanket Targeting** | 500 | ₹5,000 | 104.1 | +₹1,720.50 | +28.7% margin |
| **Causal DML Optimal** | **500** | **₹5,000** | **125.2** | **+₹2,698.40** | **+101.9% Net Margin Lift** |

*Key Commercial Takeaway:* Under identical expenditure, Causal DML doubles net campaign contribution (+102% lift) by penalizing cannibalization and prioritizing persuadable customers.

---

## Slide 9: Automated Covariate Drift Governance
### Phase 5: Statistical Quality Assurance
- **Two-Sample KS Tests:** Continuous features (`past_purchases`, `avg_order_value`, `website_visits`) evaluated against the 2,200-record baseline ($p > 0.80$, stable).
- **Decile Population Stability Index (PSI):** All feature PSIs $< 0.02$ (threshold for drift is $0.10$).
- **Overall Status:** `STABLE`.
- **Econometric Governance Rule:** Covariate drift does not imply causal model degradation as long as positivity holds. **Autonomous retraining is prohibited**; human econometric audit is required before updating production models.

---

## Slide 10: Production Architecture, API & Review Readiness
### Phase 6: System Integration & Final Acceptance
- **REST API (`backend/main.py`):** 14 production endpoints with Pydantic schemas, file-size guards, and SQLite run persistence (`data/econocausal.db`).
- **React SaaS Dashboard (`frontend/`):** Responsive enterprise analytics UI with live interactive MILP knapsack solver, Plotly visualizations, cohort drag-and-drop drift tester, and natural-language briefings.
- **Automated Verification:** **63 automated test cases passing** across optimization, allocation constraints, API, and drift detection.
- **Automation:** One-command execution via `.\run_all.ps1` or `./run_all.sh`.
- **Review Readiness:** All requirements from Days 1–6 complete; ready for mentor review and viva defense.
