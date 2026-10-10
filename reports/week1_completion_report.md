# EconoCausal — Week 1 Completion Report

**Project:** EconoCausal: Dynamic Pricing via Double Machine Learning  
**Reference:** ITS/DSML/1147  
**Week:** 1 — Causal Graphing and Dashboard Scaffolding  
**Completion date:** 2026-10-10  
**Environment:** Python 3.14.6, Node.js 22, Windows 11 PowerShell  

---

## 1. Executive Summary

Week 1 of EconoCausal is complete. All thirteen deliverables specified in the
project brief have been implemented, validated, and organised. The synthetic
dataset pipeline, preprocessing module, exploratory data analysis, DoWhy
causal DAG, React dashboard scaffold, unit tests, and reports are all
functional and reproducible from a single set of documented commands.

The week produced a working foundation on which Week 2 (Double Machine
Learning estimation) and Week 3 (budget optimisation) will build.

---

## 2. Deliverables Completed

| # | Deliverable | Location | Status |
|---|---|---|---|
| 1 | Reproducible synthetic retail dataset | `data/raw/mock_retail_campaign.csv` | ✅ |
| 2 | Cleaned dataset | `data/processed/cleaned_retail_campaign.csv` | ✅ |
| 3 | Data dictionary | `data/README.md` | ✅ |
| 4 | Data generation source code | `src/data/generate_data.py` | ✅ |
| 5 | Preprocessing source code | `src/data/preprocess.py` | ✅ |
| 6 | EDA script | `src/data/eda.py` | ✅ |
| 7 | EDA notebook | `notebooks/01_week1_eda.ipynb` | ✅ |
| 8 | EDA figures (8 PNG files) | `reports/figures/` | ✅ |
| 9 | EDA written report | `reports/week1_eda_report.md` | ✅ |
| 10 | DoWhy causal DAG implementation | `src/causal/build_dag.py` | ✅ |
| 11 | Exported causal DAG image | `reports/figures/causal_dag.png` | ✅ |
| 12 | Causal assumptions report | `reports/week1_causal_analysis.md` | ✅ |
| 13 | React + Vite dashboard scaffold | `frontend/` | ✅ |
| 14 | Python dependency file | `requirements.txt` | ✅ |
| 15 | Frontend dependency file | `frontend/package.json` | ✅ |
| 16 | Unit tests | `tests/test_data_generation.py`, `tests/test_preprocessing.py` | ✅ |
| 17 | Test results | 78 passed, 0 failed | ✅ |
| 18 | Updated root README with setup instructions | `README.md` | ✅ |
| 19 | Week 1 completion report (this document) | `reports/week1_completion_report.md` | ✅ |

---

## 3. Work Completed

### 3.1 Synthetic Dataset

- Generated 2 200 base records with a fixed random seed (42) using `numpy.random.default_rng`.
- Introduced intentional confounding: customers with more `past_purchases`, higher
  `website_visits`, and Premium/Regular segments have higher treatment propensity AND
  higher baseline purchase probability.
- Controlled data quality issues: ~3 % missing values in numeric confounder columns
  and ~2 % duplicate rows, both for testing the preprocessing pipeline.
- True embedded ATE ≈ +8 pp (via the data-generating logit model).
- Dataset saved to `data/raw/mock_retail_campaign.csv` (2 244 rows including duplicates).

### 3.2 Preprocessing Pipeline

Full pipeline implemented in `src/data/preprocess.py`:

| Step | Result |
|---|---|
| Column validation | All 11 required columns verified present |
| Binary validation | `discount_offered`, `purchased` confirmed to contain only {0, 1} |
| Duplicate removal | 44 duplicate rows removed |
| Missing-value imputation | 198 values imputed (median for numeric, mode for categorical) |
| Data-type enforcement | Integer columns cast to `int64`; floats rounded |
| Revenue clipping | No negative values found |
| Outlier flagging (IQR) | 159 rows flagged with `is_outlier=1`, not removed |

Cleaned output: 2 200 rows, 12 columns, 0 missing values, 0 duplicates.

### 3.3 Exploratory Data Analysis

EDA script (`src/data/eda.py`) saved 8 publication-ready figures:

| Figure | Key finding |
|---|---|
| Treatment vs. control counts | 1 293 treated (58.8%), 907 control (41.2%) — imbalanced by design |
| Purchase rate comparison | Treated: 56.7%, Control: 35.8% — naïve gap +20.9 pp (biased) |
| Numeric distributions | `past_purchases` and `website_visits` visibly higher in treated group |
| Categorical distributions | Premium/Regular over-represented in treated group |
| Correlation heatmap | `website_visits` most correlated with treatment (r ≈ +0.31) |
| Purchase rate by segment | Premium has highest base rate; Lapsed shows largest absolute gap |
| Purchase rate by age group | Moderate variation; 35–44 slightly more responsive |
| Confounder box plots | All three numeric confounders higher in treated group — confirms confounding |

Key finding: The naïve ATE (+20.9 pp) is more than double the true causal ATE (~+8 pp).
This motivates the need for Double Machine Learning in Week 2.

### 3.4 Causal DAG

`src/causal/build_dag.py` using DoWhy 0.8 (compatible with Python 3.14):

