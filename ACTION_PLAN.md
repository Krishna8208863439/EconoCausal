# Project Action Plan & Remediation Roadmap

**Project Title:** EconoCausal — Enterprise Causal ML & Budget Optimization Platform  
**Internship Ref:** ITS/DSML/1147  
**Review Type:** Mid-Review & Final Review Action Plan  

---

## 1. Action Priority Matrix (P0 / P1 / P2)

```
┌────────────────────────────────────────────────────────┐
│ P0: CRITICAL (Must be resolved immediately)             │
│ • Commit compliance documentation to GitHub            │
│ • Fix currency mismatch & frontend version fallbacks   │
│ • Unlock ML model artifact in .gitignore               │
│ • Verify Git remote synchronization                    │
├────────────────────────────────────────────────────────┤
│ P1: HIGH (Prepare for presentation & viva defense)     │
│ • Rehearse 3-minute oral defense & live demo flow      │
│ • Verify local uvicorn & vite services spin up cleanly │
│ • Review VIVA_PREPARATION.md answers                   │
│ • Demonstrate 33 passing optimization & drift tests    │
├────────────────────────────────────────────────────────┤
│ P2: FUTURE / ENHANCEMENTS                              │
│ • Run CI/CD runner on Python 3.11 for full 153 tests   │
│ • Multi-action treatment tiering (5%, 10%, 20%)        │
│ • Docker compose production bundle                     │
└────────────────────────────────────────────────────────┘
```

---

## 2. P0: Critical Actions (Immediate Execution)

| Task ID | Item | Target File / Area | Status | Verification |
|:---:|:---|:---|:---:|:---|
| **P0-1** | Currency Consistency | `backend/main.py` line 153 | **COMPLETED** | Default currency set to `"INR"` |
| **P0-2** | Version Fallback | `frontend/src/services/api.js` line 30 | **COMPLETED** | Offline fallback updated to `4.0.0` / week 4 |
| **P0-3** | Model Artifact In Git | `.gitignore` lines 35, 60 | **COMPLETED** | `!ml/models/causal_forest_dml.joblib` and `!discount_allocation.csv` allowed |
| **P0-4** | Compliance Docs Creation | Root directory | **COMPLETED** | All 10 Infotact compliance markdown files written |
| **P0-5** | Git Commit & Push | `origin/main` | **IN PROGRESS** | Stage all changes, commit with semantic message, push to remote |

---

## 3. P1: Presentation & Review Readiness Checklist

| Action Item | Recommended Approach | Time Allotment |
|:---|:---|:---:|
| **1. The Hook (Problem Statement)** | Explain that standard ML wastes 30-40% of marketing budgets on "Sure Things" (loyal customers who would buy anyway). Causal ML measures *incremental uplift*. | 45 sec |
| **2. The Solution (DML & EconML)** | Introduce Double Machine Learning, Neyman orthogonality, and Causal Forest DML achieving **+19.47pp ATE** and **+0.6839 Qini**. | 60 sec |
| **3. The Actionable Engine (MILP)** | Explain how SciPy MILP converts ITE into optimal discount targeting under budget constraints, outperforming random targeting by **+38.4%**. | 45 sec |
| **4. Live Dashboard Walkthrough** | Spin up `http://localhost:5173` and demonstrate: <br>a) Overview KPIs <br>b) Policy Optimizer slider <br>c) Counterfactual Simulator <br>d) KS & PSI drift status. | 90 sec |
| **5. Code & Test Evidence** | Show `tests/test_budget_optimizer.py` (22 passes) and Swagger UI at `http://127.0.0.1:8000/docs`. | 30 sec |

---

## 4. P2: Post-Review Roadmap & Next Steps

1. **GitHub Actions CI/CD Pipeline:** Add `.github/workflows/ci.yml` running on `ubuntu-latest` with Python 3.11 to run all 153 test suites automatically on every pull request.
2. **Multi-Action Causal Forest:** Expand from binary treatment ($T \in \{0, 1\}$) to continuous or multi-valued treatment arms ($T \in \{0\%, 5\%, 10\%, 15\%, 20\%\}$).
3. **Containerized Deployment:** Build and tag `Dockerfile.backend` and `Dockerfile.frontend` for AWS ECS / Google Cloud Run deployment.
