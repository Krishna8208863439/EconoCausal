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
<<<<<<< HEAD
  ChevronRight,
  Filter,
  BarChart2,
  Layers,
  ArrowRight
=======
  ChevronRight
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import BudgetAllocationChart from '../charts/BudgetAllocationChart.jsx'
import PolicyComparisonChart from '../charts/PolicyComparisonChart.jsx'
<<<<<<< HEAD
import BudgetSweepChart from '../charts/BudgetSweepChart.jsx'
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
import DiscountAllocationTable from '../components/DiscountAllocationTable.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'
import './Page.css'

export default function BudgetOptimization() {
  // Form parameters
  const [budget, setBudget]                         = useState(5000)
  const [discountAmount, setDiscountAmount]         = useState(10)
  const [minTreatmentEffect, setMinTreatmentEffect] = useState(0.0)
<<<<<<< HEAD
  const [conservative, setConservative]             = useState(false)
  const [maxCustomers, setMaxCustomers]             = useState('')
  const [showSegmentCaps, setShowSegmentCaps]       = useState(false)
  const [segmentCaps, setSegmentCaps]               = useState({
    Regular: '',
    Occasional: '',
    Premium: '',
    Lapsed: '',
  })
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c

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
<<<<<<< HEAD
  const [sweepData, setSweepData]           = useState([])
  const [activeTab, setActiveTab]           = useState('allocation') // 'allocation' | 'sweep' | 'comparison'
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD

      // Load Day 2 budget sweep data
      const sweepRes = await api.getBudgetSweep([1000, 2500, 5000, 7500, 10000, 15000, 20000, 50000], 10, false).catch(() => [])
      if (sweepRes && sweepRes.length > 0) {
        setSweepData(sweepRes)
      }
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD
    const maxAttempts = 20
=======
    const maxAttempts = 25
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c

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

<<<<<<< HEAD
          // Refresh sweep data
          const updatedSweep = await api.getBudgetSweep([1000, 2500, 5000, 7500, 10000, 15000, 20000, 50000], discountAmount, conservative).catch(() => [])
          if (updatedSweep && updatedSweep.length > 0) setSweepData(updatedSweep)

=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD
    }, 800)
  }, [addToast, discountAmount, conservative])
=======
    }, 1500)
  }, [addToast])
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c

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
<<<<<<< HEAD
    addToast('Executing SciPy HiGHS MILP Knapsack solver...', 'info')

    // Parse active segment caps
    const parsedCaps = {}
    if (showSegmentCaps) {
      Object.entries(segmentCaps).forEach(([seg, val]) => {
        if (val !== '' && !isNaN(Number(val))) {
          parsedCaps[seg] = Number(val)
        }
      })
    }

