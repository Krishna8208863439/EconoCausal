# EconoCausal — Econometric & Causal Methodology Guide
**Project Reference:** ITS/DSML/1147  
**Version:** 4.0.0 (Day 5-6 Freeze & Review Readiness)  
**Authors:** EconoCausal Engineering Team | Infotact Solutions  

---

## 1. The Core Scientific Premise

Standard predictive machine learning models answer:
$$\text{Predictive ML:} \quad \hat{Y} = P(Y = 1 \mid X)$$
This identifies buyers with high organic affinity. Offering discounts to these customers wastes promotional capital because they would have purchased anyway without intervention.

In contrast, Causal Machine Learning isolates the **Individual Treatment Effect (ITE)**:
$$\text{Causal ML (ITE):} \quad \tau(X) = \mathbb{E}[Y(1) - Y(0) \mid X]$$
This identifies **persuadable customers** whose conversion is counterfactually caused by the price discount.

```
┌───────────────────────────────┬───────────────────────────────┐
│         Sure Things           │         Persuadables          │
│   Y(1) = 1,  Y(0) = 1         │   Y(1) = 1,  Y(0) = 0         │
│   τ_i = 0 (Cannibalization)   │   τ_i = +1 (True Causal Lift) │
├───────────────────────────────┼───────────────────────────────┤
│         Lost Causes           │          Sleeping Dogs        │
│   Y(1) = 0,  Y(0) = 0         │   Y(1) = 0,  Y(0) = 1         │
│   τ_i = 0 (Wasted Spend)      │   τ_i = -1 (Negative Uplift)  │
└───────────────────────────────┴───────────────────────────────┘
```

---

## 2. Structural Identification Assumptions (The DAG)

To identify causal effects from observational data, three identification assumptions must hold:

1. **Conditional Ignorability (Unconfoundedness):**
   $$\{Y(1), Y(0)\} \perp\!\!\perp T \mid X$$
   All common causes of treatment assignment $T$ and outcome $Y$ are captured in the conditioning set $X = \{\text{past\_purchases}, \text{avg\_order\_value}, \text{website\_visits}, \text{age\_group}, \text{customer\_segment}\}$.
2. **Positivity (Common Support / Overlap):**
   $$0 < P(T = 1 \mid X) < 1 \quad \forall X$$
   Every customer profile has a non-zero probability of receiving either treatment or control. Empirically verified in EconoCausal across the propensity window $[0.400, 0.766]$, with $99.91\%$ coverage.
3. **Stable Unit Treatment Value Assumption (SUTVA):**
   - No interference: One customer receiving a discount does not affect another customer's decision.
   - Single version of treatment: The ₹10 discount represents an identical economic intervention for all recipients.

---

## 3. Double Machine Learning (DML) Formulation

To overcome the **curse of dimensionality** and **regularization bias** when adjusting for high-dimensional confounders $X$, we implement Robinson's transformation (Double Machine Learning):

### 3.1 Partially Linear Model
$$Y = \tau(X) \cdot T + g(X) + \varepsilon, \quad \mathbb{E}[\varepsilon \mid X, T] = 0$$
$$T = m(X) + \eta, \quad \mathbb{E}[\eta \mid X] = 0$$

### 3.2 Neyman Orthogonal Residualization
1. **Nuisance Model 1 (Outcome Expectation):**
   $$\hat{l}(X) = \mathbb{E}[Y \mid X]$$
2. **Nuisance Model 2 (Propensity Score):**
   $$\hat{m}(X) = \mathbb{E}[T \mid X] = P(T = 1 \mid X)$$
3. **Residual Regression:**
   $$\tilde{Y} = Y - \hat{l}(X)$$
   $$\tilde{T} = T - \hat{m}(X)$$
   $$\tilde{Y} = \tau(X) \cdot \tilde{T} + u$$

By regressing outcome residuals $\tilde{Y}$ on treatment residuals $\tilde{T}$, first-order errors in nuisance model estimation do not contaminate the causal estimate $\hat{\tau}(X)$, achieving parametric $\sqrt{N}$ convergence rates.

### 3.3 5-Fold Cross-Fitting ($K=5$)
To eliminate overfitting and regularization bias, the sample is partitioned into $K=5$ folds. For each fold $k$, nuisance models are trained on the remaining $K-1$ folds and used to predict residuals $\tilde{Y}$ and $\tilde{T}$ out-of-sample on fold $k$.

---

## 4. Prescriptive Knapsack Optimization & The Value Formula

### 4.1 The EconoCausal Value Formula
$$\Delta \text{Margin}_i = \hat{\tau}_i \cdot (\text{Margin}_i - d) - p_{0,i} \cdot d$$

Where:
- $p_{0,i} = \text{clip}\big(m(X_i) - e(X_i) \cdot \hat{\tau}_i, 0, 1\big)$ is the baseline purchase probability without an offer, taken from the DML nuisance models.
- $d$ is the fixed discount amount (₹10).
- The term $p_{0,i} \cdot d$ is the **cannibalization cost**: the margin lost when granting a coupon to an organic buyer who would have bought anyway.
- **Expected spend per customer:** $(p_{0,i} + \hat{\tau}_i) \cdot d$.

