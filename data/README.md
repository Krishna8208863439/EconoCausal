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

### mock_retail_campaign.csv  (raw) & cleaned_retail_campaign.csv (processed)

| # | Column | Type | Role | Description |
|---|--------|------|------|-------------|
| 1 | `customer_id` | string | Identifier | Pseudonymous customer key (`CUST_XXXXX`). **Must not enter the causal adjustment set.** |
| 2 | `date` | date | Administrative | Observation timestamp (`YYYY-MM-DD`). |
| 3 | `campaign_date` | date | Administrative | Date campaign communication was dispatched (`YYYY-MM-DD`). |
| 4 | `price` | float | **Treatment (Continuous)** | Unit price (£25–£120) for the dynamic pricing engine. |
| 5 | `units_sold` | integer | **Outcome (Continuous)** | Units sold / sales volume governed by true price elasticity ($\beta = -1.50$). |
| 6 | `cost_price` | float | Pre-treatment confounder | Unit wholesale cost of goods (£20–£75). |
| 7 | `competitor_price` | float | Pre-treatment confounder | Competitor market reference price (£25–£110). |
| 8 | `ad_spend` | float | Pre-treatment confounder | Promotional advertising spend (£10–£150). |
| 9 | `inventory` | integer | Pre-treatment confounder | Stock inventory level on hand (40–500 units). |
| 10 | `age_group` | categorical | Pre-treatment confounder | Customer age band: `18-24`, `25-34`, `35-44`, `45-54`, `55+`. |
| 11 | `past_purchases` | integer | Pre-treatment confounder | Number of purchases in the 90 days before campaign. |
| 12 | `avg_order_value` | float | Pre-treatment confounder | Mean order value (£) in the 90 days before campaign. |
| 13 | `website_visits` | integer | Pre-treatment confounder | Number of website visits in the 30 days before campaign. |
| 14 | `customer_segment` | categorical | Pre-treatment confounder | CRM segment: `Premium`, `Regular`, `Occasional`, `Lapsed`. |
| 15 | `discount_offered` | binary (0/1) | **Treatment (Binary)** | Promotional coupon offer indicator. |
| 16 | `discount_amount` | float | Treatment attribute | Coupon amount (£5–£20). |
| 17 | `purchased` | binary (0/1) | **Primary outcome (Binary)** | Binary conversion indicator (1 = converted, 0 = not). |
| 18 | `revenue` | float | Post-treatment outcome | Realized basket revenue (£). **Post-treatment variable — excluded from adjustment set.** |

---

## Variable Roles Summary

| Role | Variables |
|------|-----------|
| **Identifier** (exclude from model) | `customer_id` |
| **Pre-treatment confounders** (adjust for) | `cost_price`, `competitor_price`, `ad_spend`, `inventory`, `age_group`, `past_purchases`, `avg_order_value`, `website_visits`, `customer_segment` |
| **Continuous Treatment** | `price` |
| **Continuous Demand Outcome** | `units_sold` |
| **Binary Treatment** | `discount_offered` |
| **Binary Outcome** | `purchased` |
| **Treatment attribute** (do not use as confounder) | `discount_amount` |
| **Post-treatment / secondary outcome** | `revenue` |
| **Administrative** | `date`, `campaign_date` |

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
Steps: missing-value imputation, duplicate removal, type validation, outlier
flagging, and column-role tagging.

---

## Privacy and Licensing

This dataset is **entirely synthetic**. No real customer data was used.
The generation script is the authoritative record of the data-generating process.
Do not commit real customer data to this repository.
