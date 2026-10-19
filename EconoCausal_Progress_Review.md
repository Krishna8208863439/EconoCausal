# EconoCausal: Daily and Weekly Progress Review

*Project ITS/DSML/1147 | Infotact Solutions intern project | Baseline snapshot: Thursday 15 Oct 2026*

## How to use this file

1. At the end of every day, tick the tasks you finished and fill the review table for that day.
2. Update the overall progress numbers in Section 1 once a day.
3. Mark your commit for the day in the GitHub commit tracker (Section 7).
4. Be honest in the notes. This file is for you and your team to catch problems early, not to look good.
5. Week 1 status below is taken from the claims in your README's acceptance checklist. Tick the "verified" boxes only after you re-run the commands yourself.

> Updating this file can count as a documentation commit, but only if it contains real progress notes. Do not use tiny edits just to keep the daily streak alive. The handbook treats that as gaming the system.

---

## 1. Overall project progress

**Snapshot date:** Thu 15 Oct 2026

```
Overall:  [#####-----------------------------]  ~25%   (Week 1 complete, Weeks 2-4 pending)
Week 1:   [##############################]  100%  (per README, verify below)
Week 2:   [------------------------------]    0%
Week 3:   [------------------------------]    0%
Week 4:   [------------------------------]    0%
```

**How to calculate:** each week is worth 25%. Week % = ticked tasks divided by total tasks in that week. Overall % = the average of the four week percentages.

### Progress by week

| Week | Handbook dates | Focus | Status | Done % | Checked at |
|---|---|---|---|---|---|
| 1 | 5-11 Oct | Data, EDA, DAG, dashboard shell | Complete (verify) | 100% | Mid Review |
| 2 | 12-18 Oct | DML estimator, diagnostics, first effect charts | Starting late: compressed into 15-19 Oct | 0% | Mid Review |
| 3 | 19-25 Oct | Pricing/budget optimization engine, allocation UI | Not started | 0% | Final Review |
| 4 | 26 Oct-4 Nov | API, drift checks, polish, report, demo | Not started | 0% | Final Review |

### Progress by project phase (from the project image)

| # | Phase | Status | Est. % | Notes |
|---|---|---|---|---|
| 1 | Data collection | Done | 100% | Synthetic data, 2,244 rows, seed 42 |
| 2 | Preprocessing and EDA | Done | 100% | 2,200 clean rows, 8 EDA figures |
| 3 | Model development (DML) | Not started | 0% | Week 2 |
| 4 | Dynamic pricing engine | Not started | 0% | Week 3 |
| 5 | Model evaluation | Not started | 0% | Only Week 1 data tests exist so far. Model evaluation starts in Week 2 |
| 6 | Dashboard and final report | Shell only | ~20% | 5 pages scaffolded (Overview, Data, Causal, Budget, Uplift) with planned-feature placeholders |

### Key dates

| Event | Date | Done? |
|---|---|---|
| Work Distribution Document submitted (due before Mid Review) | Before 20 Oct | [ ] |
| Mid Review window (covers Weeks 1+2) | 20-27 Oct | [ ] |
| Mid Viva | In Mid Review window | [ ] |
| Mid Review social media video | In Mid Review window | [ ] |
| Final Review window (covers Weeks 3+4) | 5-10 Nov | [ ] |
| Final Viva | In Final Review window | [ ] |
| Final Review social media video | In Final Review window | [ ] |
| Scorecard release | Before the 20th of the following month | [ ] |

---

## 2. Week 1 review (5-11 Oct): Complete

### Deliverables

