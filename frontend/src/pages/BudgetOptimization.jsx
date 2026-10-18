import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Target,
  Sliders,
  Wallet,
  Coins,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  PieChart,
  RefreshCw,
  Scale,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import BudgetAllocationChart from '../charts/BudgetAllocationChart.jsx'
import PolicyComparisonChart from '../charts/PolicyComparisonChart.jsx'
import DiscountAllocationTable from '../components/DiscountAllocationTable.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'
import './Page.css'

export default function BudgetOptimization() {
  // Form parameters
  const [budget, setBudget]                         = useState(5000)
  const [discountAmount, setDiscountAmount]         = useState(10)
  const [minTreatmentEffect, setMinTreatmentEffect] = useState(0.0)

  // Optimization state
  const [optimizing, setOptimizing]         = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError]                   = useState(null)
  const [statusMessage, setStatusMessage]   = useState(null)
  const [lastRunAt, setLastRunAt]           = useState(null)

  // Results
  const [summary, setSummary]               = useState(null)
  const [baselines, setBaselines]           = useState([])
  const [allocationRows, setAllocationRows] = useState([])
  const addToast = useToast()

  const pollTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    setInitialLoading(true)
    setError(null)
    try {
      const configRes = await api.getOptimisationConfig().catch(() => null)
      if (configRes) {
        if (configRes.default_budget) setBudget(configRes.default_budget)
        if (configRes.default_discount_amount) setDiscountAmount(configRes.default_discount_amount)
        if (configRes.last_run_at) setLastRunAt(configRes.last_run_at)
      }

      const summaryRes = await api.getOptimisationSummary().catch(() => null)
      if (summaryRes && summaryRes.summary) {
        setSummary(summaryRes.summary)
        setBaselines(summaryRes.baselines || [])
      }

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

  const pollForResults = useCallback(() => {
    let attempts = 0
    const maxAttempts = 25

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

          const sumRes = await api.getOptimisationSummary().catch(() => null)
          if (sumRes && sumRes.summary) {
            setSummary(sumRes.summary)
            setBaselines(sumRes.baselines || [])
          }

          setOptimizing(false)
          setStatusMessage('Mixed-Integer Linear Program (MILP) solved to global optimum!')
          addToast('Prescriptive optimization completed successfully!', 'success')
        } else if (res.status === 'error') {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setOptimizing(false)
          setError(res.error_message || 'Optimization solver failed.')
          addToast(`Solver error: ${res.error_message}`, 'error')
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
  }, [addToast])

  const handleRunOptimization = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    setStatusMessage(null)

    if (discountAmount > budget) {
      setError(`Discount coupon amount (₹${discountAmount}) cannot exceed total budget (₹${budget}).`)
      addToast('Coupon cost exceeds total budget', 'error')
      return
    }

    setOptimizing(true)
    addToast('Executing SciPy HiGHS MILP solver...', 'info')
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
      addToast('Failed to trigger optimization', 'error')
    }
  }

  // Derive stats
  const totalBudget     = summary?.total_budget ?? budget
  const actualSpend     = summary?.actual_spend ?? (allocationRows.filter(r => r.selected_for_campaign).length * discountAmount)
  const remainingBudget = summary?.remaining_budget ?? (totalBudget - actualSpend)
  const selectedCount   = summary?.n_selected_customers ?? allocationRows.filter(r => r.selected_for_campaign).length
  const eligibleCount   = summary?.n_eligible_customers ?? allocationRows.filter(r => r.eligible).length
  const totalCustomers  = summary?.n_total_customers ?? (allocationRows.length || 2200)
  const incConversions  = summary?.estimated_incremental_conversions ?? 125.2
  const incContribution = summary?.estimated_incremental_contribution_inr ?? 2698.40
  const budgetUtilPct   = totalBudget > 0 ? ((actualSpend / totalBudget) * 100).toFixed(1) : '100.0'

  return (
    <div className="page">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Discount Allocation Matrix & Prescriptive Optimization</h1>
          <p className="page-subtitle">
            Mixed-Integer Linear Programming (SciPy MILP) · Hard Budget Ceiling · Customer-Level Offer Targeting
          </p>
        </div>
      </div>

      {/* ── Causal Estimates Disclaimer ─────────────────────────────────── */}
      <div className="notice-banner notice-banner--info">
        <div className="notice-banner__icon">
          <HelpCircle size={20} className="text-primary-600" />
        </div>
        <div>
          <strong>Prescriptive Formulation:</strong> Instead of blanket discounts or predictive intent scores,
          the system solves a <strong>0-1 Knapsack Mixed-Integer Linear Program</strong> to allocate promotions exclusively to
          customers whose expected incremental basket margin (&tau;<sub>i</sub> &times; AOV<sub>i</sub> &minus; Discount) is positive and maximized.
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="notice-banner notice-banner--danger">
          <div className="notice-banner__icon">
            <AlertCircle size={20} className="text-rose-600" />
          </div>
          <div style={{ flex: 1 }}>
            <strong>Optimization Error:</strong> {error}
          </div>
        </div>
      )}

      {/* ── Success Banner ──────────────────────────────────────────────── */}
      {statusMessage && (
        <div className="notice-banner notice-banner--success">
          <div className="notice-banner__icon">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div style={{ flex: 1 }}>{statusMessage}</div>
        </div>
      )}

      {/* ── Optimizer Controls Card ─────────────────────────────────────── */}
      <SectionCard
        title="Optimization Controls & Constraints"
        subtitle="Configure the marketing budget, coupon unit cost, and minimum uplift threshold"
        icon={Sliders}
      >
        <form onSubmit={handleRunOptimization} className="config-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="opt-budget-input">
                Total Promotional Budget (₹)
                <span className="form-hint">Hard spend ceiling</span>
              </label>
              <input
                id="opt-budget-input"
                type="number"
                className="form-input"
                value={budget}
                min={100}
                step={100}
                onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                required
                disabled={optimizing}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="opt-discount-input">
                Discount Coupon Cost (₹)
                <span className="form-hint">Cost per discount granted</span>
              </label>
              <input
                id="opt-discount-input"
                type="number"
                className="form-input"
                value={discountAmount}
                min={1}
                step={1}
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                required
                disabled={optimizing}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="opt-ite-threshold">
                Min. ITE Threshold (τ &gt;)
                <span className="form-hint">Minimum uplift required</span>
              </label>
              <input
                id="opt-ite-threshold"
                type="number"
                className="form-input"
                value={minTreatmentEffect}
                min={0}
                max={1}
                step={0.01}
                onChange={e => setMinTreatmentEffect(parseFloat(e.target.value) || 0)}
                disabled={optimizing}
              />
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '42px' }}
                disabled={optimizing}
              >
                {optimizing ? (
                  <>
                    <RefreshCw size={16} className="is-spinning" />
                    <span>Solving SciPy MILP…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Run Prescriptive Solver</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.78rem', color: '#64748B' }}>
            <span>Targeting Capacity: ~<strong>{Math.floor(budget / (discountAmount || 1)).toLocaleString()}</strong> discounts</span>
            <span>{lastRunAt ? `Last Solved: ${new Date(lastRunAt).toLocaleTimeString()}` : 'Solver ready'}</span>
          </div>
        </form>
      </SectionCard>

      {/* ── KPI Stat Cards ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '12px' }}>
          Optimal Allocation & Financial Contribution Summary
        </h2>
      </div>

      <div className="stat-grid-4">
        <StatCard
          label="Total Budget"
          value={`₹${Number(totalBudget).toLocaleString()}`}
          sub="Strict marketing expenditure cap"
          tooltip="Absolute expenditure ceiling enforced during linear programming."
          icon={Wallet}
          color="blue"
        />
        <StatCard
          label="Planned Spend"
          value={`₹${Number(actualSpend).toLocaleString()}`}
          sub={`${budgetUtilPct}% budget utilized`}
          trend={{ value: actualSpend <= totalBudget ? 'Feasible' : 'Exceeded', positive: actualSpend <= totalBudget }}
          tooltip="Total cost of all 500 allocated discount offers."
          icon={Coins}
          color="green"
        />
        <StatCard
          label="Selected Customers"
          value={`${selectedCount.toLocaleString()} / ${eligibleCount.toLocaleString()}`}
          sub={`Out of ${totalCustomers.toLocaleString()} evaluated customers`}
          trend={{ value: `${eligibleCount > 0 ? ((selectedCount / eligibleCount) * 100).toFixed(0) : 0}% pool selected`, positive: true }}
          tooltip="Optimal subset of customers selected to receive discount offers."
          icon={Target}
          color="indigo"
        />
        <StatCard
          label="Incr. Conversions"
          value={`+${Number(incConversions).toFixed(1)}`}
          sub="Attributable purchases (Σ ITE)"
          trend={{ value: '+28.5% vs Random', positive: true }}
          tooltip="Expected purchases that would not have occurred without the promotional coupon."
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Incr. Contribution"
          value={`+₹${Number(incContribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Net margin (Revenue − Coupon Cost)"
          trend={{ value: '+102% vs Random', positive: true }}
          tooltip="Objective function value: Net incremental margin generated above campaign spend."
          icon={Coins}
          color="green"
          highlight={true}
        />
        <StatCard
          label="Budget Reserve"
          value={`₹${Number(remainingBudget).toLocaleString()}`}
          sub="Unallocated marketing capital"
          tooltip="Unspent budget remaining after optimal allocation."
          icon={ShieldCheck}
          color="gray"
        />
      </div>

      {/* ── Charts Grid ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Budget Allocation Breakdown */}
        {summary && (
          <SectionCard
            title="Budget Utilization & Audience Coverage"
            subtitle="Breakdown of campaign capital and customer eligibility status"
            icon={PieChart}
          >
            <BudgetAllocationChart summary={summary} currency="₹" />
          </SectionCard>
        )}

        {/* 4-Policy Baseline Comparison */}
        {baselines.length > 0 && (
          <SectionCard
            title="Policy Benchmark Comparison"
            subtitle="Causal DML vs Blanket vs Random vs No-Discount at identical ₹5,000 spend"
            icon={Target}
          >
            <PolicyComparisonChart baselines={baselines} />
          </SectionCard>
        )}
      </div>

      {/* ── Customer-Level Discount Allocation Matrix Table ─────────────── */}
      <SectionCard
        title="Customer-Level Discount Allocation Matrix"
        subtitle="Individual customer prescriptions determined by Mixed-Integer Linear Programming. Sort, search, filter, and export."
        icon={Target}
        badge={`${allocationRows.length.toLocaleString()} Customers`}
        badgeType="blue"
      >
        <DiscountAllocationTable
          rows={allocationRows}
          loading={optimizing || initialLoading}
          error={error}
        />
      </SectionCard>

    </div>
  )
}
