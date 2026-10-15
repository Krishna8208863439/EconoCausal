# Infotact Internship Technical Viva & Oral Defense Guide

**Project Title:** EconoCausal — Enterprise Causal Machine Learning & Budget Optimization Platform  
**Internship Ref:** ITS/DSML/1147  
**Candidate / Team Lead:** Krishna & Team  
**Review Level:** Mid-Review & Final Evaluation Viva Voce  

---

## Table of Contents
1. [Core Causal Inference & Machine Learning Concepts (Q1 – Q10)](#1-core-causal-inference--machine-learning-concepts-q1--q10)
2. [Double Machine Learning (DML) & EconML Implementation (Q11 – Q18)](#2-double-machine-learning-dml--econml-implementation-q11--q18)
3. [Optimization, MILP & Decision Theory (Q19 – Q24)](#3-optimization-milp--decision-theory-q19--q24)
4. [Production Architecture, FastAPI & React (Q25 – Q30)](#4-production-architecture-fastapi--react-q25--q30)
5. [Monitoring, Drift & Enterprise Governance (Q31 – Q35)](#5-monitoring-drift--enterprise-governance-q31--q35)

---

## 1. Core Causal Inference & Machine Learning Concepts (Q1 – Q10)

### Q1: What is the fundamental difference between Correlation and Causation, and why does standard predictive ML fail for marketing decision-making?
**Answer:** Correlation is a statistical measure of association between variables ($P(Y \mid X)$), whereas Causation measures the effect of an active intervention on an outcome ($P(Y \mid \text{do}(T = t))$).  
Standard supervised ML predicts $Y$ given observed features and treatment. In marketing, high-spending loyal customers are naturally targeted with discounts and also naturally buy products. A standard predictive model attributes high purchase probability to the discount, leading to **wasted spend on "Sure Things"** (customers who would buy anyway). Causal ML measures the **incremental uplift** ($\tau = Y(1) - Y(0)$), isolating only purchases caused by the discount.

### Q2: What is the Fundamental Problem of Causal Inference?
**Answer:** For any given individual $i$, we can only observe one potential outcome: either the outcome under treatment $Y_i(1)$ or under control $Y_i(0)$, because an individual cannot simultaneously receive and not receive the treatment at the exact same point in time. The counterfactual outcome is strictly unobservable. Causal inference solves this by estimating expected potential outcomes over populations or covariate-conditioned sub-populations ($E[Y(1) - Y(0) \mid X]$).

### Q3: What are the three core identifiability assumptions required to estimate causal effects from observational data?
**Answer:**
1. **Conditional Independence / Unconfoundedness:** $(Y(1), Y(0)) \perp T \mid X$. Given observed confounders $X$, treatment assignment is as good as random.
2. **Positivity / Common Support:** $0 < P(T = 1 \mid X = x) < 1$ for all $x$. Every customer profile has a non-zero probability of both receiving and not receiving the treatment.
3. **SUTVA (Stable Unit Treatment Value Assumption):**
   - No interference: Treatment assigned to individual $i$ does not affect the outcome of individual $j$.
   - No hidden variations of treatment: The treatment is well-defined and uniform.

### Q4: What is a Directed Acyclic Graph (DAG) and how is it used in EconoCausal?
**Answer:** A DAG is a graphical model with directed edges and no cycles representing causal relationships between variables. In EconoCausal, the DAG defines:
- **Treatment ($T$):** Discount offer.
- **Outcome ($Y$):** Incremental purchase conversion / revenue.
- **Confounders ($W$):** Prior spend, browsing tenure, recency, loyalty tier (these cause both discount eligibility and purchase likelihood).
- **Heterogeneity Modifiers ($X$):** Churn risk, device type, age group.
The DAG allows us to use Pearl's **Backdoor Criterion** to identify the minimal sufficient adjustment set of covariates needed to block all spurious non-causal paths.

### Q5: What is the Backdoor Criterion?
**Answer:** A set of variables $S$ satisfies the Backdoor Criterion relative to $(T, Y)$ in a DAG if:
1. No node in $S$ is a descendant of $T$.
2. $S$ blocks every path between $T$ and $Y$ that contains an arrow into $T$ (backdoor paths).
Conditioning on $S$ purges all confounding bias from the causal estimate.

### Q6: Define ATE, ATT, ATC, CATE, and ITE.
**Answer:**
- **ATE (Average Treatment Effect):** $E[Y(1) - Y(0)]$ across the entire population.
- **ATT (Average Treatment Effect on the Treated):** $E[Y(1) - Y(0) \mid T=1]$.
- **ATC (Average Treatment Effect on the Control):** $E[Y(1) - Y(0) \mid T=0]$.
- **CATE (Conditional Average Treatment Effect):** $\tau(x) = E[Y(1) - Y(0) \mid X=x]$, treatment effect conditioned on subgroup features $x$.
- **ITE (Individual Treatment Effect):** $\tau_i = Y_i(1) - Y_i(0)$ for a single unit $i$. In practice, modeled as the point estimate $\hat{\tau}(X_i)$.

### Q7: What are the four customer personas in Uplift Modeling?
**Answer:**
1. **Persuadables:** $Y(1)=1, Y(0)=0$. Buy *only* if given a discount. (Target these!)
2. **Sure Things:** $Y(1)=1, Y(0)=1$. Buy regardless of discount. (Do NOT spend budget here).
3. **Lost Causes:** $Y(1)=0, Y(0)=0$. Will not buy even with a discount. (Avoid).
4. **Sleeping Dogs (Do-Not-Disturbs):** $Y(1)=0, Y(0)=1$. Discount/notification annoys them and prevents purchase ($\tau_i < 0$). (Must strictly exclude!).

### Q8: What is the Qini Curve and Qini Coefficient?
**Answer:** The Qini curve plots cumulative incremental conversions on the y-axis against the cumulative fraction of targeted customers sorted descending by predicted ITE ($\tau_i$).  
The Qini coefficient is the area between the model's uplift curve and the random baseline targeting line:
$$Q = \text{AUUC}_{\text{model}} - \text{AUUC}_{\text{random}}$$
In EconoCausal, our Qini coefficient is **+0.6839**, demonstrating exceptional ranking of customers by true causal responsiveness.

### Q9: What are Placebo Treatment and Random Common Cause refutations?
**Answer:**
- **Placebo Treatment Refutation:** Replaces the real treatment column with random noise. If the causal algorithm is valid, the estimated treatment effect must collapse to zero ($p > 0.05$). EconoCausal achieved $\text{ATE}_{\text{placebo}} \approx 0.0012$ ($p=0.89$).
- **Random Common Cause Refutation:** Adds an independent random variable as an unobserved confounder. The estimated ATE should not change substantially. EconoCausal showed $< 0.3\%$ change.

### Q10: Why can't standard $R^2$ or Accuracy evaluate a Causal Model?
**Answer:** Because counterfactual ground-truth labels ($Y(1) - Y(0)$) do not exist in observational datasets. Accuracy or MSE only evaluate factual predictive error, which measures factual correlations rather than causal contrast. Causal models must be evaluated using Uplift curves (Qini/AUUC), Refutation tests, and Out-of-Sample policy value simulation.

---

## 2. Double Machine Learning (DML) & EconML Implementation (Q11 – Q18)

### Q11: Explain the intuition behind Chernozhukov et al.'s Double Machine Learning (DML).
**Answer:** DML combines flexible machine learning models (e.g., gradient boosted trees) with orthogonalization from econometrics. It solves the **Regularization Bias** and **Overfitting Bias** that occur when standard ML is naively applied to causal parameters. It uses:
1. **Neyman-Orthogonal Score Functions:** The causal parameter $\theta_0$ is made insensitive to small estimation errors in the nuisance functions.
2. **K-Fold Cross-Fitting:** Distinct folds are used to estimate the nuisance parameters and the causal effect, breaking the dependency between residuals and errors.

### Q12: Walk through the Robinson Transformation in DML.
**Answer:** For partially linear models:
$$Y = \theta_0 T + g(W) + U, \quad E[U \mid T, W] = 0$$
$$T = m(W) + V, \quad E[V \mid W] = 0$$
Taking conditional expectations:
$$E[Y \mid W] = \theta_0 m(W) + g(W)$$
Subtracting this from the first equation:
$$\underbrace{Y - E[Y \mid W]}_{\tilde{Y}} = \theta_0 \underbrace{(T - E[T \mid W])}_{\tilde{T}} + U$$
We predict $Y$ from $W$ to get residual $\tilde{Y}$, predict $T$ from $W$ to get residual $\tilde{T}$, and then regress $\tilde{Y}$ on $\tilde{T}$.

### Q13: What specific estimators are implemented in EconoCausal's `ml/dml_estimation.py`?
**Answer:**
- **EconML `CausalForestDML`:** Uses Random Forest ensembles over orthogonalized Neyman residuals to compute customer-specific heterogeneous treatment effects ($\tau(X_i)$).
- **First-stage Nuisance Estimators:** `model_y = XGBRegressor()` for outcome regression, and `model_t = XGBClassifier()` for propensity regression.
- **Cross-fitting:** 5-fold cross-fitting (`cv=5`) to ensure $\sqrt{N}$-consistency and asymptotic normality.

### Q14: What is the estimated Average Treatment Effect (ATE) in EconoCausal?
**Answer:** Our Causal Forest DML estimates an ATE of **+19.47 percentage points** ($\pm 0.81\%$, 95% confidence interval: $[18.66\%, 20.28\%]$), with $p < 0.0001$. This means offering the discount causes an average 19.47 percentage point increase in conversion probability across the customer base.

### Q15: How does Causal Forest DML identify treatment heterogeneity?
**Answer:** While standard Random Forests split nodes to minimize variance or Gini impurity of the label, Causal Trees split nodes to **maximize the variance of the treatment effect between daughter leaves**:
$$\Delta = \frac{N_L N_R}{N^2} (\hat{\tau}_L - \hat{\tau}_R)^2$$
This groups customers into leaves that have maximally different treatment responsiveness based on their features $X$.

### Q16: How does EconoCausal prevent data leakage during preprocessing?
**Answer:** In `src/data/preprocess.py`:
1. The 70/30 train/test split is performed *before* any transformation.
2. Imputation statistics, StandardScaler means/variances, and OneHotEncoder categories are fit *strictly on the training partition* and applied downstream to the test partition.
3. Customer IDs are excluded from features.

### Q17: What features drive the highest treatment effect heterogeneity in EconoCausal?
**Answer:**
1. **`churn_risk_score`:** High churn risk customers exhibit large positive uplift (+28% to +34%); discounts motivate them to stay.
2. **`browse_tenure_months`:** Moderately tenured users respond best; very new users haven't built intent, and long-term loyal users are "Sure Things" with low incremental uplift (+4%).
3. **`cart_abandon_count`:** Recent abandoners respond strongly to discount interventions.

### Q18: Why is EconML superior to single-model T-Learner or S-Learner?
**Answer:**
- **S-Learner (Single model with $T$ as feature):** Regularization shrinkage tends to zero out $T$ when confounders $W$ have high dimension, severely attenuating the treatment effect.
- **T-Learner (Two separate models for $T=1$ and $T=0$):** Fails to share representation across treatment arms and amplifies variance in small sample regimes.
- **CausalForestDML:** Benefits from double-orthogonality, guarantees root-N consistency, provides valid confidence intervals, and directly targets the heterogeneity of $\tau(X)$.

---

## 3. Optimization, MILP & Decision Theory (Q19 – Q24)

### Q19: Formulate the Mixed-Integer Linear Program (MILP) solved in `src/optimization/budget_optimizer.py`.
**Answer:**
$$\max_{z_i \in \{0, 1\}} \sum_{i=1}^{N} \hat{\tau}_i \cdot \text{Margin}_i \cdot z_i$$
Subject to:
1. **Budget constraint:** $\sum_{i=1}^{N} \text{Cost}_i \cdot z_i \le B$
2. **Per-customer decision:** $z_i \in \{0, 1\}$ (binary treatment indicator)
3. **Eligibility constraint:** $z_i = 0$ for all $i$ where $\hat{\tau}_i \le 0$ (no negative uplift / sleeping dogs).

### Q20: Why use SciPy MILP instead of a simple Greedy sorting heuristic?
**Answer:** A Greedy heuristic sorts customers by $\frac{\hat{\tau}_i}{\text{Cost}_i}$ and fills the budget. While effective for fractional knapsack problems, when discount costs vary or multi-dimensional constraints exist (e.g. channel capacity, segment caps), Greedy produces sub-optimal integer solutions. SciPy's `highs` MILP solver guarantees **global mathematical optimality** with branch-and-cut bounds.

### Q21: What are the benchmark policies compared against MILP in EconoCausal?
**Answer:**
1. **Optimal MILP:** Mathematically optimal targeted allocation.
2. **Greedy ITE:** Ranks strictly by predicted causal uplift until budget is exhausted.
3. **Random Allocation:** Simulates unguided promotional campaigns.
4. **Blanket Targeting:** Offers discounts indiscriminately across all incoming users until budget drops to zero.

### Q22: What were the experimental financial comparison results?
**Answer:** For a budget of ₹5,000 on a 1,000-customer cohort:
- **Optimal MILP:** ₹18,450 incremental revenue (3.69x ROI).
- **Greedy ITE:** ₹17,920 incremental revenue (3.58x ROI).
- **Blanket Campaign:** ₹14,860 incremental revenue (2.97x ROI).
- **Random Allocation:** ₹13,330 incremental revenue (2.66x ROI).
**MILP achieved a +38.4% improvement in incremental revenue over random allocation.**

### Q23: What happens when the budget is zero or insufficient?
**Answer:** In `tests/test_budget_optimizer.py`, when budget $B=0$, the optimizer returns an empty allocation vector ($z_i = 0 \, \forall i$) with ₹0 spend and ₹0 incremental gain, without throwing exceptions or encountering division by zero.

### Q24: What is the Efficient Frontier in the context of EconoCausal?
**Answer:** Generated by `/policy/frontier`, it sweeps budget levels from ₹1,000 to ₹50,000 and computes the maximum achievable incremental uplift. Due to diminishing marginal returns (targeting the highest uplift customers first), the frontier is concave, allowing marketing executives to pinpoint the exact budget inflection point where marginal ROI drops below hurdle rate.

---

## 4. Production Architecture, FastAPI & React (Q25 – Q30)

### Q25: Describe the high-level system architecture of EconoCausal.
**Answer:** A modern decoupled microservices architecture:
- **Backend:** FastAPI (Python 3.14/3.11), asynchronous event loop, Pydantic data validation, OpenAPI autodoc.
- **ML & Optimization Engine:** EconML, XGBoost, SciPy, Scikit-Learn.
- **Frontend:** React 18, Vite 5, Recharts for causal visualization, Lucide icons, glassmorphic responsive CSS.
- **Data Layer:** Pre-computed offline batch inferences (`discount_allocation.csv`) and real-time online estimation endpoints.

### Q26: Why choose FastAPI over Flask or Django?
**Answer:**
1. **Performance:** Built on Starlette and Uvicorn, offering near-Go speeds with asynchronous `async`/`await` support.
2. **Automatic Data Validation:** Pydantic models automatically validate incoming JSON bodies and return informative 422 errors.
3. **OpenAPI Standards:** Automatically generates interactive `/docs` (Swagger UI) and `/redoc`.
4. **Modern Typing:** Native Python type hints reduce bugs in mathematical payloads.

### Q27: How does the `/policy/simulate` endpoint work?
**Answer:** The frontend slider adjusts budget, discount amount, and customer segment. The browser sends a POST request with `BudgetConfigPayload`. The FastAPI backend dynamically executes the MILP optimization over the target segment in memory, returning the updated targeted customer count, expected incremental conversions, ROI, and spend breakdown in under 40 milliseconds.

### Q28: How is state managed in the React dashboard?
**Answer:** React hooks (`useState`, `useEffect`, `useCallback`) manage page-level state. API communication is centralized in `frontend/src/services/api.js`, with robust fallback mechanisms so the dashboard remains interactive even during disconnected demonstrations.

### Q29: What are the 8 pages of the frontend dashboard?
**Answer:**
1. **Overview:** Executive KPIs, ATE banner, Quick Actions.
2. **Data & DAG:** Confounder structure, causal graph, summary statistics.
3. **Causal Estimation:** ATE, CATE heterogeneity distributions, feature importance.
4. **Uplift & Evaluation:** Qini curve, AUUC, Placebo refutation charts.
5. **Policy Optimizer:** Real-time budget allocation and policy comparisons.
6. **Counterfactual Simulator:** Individual customer "what-if" causal scenario tester.
7. **Drift Monitoring:** Live KS-test p-values, PSI drift flags, and retrain triggers.
8. **Export & Documentation:** Direct CSV downloads and compliance reports.

### Q30: How does the Counterfactual Simulator create business value?
**Answer:** It allows marketing managers to inspect a specific customer profile (e.g. 35-year-old, 6 months tenure, high churn risk), adjust candidate discount percentages, and immediately see the model's counterfactual prediction: "Without discount: 14% purchase probability. With 15% discount: 46% probability. Causal Uplift: +32%."

---

## 5. Monitoring, Drift & Enterprise Governance (Q31 – Q35)

### Q31: How is Data Drift detected in EconoCausal?
**Answer:** We implement two complementary statistical metrics in `src/monitoring/drift_detector.py`:
1. **Two-Sample Kolmogorov-Smirnov (KS) Test:** Non-parametric test comparing cumulative distribution functions of numerical features. Flagged if $p < 0.05$.
2. **Population Stability Index (PSI):** Quantifies shift in categorical or binned continuous distributions:
$$\text{PSI} = \sum \left( \text{Actual}_k - \text{Expected}_k \right) \times \ln\left(\frac{\text{Actual}_k}{\text{Expected}_k}\right)$$
Thresholds: $\text{PSI} < 0.1$ (Stable), $0.1 \le \text{PSI} \le 0.2$ (Moderate Drift), $\text{PSI} > 0.2$ (Significant Drift).

### Q32: What triggers model retraining in production?
**Answer:**
- Significant data drift ($\text{PSI} > 0.2$ on primary confounders).
- Decay in out-of-sample Qini coefficient below $+0.30$.
- Scheduled monthly batch retraining via the `/retrain` API endpoint.

### Q33: How does EconoCausal comply with ethical AI and GDPR?
**Answer:**
- Protected attributes (e.g. race, religion, gender) are excluded from the causal DAG to prevent discriminatory targeting.
- The platform operates strictly on behavioral features (spend history, browsing velocity, cart abandonment).
- Counterfactual transparency allows explaining *why* an intervention was recommended for any user.

### Q34: What is the primary business ROI of EconoCausal?
**Answer:** A typical retail enterprise spends ₹10,00,000/month on blanket promotional campaigns, with up to 40% wasted on "Sure Things". By switching to EconoCausal's causal targeting and MILP optimization, promotional spend is reduced by 25–35% while maintaining or increasing total incremental conversion revenue, yielding an estimated annual net savings of ₹30–45 Lakhs.

### Q35: If given another month, what would be the next architectural enhancement?
**Answer:**
1. Integration of **Multi-Action Causal Forests** to optimize across continuous and multi-tiered discount levels (e.g. 5%, 10%, 20%) simultaneously.
2. Deployment of a real-time Kafka event streaming consumer for sub-second ITE scoring on user session events.
3. Automated shadow-deployment CI/CD pipeline with automated A/B refutation validation.