| Deliverable | Evidence (from README) | Claimed done | I verified it myself |
|---|---|---|---|
| Synthetic dataset, one command | `python src/data/generate_data.py` gives `data/raw/mock_retail_campaign.csv` (2,244 rows) | Yes | [ ] |
| Preprocessing pipeline | `python src/data/preprocess.py` gives `data/processed/cleaned_retail_campaign.csv` (2,200 rows, no missing values) | Yes | [ ] |
| EDA with 8 figures | `python src/data/eda.py`, `reports/figures/`, `reports/week1_eda_report.md` | Yes | [ ] |
| Causal DAG with DoWhy | `python src/causal/build_dag.py`, `reports/figures/causal_dag.png` | Yes | [ ] |
| Causal assumptions documented | `reports/week1_causal_analysis.md` | Yes | [ ] |
| Dashboard shell | `cd frontend && npm run dev`, http://localhost:5173 (5 pages, 6 components, CSV uploader) | Yes | [ ] |
| Unit tests | `python -m pytest tests/ -v`: 78 passed (34 data generation + 44 preprocessing) | Yes | [ ] |
| EDA notebook | `notebooks/01_week1_eda.ipynb` | Yes | [ ] |
| Week 1 completion report | `reports/week1_completion_report.md` | Yes | [ ] |
| Data dictionary | `data/README.md` | Yes | [ ] |

### What went well

- 
- 

### Gaps to carry into Week 2

- [ ] **Brief mismatch:** the project image is about **price and sales** (continuous treatment, optimal price engine). The README and dataset are about **binary discounts and customer uplift**. Decide with your mentor which to build. Record the decision in Section 9.
- [ ] `econml` is not in the listed Week 1 packages. Install it and add it to `requirements.txt`. Python 3.14 may not be supported, so check on Day 1.
- [ ] No backend/API or database exists yet. The Mid Review explicitly scores backend/API development and database integration.
- [ ] Confirm the Work Distribution Document is submitted.
- [ ] Confirm every member has their own branch and the repo is connected to the Infotact dashboard.
- [ ] Check whether the Team Lead needs to submit a **lag report**, because Week 2 starts 3 days after its handbook start date (12 Oct).

---

## 3. Week 2 review (handbook 12-18 Oct, executed 15-19 Oct)

**Goal:** train the DML estimator, run diagnostics, add the first effect charts, and have a minimal API and database ready for Mid Review.

**Reminder of how the Mid Review is marked:** 35 marks in total. 20 for project implementation and progress, 5 for the viva, 5 for attendance and 5 for the social media video.


### Day 1: Thu 15 Oct. Align data and set up

**Status:** `Not started`  (change to `In progress` / `Done` / `Blocked`)

**Tasks**

- [ ] Decide price (image) vs discount (README) as the treatment and write it down in Section 9
- [ ] Check the dataset has treatment, outcome, cost, ad spend, competitor price, inventory and date columns; extend `generate_data.py` if needed (seed 42, store the true effect)
- [ ] Re-run preprocessing and the 78 tests
- [ ] `pip install econml`, add it to `requirements.txt` (use a Python 3.11/3.12 venv if 3.14 fails)
- [ ] Create every member's branch and submit the Work Distribution Document
- [ ] Count distinct commit days since 9 Oct in the GitHub calendar
- [ ] Make the first commit of the day

**Done when:** `econml` imports, the dataset has treatment, outcome and confounders, and all tests pass.

| Review item | Notes |
|---|---|
| Evidence (commit link, file path, screenshot) | |
| Hours spent | |
| What went well | |
| Blockers or problems | |
| Carry-over to tomorrow | |
| Who did what (member to task) | |
| Committed to own branch today? | [ ] Yes |

---

### Day 2: Fri 16 Oct. Core DML estimator

**Status:** `Not started`  (change to `In progress` / `Done` / `Blocked`)

**Tasks**

- [ ] Create `src/causal/dml_estimator.py` with a train/test split
- [ ] Fit the outcome model E[Y|X] and treatment model E[T|X] (Random Forest or XGBoost)
- [ ] Cross-fit with 5 folds, compute residuals, fit `LinearDML` (use log units vs log price if price is the treatment)
- [ ] Record MAE, RMSE and R² for both nuisance models on the test set
- [ ] Compare with a naive OLS baseline
- [ ] Build Plotly components: actual vs predicted, and price (or discount) vs demand

**Done when:** You have an average effect with a confidence interval and a naive vs DML comparison table.

| Review item | Notes |
|---|---|
| Evidence (commit link, file path, screenshot) | |
| Hours spent | |
| What went well | |
| Blockers or problems | |
| Carry-over to tomorrow | |
| Who did what (member to task) | |
| Committed to own branch today? | [ ] Yes |

