# EconoCausal: 13-Day Progress Review & Operational Plan

**Project Title:** EconoCausal — Enterprise Causal Machine Learning & Dynamic Pricing Platform  
**Internship Ref:** ITS/DSML/1147 | Infotact Solutions intern project  
**Plan Window:** Wednesday 28 Oct – Monday 9 Nov 2026 (13 Days)  
**Final Review Window:** 5 Nov – 10 Nov 2026 (opens in 8 days)  

---

## Read This First

Today is **Wednesday 28 Oct**. The Mid Review window (20–27 Oct) closed yesterday, and the Final Review window (5–10 Nov) opens in 8 days. This plan runs 13 days, from **28 Oct to 9 Nov**, finishing inside the Final Review window.

### Do These Two Things Today Before Anything Else:

1. **Mid Review Status:** If it has not happened, message your Infotact mentor now. Ask whether it was held or can be rescheduled.
2. **Commit Streak Audit:** Open your GitHub commit calendar and look for gaps. The Final Review requires a commit on **every one of the 20 days before it**, and that window starts between **17 and 22 Oct** depending on your review date. A gap means the handbook marks the project incomplete, so inform your mentor early if there is one.

---

## The Plan at a Glance

All core implementation work must finish by **Day 8 (Wed 4 Nov)** so that Days 9–13 are dedicated to documentation, rehearsal, and buffer before the review window closes.

| Days | Dates | Phase & Goal | Target Deliverable |
|:---:|:---|:---|:---|
| **Days 1–2** | Wed 28 – Thu 29 Oct | **Phase 1:** Recheck and fix Weeks 1 and 2 | Clean clone & Week 2 audit pass |
| **Days 3–5** | Fri 30 Oct – Sun 1 Nov | **Phase 2:** Week 3: Pricing engine, policy comparison, dashboard page | 4-column pricing engine & UI |
| **Days 6–8** | Mon 2 – Wed 4 Nov | **Phase 3:** Week 4: API, drift checks, evaluation, **Code Freeze** | Full API, KS/PSI drift, freeze |
| **Days 9–13** | Thu 5 – Mon 9 Nov | **Phase 4:** Report, PPT, demo, viva, videos, and review itself | Final submission & defense |

---

## Phase 1: Recheck Weeks 1 and 2 (Days 1–2)

### Day 1, Wed 28 Oct. Audit Week 1 and Settle the Treatment

**Objectives:**
- [ ] Do a fresh `git clone`, set up a `.venv`, and run the entire Week 1 pipeline from the README: data generation, preprocessing, EDA, causal DAG, and test suite. Expect **78 tests passed**.
- [ ] Verify that the React dashboard starts cleanly on `http://localhost:5173`.
- [ ] Confirm the Work Distribution Document is submitted, every member has their own branch, and the repo is connected to the Infotact dashboard.
- [ ] **Settle the price vs. discount question:** The project image is about price and sales, while the README references discounts. If Week 2 already used `discount_amount`, **do not rebuild**. A discount effect curve converts directly into a price recommendation, since:
  $$\text{Price} = \text{List Price} - \text{Discount}$$
- [ ] Write a structured list of everything that fails or is missing.

**Done when:** Week 1 runs end-to-end from a clean clone and you have a written fix list.

| Review Item | Daily Notes |
|:---|:---|
| Hours spent | |
| What went well | |
| Blockers or issues | |
| Committed to own branch today? | [ ] Yes |

---

### Day 2, Thu 29 Oct. Audit Week 2 and Close Gaps

**Objectives:**
Verify all 10 Week 2 audit pass conditions:

| # | Check Area | Required Pass Condition | Status |
|:---:|:---|:---|:---:|
| 1 | `econml` in `requirements.txt` | Installs cleanly and imports without error | [x] PASSED |
| 2 | `dml_estimator.py` | Produces an effect estimate with a valid confidence interval | [x] PASSED |
| 3 | Naive vs DML comparison | Comparison table exists showing meaningful confounding bias reduction | [x] PASSED |
| 4 | Nuisance models | MAE, RMSE, and $R^2$ recorded on a held-out test set | [x] PASSED |
| 5 | `diagnostics.py` | Overlap, balance, and DoWhy refutations run and save results | [x] PASSED |
| 6 | True-effect recovery | Reported if synthetic generator stores the known true effect | [x] PASSED |
| 7 | Dashboard Causal page | Shows real estimates and live curves, not static placeholders | [x] PASSED |
| 8 | API and SQLite | `/health` and `/causal/estimate` work; execution runs saved to DB | [x] PASSED |
| 9 | Test suite | Full `pytest` verification suite passes | [x] PASSED |
| 10 | `reports/week2_dml_report.md` | Written with causal assumptions, intervals, and zero ROI claims | [x] PASSED |