### 4.2 0-1 Knapsack Binary Integer Program (BIP)
$$\max_{\mathbf{x}} \quad \sum_{i=1}^{N} x_i \cdot \Big[ \hat{\tau}_i \cdot (\text{Margin}_i - d) - p_{0,i} \cdot d \Big]$$
$$\text{subject to} \quad \sum_{i=1}^{N} x_i \cdot d \le B, \quad x_i \in \{0, 1\}$$
$$\sum_{i=1}^{N} x_i \le N_{\max} \quad (\text{Audience cap})$$
$$\sum_{i \in \text{Segment}_k} x_i \le \text{Cap}_k \quad (\text{Segment fairness quotas})$$

Solved via SciPy's HiGHS solver (`scipy.optimize.milp`).

### 4.3 Governance Constraints
- **Conservative Targeting Mode:** Filters candidates to $\hat{\tau}_{\text{lo},i} > 0$, guaranteeing that only customers with a 95% statistically significant positive treatment effect are selected.
- **Strict Budget Invariance:** Total expenditure is mathematically guaranteed never to exceed budget $B$.

---

## 5. Statistical Drift & Monitoring Formulation

### 5.1 Two-Sample Kolmogorov-Smirnov (KS) Test
$$D = \sup_{x} |F_{\text{curr}}(x) - F_{\text{ref}}(x)|$$
Where $F_{\text{ref}}$ and $F_{\text{curr}}$ are empirical cumulative distribution functions. A $p$-value $< 0.05$ flags statistical shape changes.

### 5.2 Decile Population Stability Index (PSI)
$$\text{PSI} = \sum_{b=1}^{10} \Big( P_{\text{curr}, b} - P_{\text{ref}, b} \Big) \times \ln\left( \frac{P_{\text{curr}, b}}{P_{\text{ref}, b}} \right)$$
- $\text{PSI} < 0.10$: Stable distribution.
- $0.10 \le \text{PSI} < 0.25$: Moderate drift (monitoring advised).
- $\text{PSI} \ge 0.25$: Significant drift (investigation required).

---

## 6. Oral Defense & Viva Rehearsal Guide (Day 6 Readiness)

### Q1: Why is correlation not causation?
**Answer:** Correlation measures statistical association ($P(Y=1 \mid T=1) - P(Y=1 \mid T=0)$), which conflates the true treatment effect with selection bias. In retail marketing, high-value customers who visit frequently receive more discounts. Comparing treated and untreated groups naively ($+20.86\text{ pp}$) credits the discount for purchases that would have happened organically. Causation isolates the counterfactual outcome ($\mathbb{E}[Y(1) - Y(0)]$) holding all confounders constant.

### Q2: What does residualization do?
**Answer:** Residualization implements Robinson's transformation (1988). By subtracting the expected outcome given covariates ($Y - \hat{l}(X)$) and the expected treatment given covariates ($T - \hat{m}(X)$), we purge all linear and non-linear confounding from both variables. Regressing $\tilde{Y}$ on $\tilde{T}$ satisfies Neyman orthogonality: the first-order derivative of the estimating equation with respect to nuisance parameters is zero, enabling $\sqrt{N}$ parametric consistency even when using flexible machine learning estimators.

### Q3: Why do we use cross-fitting?
**Answer:** Cross-fitting (sample splitting) breaks the statistical dependence between the estimation of the nuisance models ($\hat{l}, \hat{m}$) and the estimation of the causal parameter $\hat{\tau}$. If the same data points were used to fit nuisance models and estimate treatment effects, machine learning overfitting (Donsker class violations) would introduce substantial regularization bias into $\hat{\tau}$. 5-fold cross-fitting ensures all causal residuals are evaluated out-of-sample.

### Q4: What does the DAG assume, and what is overlap?
**Answer:** The Directed Acyclic Graph (DAG) encodes the conditional exchangeability assumption: that all backdoor paths connecting treatment $T$ and outcome $Y$ are blocked by conditioning on observable set $X$, leaving no unobserved confounders. Overlap (positivity) assumes $0 < P(T=1 \mid X) < 1$ for all customer segments. Without overlap, there are regions where certain customer profiles are either always treated or never treated, making counterfactual estimation mathematically impossible without arbitrary parametric extrapolation.

### Q5: Why does the value formula subtract $p_0 \cdot d$?
**Answer:** $p_0 = m(X) - e(X) \cdot \tau(X)$ represents the customer's organic baseline probability of purchasing without a promotional discount. When we offer discount $d$ to a customer who purchases organically, we gain zero incremental sales but suffer a direct financial margin loss of $d$. The term $-p_{0} \cdot d$ penalizes organic cannibalization, ensuring marketing capital is not wasted on sure-thing customers.

### Q6: What happens if there is hidden confounding?
**Answer:** If an unobserved variable simultaneously affects discount assignment and purchase likelihood (e.g., offline store loyalty or competitor promotions not recorded in the data), the unconfoundedness assumption is violated, and DML estimates will be asymptotically biased. We audit for hidden confounding using DoWhy refutation tests (placebo treatment and random common cause). If the refutation estimate significantly diverges from the original ATE, the model's causal validity is refuted.

---

## 7. Responsible AI, Fairness, & Privacy Governance

1. **Demographic Parity & Subgroup Uplift:** Treatment effects are audited across age groups and RFM tiers. Subgroup CATE analysis verifies that discounts are allocated based on price elasticity rather than demographic discrimination.
2. **Data Minimization:** No personally identifiable information (PII) such as customer names, email addresses, or phone numbers are ingested or persisted.
3. **Model Limitations:** All predictions reflect statistical point estimates and 95% confidence intervals; they represent expected counterfactual gains rather than realized accounting revenues.