---

### Day 3: Sat 17 Oct. Heterogeneous effects and diagnostics

**Status:** `Not started`  (change to `In progress` / `Done` / `Blocked`)

**Tasks**

- [ ] Add `CausalForestDML` (or `LinearDML` with a featurizer) for effects by segment
- [ ] Write `src/causal/diagnostics.py`: overlap/residual variation, covariate balance, residual correlation with X
- [ ] Run DoWhy refutations: placebo treatment, random common cause, data subset
- [ ] Compare results across learners and fold counts
- [ ] If the true effect is stored, report how closely DML recovers it
- [ ] Save diagnostic results to JSON

**Done when:** `diagnostics.py` runs end to end and writes its results file.

| Review item | Notes |
|---|---|
| Evidence (commit link, file path, screenshot) | |
| Hours spent | |
| What went well | |
| Blockers or problems | |
| Carry-over to tomorrow | |
| Who did what (member to task) | |
| Committed to own branch today? | [ ] Yes |

---

### Day 4: Sun 18 Oct. Dashboard, API and database

**Status:** `Not started`  (change to `In progress` / `Done` / `Blocked`)

**Tasks**

- [ ] Fill the Causal page: DAG, effect distribution, effect curve with confidence band, segment effects, filters
- [ ] Build FastAPI with `/health`, `/data/validate` and `/causal/estimate`
- [ ] Store run metadata and results in SQLite
- [ ] Check the dashboard shows real estimates, not placeholders

**Done when:** The dashboard shows real estimates and the API returns them.

| Review item | Notes |
|---|---|
| Evidence (commit link, file path, screenshot) | |
| Hours spent | |
| What went well | |
| Blockers or problems | |
| Carry-over to tomorrow | |
| Who did what (member to task) | |
| Committed to own branch today? | [ ] Yes |

---

### Day 5: Mon 19 Oct. Tests, report and merge

**Status:** `Not started`  (change to `In progress` / `Done` / `Blocked`)

**Tasks**

- [ ] Add tests for the estimator, diagnostics and API; run the full `pytest` suite
- [ ] Write `reports/week2_dml_report.md` (question, assumptions, results with intervals, limitations; no profit or ROI claims yet)
- [ ] Update the README with Week 2 run commands and an acceptance checklist
- [ ] Team Lead merges all member branches to main and tags `week2`
- [ ] Rehearse the viva: residualization, cross-fitting, DAG assumptions
- [ ] Draft the social media video script

**Done when:** Main is green, the report is in the repo, and the demo runs from a clean clone.

| Review item | Notes |
|---|---|
| Evidence (commit link, file path, screenshot) | |
| Hours spent | |
| What went well | |
| Blockers or problems | |
| Carry-over to tomorrow | |
| Who did what (member to task) | |
| Committed to own branch today? | [ ] Yes |

---

### Week 2 end-of-week review

| Item | Result |
|---|---|
| Tasks ticked / total | ___ / 29 |
| Week 2 completion % | ___ % |
| Merged to main and tagged `week2` | [ ] |
| Demo runs from a clean clone | [ ] |
| Biggest win | |
| Biggest problem | |
| What I would do differently | |

### Mid Review self-check (handbook 3.2.4.2)

Rate each item from 0 to 5 honestly, then fix the lowest ones before the review.

| What the Mid Review assesses | Self-rating (0-5) | Gap to fix |
|---|---|---|
| Completion of assigned Week 1 and Week 2 tasks | | |
| Frontend implementation | | |
| Backend/API development | | |
| Database integration | | |
| Functionality of implemented modules | | |
| Individual contribution (can each member show their own work?) | | |
| Understanding of the project architecture | | |
| Technical explanation during the Mid Viva | | |

---

## 4. Week 3 tracker (handbook 19-25 Oct): optimization / pricing engine

**Goal:** turn the causal estimates into a recommendation, either the best price (project image) or the best discount allocation under a budget (README). The Mid Review also happens inside this week's window (20-27 Oct), so plan around it.

