/**
 * frontend/src/services/api.js
 * ============================
 * EconoCausal API Client
 * Connects to FastAPI backend at http://localhost:8000,
 * with graceful fallback to precomputed local JSON/static assets
 * when running standalone.
 */

const API_BASE = 'http://localhost:8000'

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.detail || `HTTP ${res.status}: ${res.statusText}`)
    }
    return await res.json()
  } catch (err) {
    console.warn(`API call to ${url} failed:`, err.message)
    throw err
  }
}

export const api = {
  // Health check
  async getHealth() {
    try {
      return await safeFetch(`${API_BASE}/health`)
    } catch {
      return { status: 'offline', version: '2.0.0', week: 2 }
    }
  },

  // Model status
  async getModelStatus() {
    try {
      return await safeFetch(`${API_BASE}/model/status`)
    } catch {
      return { status: 'trained', estimator_type: 'causal_forest', fallback: true }
    }
  },

  // Trigger training
  async trainModel(estimator = 'causal_forest', cv = 5, seed = 42) {
    return await safeFetch(`${API_BASE}/model/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimator, cv, seed }),
    })
  },

  // Get full causal results
  async getCausalResults() {
    try {
      return await safeFetch(`${API_BASE}/causal/results`)
    } catch {
      // Fallback to static JSON in public/
      const staticRes = await fetch('/causal_evaluation_results.json')
      if (staticRes.ok) {
        return await staticRes.json()
      }
      throw new Error('Unable to load causal evaluation results from backend or static cache.')
    }
  },

  // Get diagnostics
  async getCausalDiagnostics() {
    try {
      return await safeFetch(`${API_BASE}/causal/diagnostics`)
    } catch {
      const full = await this.getCausalResults()
      return {
        nuisance_diagnostics: full.nuisance_diagnostics || {},
        dgp_validation: full.dgp_validation || {},
        uplift_evaluation: full.uplift_evaluation || {},
        policy_comparison: full.policy_comparison || {},
      }
    }
  },

  // Predict ITE for customer
  async estimateCausal(customerProfile) {
    try {
      return await safeFetch(`${API_BASE}/causal/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: [customerProfile] }),
      })
    } catch (err) {
      // Client-side approximation fallback if backend offline
      const base = 0.1947
      const segBoost = customerProfile.customer_segment === 'Occasional' ? 0.02
        : customerProfile.customer_segment === 'Regular' ? 0.01 : -0.01
      const eff = Math.min(0.35, Math.max(0.05, base + segBoost + (customerProfile.website_visits - 6) * 0.005))
      return {
        estimator: 'causal_forest (offline preview)',
        predictions: [
          {
            customer_id: customerProfile.customer_id || 'DEMO_001',
            treatment_effect: Number(eff.toFixed(4)),
            treatment_effect_lower: Number((eff - 0.07).toFixed(4)),
            treatment_effect_upper: Number((eff + 0.07).toFixed(4)),
            recommended_action: eff > 0.15 ? 'Offer Discount' : 'Standard Pricing',
          },
        ],
      }
    }
  },

  // Data summary
  async getDataSummary() {
    try {
      return await safeFetch(`${API_BASE}/data/summary`)
    } catch {
      return null
    }
  },

  // Save budget config
  async saveBudgetConfig(config) {
    try {
      return await safeFetch(`${API_BASE}/budget/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch {
      localStorage.setItem('econocausal_budget_config', JSON.stringify(config))
      return { status: 'saved_locally', config }
    }
  },

  // Get budget config
  async getBudgetConfig() {
    try {
      return await safeFetch(`${API_BASE}/budget/config`)
    } catch {
      const saved = localStorage.getItem('econocausal_budget_config')
      return saved ? JSON.parse(saved) : null
    }
  },
}
