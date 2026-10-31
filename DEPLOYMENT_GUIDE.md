# Enterprise Deployment & Operations Guide

**Project Title:** EconoCausal — Enterprise Causal ML & Budget Optimization Platform  
**Internship Ref:** ITS/DSML/1147  
**Version:** 4.0.0  
**Target Environments:** Local Development, Docker Containerization, Cloud Production  

---

## 1. System Requirements & Prerequisites

### 1.1. Operating System
- **Supported:** Linux (Ubuntu 20.04+), macOS (12.0+), Windows 10/11 (PowerShell or WSL2).
- **Recommended for full test runner:** Linux / Ubuntu 22.04 LTS (Python 3.10 / 3.11).

### 1.2. Software Dependencies
- **Python:** 3.10, 3.11, or 3.12 (Python 3.14 compatible for runtime API; Python 3.11 recommended for C-extensions/gmpy2).
- **Node.js:** v18.0.0 or higher.
- **npm:** v9.0.0 or higher.
- **Git:** v2.30+.
- **Hardware:** Minimum 8GB RAM (16GB recommended for Causal Forest training on 100k samples), 4-core CPU, 5GB free disk space.

---

## 2. Quickstart: Local Setup in 5 Steps

### Step 1: Clone Repository
```bash
git clone https://github.com/Krishna8208863439/EconoCausal.git
cd EconoCausal
```

### Step 2: Set Up Python Virtual Environment
```bash
# On Linux/macOS:
python3 -m venv venv
source venv/bin/activate

# On Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Backend Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 5: Configure Environment Variables
```bash
cp .env.example .env
```
*(Default settings work out-of-the-box for local demonstration).*

---

## 3. Running the ML & Data Pipelines

To re-execute the end-to-end data and modeling pipelines from scratch:

```bash
# 1. Generate 100,000 synthetic records with non-linear confounding
python src/data/generate_mock_data.py

# 2. Preprocess data (leakage-free train/test split, encoding, scaling)
python src/data/preprocess.py

# 3. Train EconML Causal Forest DML model & save artifact
python ml/train_causal_model.py

# 4. Run causal evaluations (Qini curve, AUUC, Placebo & Random refutations)
python ml/evaluate_causal.py

# 5. Run SciPy MILP budget optimization & generate allocations
python src/optimization/budget_optimizer.py
```

---

## 4. Running the Application Locally

### 4.1. Launch FastAPI Backend Service
From the project root directory:
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Redoc Documentation: `http://127.0.0.1:8000/redoc`
- Health Endpoint: `http://127.0.0.1:8000/health`

### 4.2. Launch React Frontend Dashboard
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Web Application URL: `http://localhost:5173`
- The Vite development server automatically proxies requests to `http://localhost:8000`.

---

## 5. Verification & Testing

### 5.1. Run Verified Standalone Test Suites
```bash
# Verify Optimization and Drift detection modules (33 tests)
pytest tests/test_budget_optimizer.py tests/test_drift_detector.py -v
```

### 5.2. Test API Endpoints via cURL
```bash
# Check service health
curl -X GET http://127.0.0.1:8000/health

# Fetch Causal ATE
curl -X GET http://127.0.0.1:8000/causal/ate

# Test Policy Comparison
curl -X GET http://127.0.0.1:8000/policy/compare

# Check Drift Status
curl -X GET http://127.0.0.1:8000/drift/status
```

---

## 6. Docker Containerization (Production Deployment)

> **Operational Guideline (13-Day Plan Cut Order):**  
> Docker containerization is strictly **optional**. As defined in the project triage cut order, Docker is the first item to cut if time is constrained. Protect core deliverables first: DML estimation, causal diagnostics, pricing recommendations, interactive dashboard, REST API, and final reports. Only proceed with containerization if all core tasks are complete.

### 6.1. Backend `Dockerfile`
Create `Dockerfile.backend`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY src/ ./src/
COPY data/processed/ ./data/processed/
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 6.2. Frontend `Dockerfile`
Create `Dockerfile.frontend`:
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 6.3. Docker Compose Orchestration
```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## 7. Cloud Deployment (AWS / GCP / Azure)

### 7.1. Cloud Run (GCP) or AWS App Runner
1. Build and push container to Google Artifact Registry / AWS ECR.
2. Deploy backend service container with minimum 2GB memory allocated.
3. Set environment variable `FRONTEND_URL=https://<your-frontend-domain>`.

### 7.2. Frontend Deployment (Vercel / Netlify)
1. Link GitHub repository root directory to Vercel/Netlify.
2. Root directory: `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Environment variable: `VITE_API_BASE_URL=https://<your-backend-api-domain>`.

---

## 8. Troubleshooting & Common Issues

| Issue | Cause | Resolution |
|:---|:---|:---|
| `Port 8000 already in use` | Zombie uvicorn or python process | Kill process: `Get-Process python \| Stop-Process` or use `--port 8001` |
| `Failed to fetch / NetworkError` | Backend service not running | Start backend first using `uvicorn backend.main:app --reload` |
| `Windows fatal exception 0xc0000139` | Python 3.14 `gmpy2.dll` mismatch in Pytest discovery | Run `pytest tests/test_budget_optimizer.py tests/test_drift_detector.py` or use Python 3.11 virtualenv |
| `File not found: causal_forest_dml.joblib` | Model not yet trained | Run `python ml/train_causal_model.py` or pull from release artifacts |