- [ ] Define the objective before coding (maximize profit, revenue or incremental margin; list the constraints)
- [ ] Confirm cost or margin data exists (otherwise label the objective "purchase uplift", not profit)
- [ ] Write `src/optimization/budget_optimizer.py` using SciPy (`linprog`, `milp` or `minimize`)
- [ ] Support constraints: budget, eligibility, maximum customers or price range, segment caps
- [ ] Return the recommendation: selected customers or price, spend, expected incremental value
- [ ] Build the policy comparison: no action, random, blanket, causal targeting
- [ ] Add the budget/pricing page to the dashboard (slider, results table, CSV export)
- [ ] Write the optimizer tests
- [ ] Write `reports/week3_report.md`
- [ ] Attend the Mid Review (date: ______)
- [ ] Complete the Mid Viva
- [ ] Submit the Mid Review social media video
- [ ] Merge all branches to main; tag `week3`

**Week 3 completion:** ___ / 13 tasks = ___ %

**Notes:**

---

## 5. Week 4 tracker (handbook 26 Oct-4 Nov): API, polish, final deliverables

**Goal:** finish the API, add drift checks, polish the dashboard, and prepare everything for the Final Review (5-10 Nov).

- [ ] Finish API endpoints: `/causal/diagnostics`, `/optimize`, `/runs/{id}` with schema validation and file-size limits
- [ ] Add data-drift checks (PSI or KS tests)
- [ ] Expand tests to cover the whole pipeline
- [ ] Polish the dashboard and add plain-language summaries
- [ ] Build the Experiment Report page
- [ ] Fill the README results table with real measured numbers only (no invented ROI)
- [ ] Optional: Docker setup for the deployment/demo criterion
- [ ] Code freeze (target: Tue 3 Nov)
- [ ] Write the final project report
- [ ] Create the presentation (PPT)
- [ ] Record the demo
- [ ] Rehearse the Final Viva (every member)
- [ ] Prepare the Final Review social media video
- [ ] Merge all branches to main; tag `final`
- [ ] Attend the Final Review (date: ______)
- [ ] Complete the Final Viva
- [ ] Submit the Final Review social media video

**Week 4 completion:** ___ / 17 tasks = ___ %

**Notes:**

---

## 6. Daily review template (copy this block for each new day)

```
### Day __: <weekday, date>

Status: Not started / In progress / Done / Blocked
Planned tasks:
- [ ]
- [ ]
Done today:
-
Evidence (commit links, file paths):
-
Hours spent:
What went well:
Blockers or problems:
Carry-over to tomorrow:
Who did what:
Committed to own branch today? Yes / No
Overall progress after today: ___ %
```

---

## 7. GitHub commit tracker

**Rules from the handbook:**
- **Mid Review:** commits on at least 10 different days in the 14 days before the review.
- **Final Review:** at least one commit on every one of the 20 days before the review, with no gaps.
- Each active member commits to their **own branch**. Only meaningful commits count (code, docs, README, config, assets). Empty, single-character or duplicated commits do not.
- To be safe, aim for every member to commit on at least 10 days before the Mid Review.

Tick the first column for team activity, then use the member columns (rename A, B, C, D to your team names).

| Date | Day | Team commit | Member A | Member B | Member C | Member D | What was committed |
|---|---|---|---|---|---|---|---|
| 9 Oct | Fri | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 10 Oct | Sat | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 11 Oct | Sun | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 12 Oct | Mon | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 13 Oct | Tue | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 14 Oct | Wed | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 15 Oct | Thu | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 16 Oct | Fri | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 17 Oct | Sat | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 18 Oct | Sun | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 19 Oct | Mon | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 20 Oct **(Mid Review window opens)** | Tue | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 21 Oct | Wed | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 22 Oct | Thu | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 23 Oct | Fri | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 24 Oct | Sat | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 25 Oct | Sun | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 26 Oct | Mon | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 27 Oct **(Mid Review window ends)** | Tue | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 28 Oct | Wed | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 29 Oct | Thu | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 30 Oct | Fri | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 31 Oct | Sat | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 1 Nov | Sun | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 2 Nov | Mon | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 3 Nov | Tue | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 4 Nov | Wed | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 5 Nov **(Final Review window opens)** | Thu | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 6 Nov | Fri | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 7 Nov | Sat | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 8 Nov | Sun | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 9 Nov | Mon | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 10 Nov **(Final Review window ends)** | Tue | [ ] | [ ] | [ ] | [ ] | [ ] | |

