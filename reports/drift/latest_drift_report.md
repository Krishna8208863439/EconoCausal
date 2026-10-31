# EconoCausal — Automated Data Drift & Quality Report
**Generated:** 2026-10-18T11:37:09.050494+00:00  
**Status:** **STABLE**  
**Reference Records:** 2,200 | **Current Records:** 5  

---

## 1. Executive Summary

| Category | Assessment |
|---|---|
| **Overall Drift Status** | **STABLE** |
| **Schema Integrity** | VALID |
| **High Drift Features** | None |
| **Moderate Drift Features** | None |

---

## 2. Covariate Distribution Stability (PSI & Statistical Tests)

| Feature | Type | Test | PSI | p-value | Severity | Status |
|---|---|---|---|---|---|---|
| `past_purchases` | numerical | KS & PSI | **0.0000** | 1.0000 | NONE | Stable |
| `avg_order_value` | numerical | KS & PSI | **0.0000** | 0.3368 | NONE | Stable |
| `website_visits` | numerical | KS & PSI | **0.0000** | 0.8636 | NONE | Stable |
| `age_group` | categorical | Chi² & PSI | **0.0000** | 1.0000 | INSUFFICIENT_DATA | Insufficient Data |
| `customer_segment` | categorical | Chi² & PSI | **0.0000** | 1.0000 | INSUFFICIENT_DATA | Insufficient Data |

---

## 3. Data Missingness & Quality Auditing

| Feature | Reference Missing % | Current Missing % | Net Change (pp) | Alert |
|---|---|---|---|---|
| `past_purchases` | 0.0% | 0.0% | +0.00% | ✅ Normal |
| `avg_order_value` | 0.0% | 0.0% | +0.00% | ✅ Normal |
| `website_visits` | 0.0% | 0.0% | +0.00% | ✅ Normal |
| `age_group` | 0.0% | 0.0% | +0.00% | ✅ Normal |
| `customer_segment` | 0.0% | 0.0% | +0.00% | ✅ Normal |

---

## 4. Recommended Actions & Governance Notes

- All monitored covariates exhibit stable distributions (PSI < 0.10). No intervention needed.
- Governance Policy: Statistical covariate drift does not automatically imply causal model degradation. Do NOT automatically retrain without off-policy validation on new experimental data.

> **Causal ML Governance Disclaimer:**  
> A drift warning indicates that the incoming customer covariate distribution has changed relative to the model training cohort. Under Robinson's residualization and unconfoundedness, causal estimators remain valid if overlap holds, but out-of-support predictions carry higher variance. Never trigger autonomous retraining without human and econometric review.
