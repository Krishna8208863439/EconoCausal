# EconoCausal Dashboard — Frontend

**Project:** EconoCausal: Dynamic Pricing via Double Machine Learning  
**Reference:** ITS/DSML/1147  
**Stack:** React 18, Vite 5, Plotly.js, PapaParse

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |

---

## Installation

```powershell
# From the project root:
cd frontend
npm install
```

---

## Running the Development Server

```powershell
npm run dev
```

The dashboard opens at **http://localhost:5173** automatically.

---

## Build for Production

```powershell
npm run build
npm run preview
```

---

## Optional: EDA Figures in Dashboard

The Data page can display pre-generated EDA figures from `reports/figures/`.
To enable this, copy them to the Vite public directory:

```powershell
# From project root
New-Item -ItemType Directory -Force -Path frontend\public\eda_figures
Copy-Item reports\figures\*.png frontend\public\eda_figures\
Copy-Item reports\figures\causal_dag.png frontend\public\causal_dag.png
```

The Causal Analysis page uses `/causal_dag.png` served from `frontend/public/`.

---

## Week 1 Status

| Feature | Status |
|---------|--------|
| Project overview page | ✅ Complete |
| CSV upload with validation | ✅ Complete |
| Dataset summary cards | ✅ Complete |
| Budget configuration form | ✅ Complete |
| Treatment/outcome variable selection | ✅ Complete |
| Causal DAG display | ✅ Complete (shows image or ASCII fallback) |
| Uplift curves | ⏳ Week 2 — Planned |
| DML estimates | ⏳ Week 2 — Planned |
| Budget allocation table | ⏳ Week 3 — Planned |

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── public/            ← static assets (copy DAG PNG here)
└── src/
    ├── main.jsx
    ├── App.jsx / App.css
    ├── index.css
    ├── components/
    │   ├── TopBar.jsx / TopBar.css
    │   ├── Sidebar.jsx / Sidebar.css
    │   ├── StatCard.jsx / StatCard.css
    │   ├── SectionCard.jsx / SectionCard.css
    │   ├── PlannedFeature.jsx / PlannedFeature.css
    │   └── CsvUploader.jsx / CsvUploader.css
    └── pages/
        ├── Page.css          ← shared page styles
        ├── OverviewPage.jsx
        ├── DataPage.jsx
        ├── CausalPage.jsx
        ├── BudgetPage.jsx
        └── UpliftPage.jsx
```
