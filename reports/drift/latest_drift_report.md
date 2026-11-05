# EconoCausal — Automated Data Drift & Quality Report
**Generated:** 2026-10-18T11:28:10.553756+00:00  
**Status:** **DRIFT_DETECTED**  
**Reference Records:** 2,200 | **Current Records:** 2,200  

---

## 1. Executive Summary

| Category | Assessment |
|---|---|
| **Overall Drift Status** | **DRIFT_DETECTED** |
| **Schema Integrity** | VALID |
| **High Drift Features** | past_purchases, avg_order_value, website_visits, age_group, customer_segment |
| **Moderate Drift Features** | None |

---

## 2. Covariate Distribution Stability (PSI & Statistical Tests)

| Feature | Type | Test | PSI | p-value | Severity | Status |
|---|---|---|---|---|---|---|
| `past_purchases` | numerical | KS & PSI | **0.8575** | 0.0000 | HIGH | Significant Drift |
| `avg_order_value` | numerical | KS & PSI | **0.4500** | 0.0000 | HIGH | Significant Drift |
| `website_visits` | numerical | KS & PSI | **0.8064** | 0.0000 | HIGH | Significant Drift |
| `age_group` | categorical | Chi² & PSI | **0.2674** | 0.0000 | HIGH | Significant Drift |
| `customer_segment` | categorical | Chi² & PSI | **0.3387** | 0.0000 | HIGH | Significant Drift |

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

- Significant distribution shift observed in ['past_purchases', 'avg_order_value', 'website_visits', 'age_group', 'customer_segment']. Investigate possible seasonal behavioral changes or marketing channel source modifications.
- Governance Policy: Statistical covariate drift does not automatically imply causal model degradation. Do NOT automatically retrain without off-policy validation on new experimental data.

> **Causal ML Governance Disclaimer:**  
> A drift warning indicates that the incoming customer covariate distribution has changed relative to the model training cohort. Under Robinson's residualization and unconfoundedness, causal estimators remain valid if overlap holds, but out-of-support predictions carry higher variance. Never trigger autonomous retraining without human and econometric review.