- [ ] Anything that fails: build the minimal version today.
- [ ] Merge member branches to `main` and tag `week2`.

**Done when:** Every row in the checklist above is ticked and `main` is completely green.

---

## Phase 2: Week 3, The Pricing Engine (Days 3–5)

### Day 3, Fri 30 Oct. Core Engine

**Objectives:**
- [ ] Formulate economic objectives:
  $$\text{Revenue} = \text{Price} \times \text{Expected Sales}$$
  $$\text{Profit} = (\text{Price} - \text{Cost}) \times \text{Expected Sales}$$
- [ ] Verify cost data exists in dataset (`cost_price`). If absent, add a cost column or label the output "revenue" instead of "profit".
- [ ] Build `src/optimization/pricing_engine.py` (and integrate with `src/causal/pricing_optimizer.py`). The engine constructs a price grid, uses the DML elasticity/effect to predict expected sales at each price, and outputs the 4-column table:
  $$\begin{bmatrix} \text{Price} & \text{Expected Sales} & \text{Revenue} & \text{Profit} \end{bmatrix}$$
- [ ] Sanity check: Ensure demand strictly falls as price rises, and outputs stay within realistic microeconomic bounds.

**Done when:** The pricing engine prints the 4-column table for a given product or customer segment.

---

### Day 4, Sat 31 Oct. Goals, Constraints, and Policy Comparison

**Objectives:**
- [ ] Implement four explicit optimization objectives:
  1. Maximize Revenue
  2. Maximize Profit
  3. Maximize Sales Volume
  4. Weighted Blend of Profit and Volume
- [ ] Add operational constraints:
  - Minimum and maximum price bounds ($P_{\min}, P_{\max}$)
  - Minimum profit margin floor ($\ge 10\%$)
  - Maximum allowable price change ($\pm 20\%$)
  - Available inventory limit
- [ ] Use SciPy solvers (`minimize_scalar` / `minimize` for continuous pricing; `linprog` / `milp` for customer-level budget allocation).
- [ ] Build 4-policy comparative benchmark:
  1. Current Price Policy
  2. Recommended Causal DML Policy
  3. Random Allocation Policy
  4. Blanket Policy
- [ ] On synthetic data with known DGP, score each policy against the known true effect.
- [ ] Write unit and integration tests for the optimizer.

**Done when:** Each goal produces a distinct recommended price and the policy comparison table is exported.

---

### Day 5, Sun 1 Nov. Dashboard Pricing Page & Week 3 Wrap-up

**Objectives:**
- [ ] Build the interactive Pricing Page in the React dashboard:
  - Objective selector (Revenue, Profit, Sales Volume, Balanced)
  - Constraint sliders (margin floor, price bounds, inventory)
  - Recommended optimal price card
  - Interactive Price-vs-Demand causal curve
  - Revenue and Profit comparison chart
- [ ] Add interactive dataset filters (customer segment, product category, region).
- [ ] Author `reports/week3_report.md` (and `reports/week3_optimization_report.md`).
- [ ] Merge member branches to `main` and tag `week3`.

**Done when:** A user selects an objective in the dashboard and sees the recommended price with responsive curves.

---

## Phase 3: Week 4, API, Evaluation, and Code Freeze (Days 6–8)

### Day 6, Mon 2 Nov. API and Storage

**Objectives:**
- [ ] Finish operational REST endpoints:
  - `GET /causal/diagnostics` (nuisance metrics, overlap, refutations)
  - `POST /optimize` (or `POST /pricing/recommend`) (prescriptive recommendation)
  - `GET /runs/{id}` (historical run lookup)
- [ ] Implement robust Pydantic schema validation, file-size limits, and descriptive error responses.
- [ ] Persist every estimation and optimization run to SQLite (`data/econocausal.db`).
- [ ] Add comprehensive API integration tests in `tests/test_api.py`.

**Done when:** The React dashboard successfully communicates with all API endpoints end-to-end.

---

### Day 7, Tue 3 Nov. Evaluation, Drift, and Polish

