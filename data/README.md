# EconoCausal — Data Directory

> **All data in this directory is synthetic and was generated programmatically
> for pipeline validation purposes only. It does not represent real customers,
> actual business outcomes, or any real organisation's data.**

---

## Directory Layout

```
data/
├── raw/                         # Unmodified generated dataset
│   └── mock_retail_campaign.csv
├── processed/                   # Cleaned, validated dataset ready for analysis
│   └── cleaned_retail_campaign.csv
└── README.md                    # This file
```

---

## Data Dictionary

### mock_retail_campaign.csv  (raw)

| # | Column | Type | Role | Description |
|---|--------|------|------|-------------|
| 1 | `customer_id` | string | Identifier | Pseudonymous customer key (`CUST_XXXXX`). **Must not enter the causal adjustment set.** |
| 2 | `age_group` | categorical | Pre-treatment confounder | Customer age band: `18-24`, `25-34`, `35-44`, `45-54`, `55+`. Measured before the campaign. |
| 3 | `past_purchases` | integer | Pre-treatment confounder | Number of purchases in the 90 days before the campaign. Correlates with both treatment propensity and purchase outcome. |
| 4 | `avg_order_value` | float | Pre-treatment confounder | Mean order value (£) in the 90 days before the campaign. Proxy for customer spending capacity. |
| 5 | `website_visits` | integer | Pre-treatment confounder | Number of website visits in the 30 days before the campaign. Proxy for current engagement level. |
| 6 | `customer_segment` | categorical | Pre-treatment confounder | CRM segment assigned before the campaign: `Premium`, `Regular`, `Occasional`, `Lapsed`. |
| 7 | `discount_offered` | binary (0/1) | **Treatment** | Whether the customer was offered a promotional discount during the campaign window. 1 = offered, 0 = control. |
| 8 | `discount_amount` | float | Treatment attribute | Discount value (£) offered to the customer. Zero for control customers. Post-assignment; use with care. |
| 9 | `purchased` | binary (0/1) | **Primary outcome** | Whether the customer made at least one purchase within the 14-day campaign window. |
| 10 | `revenue` | float | Secondary outcome / post-treatment | Observed revenue (£) within the campaign window. **Post-treatment variable — exclude from confounder adjustment set.** |
| 11 | `campaign_date` | date | Administrative | Date the campaign communication was sent (`YYYY-MM-DD`). |

---

## Variable Roles Summary

| Role | Variables |
|------|-----------|
| **Identifier** (exclude from model) | `customer_id` |
| **Pre-treatment confounders** (adjust for) | `age_group`, `past_purchases`, `avg_order_value`, `website_visits`, `customer_segment` |
| **Treatment** | `discount_offered` |
| **Treatment attribute** (do not use as confounder) | `discount_amount` |
| **Primary outcome** | `purchased` |
| **Post-treatment / secondary outcome** | `revenue` |
| **Administrative** | `campaign_date` |

---

## Why `customer_id` Is Excluded from the Adjustment Set

Customer identifiers are unique keys with no causal relationship to purchase
behaviour. Including them in a regression or matching model would:

1. Create a spurious one-to-one mapping between ID and outcome.
2. Consume model capacity without providing generalizable signal.
3. Risk encoding demographic proxies if IDs contain embedded information.

---

## Why `revenue` Is Excluded from the Confounder Adjustment Set

`revenue` is measured *after* treatment is assigned. Conditioning on a
post-treatment variable can open collider paths and introduce bias. Use
`revenue` only as an alternative outcome variable, not as a covariate.

---

## Data Generation

```powershell
# From the project root (activate .venv first)
python src/data/generate_data.py
```

Output: `data/raw/mock_retail_campaign.csv`  
Random seed: **42** — re-running the script produces an identical file.

---

## Data Preprocessing

```powershell
python src/data/preprocess.py
```

Output: `data/processed/cleaned_retail_campaign.csv`  
Steps: missing-value imputation, duplicate removal, type validation, campaign date
format validation, business logic integrity checks, outlier flagging, and column-role tagging.

---

## Empirical Data Study & Quality Audit

A comprehensive statistical and causal health audit of the dataset is available:

```powershell
python src/data/data_study.py
```

Output: `reports/data_study_report.md`  
Key findings audited:
- **Confounder skewness:** `avg_order_value` exhibits right skewness (1.81) requiring logarithmic transformations for linear nuisance models.
- **Empirical positivity:** Common support holds 100% across all customer segments (54%–62% treatment probability) and age bands (56%–62%).
- **Promotional margin analysis:** 17 treated purchasers (2.3%) exhibited negative net revenue (`discount_amount > revenue`, loss down to £9.91), highlighting the necessity of minimum order thresholds in real-world campaigns.


## Privacy and Licensing

This dataset is **entirely synthetic**. No real customer data was used.
The generation script is the authoritative record of the data-generating process.
Do not commit real customer data to this repository.
