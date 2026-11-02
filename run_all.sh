#!/usr/bin/env bash
# ==============================================================================
# EconoCausal — End-to-End Orchestration Script (Day 5 Code Freeze & Automation)
# Project ITS/DSML/1147 | Infotact Solutions
# ==============================================================================

set -e

PORT=${1:-3000}

echo "================================================================="
echo "  EconoCausal — Dynamic Pricing via Double Machine Learning"
echo "  Orchestration & Verification Pipeline (Day 5-6 Review Readiness)"
echo "================================================================="

# Step 1: Check Node & npm
echo ">> Checking Node.js and npm..."
node -v
npm -v

# Step 2: Ensure node_modules installed
if [ ! -d "node_modules" ]; then
  echo ">> Installing npm packages..."
  npm install
else
  echo ">> node_modules present."
fi

# Step 3: Run production build verification
echo ">> Running Vite build verification..."
npm run build
echo ">> Production build succeeded."

# Step 4: Verify static datasets
echo ">> Verifying causal artifacts and data tables..."
test -f frontend/public/cleaned_retail_campaign.csv || echo "Warning: cleaned_retail_campaign.csv missing"
test -f frontend/public/discount_allocation.csv || echo "Warning: discount_allocation.csv missing"
test -f frontend/public/causal_evaluation_results.json || echo "Warning: causal_evaluation_results.json missing"
test -f frontend/public/latest_drift_report.json || echo "Warning: latest_drift_report.json missing"

# Step 5: Boot Dev Server
echo ">> Starting EconoCausal Dashboard on port $PORT..."
echo ">> Local URL: http://localhost:$PORT"
exec npm run dev -- --host 0.0.0.0 --port "$PORT"