- Defined treatment (`discount_offered`), outcome (`purchased`), and 5 confounders.
- Extracted the networkx DiGraph from DoWhy's internal `CausalGraph` wrapper.
- Rendered a colour-coded DAG (orange = confounders, blue = treatment, green = outcome).
- Verified 7 nodes and 11 edges (5 confounder→treatment, 5 confounder→outcome, 1 treatment→outcome).
- Causal assumptions, identification strategy, exclusion rationale, and glossary documented
  in `reports/week1_causal_analysis.md`.

### 3.5 React Dashboard

Full scaffold built with React 18 + Vite 5:

| Page | Key functionality |
|---|---|
| Overview | Project summary, milestone tracker, technology stack |
| Data & EDA | CSV upload with PapaParse validation, 8 summary stat cards, column-role table, paginated data preview |
| Causal Analysis | DAG image display (with ASCII fallback), adjustment set, assumptions, glossary |
| Budget Config | Budget input, treatment/outcome selectors, confounder checkboxes — all accessible and validated |
| Uplift Analysis | Clearly marked as Week 2 planned — no fabricated estimates displayed |

Build: 52 modules transformed, 0 errors, bundle size ~195 KB gzipped ~63 KB.

### 3.6 Unit Tests

78 tests across 15 test classes, all passing in 1.90 s:

| File | Classes | Tests | Coverage area |
|---|---|---|---|
| `test_data_generation.py` | 7 | 34 | Reproducibility, schema, binary columns, numeric ranges, categoricals, data quality, causal structure |
| `test_preprocessing.py` | 8 | 44 | All pipeline steps, dtype enforcement, outlier flagging, adjustment set, column roles, full pipeline |

---

## 4. Test Results Summary

```
78 passed in 1.90s   (Python 3.14.6, pytest 9.0.3)
0 failed  0 errors  0 warnings
```

Run command:
```powershell
python -m pytest tests/ -v
```

---

## 5. Limitations and Known Issues

### 5.1 DoWhy Version Constraint

DoWhy 0.11.x requires Python < 3.14. The environment uses Python 3.14.6, so
DoWhy 0.8 is installed. The 0.8 API uses `CausalModel(common_causes=…)` rather
than the newer GML-graph interface. The `build_dag.py` script extracts the
networkx graph from `model._graph._graph` — an internal attribute that may
change in future DoWhy versions.

**Mitigation:** The script includes a fallback that manually reconstructs the
DAG from the specification if the internal attribute is not found.

**Week 2 recommendation:** Consider upgrading to Python 3.12 or 3.13 to use
DoWhy 0.14+ and EconML's latest estimators.

### 5.2 Naïve ATE vs. True ATE

The naïve difference (+20.9 pp) substantially over-estimates the true embedded
causal effect (~+8 pp) due to intentional confounding. The causal analysis
documents this clearly. The true ATE will be recovered in Week 2 using DML.

### 5.3 pygraphviz Not Available on Windows

`pygraphviz` requires Graphviz binary installation on Windows. The `build_dag.py`
script uses a networkx + matplotlib fallback that produces a clean PNG without
requiring Graphviz. Full Graphviz installation is documented in `requirements.txt`
as an optional step.

### 5.4 Synthetic Data Only

All data is programmatically generated. No real customer data has been used.
Pipeline performance on real data may differ. Additional confounders not present
in the synthetic data (e.g., brand loyalty, seasonal effects) could affect
identification in a real deployment.

### 5.5 Dashboard — Week 2 and Week 3 Features Not Yet Wired

The Uplift and Budget pages correctly display "Planned" placeholders with no
fabricated estimates. These will be populated in Weeks 2 and 3 once the DML
estimator and SciPy optimiser are implemented.

---

## 6. Acceptance Checklist

| Criterion | Result |
|---|---|
| Synthetic dataset generated with one command | ✅ `python src/data/generate_data.py` |
| Preprocessing pipeline runs successfully | ✅ `python src/data/preprocess.py` |
| EDA report and figures saved | ✅ 8 PNGs + `reports/week1_eda_report.md` |
| DoWhy causal graph generated with documented assumptions | ✅ `reports/figures/causal_dag.png` + `reports/week1_causal_analysis.md` |
| Dashboard starts locally and displays initial interface | ✅ `cd frontend && npm run dev` → http://localhost:5173 |
| Tests pass | ✅ 78/78 passed in 1.90 s |
| All deliverables organised and reproducible | ✅ |
| No unsupported causal claims made | ✅ All estimates clearly labelled naïve/biased or planned |

---

## 7. Quick-Start Commands (PowerShell)

```powershell
# 1. Activate environment
.venv\Scripts\Activate.ps1

# 2. Run full Python pipeline
python src/data/generate_data.py
python src/data/preprocess.py
python src/data/eda.py
python src/causal/build_dag.py

# 3. Run tests
python -m pytest tests/ -v

# 4. Start dashboard
cd frontend
npm install   # first time only
npm run dev
```

---

## 8. Next Steps — Week 2

1. Install EconML (`pip install econml`).
2. Implement `src/causal/dml_estimator.py` with `LinearDML` or `CausalForestDML`.
3. Estimate ATE and CATE using the 5-confounder adjustment set identified in Week 1.
4. Check propensity overlap and run DoWhy refutation tests.
5. Add Plotly uplift charts to the dashboard (currently placeholder).
6. Compare the DML-adjusted ATE (~+8 pp expected) against the naïve estimate (+20.9 pp).

---

*EconoCausal Week 1 — ITS/DSML/1147*
