/**
 * frontend/src/pages/BudgetOptimization.jsx
 * ==========================================
 * EconoCausal — Week 3: Prescriptive Optimization and Discount Allocation Matrix
 * Project Reference: ITS/DSML/1147
 *
 * Implements:
 *  - Prescriptive budget allocation under hard marketing budget constraint (SciPy MILP)
 *  - Customer-level Discount Allocation Matrix with real Week 2 DML ITE predictions
 *  - 4-Policy benchmark comparison (Causal DML vs Blanket vs Random vs No Discount)
 *  - Real-time parameter tuning (Budget, Coupon Amount, ITE Threshold)
 *  - Clear mathematical formulations, units, and causal inference assumptions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import BudgetAllocationChart from '../charts/BudgetAllocationChart.jsx'
import PolicyComparisonChart from '../charts/PolicyComparisonChart.jsx'
import DiscountAllocationTable from '../components/DiscountAllocationTable.jsx'
import { api } from '../services/api.js'
import './Page.css'

export default function BudgetOptimization() {
  // Form parameters
  const [budget, setBudget] = useState(5000)
  const [discountAmount, setDiscountAmount] = useState(10)
  const [minTreatmentEffect, setMinTreatmentEffect] = useState(0.0)

  // Optimization state
  const [optimizing, setOptimizing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [lastRunAt, setLastRunAt] = useState(null)

  // Results
  const [summary, setSummary] = useState(null)
  const [baselines, setBaselines] = useState([])
  const [allocationRows, setAllocationRows] = useState([])

  const pollTimerRef = useRef(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  // Load existing results on page load
  const loadInitialData = useCallback(async () => {
    setInitialLoading(true)
    setError(null)
    try {
      // 1. Fetch config/defaults
      const configRes = await api.getOptimisationConfig().catch(() => null)
      if (configRes) {
        if (configRes.default_budget) setBudget(configRes.default_budget)
        if (configRes.default_discount_amount) setDiscountAmount(configRes.default_discount_amount)
        if (configRes.last_run_at) setLastRunAt(configRes.last_run_at)
      }

      // 2. Fetch summary & baselines
      const summaryRes = await api.getOptimisationSummary().catch(() => null)
      if (summaryRes && summaryRes.summary) {
        setSummary(summaryRes.summary)
        setBaselines(summaryRes.baselines || [])
      }

      // 3. Fetch allocation rows (fetch up to 3000 to cover all 2,200 rows)
      const resultsRes = await api.getOptimisationResults(3000, 0).catch(() => null)
      if (resultsRes && Array.isArray(resultsRes.allocation) && resultsRes.allocation.length > 0) {
        setAllocationRows(resultsRes.allocation)
        if (resultsRes.last_run_at) setLastRunAt(resultsRes.last_run_at)
      }
    } catch (err) {
      console.warn('Initial optimization data load failed:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Poll for completion
  const pollForResults = useCallback(() => {
    let attempts = 0
    const maxAttempts = 25 // 25 x 1.5s = ~37s max

    if (pollTimerRef.current) clearInterval(pollTimerRef.current)

    pollTimerRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await api.getOptimisationResults(3000, 0)
        if (res.status === 'completed') {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setAllocationRows(res.allocation || [])
          setLastRunAt(res.last_run_at)

          // Fetch summary
          const sumRes = await api.getOptimisationSummary().catch(() => null)
          if (sumRes && sumRes.summary) {
            setSummary(sumRes.summary)
            setBaselines(sumRes.baselines || [])
          }

          setOptimizing(false)
          setStatusMessage('✅ MILP optimization converged to global optimum successfully!')
        } else if (res.status === 'error') {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setOptimizing(false)
          setError(res.error_message || 'Optimization solver failed.')
        } else if (attempts >= maxAttempts) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setOptimizing(false)
          setError('Optimization timed out. Please verify backend status.')
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setOptimizing(false)
          setError('Failed to poll optimization status: ' + err.message)
        }
      }
    }, 1500)
  }, [])

  // Handle run optimization
  const handleRunOptimization = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    setStatusMessage(null)

    if (discountAmount > budget) {
      setError(`Discount coupon amount (₹${discountAmount}) cannot exceed total budget (₹${budget}).`)
      return
    }

    setOptimizing(true)
    try {
      await api.runOptimisation({
        budget: Number(budget),
        discount_amount: Number(discountAmount),
        min_treatment_effect: Number(minTreatmentEffect),
        random_seed: 42,
      })
      pollForResults()
    } catch (err) {
      setOptimizing(false)
      setError('Could not start optimization: ' + (err.message || 'Server error'))
    }
  }

  // Derive stats
  const totalBudget = summary?.total_budget ?? budget
  const actualSpend = summary?.actual_spend ?? (allocationRows.filter(r => r.selected_for_campaign).length * discountAmount)
  const remainingBudget = summary?.remaining_budget ?? (totalBudget - actualSpend)
  const selectedCount = summary?.n_selected_customers ?? allocationRows.filter(r => r.selected_for_campaign).length
  const eligibleCount = summary?.n_eligible_customers ?? allocationRows.filter(r => r.eligible).length
  const totalCustomers = summary?.n_total_customers ?? (allocationRows.length || 2200)
  const incConversions = summary?.estimated_incremental_conversions ?? 0
  const incContribution = summary?.estimated_incremental_contribution_inr ?? 0
  const budgetUtilPct = totalBudget > 0 ? ((actualSpend / totalBudget) * 100).toFixed(1) : '0'

  return (
    <div className="page" style={{ paddingBottom: '40px' }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">Week 3 Live</span>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              Prescriptive Decision Layer • SciPy MILP Engine
            </span>
          </div>
          <h1>Prescriptive Optimization & Discount Allocation Matrix</h1>
          <p className="page-desc">
            Maximize net incremental contribution margin under a strict marketing budget
            by assigning targeted discounts based on validated Week 2 CausalForestDML individual treatment effects.
          </p>
        </div>
      </div>

      {/* ── Model Estimates Disclaimer ───────────────────────────────────────── */}
      <div className="notice-banner notice-banner--info" style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
        <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: '1.45' }}>
          <strong>Causal Estimates Disclosure:</strong> All incremental conversion numbers and contribution
          margins presented below are model-derived causal predictions (τ_i), estimated via
          Double Machine Learning out-of-fold cross-fitting on observed historical retail data. They represent
          expected prescriptive outcomes, not guaranteed realized revenue.
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="notice-banner notice-banner--danger" style={{ marginBottom: '20px' }}>
          <span>❌</span>
          <div style={{ flex: 1 }}>
            <strong>Optimization Error:</strong> {error}
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Success Banner ───────────────────────────────────────────────────── */}
      {statusMessage && (
        <div className="notice-banner notice-banner--success" style={{ marginBottom: '20px', background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
          <span>🎯</span>
          <div style={{ flex: 1 }}>{statusMessage}</div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Optimizer Configuration Card ─────────────────────────────────────── */}
      <SectionCard
        title="Optimization Controls & Constraints"
        subtitle="Configure the marketing budget, coupon unit cost, and eligibility gates for the SciPy MILP solver"
      >
        <form onSubmit={handleRunOptimization} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label className="form-label" htmlFor="budget-input">
              Total Budget (₹)
            </label>
            <input
              id="budget-input"
              type="number"
              className="form-input"
              value={budget}
              min={100}
              step={100}
              onChange={e => setBudget(parseFloat(e.target.value) || 0)}
              required
              disabled={optimizing}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Total capital allocated for discounts</span>
          </div>

          <div>
            <label className="form-label" htmlFor="discount-input">
              Discount Coupon Cost (₹)
            </label>
            <input
              id="discount-input"
              type="number"
              className="form-input"
              value={discountAmount}
              min={1}
              step={1}
              onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
              required
              disabled={optimizing}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Fixed cost per coupon offer (binary)</span>
          </div>

          <div>
            <label className="form-label" htmlFor="ite-threshold-input">
              Min. ITE Threshold (τ &gt;)
            </label>
            <input
              id="ite-threshold-input"
              type="number"
              className="form-input"
              value={minTreatmentEffect}
              min={0}
              max={1}
              step={0.01}
              onChange={e => setMinTreatmentEffect(parseFloat(e.target.value) || 0)}
              disabled={optimizing}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Minimum uplift required for eligibility</span>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={optimizing}
            >
              {optimizing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Solving MILP…
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Run SciPy MILP Optimizer
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.72rem', color: '#64748B' }}>
              {lastRunAt ? `Last run: ${new Date(lastRunAt).toLocaleTimeString()}` : 'Ready to solve'}
            </div>
          </div>
        </form>
      </SectionCard>

      {/* ── KPI Stat Cards ───────────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginTop: '20px', marginBottom: '24px' }}>
        <StatCard
          title="Total Budget"
          value={`₹${Number(totalBudget).toLocaleString()}`}
          subtext="Strict ceiling constraint"
          badge="Hard Cap"
          badgeType="default"
        />
        <StatCard
          title="Planned Spend"
          value={`₹${Number(actualSpend).toLocaleString()}`}
          subtext={`${budgetUtilPct}% budget utilized`}
          badge={actualSpend <= totalBudget ? "Feasible" : "Exceeded"}
          badgeType={actualSpend <= totalBudget ? "success" : "danger"}
        />
        <StatCard
          title="Selected / Eligible"
          value={`${selectedCount.toLocaleString()} / ${eligibleCount.toLocaleString()}`}
          subtext={`Out of ${totalCustomers.toLocaleString()} total customers`}
          badge={`${eligibleCount > 0 ? ((selectedCount / eligibleCount) * 100).toFixed(0) : 0}% selected`}
          badgeType="info"
        />
        <StatCard
          title="Incremental Conversions"
          value={`+${Number(incConversions).toFixed(1)}`}
          subtext="Net orders gained via uplift"
          badge="Uplift (Σ ITE)"
          badgeType="success"
        />
        <StatCard
          title="Incremental Contribution"
          value={`+₹${Number(incContribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext="Net margin (Revenue − Cost)"
          badge="Objective"
          badgeType="success"
        />
        <StatCard
          title="Budget Remaining"
          value={`₹${Number(remainingBudget).toLocaleString()}`}
          subtext="Unused marketing reserves"
          badge="Reserve"
          badgeType={remainingBudget >= 0 ? "default" : "warning"}
        />
      </div>

      {/* ── Charts Grid ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Budget Allocation Breakdown */}
        {summary && (
          <SectionCard
            title="Budget Utilization & Audience Coverage"
            subtitle="Breakdown of campaign capital and customer eligibility status"
          >
            <BudgetAllocationChart summary={summary} currency="₹" />
          </SectionCard>
        )}

        {/* 4-Policy Baseline Comparison */}
        {baselines.length > 0 && (
          <SectionCard
            title="Policy Benchmark Comparison"
            subtitle="Comparing prescriptive Causal DML targeting against Blanket, Random, and No-Discount baselines under the identical ₹5,000 budget"
          >
            <PolicyComparisonChart baselines={baselines} />
          </SectionCard>
        )}
      </div>

      {/* ── Discount Allocation Matrix ───────────────────────────────────────── */}
      <SectionCard
        title="Customer-Level Discount Allocation Matrix"
        subtitle="Individual customer prescriptions determined by Mixed-Integer Linear Programming. Sort, search, filter, and export allocation results."
      >
        <DiscountAllocationTable
          rows={allocationRows}
          loading={optimizing || initialLoading}
          error={error}
        />
      </SectionCard>

      {/* ── Mathematical Formulation & Methodology ───────────────────────────── */}
      <SectionCard
        title="Prescriptive Formulation & Economic Framework"
        subtitle="Mathematical formulation and econometric assumptions underlying the prescriptive engine"
      >
        <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1E293B', fontSize: '0.95rem' }}>
                📐 Binary Integer Program (BIP)
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.83rem', color: '#64748B' }}>
                We formulate the discount assignment as a 0-1 knapsack optimization problem solved via SciPy's HiGHS solver:
              </p>
              <pre style={{ background: '#0F172A', color: '#38BDF8', padding: '12px', borderRadius: '6px', fontSize: '0.82rem', overflowX: 'auto' }}>
{`maximize   ∑  x_i · [ τ_i · M_i − d ]
subject to ∑  x_i · d ≤ Budget
           x_i ∈ {0, 1}   ∀ i ∈ {1, ..., N}
           τ_i > τ_min,   τ_i · M_i > d`}
              </pre>
              <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                <li><strong>x_i ∈ [0, 1]:</strong> Binary decision variable (1 = offer discount, 0 = do not offer)</li>
                <li><strong>τ_i:</strong> Individual Treatment Effect (ITE) from Week 2 Causal Forest</li>
                <li><strong>M_i:</strong> Margin proxy (Customer average order value, ₹55 baseline)</li>
                <li><strong>d:</strong> Fixed discount cost per coupon offer (₹10)</li>
              </ul>
            </div>

            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1E293B', fontSize: '0.95rem' }}>
                ⚖️ Economic & Causal Assumptions
              </h4>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Strict Budget Invariance:</strong> Planned spend is guaranteed never to exceed the defined budget (∑ x_i · d ≤ B).
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Economic Viability Gate:</strong> Only customers with positive net expected contribution (τ_i · M_i &gt; d) are eligible, ensuring no loss-making discounts are ever issued.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Binary Treatment Contrast:</strong> The Week 2 causal model estimates the contrast between receiving a discount vs not receiving a discount. Multi-tier discount dosage is excluded.
                </li>
                <li>
                  <strong>Uncertainty Flagging:</strong> Customers whose 95% confidence lower bound τ_lower ≤ 0 are marked with ⚠️ for business transparency, while retaining optimal point-estimate ranking.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
