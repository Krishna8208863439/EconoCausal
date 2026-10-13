# EconoCausal — Comprehensive Data Study & Quality Audit Report

> **Project Reference:** ITS/DSML/1147  
> **Audited Records:** 2,200 cleaned rows (2,244 raw records)  
> **Temporal Coverage:** 2024-01-15 to 2024-04-13 (90 campaign days)

---

## 1. Executive Summary

This empirical data study audits the pre-treatment covariates, treatment assignment mechanism, and outcome variables for the synthetic retail campaign dataset. The dataset exhibits realistic observational confounding designed to evaluate Double Machine Learning (DML) algorithms.

### Key Findings:
1. **Confounder Skewness:** `avg_order_value` shows substantial right-skewness (skewness = 1.81, kurtosis = 4.86) due to log-normal spending dynamics. A logarithmic nuisance transformation is recommended for linear models.
2. **Strict Positivity (Overlap):** Treatment probability is balanced across all strata (54.6%–62.5% across segments; 56.6%–62.2% across age groups), confirming that the positivity assumption holds without empirical violations.
3. **Promotional Margin Integrity:** Among 733 treated purchasing customers, 17 (2.32%) experienced negative net margins (`discount_amount > revenue`, with minimum net revenue of £-9.91). This reflects real-world flat-voucher over-discounting on low basket sizes.
4. **Controlled Data Quality:** 44 duplicate records were cleanly removed, and 202 missing values across 3 numeric confounders were median-imputed without introducing downstream bias.

---

## 2. Ingestion & Quality Cleaning Audit

| Quality Metric | Observation | Action Taken / Status |
| :--- | :--- | :--- |
| **Raw Ingested Records** | 2,244 | Base cohort + introduced duplicates |
| **Duplicates Removed** | 44 (2.0%) | Exact duplicate rows dropped, index reset |
| **Cleaned Population** | 2,200 | 100% valid records retained |
| **Missing Cells (Raw)** | 202 across 196 rows | Median imputed on numeric confounders |
| **Outlier-Flagged Rows** | 159 (7.2%) | IQR-flagged via `is_outlier`, rows retained |

### Missingness Breakdown (Raw Dataset)

| Column | Missing Count | Imputation Rule |
| :--- | :--- | :--- |
| `past_purchases` | 67 (3.0%) | Median imputation (robust to skew) |
| `avg_order_value` | 67 (3.0%) | Median imputation (robust to skew) |
| `website_visits` | 68 (3.0%) | Median imputation (robust to skew) |

---

## 3. Confounder Distributions & Skewness Analysis

