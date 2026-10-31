# Project Action Plan & 13-Day Operational Roadmap

**Project Title:** EconoCausal — Enterprise Causal ML & Dynamic Pricing Platform  
**Internship Ref:** ITS/DSML/1147 | Infotact Solutions intern project  
**Plan Window:** Wednesday 28 Oct – Monday 9 Nov 2026 (13 Days)  
**Final Review Window:** 5 Nov – 10 Nov 2026 (opens in 8 days)  

---

## 1. Read This First & Day 1 Immediate Actions (Wed 28 Oct)

Today is **Wednesday 28 Oct**. The Mid Review window (20–27 Oct) closed yesterday, and the Final Review window (5–10 Nov) opens in 8 days. All core implementation work must freeze by **Day 8 (Wed 4 Nov)** so that Days 9–13 are reserved for reports, presentation slides, viva defense rehearsal, and buffer.

### Do These Two Things Today Before Anything Else:

1. **Mid Review Status Check:** If the Mid Review has not happened, message your Infotact mentor immediately. Confirm whether it was held, recorded, or can be rescheduled.
2. **Commit Streak Audit:** Open your GitHub commit calendar and check for gaps. The Final Review requires a commit on **every one of the 20 days prior to review** (the window starts between 17 and 22 Oct depending on review date). A gap causes the handbook to mark the project incomplete, so inform your mentor early if any gap exists.

---

## 2. 13-Day Action Plan at a Glance

| Days | Dates | Phase & Milestone Goal | Review Status |
|:---:|:---|:---|:---:|
| **Days 1–2** | Wed 28 – Thu 29 Oct | **Phase 1:** Recheck and fix Weeks 1 and 2 | Mid-Review Audit |
| **Days 3–5** | Fri 30 Oct – Sun 1 Nov | **Phase 2:** Week 3: Pricing engine, policy comparison, dashboard page | Week 3 Wrap-up |
| **Days 6–8** | Mon 2 – Wed 4 Nov | **Phase 3:** Week 4: API, drift checks, evaluation, **Code Freeze (4 Nov)** | Feature Freeze |
| **Days 9–13** | Thu 5 – Mon 9 Nov | **Phase 4:** Report, PPT, demo, viva, videos, and review itself | Final Review Window |

---

## 3. Action Priority Matrix (P0 / P1 / P2)

```
┌────────────────────────────────────────────────────────────────────────┐
│ P0: IMMEDIATE & CORE PREREQUISITES (Days 1–2: 28–29 Oct)               │
│ • Mentor query: confirm Mid Review status / reschedule                 │
│ • GitHub commit streak audit: verify 20-day streak with zero gaps      │
│ • Clean-clone check: fresh clone, venv, run Week 1 pipeline & 78 tests │
│ • Settle treatment: discount curve converts to price via P = List - D  │
│ • Complete Week 2 pass condition checklist (EconML, DML, DoWhy, API)   │
├────────────────────────────────────────────────────────────────────────┤
│ P1: PHASE 2 & 3 CORE IMPLEMENTATION (Days 3–8: 30 Oct – 4 Nov)         │
│ • Day 3: Build pricing engine (Price, Expected Sales, Revenue, Profit) │
│ • Day 4: 4 objectives (revenue, profit, volume, blend) & constraints   │
│ • Day 5: React pricing page, goal selector, price-vs-demand curve      │
│ • Day 6: REST endpoints (/causal/diagnostics, /optimize, /runs/{id})   │
│ • Day 7: Data-drift checks (KS & PSI), Experiment Report page          │
│ • Day 8 (4 Nov): CODE FREEZE — clean-clone pipeline & test run         │
├────────────────────────────────────────────────────────────────────────┤
│ P2: PHASE 4 FINAL DELIVERABLES & REVIEW BUFFER (Days 9–13: 5–9 Nov)    │
│ • Day 9: Final project report & 6-phase presentation deck (PPT)        │
│ • Day 10: Demo video recording & oral viva defense rehearsal           │
│ • Day 11: Final Review social media video (5 marks) & timed dry run    │
│ • Days 12–13: Final buffer, attend review (whole team for 5 marks)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Triage & Fallback Rules (Cut Order)

If development falls behind schedule, eliminate non-critical items strictly in this order:

1. **First Cut:** Docker containerization setup (Docker is optional; only do it if everything else is complete).
2. **Second Cut:** Extra dashboard styling and minor polish.
3. **Third Cut:** Segment-level granular causal forest.

> **PROTECT THE CORE AT ALL COSTS:**  
> 1. DML estimate with confidence interval  
> 2. Diagnostics & refutation tests  
> 3. Pricing recommendation engine & policy comparison  
> 4. Interactive dashboard  
> 5. FastAPI backend & SQLite logging  
> 6. Comprehensive final report & PPT  
> 7. Working live demo & viva preparation  

---

## 5. Non-Negotiable Operational Rules

1. **Commit Authenticity:** Every team member must commit meaningfully to their own branch every single day. The Team Lead merges to `main`. Empty or single-character commits do not count.
2. **Honest Reporting:** Make **zero profit or ROI claims** that your empirical data and evaluation do not support.
3. **Clean-Clone Standard:** Every milestone must run end-to-end from a clean `git clone` using the exact commands in [README.md](file:///e:/econocausal/README.md).