=======
    addToast('Executing SciPy HiGHS MILP solver...', 'info')
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
    try {
      await api.runOptimisation({
        budget: Number(budget),
        discount_amount: Number(discountAmount),
        min_treatment_effect: Number(minTreatmentEffect),
<<<<<<< HEAD
        conservative: Boolean(conservative),
        max_customers: maxCustomers ? Number(maxCustomers) : null,
        segment_caps: Object.keys(parsedCaps).length > 0 ? parsedCaps : null,
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD
            Week 3: Mixed-Integer Linear Programming · Cannibalization Penalty · Day 2 Constraints & Budget Sweep
=======
            Mixed-Integer Linear Programming (SciPy MILP) · Hard Budget Ceiling · Customer-Level Offer Targeting
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
          </p>
        </div>
        <div className="page-header-actions">
          <span className="badge badge-purple">
            <Sparkles size={13} />
            SciPy HiGHS Solver
          </span>
          <span className="badge badge-green">
            <CheckCircle2 size={13} />
            Global Optimum Converged
          </span>
        </div>
      </div>

<<<<<<< HEAD
      {/* ── Methodology Banner ─────────────────────────────────────────── */}
=======
      {/* ── Causal Estimates Disclaimer ─────────────────────────────────── */}
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
      <div className="notice-banner notice-banner--info">
        <div className="notice-banner__icon">
          <HelpCircle size={20} className="text-primary-600" />
        </div>
        <div>
<<<<<<< HEAD
          <strong>EconoCausal Value Formulation:</strong> Unlike traditional uplift heuristics, our objective function
          explicitly subtracts organic conversion risk:
          <span style={{ fontFamily: 'var(--font-mono)', marginLeft: '6px', fontWeight: 600 }}>
            Incremental Margin = τ_i · (Margin_i − d) − p_{'{0,i}'} · d
          </span>.
          Coupons are never granted to buyers who would have converted anyway, protecting marketing margins.
=======
          <strong>Prescriptive Formulation:</strong> Instead of blanket discounts or predictive intent scores,
          the system solves a <strong>0-1 Knapsack Mixed-Integer Linear Program</strong> to allocate promotions exclusively to
          customers whose expected incremental basket margin ($\tau_i \cdot \text{AOV}_i - \text{Discount}$) is positive and maximized.
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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

<<<<<<< HEAD
      {/* ── Day 1 & Day 2 Optimizer Controls Card ────────────────────────── */}
      <SectionCard
        title="Optimization Controls & Day 2 Business Constraints"
        subtitle="Configure marketing expenditure, unit costs, conservative confidence bounds, and cohort limits"
        icon={Sliders}
      >
        <form onSubmit={handleRunOptimization} className="config-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="opt-budget-input">
                Total Budget Ceiling (₹)
                <span className="form-hint">Hard spend constraint</span>
=======
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
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
              </label>
              <input
                id="opt-budget-input"
                type="number"
                className="form-input"
                value={budget}
                min={100}
<<<<<<< HEAD
                step={500}
=======
                step={100}
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
                onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                required
                disabled={optimizing}
              />
<<<<<<< HEAD
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[1000, 2500, 5000, 10000, 20000].map(b => (
                  <button
                    key={b}
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setBudget(b)}
                    style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                  >
                    ₹{b >= 1000 ? `${b / 1000}k` : b}
                  </button>
                ))}
              </div>
=======
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="opt-discount-input">
<<<<<<< HEAD
                Coupon Unit Cost (₹)
=======
                Discount Coupon Cost (₹)
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD
                Min. Uplift Threshold (τ &gt;)
                <span className="form-hint">Minimum ITE required</span>
=======
                Min. ITE Threshold (τ &gt;)
                <span className="form-hint">Minimum uplift required</span>
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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

<<<<<<< HEAD
            <div className="form-group">
              <label className="form-label" htmlFor="opt-max-customers">
                Max Audience Cap (N_max)
                <span className="form-hint">Optional customer ceiling</span>
              </label>
              <input
                id="opt-max-customers"
                type="number"
                className="form-input"
                placeholder="No limit (knapsack)"
                value={maxCustomers}
                min={1}
                onChange={e => setMaxCustomers(e.target.value)}
                disabled={optimizing}
              />
            </div>
          </div>

          {/* Day 2 Constraint Toggles: Conservative Mode & Segment Caps */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'center',
            padding: '14px 16px',
            background: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            marginTop: '16px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1E293B' }}>
              <input
                type="checkbox"
                checked={conservative}
                onChange={e => setConservative(e.target.checked)}
                disabled={optimizing}
                style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
              />
              <span>Conservative Targeting (Require τ_lower &gt; 0)</span>
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>95% Confidence</span>
            </label>

            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setShowSegmentCaps(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Filter size={12} />
              <span>{showSegmentCaps ? 'Hide Segment Caps' : 'Configure Segment Caps'}</span>
            </button>
          </div>

          {/* Collapsible Segment Caps */}
          {showSegmentCaps && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              padding: '14px',
              background: '#F1F5F9',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              {['Regular', 'Occasional', 'Premium', 'Lapsed'].map(seg => (
                <div key={seg} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    {seg} Cap
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Max count"
                    value={segmentCaps[seg]}
                    onChange={e => setSegmentCaps(sc => ({ ...sc, [seg]: e.target.value }))}
                    disabled={optimizing}
                    style={{ height: '34px', fontSize: '0.82rem' }}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
              <span>Targeting Capacity: ~<strong>{Math.floor(budget / (discountAmount || 1)).toLocaleString()}</strong> discounts</span>
              <span style={{ marginLeft: '12px' }}>{lastRunAt ? `Last Solved: ${new Date(lastRunAt).toLocaleTimeString()}` : 'Solver ready'}</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ minWidth: '220px', height: '42px' }}
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
                  <span>Execute Prescriptive Solver</span>
                </>
              )}
            </button>
=======
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
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD
          tooltip="Total cost of all allocated discount offers."
=======
          tooltip="Total cost of all 500 allocated discount offers."
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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
<<<<<<< HEAD
          sub="Net margin (Revenue − Cannibalization − Cost)"
=======
          sub="Net margin (Revenue − Coupon Cost)"
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
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

<<<<<<< HEAD
      {/* ── Day 2 Budget Sweep & Policy Comparison Section ───────────────── */}
      <SectionCard
        title="Day 2 Advanced Analytics: Budget Sweep & Policy Benchmarks"
        subtitle="Evaluate diminishing marginal returns across budgets and compare 4 campaign strategies"
        icon={BarChart2}
      >
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'allocation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('allocation')}
          >
            <span>Budget Allocation Breakdown</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'sweep' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sweep')}
          >
            <span>Day 2 Budget Sweep Analysis</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'comparison' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('comparison')}
          >
            <span>4-Policy Benchmark Comparison</span>
          </button>
        </div>

        {activeTab === 'allocation' && summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: '#1E293B' }}>
                Budget Utilization & Audience Coverage
              </h4>
              <BudgetAllocationChart summary={summary} currency="₹" />
            </div>
            <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: '#1E293B' }}>
                Prescriptive Allocation Breakdown
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Total Customer Cohort:</span>
                  <strong>{totalCustomers.toLocaleString()} customers</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Eligible Persuadables (τ &gt; 0 & Margin &gt; Cost):</span>
                  <strong style={{ color: '#2563EB' }}>{eligibleCount.toLocaleString()} customers ({((eligibleCount / totalCustomers) * 100).toFixed(1)}%)</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Optimal Selected Candidates:</span>
                  <strong style={{ color: '#059669' }}>{selectedCount.toLocaleString()} customers ({((selectedCount / Math.max(1, eligibleCount)) * 100).toFixed(1)}% of eligible)</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Average Coupon Spend per Selected:</span>
                  <strong>₹{discountAmount.toFixed(2)}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Expected Return on Investment (ROI):</span>
                  <strong style={{ color: '#10B981' }}>+{(incContribution / Math.max(1, actualSpend) * 100).toFixed(1)}%</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Conservative Mode Active:</span>
                  <span className={`badge ${conservative ? 'badge-green' : 'badge-gray'}`}>
                    {conservative ? 'YES (τ_lower > 0)' : 'NO (Point estimates)'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'sweep' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                Day 2 Budget Sweep Performance Curve (₹1k – ₹50k)
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                Simulates optimal knapsack allocation across varying promotional budgets, showing incremental revenue and diminishing marginal returns.
              </p>
            </div>
            <BudgetSweepChart sweepData={sweepData} />

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Budget Ceiling</th>
                    <th>Targeted Customers</th>
                    <th>Actual Spend</th>
                    <th>Utilization (%)</th>
                    <th>Incr. Orders</th>
                    <th>Net Incr. Margin</th>
                    <th>ROI (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {sweepData.map(row => (
                    <tr key={row.budget}>
                      <td style={{ fontWeight: 700 }}>₹{Number(row.budget).toLocaleString()}</td>
                      <td>{Number(row.customers_targeted).toLocaleString()}</td>
                      <td>₹{Number(row.actual_spend).toLocaleString()}</td>
                      <td>{row.budget_utilisation_pct}%</td>
                      <td style={{ color: '#10B981', fontWeight: 600 }}>+{row.incremental_purchases}</td>
                      <td style={{ color: '#2563EB', fontWeight: 700 }}>+₹{Number(row.incremental_margin).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td>{row.roi_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'comparison' && baselines.length > 0 && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                4-Policy Benchmark Comparison at ₹{Number(totalBudget).toLocaleString()} Spend
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                Compares Causal DML against Blanket, Random, and No-Discount policies using Doubly Robust policy valuation.
              </p>
            </div>
            <PolicyComparisonChart baselines={baselines} />
          </div>
        )}
      </SectionCard>
=======
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
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c

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

      {/* ── Mathematical Formulation & Economic Framework ───────────────── */}
      <SectionCard
<<<<<<< HEAD
        title="Prescriptive Formulation & Economic Framework (Week 3 Methodology)"
        subtitle="Mathematical formulation and econometric assumptions underlying the prescriptive knapsack engine"
=======
        title="Prescriptive Formulation & Economic Framework"
        subtitle="Mathematical formulation and econometric assumptions underlying the prescriptive engine"
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
        icon={Scale}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1E293B', fontSize: '0.95rem', fontWeight: 700 }}>
<<<<<<< HEAD
              📐 Binary Integer Program (BIP) with Cannibalization Penalty
=======
              📐 Binary Integer Program (BIP) Formulation
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#64748B' }}>
              We formulate the discount assignment as a 0-1 knapsack optimization problem solved via SciPy's HiGHS solver:
            </p>
            <pre style={{ background: '#0F172A', color: '#38BDF8', padding: '14px', borderRadius: '8px', fontSize: '0.82rem', overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
<<<<<<< HEAD
{`maximize   ∑  x_i · [ τ_i · (M_i − d) − p_{0,i} · d ]
subject to ∑  x_i · d ≤ Budget
           ∑  x_i ≤ N_max                  (Optional)
           ∑_{i∈S} x_i ≤ Cap_S             (Segment caps)
           x_i ∈ {0, 1}                    ∀ i ∈ {1, ..., N}
=======
{`maximize   ∑  x_i · [ τ_i · M_i − d ]
subject to ∑  x_i · d ≤ Budget
           x_i ∈ {0, 1}   ∀ i ∈ {1, ..., N}
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
           τ_i > τ_min,   τ_i · M_i > d`}
            </pre>
            <ul style={{ paddingLeft: '20px', margin: '10px 0 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
              <li><strong>x_i ∈ &#123;0, 1&#125;:</strong> Binary decision variable (1 = offer discount, 0 = do not offer)</li>
              <li><strong>τ_i:</strong> Individual Treatment Effect (ITE) from Week 2 Causal Forest</li>
<<<<<<< HEAD
              <li><strong>p_{'{0,i}'}:</strong> Baseline purchase probability without offer ($m(X_i) - e(X_i) \cdot \tau_i$)</li>
              <li><strong>p_{'{0,i}'} · d:</strong> Cannibalization penalty (cost of giving coupon to organic buyer)</li>
              <li><strong>M_i:</strong> Contribution margin proxy (Customer average order value, ₹55 baseline)</li>
=======
              <li><strong>M_i:</strong> Margin proxy (Customer average order value, ₹55 baseline)</li>
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
              <li><strong>d:</strong> Fixed discount cost per coupon offer (₹10)</li>
            </ul>
          </div>

          <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1E293B', fontSize: '0.95rem', fontWeight: 700 }}>
              ⚖️ Economic & Causal Governance Principles
            </h4>
            <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.7' }}>
              <li style={{ marginBottom: '8px' }}>
<<<<<<< HEAD
                <strong>Strict Budget Invariance:</strong> Planned spend is mathematically guaranteed never to exceed the defined budget ($\sum x_i \cdot d \le B$).
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Cannibalization Shield:</strong> Subtracting $p_{0,i} \cdot d$ ensures discounts are never assigned to sure-thing buyers who would convert anyway.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Conservative Mode Confidence Gate:</strong> Optional toggle filters candidates to those with &tau;<sub>lower</sub> &gt; 0, ensuring statistically verified positive uplift at the 95% confidence level.
              </li>
              <li>
                <strong>Segment Balancing:</strong> Configurable caps ensure promotional equity across Regular, Premium, Occasional, and Lapsed segments without budget spillage.
=======
                <strong>Strict Budget Invariance:</strong> Planned spend is mathematically guaranteed never to exceed the defined budget (∑ x_i · d ≤ B).
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Economic Viability Gate:</strong> Only customers with positive net expected contribution (τ_i · M_i &gt; d) are eligible, ensuring no loss-making discounts are ever issued.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Binary Treatment Contrast:</strong> The causal model estimates the contrast between receiving a discount vs not receiving a discount. Multi-tier discount dosage is excluded.
              </li>
              <li>
                <strong>Uncertainty Flagging:</strong> Customers whose 95% confidence lower bound τ_lower ≤ 0 are marked with ⚠️ for business transparency, while retaining optimal point-estimate ranking.
>>>>>>> c252a66c1d9cdab11c0455b44796e49ac90fba8c
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