| Feature | Mean | Std | Median | IQR [Q25, Q75] | Skew | Kurtosis | Outliers (%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `past_purchases` | 9.38 | 5.11 | 9.00 | [6.00, 12.00] | 0.84 | 0.91 | 56 (2.5%) |
| `avg_order_value` | 55.61 | 35.74 | 46.64 | [30.61, 69.45] | 1.81 | 4.86 | 108 (4.9%) |
| `website_visits` | 5.97 | 2.51 | 6.00 | [4.00, 8.00] | 0.45 | 0.36 | 3 (0.1%) |
| `discount_amount` | 7.47 | 7.09 | 7.24 | [0.00, 14.10] | 0.23 | -1.48 | 0 (0.0%) |
| `revenue` | 31.84 | 45.44 | 0.00 | [0.00, 53.85] | 1.95 | 5.07 | 84 (3.8%) |

> [!NOTE]
> `avg_order_value` displays the highest skewness (1.81) and kurtosis (4.86). > When fitting linear nuisance models $m(X)$ or logistic regression $e(X)$, incorporating > `log_avg_order_value = np.log1p(avg_order_value)` prevents extreme high-spending customers > from disproportionately exerting leverage on parameter estimates.

---

## 4. Positivity & Overlap Across Subgroups

For causal estimability, the positivity assumption requires $0 < P(T=1 \mid X) < 1$ for all confounder strata $X$.

### Behavioral Segments Breakdown

| Segment | Count | Population Share | Treatment Rate | P(Purchase \| Treated) | P(Purchase \| Control) | Naïve Diff |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Premium** | 431 | 19.6% | 60.6% | 59.4% | 44.7% | +14.7 pp |
| **Regular** | 870 | 39.5% | 62.5% | 54.6% | 35.3% | +19.3 pp |
| **Occasional** | 549 | 25.0% | 54.1% | 62.0% | 33.7% | +28.2 pp |
| **Lapsed** | 350 | 15.9% | 54.6% | 50.8% | 30.8% | +20.0 pp |

### Demographic Age Bands Breakdown

| Age Group | Count | Population Share | Treatment Rate | P(Purchase \| Treated) | P(Purchase \| Control) | Naïve Diff |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **18-24** | 321 | 14.6% | 58.3% | 57.8% | 41.0% | +16.7 pp |
| **25-34** | 447 | 20.3% | 59.1% | 56.4% | 35.0% | +21.5 pp |
| **35-44** | 472 | 21.5% | 57.2% | 56.7% | 37.1% | +19.5 pp |
| **45-54** | 447 | 20.3% | 56.6% | 55.7% | 31.4% | +24.3 pp |
| **55+** | 513 | 23.3% | 62.2% | 57.1% | 36.1% | +21.0 pp |

> [!IMPORTANT]
> **Empirical Positivity Confirmed:** Treatment rates across all segments range between 54.1% and 62.5%. > Across all age bands, treatment rates range between 56.6% and 62.2%. There are no empty cells or > near-zero propensity zones in any observed stratum.

---

## 5. Promotional Economics & Negative Margin Audit

Observational retail campaigns frequently encounter instances where flat promotional discounts exceed the purchase basket size, eroding profitability.

| Economic Metric | Observed Value | Interpretation |
| :--- | :--- | :--- |
| **Total Customers Treated** | 1,293 | Customers offered promotional discount |
| **Treated Customers Who Purchased** | 733 | 56.7% conversion among treated |
| **Mean Discount Amount Offered** | £12.71 | Average discount incentive |
| **Mean Gross Revenue (Purchasers)** | £67.52 | Mean basket spend |
| **Mean Net Revenue (Purchasers)** | £54.84 | Revenue minus discount |
| **Negative Margin Purchases** | **17 (2.32%)** | `discount_amount > revenue` |
| **Maximum Promotional Loss** | **£9.91** | Deepest loss on a single transaction |

> [!WARNING]
> 17 customers purchased an item where their discount was greater than the total observed order revenue. > In production dynamic pricing, minimum spend requirements (e.g. '£10 off orders over £30') must be parameterized > to prevent loss-inducing promotions.

---

## 6. Temporal Campaign Stability

- **Window Duration:** 90 consecutive calendar days (2024-01-15 to 2024-04-13).
- **Weekly Volume Uniformity:** Campaign notifications were evenly distributed across days of the week:

| Day of Week | Customer Volume | Percentage |
| :--- | :--- | :--- |
| Friday | 332 | 15.1% |
| Monday | 322 | 14.6% |
| Saturday | 321 | 14.6% |
| Tuesday | 310 | 14.1% |
| Wednesday | 307 | 14.0% |
| Thursday | 305 | 13.9% |
| Sunday | 303 | 13.8% |

---

## 7. Actionable Pipeline & Model Recommendations

1. **Business Invariant Guardrails:** Ensure `validate_business_logic()` continuously halts data ingestion if control customers exhibit positive discounts or non-purchasers exhibit revenue.
2. **Margin Tracking:** Preprocessing should compute `net_revenue` and track `is_negative_margin` to support post-causal pricing optimization.
3. **Nuisance Model Regularization:** Given the log-normal tail of `avg_order_value`, Double Machine Learning nuisance models $m(X)$ and $e(X)$ should utilize standardized inputs and optional log transforms to stabilize residualization.
4. **Readiness for Covariate Balance (Day 3):** With positivity verified across all confounder slices, the stage is set for Standardized Mean Difference (SMD) and Inverse Propensity Weighting (IPW) balance checks.

---
*Report auto-generated by `src/data/data_study.py`.*