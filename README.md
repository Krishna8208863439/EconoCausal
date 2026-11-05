# EconoCausal: Dynamic Pricing via Double Machine Learning

> **An enterprise decision-intelligence React platform for estimating heterogeneous treatment effects, prescriptive budget optimization, and distribution drift monitoring.**

**Domain:** Economics, Causal AI, Decision Science & Machine Learning  
**Project reference:** ITS/DSML/1147  
**Runtime:** React 18, Vite, TypeScript  
**Port:** 3000 (`0.0.0.0:3000`)

---

## Architecture Overview

EconoCausal is rewritten as a modern React application powered by Vite, presenting an enterprise SaaS dashboard for causal decision-making across retail discount campaigns:

1. **Overview & Executive Summary (`/`)**:
   - High-level KPIs, cohort sample statistics (2,200 customers, 1,293 treated, 907 control).
   - Double Machine Learning ATE (+19.47 pp) vs Naïve conversion difference (+20.86 pp, eliminating 1.39 pp selection bias).
   - Full executive natural-language decision briefing synthesizing campaign metrics, prescriptive ROI, and drift stability.

2. **Data & Exploratory Data Analysis (`/data`)**:
   - Interactive 2,200-customer dataset table with search, pagination, and role tags.
   - DoWhy variable roles: Confounders, Treatment indicator, Primary outcome, and excluded post-treatment colliders.
   - Comprehensive EDA figures gallery and grouped conversion bar charts.
   - CSV Dataset History & Snapshot Manager with in-browser persistence.

3. **Causal Inference & Double Machine Learning (`/causal`)**:
   - Structural Directed Acyclic Graph (DAG) specification and identification assumptions (SUTVA, Positivity, Unconfoundedness).
   - Robinson residualization and Frisch-Waugh-Lovell theorem foundation.
   - In-depth nuisance model diagnostics (Propensity classifier ROC-AUC: 0.536, 99.91% common support overlap; Outcome regressor RMSE: 0.502).

4. **Campaign Budget Configuration (`/budget`)**:
   - Interactive parameters: Marketing budget (default ₹5,000), Discount amount per coupon (₹10), and target segments.
   - Prescriptive allocation matrix and policy comparisons.

5. **Uplift & Treatment Evaluation (`/uplift`)**:
   - Real-time customer treatment effect inference engine: compute individual CATE $\tau_i$, 95% Confidence Intervals, and personalized discount recommendations.
   - Cumulative Uplift Curve and Qini Curve (Qini score: +0.684).
   - CATE distribution density chart with Mean ATE marker.

6. **Discount Allocation Matrix (`/optimization`)**:
   - Prescriptive MILP knapsack optimizer selecting high-elasticity customers maximizing net contribution.
   - Full customer-level allocation table with sorting, search, and CSV export (`discount_allocation.csv`).
   - Policy comparison chart across Causal DML, Random, Blanket, and No-Discount policies.

7. **Automated Data Drift Monitor (`/drift`)**:
   - Two-Sample Kolmogorov-Smirnov test and decile Population Stability Index (PSI) for continuous covariates (`past_purchases`, `avg_order_value`, `website_visits`).
   - Chi-Square tests and categorical PSI for `age_group` and `customer_segment`.
   - Audit report viewer and upload validator for candidate campaign datasets.

8. **Executive Briefing & Technical Viva (`/report`)**:
   - Comprehensive technical defense examination notes.
   - Methodological justification (Why DML? Why Neyman orthogonality? Why MILP?).
   - Report export in Markdown and allocation CSV download.

---

## Development

```bash
npm install
npm run dev
```

Applet dev server starts on port `3000`.

## Build

```bash
npm run build
```
