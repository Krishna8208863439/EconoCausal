# EconoCausal — Week 3 & 4 Operational Action Plan (Day-by-Day)
**Project Title:** EconoCausal — Dynamic Pricing via Double Machine Learning  
**Project Reference:** ITS/DSML/1147 | Infotact Solutions  
**Plan Window:** Saturday 31 Oct – Monday 9 Nov 2026  
**Final Review Window:** 5 Nov – 10 Nov 2026 (Opens Thursday 5 Nov)  
**Status:** Day 5 Code Freeze & Day 6 Review Readiness Complete  

---

## 1. Plan Overview & Date Calibration

> **Date Correction (from mentor plan):** The plan window runs from Saturday 31 Oct through Monday 9 Nov 2026. The 5 build days span 31 Oct to 4 Nov (Days 1–5), followed by documents, viva rehearsal, and mentor review from 5 Nov onwards (Days 6–10).

### Build & Review Schedule:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EconoCausal Milestones                                │
└─────────────────────────────────────────────────────────────────────────────┘
  Day 1 (Sat 31 Oct): Effects File & SciPy MILP Optimizer v1 ──────────> [DONE]
  Day 2 (Sun 1 Nov):  Constraints, Budget Sweep & Policy Comparison ───> [DONE]
  Day 3 (Mon 2 Nov):  FastAPI v4.0.0 Endpoints & SQLite Run Store ─────> [DONE]
  Day 4 (Tue 3 Nov):  Covariate Drift (KS/PSI) & Experiment Reports ───> [DONE]
  Day 5 (Wed 4 Nov):  Code Freeze, run_all.ps1 & Clean-Clone Test ─────> [DONE]
  Day 6 (Thu 5 Nov):  Final Report, 6-Phase PPT & Viva Defense Prep ───> [READY]
  Days 7-10 (6-9 Nov): Demo Recording, Showcase Video & Final Defense ─> [SCHEDULED]
```

---

## 2. Day 5: Code Freeze & Automation Status (Wed 4 Nov)

- [x] **No New Features (Freeze):** Architecture stabilized; bug fixes and regression audits completed.
- [x] **Clean Clone Execution Script:** Added `run_all.ps1` (Windows PowerShell) and `run_all.sh` (Linux/macOS) for single-command end-to-end execution.
- [x] **Test Suite Verification:** 63 unit and integration tests passing (`pytest tests/ -v`).
- [x] **Frontend Bundle Compilation:** Vite 5 compiling in under 25 seconds with zero syntax errors (`npm run build`).
- [x] **Branch Merging:** All member contributions consolidated into `main` branch.

---

## 3. Day 6: Final Review Readiness Checklist (Thu 5 Nov)

- [x] **Mentor Review Slot:** Requested for Thursday 5 Nov 2026.
- [x] **Comprehensive Final Report:** `reports/final_evaluation.md` and `reports/week4_final_report.md` complete with:
  - Business problem statement & cannibalization risks
  - Observational cohort data distributions (2,200 rows)
  - DAG structural identification assumptions (unconfoundedness, overlap $[0.400, 0.766]$, SUTVA)
  - DML Robinson residualization & 5-fold cross-fitting
  - Empirical results with 95% confidence intervals (ATE $= +19.47\text{ pp}$ $[+5.67\text{ pp}, +33.28\text{ pp}]$, Qini $= +0.6839$)
  - 4-policy benchmark comparison (+101.9% net margin lift)
  - Known limitations and threats to validity
  - Fairness and customer privacy governance note
- [x] **Executive Presentation Slide Deck (PPT):** `docs/presentation_deck.md` and live in `FinalReportPage.jsx` covering the 6 core phases + project brief Price/Sales/Revenue/Profit table.
- [x] **System Architecture Document:** `docs/architecture.md` finalized.
- [x] **Causal Methodology Guide:** `docs/methodology.md` finalized.
- [x] **Oral Defense & Viva Rehearsal Examiner:** Interactive 6-question viva preparation module active in `FinalReportPage.jsx` covering all questions from the mentor action plan.

---

## 4. Tick-Off Tracker (Action Plan Sign-Off)

| Day | Date | Milestone Condition | Verification Finding | Status |
|---|---|---|---|:---:|
| **Gate** | Sat 31 Oct | EconML imports, tests green, `effects.csv` generated | Verified out-of-fold ITE predictions | ✅ |
| **Day 1** | Sat 31 Oct | Optimizer CLI prints real selection summary; tests pass | SciPy HiGHS knapsack solver active | ✅ |
| **Day 2** | Sun 1 Nov | Dashboard shows allocation, sweep, and policy comparison | Interactive Donut, Sweep, and Bar charts | ✅ |
| **Day 3** | Mon 2 Nov | UI to API to SQLite round trip operational; API tests pass | 14 FastAPI endpoints + `data/econocausal.db` | ✅ |
| **Day 4** | Tue 3 Nov | All README section 13 items in app; drift report generated | KS tests, Chi-sq, and decile PSI $< 0.02$ | ✅ |
| **Day 5** | Wed 4 Nov | Clean clone runs without author help; `run_all.ps1` added | `run_all.ps1` & `run_all.sh` verified | ✅ |
| **Day 6** | Thu 5 Nov | Review slot requested; final report, PPT, & viva prep complete | All 6 viva questions rehearsed; PPT ready | ✅ |
| **Day 7** | Fri 6 Nov | Demo recorded; each member has viva answers for own part | In progress according to rehearsal guide | ⏳ |
| **Day 8** | Sat 7 Nov | Social media video submitted; timed dry run completed | 5 marks allocation | ⏳ |
| **Day 9** | Sun 8 Nov | Review attended by whole team | 100% attendance required for 5 marks | ⏳ |
| **Day 10**| Mon 9 Nov | Final submissions confirmed before window closure | Final project sign-off | ⏳ |
