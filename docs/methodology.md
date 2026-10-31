# EconoCausal — Econometric & Causal Methodology Guide
**Project Reference:** ITS/DSML/1147  
**Version:** 4.0.0  
**Authors:** EconoCausal Engineering Team  

---

## 1. The Core Scientific Premise

Standard predictive machine learning models answer:
$$\text{Predictive ML:} \quad \hat{Y} = P(Y = 1 \mid X)$$
This identifies buyers with high organic affinity. Offering discounts to these customers wastes promotional capital because they would have purchased anyway without intervention.

In contrast, Causal Machine Learning isolates the **treatment effect**:
$$\text{Causal ML (ITE):} \quad \tau(X) = E[Y(1) - Y(0) \mid X]$$
This identifies **persuadable customers** whose conversion is counterfactually caused by the price discount.

---

## 2. Double Machine Learning (DML) Formulation

To overcome the **curse of dimensionality** and **regularization bias** when adjusting for high-dimensional confounders $X$, we implement Robinson's transformation (Double Machine Learning):

### 2.1 Partially Linear Model
$$Y = \tau(X) \cdot T + g(X) + \varepsilon, \quad E[\varepsilon \mid X, T] = 0$$
$$T = m(X) + \eta, \quad E[\eta \mid X] = 0$$

### 2.2 Neyman Orthogonal Residualization
1. **Nuisance Model 1 (Outcome Expectation):**
   $$\hat{l}(X) = E[Y \mid X]$$
2. **Nuisance Model 2 (Propensity Score):**
   $$\hat{m}(X) = E[T \mid X] = P(T = 1 \mid X)$$
3. **Residual Regression:**
   $$\tilde{Y} = Y - \hat{l}(X)$$
   $$\tilde{T} = T - \hat{m}(X)$$
   $$\tilde{Y} = \tau(X) \cdot \tilde{T} + u$$

By regressing outcome residuals $\tilde{Y}$ on treatment residuals $\tilde{T}$, first-order errors in nuisance model estimation do not contaminate the causal estimate $\hat{\tau}(X)$, achieving parametric root-$N$ convergence rates.

### 2.3 Cross-Fitting (Sample Splitting)
To eliminate overfitting and regularization bias, we enforce 5-fold cross-fitting ($K=5$). Nuisance models are trained on out-of-fold partitions and evaluated out-of-sample on holdouts.

---

## 3. Prescriptive Knapsack Optimization & The Value Formula

### 3.1 The Value Formula with Cannibalization Penalty
$$\Delta \text{Margin}_i = \hat{\tau}_i \cdot (\text{Margin}_i - d) - p_{0,i} \cdot d$$

Where:
- $p_{0,i} = \text{clip}\big(m(X_i) - e(X_i) \cdot \hat{\tau}_i, 0, 1\big)$ is the baseline purchase probability without an offer.
- $d$ is the fixed discount amount.
- The term $p_{0,i} \cdot d$ represents **cannibalization cost**: the margin lost when granting a coupon to an organic buyer.

### 3.2 0-1 Knapsack Binary Integer Program
$$\max_{\mathbf{x}} \quad \sum_{i=1}^{N} x_i \cdot \Delta \text{Margin}_i$$
$$\text{subject to} \quad \sum_{i=1}^{N} x_i \cdot d \le B, \quad x_i \in \{0, 1\}$$

Solved via SciPy's HiGHS solver (`scipy.optimize.milp`).

### 3.3 Governance & Robustness Constraints
- **Conservative Mode:** Restricts targeting to $\hat{\tau}_{\text{lo},i} > 0$ to guarantee 95% statistical confidence of positive uplift.
- **Segment Caps:** Limits discount allocation per customer segment to avoid customer churn or market concentration.
- **Budget Invariance:** Mathematical guarantee that spend never exceeds budget $B$.