**Objectives:**
- [ ] Implement automated covariate data-drift detection:
  - Kolmogorov-Smirnov (KS) tests for continuous features
  - Population Stability Index (PSI) with decile binning
  - Expose drift alerts in the frontend dashboard monitor
- [ ] Build the Experiment Report page with plain-language executive summaries for all charts.
- [ ] Populate the [README.md](file:///e:/econocausal/README.md) results table with **real measured numbers only** (strictly zero invented ROI).
- [ ] Extend test coverage across the entire end-to-end pipeline.

**Done when:** All evaluation metrics (MAE/RMSE, 95% CI, policy evaluation, out-of-sample validation) are visible in the platform.

---

### Day 8, Wed 4 Nov. Code Freeze

**Objectives:**
- [ ] **Feature Freeze:** Stop adding new features. From this point forward, perform bug fixes only.
- [ ] **Clean-Clone Check:** Test on a clean directory:
  1. `git clone`
  2. `python -m venv .venv` and dependency installation
  3. One-command pipeline execution
  4. Complete `pytest` suite
  5. FastAPI backend and React frontend spin-up
- [ ] Update [README.md](file:///e:/econocausal/README.md) with verified, copy-pasteable run commands.
- [ ] Merge all member branches into `main` and tag `final`.
- [ ] *Docker is optional:* Only attempt containerization if all previous criteria are verified and passing.

**Done when:** A teammate who did not write the code can run the entire project seamlessly from the README instructions.

---

## Phase 4: Documents, Rehearsal, and Review (Days 9–13)

### Day 9, Thu 5 Nov. Final Report and Presentation Deck (PPT)

**Objectives:**
- [ ] Write the Final Project Report (`reports/week4_final_report.md`): problem statement, causal methodology, identification assumptions, empirical results with 95% CIs, and practical limitations.
- [ ] Create the slide presentation (PPT) structured around the six core project phases.

---

### Day 10, Fri 6 Nov. Demo Video & Viva Preparation

**Objectives:**
- [ ] Record a 3–5 minute high-resolution live demo video walking through the interactive platform.
- [ ] **Technical Viva Rehearsal:** Ensure every team member can articulate answers to the 7 core questions:
  1. Why correlation does not equal causation (observational selection bias).
  2. What residualization does (Robinson's partialling-out for Neyman orthogonality).
  3. Why cross-fitting is essential (eliminates overfitting/plug-in bias).
  4. What the causal DAG assumes (conditional unconfoundedness / no unobserved confounders).
  5. What overlap / common support means (positivity: every unit has non-zero propensity).
  6. How the optimizer picks a price (continuous price profit curve vs. MILP knapsack allocation).
  7. What the limitations are (unobserved shocks, SUTVA interference, zero ROI claims without experimental validation).

---

### Day 11, Sat 7 Nov. Social Media Video & Timed Dry Run

**Objectives:**
- [ ] Record and submit the Final Review social media showcase video (**5 marks**).
- [ ] Conduct a timed dry run of the full review (formal presentation + live demo + mock viva questions).
- [ ] Resolve any minor UX or display glitches discovered during the dry run.

---

### Day 12, Sun 8 Nov. Review Buffer 1

**Objectives:**
- [ ] Re-verify GitHub commit calendar, repository branch synchronization, and README clarity.
- [ ] Attend the Final Review if scheduled today. Ensure **100% team attendance** (**5 marks**).

---

### Day 13, Mon 9 Nov. Final Review Buffer 2

**Objectives:**
- [ ] Last safe day before the review window closes on **10 Nov**.
- [ ] If the review has not yet been conducted, coordinate with your Infotact mentor immediately to ensure scheduling.

---

## Rules for All 13 Days

1. **Daily Meaningful Commits:** Every member commits meaningfully to their own branch each day. The Team Lead merges approved PRs to `main`. Single-character, whitespace, or empty commits do not count.
2. **Fallback Cut Order:** If running behind schedule, trim scope strictly in this order:
   - **Cut 1:** Docker containerization.
   - **Cut 2:** Extra dashboard aesthetic polish.
   - **Cut 3:** Segment-level causal forest granularity.
   - **PROTECT THE CORE:** DML effect estimate, diagnostics & refutations, pricing engine, dashboard UI, REST API, report, and live demo.
3. **No Unsubstantiated Claims:** Strictly make no profit, ROI, or revenue claims that your experimental data and statistical evaluations do not prove.

---

## GitHub Commit Calendar Tracker (17 Oct – 10 Nov)

The Final Review requires an unbroken commit streak across the **20 days prior to review**.

| Date | Day | Team Commit | Member A | Member B | Member C | Commit Summary |
|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 17 Oct | Sat | [x] | [x] | [ ] | [ ] | Causal diagnostics & refutation falsification |
| 18 Oct | Sun | [x] | [x] | [ ] | [ ] | Dynamic pricing optimizer & database logging |
| 19 Oct | Mon | [x] | [x] | [ ] | [ ] | API endpoints & test suite stabilization |
| 20 Oct | Tue | [x] | [x] | [ ] | [ ] | Mid-review compliance documentation |
| 21 Oct | Wed | [x] | [x] | [ ] | [ ] | Budget optimizer MILP formulation |
| 22 Oct | Thu | [x] | [x] | [ ] | [ ] | Frontend budget allocation view |
| 23 Oct | Fri | [x] | [x] | [ ] | [ ] | Data drift detection module (KS & PSI) |
| 24 Oct | Sat | [x] | [x] | [ ] | [ ] | Fast-path API testing & OpenAPI docs |
| 25 Oct | Sun | [x] | [x] | [ ] | [ ] | Frontend drift monitoring page |
| 26 Oct | Mon | [x] | [x] | [ ] | [ ] | Project audit report & readiness review |
| 27 Oct | Tue | [x] | [x] | [ ] | [ ] | Final evaluation report & executive summaries |
| 28 Oct | Wed | [x] | [x] | [ ] | [ ] | **Day 1: 13-Day plan sync & treatment alignment** |
| 29 Oct | Thu | [ ] | [ ] | [ ] | [ ] | **Day 2: Week 2 pass condition audit & tag** |
| 30 Oct | Fri | [ ] | [ ] | [ ] | [ ] | **Day 3: Core pricing engine (4-column table)** |
| 31 Oct | Sat | [ ] | [ ] | [ ] | [ ] | **Day 4: Objectives, constraints & policy bench** |
| 1 Nov | Sun | [ ] | [ ] | [ ] | [ ] | **Day 5: Dashboard pricing page & tag week3** |
| 2 Nov | Mon | [ ] | [ ] | [ ] | [ ] | **Day 6: API endpoints & SQLite persistence** |
| 3 Nov | Tue | [ ] | [ ] | [ ] | [ ] | **Day 7: Evaluation, drift metrics & README data** |
| 4 Nov | Wed | [ ] | [ ] | [ ] | [ ] | **Day 8: CODE FREEZE & clean-clone validation** |
| 5 Nov | Thu | [ ] | [ ] | [ ] | [ ] | **Day 9: Final report & presentation slides** |
| 6 Nov | Fri | [ ] | [ ] | [ ] | [ ] | **Day 10: Demo video & oral viva rehearsal** |
| 7 Nov | Sat | [ ] | [ ] | [ ] | [ ] | **Day 11: Social media video & dry run** |
| 8 Nov | Sun | [ ] | [ ] | [ ] | [ ] | **Day 12: Buffer 1 & attend scheduled review** |
| 9 Nov | Mon | [ ] | [ ] | [ ] | [ ] | **Day 13: Buffer 2 & final review closeout** |
| 10 Nov | Tue | [ ] | [ ] | [ ] | [ ] | Final review window closure |

---

## Decisions Log & Treatment Alignment

| Issue | Resolution & Rationale | Agreement Date |
|:---|:---|:---:|
| **Price vs. Discount Formulation** | **Unified Dual-Track Formulation:** The project image highlights continuous price elasticity ($\ln Q = \alpha + \beta \ln P + \dots$), while promotional retail uses discount coupons ($T \in \{0, 1\}$ or $\text{discount\_amount}$). Since $\text{Price} = \text{List Price} - \text{Discount}$, the causal discount effect curve maps directly to price elasticity. Both are supported in the platform. | 28 Oct 2026 |
| **Objective Formulation** | Dual support for Continuous Pricing ($\max_P (P - C) \cdot Q(P)$ or $P \cdot Q(P)$) and Promotional Budget Allocation ($\max \sum_i x_i (\tau_i M_i - d)$ subject to budget $B$). | 28 Oct 2026 |
| **ROI / Profit Claims** | Strict empirical standard: No ROI claims in reports without explicit experimental verification; all metrics report statistical uncertainty (95% CIs). | 28 Oct 2026 |