**Mid Review commit days counted (last 14 days before the review):** ___ / 10 needed
**Final Review consecutive commit days (last 20 days before the review):** ___ / 20 needed

> The Final Review 20-day window starts between 16 and 22 Oct depending on your review date. Commit daily from **16 Oct** to be safe.

---

## 8. Review readiness and score tracker

The total is **70 marks**: 35 for the Mid Review and 35 for the Final Review. The minimum for stipend is **45/70**, and the expected benchmark is about **53/70**. GitHub working days are also mandatory for stipend eligibility and are not part of the 70 marks.

### Mid Review (35 marks)

| Component | Max | Target | Actual | Readiness checklist |
|---|---|---|---|---|
| Project implementation and progress | 20 | 16+ | | [ ] Weeks 1+2 work merged and demoable |
| Mid Viva (technical) | 5 | 4+ | | [ ] Every member rehearsed |
| Attendance | 5 | 5 | | [ ] Whole team present, Team Lead confirmed |
| Social media video | 5 | 5 | | [ ] Recorded and submitted on time |
| **Total** | **35** | **29+** | | |

### Final Review (35 marks)

| Component | Max | Target | Actual | Readiness checklist |
|---|---|---|---|---|
| Final project implementation | 20 | 16+ | | [ ] Weeks 3+4 done, deployed or demo ready |
| Final Viva (technical) | 5 | 4+ | | [ ] Every member rehearsed |
| Attendance | 5 | 5 | | [ ] Whole team present |
| Social media video | 5 | 5 | | [ ] Recorded and submitted on time |
| **Total** | **35** | **29+** | | |

| Overall | Marks |
|---|---|
| Target | 58+ / 70 |
| Minimum for stipend | 45 / 70 |
| Actual (fill after scorecard) | ___ / 70 |

### Final Review also assesses

- [ ] Completion of all assigned project requirements
- [ ] Frontend and backend integration
- [ ] Database implementation
- [ ] API functionality
- [ ] Advanced features
- [ ] Code quality and project structure
- [ ] Individual contribution
- [ ] Deployment and working demonstration

---

## 9. Risks, blockers and decisions log

### Open risks

| # | Risk | Likelihood | Impact | What I will do | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | Week 2 started 3 days late (15 Oct instead of 12 Oct) | High | Medium | Follow the 5-day plan; consider a lag report | Team Lead | Open |
| 2 | `econml` may not install on Python 3.14 | Medium | High | Test on Day 1; fall back to a 3.11 or 3.12 venv | | Open |
| 3 | Price-vs-discount mismatch between image and README | High | High | Confirm with mentor; record decision below | | Open |
| 4 | No backend/API/database yet, but the Mid Review scores them | High | High | Build minimal FastAPI and SQLite on Day 4 | | Open |
| 5 | A gap in the 20-day final commit streak makes the project incomplete | Medium | Very high | Commit meaningfully every day from 16 Oct | Team Lead | Open |
| 6 | Unresponsive team member (48-hour rule) | Low | High | Report to Infotact with screenshots and update the Work Distribution Document | Team Lead | Open |
| 7 | Social media video or attendance marks missed | Medium | Medium | Schedule both early | | Open |
| 8 | | | | | | |

### Decisions made

| Date | Decision | Why | Who agreed |
|---|---|---|---|
| | Treatment: price (image) or discount (README)? | | |
| | Objective: profit, revenue, or purchase uplift? | | |
| | | | |

### Blockers log

| Date | Blocker | Raised with | Resolved on | How |
|---|---|---|---|---|
| | | | | |

---

## 10. Weekly retrospective (fill at the end of each week)

| | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|
| Completion % | 100% (verify) | | | |
| Reviewed at (Mid/Final) | Mid | Mid | Final | Final |
| Commit days that week | | | | |
| What went well | | | | |
| What slowed us down | | | | |
| Fix for next week | | | | |
| Lag report needed? | | | | |

---

*Last updated: ____________  |  Updated by: ____________*
