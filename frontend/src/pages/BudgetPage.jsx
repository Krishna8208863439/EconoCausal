import React, { useState, useEffect, useMemo } from 'react'
import Plot from 'react-plotly.js'
import {
  Sliders,
  Wallet,
  Coins,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Save,
  RefreshCw,
  PieChart
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'
import './Page.css'

const TREATMENT_COLS  = ['discount_offered']
const OUTCOME_COLS    = ['purchased', 'revenue']
const CONFOUNDER_COLS = ['age_group', 'past_purchases', 'avg_order_value', 'website_visits', 'customer_segment']

function optimiseBudget({ budget, discountAmount, causalResults }) {
  const segments = causalResults?.segment_breakdown || [
    { customer_segment: 'Regular', count: 880, mean: 0.215, std: 0.038 },
    { customer_segment: 'Occasional', count: 660, mean: 0.198, std: 0.042 },
    { customer_segment: 'Premium', count: 440, mean: 0.165, std: 0.035 },
    { customer_segment: 'Lapsed', count: 220, mean: 0.125, std: 0.045 },
  ]
  const dmlAte = causalResults?.dml_estimates?.mean_ate || 0.1947
  const validDiscount = Math.max(1, discountAmount || 10)
  const maxTargets = Math.floor(budget / validDiscount)
  const avgRevPerConversion = 40.0 // assumed basket conversion value

  const rows = [...segments]
    .map(seg => ({
      segment: seg.customer_segment,
      population: seg.count,
      meanCate: seg.mean,
      cateStd: seg.std,
      priorityScore: seg.mean,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)

  let remaining = maxTargets
  let totalSpend = 0
  let totalConversions = 0
  let totalRevenue = 0

  const allocationRows = rows.map(row => {
    const eligible   = Math.round(row.population * 0.6)
    const allocated  = Math.min(eligible, remaining)
    const spend      = allocated * validDiscount
    const inc        = allocated * row.meanCate
    const rev        = inc * avgRevPerConversion

    remaining         -= allocated
    totalSpend        += spend
    totalConversions  += inc
    totalRevenue      += rev

    return {
      segment:           row.segment,
      population:        row.population,
      eligible,
      allocated,
      spend:             Math.round(spend),
      meanCate:          row.meanCate,
      incrementalConv:   inc,
      incrementalRev:    rev,
      roi:               spend > 0 ? ((rev - spend) / spend) * 100 : 0,
    }
  })

  const causalInc = totalConversions
  const randomInc = maxTargets * dmlAte
  const randomRev = randomInc * avgRevPerConversion
  const causalRev = totalRevenue
  const gain      = causalInc - randomInc

  return {
    allocationRows,
    summary: {
      budget,
      maxTargets,
      totalSpend: Math.round(totalSpend),
      totalConversions: totalConversions.toFixed(1),
      totalRevenue: totalRevenue.toFixed(0),
      roi: totalSpend > 0 ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(1) : '0',
      causalGainVsRandom: gain.toFixed(1),
      causalGainPct: randomInc > 0 ? ((gain / randomInc) * 100).toFixed(1) : '0',
      randomInc: randomInc.toFixed(1),
      randomRev: randomRev.toFixed(0),
    },
    policies: [
      { name: 'Causal DML Policy', spend: Math.round(totalSpend), inc: Number(causalInc.toFixed(1)), rev: Number(causalRev.toFixed(0)), roi: Number(((causalRev - totalSpend) / (totalSpend || 1) * 100).toFixed(1)), color: '#2563EB' },
      { name: 'Random Policy', spend: Math.round(maxTargets * validDiscount), inc: Number(randomInc.toFixed(1)), rev: Number(randomRev.toFixed(0)), roi: Number(((randomRev - maxTargets * validDiscount) / (maxTargets * validDiscount || 1) * 100).toFixed(1)), color: '#F59E0B' },
      { name: 'No-Discount Baseline', spend: 0, inc: 0, rev: 0, roi: 0, color: '#94A3B8' },
    ],
  }
}

export default function BudgetPage() {
  const [budget, setBudget]                 = useState(5000)
  const [currency, setCurrency]             = useState('INR')
  const [discountAmount, setDiscountAmount] = useState(10)
  const [treatment, setTreatment]           = useState('discount_offered')
  const [outcome, setOutcome]               = useState('purchased')
  const [confounders, setConfounders]       = useState([...CONFOUNDER_COLS])
  const [saving, setSaving]                 = useState(false)
  const [causalResults, setCausalResults]   = useState(null)
  const [metricView, setMetricView]         = useState('conversions')
  const addToast = useToast()

  const currencySymbol = currency === 'INR' ? '₹' : '£'

  useEffect(() => {
    api.getBudgetConfig().then(cfg => {
      if (cfg) {
        if (cfg.budget)          setBudget(cfg.budget)
        if (cfg.currency)        setCurrency(cfg.currency)
        if (cfg.discount_amount) setDiscountAmount(cfg.discount_amount)
        if (cfg.treatment_col)   setTreatment(cfg.treatment_col)
        if (cfg.outcome_col)     setOutcome(cfg.outcome_col)
        if (cfg.covariates)      setConfounders(cfg.covariates)
      }
    })
    api.getCausalResults().then(r => setCausalResults(r)).catch(() => {})
  }, [])

  function handleConfoundToggle(col) {
    setConfounders(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
  }

  async function handleSave(e) {
    e.preventDefault()
    if (discountAmount > budget) {
      addToast('Discount amount cannot exceed total campaign budget.', 'error')
      return
    }
    if (confounders.length === 0) {
      addToast('At least one confounder is required for causal adjustment.', 'error')
      return
    }

    setSaving(true)
    try {
      await api.saveBudgetConfig({
        budget,
        currency,
        discount_amount: discountAmount,
        treatment_col: treatment,
        outcome_col: outcome,
        covariates: confounders,
      })
      addToast('Campaign budget configuration successfully saved.', 'success')
    } catch (err) {
      addToast('Failed to save budget config to backend.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const optResult = useMemo(
    () => optimiseBudget({ budget, discountAmount, causalResults }),
    [budget, discountAmount, causalResults]
  )

  const seg = causalResults?.segment_breakdown || [
    { customer_segment: 'Regular', mean: 0.215, std: 0.038 },
    { customer_segment: 'Occasional', mean: 0.198, std: 0.042 },
    { customer_segment: 'Premium', mean: 0.165, std: 0.035 },
    { customer_segment: 'Lapsed', mean: 0.125, std: 0.045 },
  ]

  return (
    <div className="page">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaign Budget & Simulation Config</h1>
          <p className="page-subtitle">
            Configure campaign marketing spend · Real-time CATE greedy simulation · Policy benchmarking
          </p>
        </div>
      </div>

      {/* ── Simulation KPI Summary ──────────────────────────────────────── */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '12px' }}>
          Real-Time Budget Allocation Projections
        </h2>
      </div>

      <div className="stat-grid-4">
        <StatCard
          label="Total Budget"
          value={`${currencySymbol}${budget.toLocaleString()}`}
          sub={`Unit discount cost: ${currencySymbol}${discountAmount}`}
          tooltip="Total marketing capital allocated for the dynamic promotional campaign."
          icon={Wallet}
          color="blue"
        />
        <StatCard
          label="Targeting Capacity"
          value={Math.floor(budget / (discountAmount || 1)).toLocaleString()}
          sub="Maximum customers who can receive offers"
          trend={{ value: `${currencySymbol}${discountAmount} per offer`, positive: true }}
          tooltip="Upper bound on customer discounts permitted under strict budget constraint."
          icon={Target}
          color="indigo"
        />
        <StatCard
          label="Incremental Conversions"
          value={`+${optResult.summary.totalConversions}`}
          sub="DML CATE-ranked targeting"
          trend={{ value: `+${optResult.summary.causalGainPct}% gain`, label: 'vs Random targeting', positive: true }}
          tooltip="Expected additional buyers who purchase exclusively due to the promotional offer."
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Causal Advantage"
          value={`+${optResult.summary.causalGainVsRandom} conv`}
          sub={`Extra conversions over random policy`}
          trend={{ value: `+${optResult.summary.causalGainPct}% lift`, positive: true }}
          tooltip="Net lift in incremental customers achieved by prioritizing highest-CATE customers rather than random distribution."
          icon={Coins}
          color="purple"
          highlight={true}
        />
      </div>

      {/* ── Interactive Form ────────────────────────────────────────────── */}
      <SectionCard
        title="Promotional Campaign Parameters"
        subtitle="Edit campaign spending, coupon cost, and causal adjustment parameters"
        icon={Sliders}
      >
        <form onSubmit={handleSave} className="config-form" aria-label="Campaign budget configuration form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Currency & Budget */}
            <div className="form-group">
              <label className="form-label" htmlFor="currency-select">
                Currency
                <span className="form-hint">Display currency unit</span>
              </label>
              <select
                id="currency-select"
                className="form-select"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="GBP">£ GBP (British Pound)</option>
              </select>
            </div>

            {/* Campaign Budget with Slider */}
            <div className="form-group">
              <div className="form-label">
                <span>Total Campaign Budget ({currencySymbol})</span>
                <span className="range-value-pill">{currencySymbol}{budget.toLocaleString()}</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  min={500}
                  max={50000}
                  step={500}
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  className="range-slider"
                />
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={budget}
                  onChange={e => setBudget(Math.max(100, Number(e.target.value)))}
                  className="form-input"
                  style={{ width: '120px' }}
                />
              </div>
            </div>

            {/* Cost Per Discount Offer with Slider */}
            <div className="form-group">
              <div className="form-label">
                <span>Discount Cost per Customer ({currencySymbol})</span>
                <span className="range-value-pill">{currencySymbol}{discountAmount}</span>
              </div>
              <div className="range-slider-wrapper">
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  className="range-slider"
                />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Math.max(1, Number(e.target.value)))}
                  className="form-input"
                  style={{ width: '120px' }}
                />
              </div>
            </div>
          </div>

          {/* Confounders Adjustment Set Checkboxes */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>
              <span>Causal Adjustment Confounders</span>
              <span className="form-hint">{confounders.length} of {CONFOUNDER_COLS.length} active</span>
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {CONFOUNDER_COLS.map(col => (
                <label
                  key={col}
                  className="checkbox-label"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: confounders.includes(col) ? 'var(--primary-50)' : 'var(--slate-100)',
                    border: `1px solid ${confounders.includes(col) ? 'var(--primary-200)' : 'var(--slate-200)'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confounders.includes(col)}
                    onChange={() => handleConfoundToggle(col)}
                  />
                  <code style={{ fontSize: '0.84rem', color: confounders.includes(col) ? 'var(--primary-800)' : 'var(--slate-700)' }}>
                    {col}
                  </code>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '22px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || confounders.length === 0}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Config…' : 'Save Configuration'}</span>
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Capacity: ~<strong>{Math.floor(budget / (discountAmount || 1)).toLocaleString()}</strong> discounts at {currencySymbol}{discountAmount} each
            </span>
          </div>
        </form>
      </SectionCard>

      {/* ── Policy Comparison & Segment Breakdown Charts ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Policy Comparison Bar Chart */}
        <SectionCard
          title="Policy Benchmark Under Selected Budget"
          subtitle="Incremental conversions, projected revenue, and ROI across campaign policies"
          icon={TrendingUp}
          action={
            <div style={{ display: 'flex', gap: '6px' }}>
              {['conversions', 'revenue', 'roi'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetricView(m)}
                  className={`btn btn-sm ${metricView === m ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                >
                  {m === 'conversions' ? 'Orders' : m === 'revenue' ? 'Revenue' : 'ROI %'}
                </button>
              ))}
            </div>
          }
        >
          <div style={{ width: '100%', height: '320px' }}>
            <Plot
              data={[{
                x: optResult.policies.map(p => p.name),
                y: optResult.policies.map(p => metricView === 'conversions' ? p.inc : metricView === 'revenue' ? p.rev : p.roi),
                type: 'bar',
                marker: { color: optResult.policies.map(p => p.color) },
                text: optResult.policies.map(p => metricView === 'conversions' ? `+${p.inc}` : metricView === 'revenue' ? `${currencySymbol}${p.rev.toLocaleString()}` : `${p.roi > 0 ? '+' : ''}${p.roi}%`),
                textposition: 'auto',
                hovertemplate: '%{x}<br>Value: %{text}<extra></extra>',
              }]}
              layout={{
                title: { text: `<b>${metricView === 'conversions' ? 'Incremental Conversions' : metricView === 'revenue' ? 'Revenue' : 'ROI %'} by Policy</b>`, font: { size: 13, color: '#0F172A' }, x: 0.02 },
                height: 310,
                autosize: true,
                margin: { l: 55, r: 20, t: 45, b: 55 },
                xaxis: { tickangle: -5, gridcolor: '#F1F5F9' },
                yaxis: { gridcolor: '#E2E8F0', zeroline: true },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </SectionCard>

        {/* Mean CATE by Customer Segment */}
        <SectionCard
          title="Mean Treatment Effect (CATE) by Segment"
          subtitle="Heterogeneous uplift potential estimated for each RFM segment"
          icon={PieChart}
        >
          <div style={{ width: '100%', height: '320px' }}>
            <Plot
              data={[{
                x: seg.map(s => s.customer_segment),
                y: seg.map(s => Number((s.mean * 100).toFixed(2))),
                error_y: { type: 'data', array: seg.map(s => Number((s.std * 100).toFixed(2))), visible: true, color: '#94A3B8' },
                type: 'bar',
                marker: { color: ['#2563EB', '#3B82F6', '#60A5FA', '#94A3B8'] },
                text: seg.map(s => `+${(s.mean * 100).toFixed(1)} pp`),
                textposition: 'auto',
                hovertemplate: 'Segment: %{x}<br>Mean Uplift: +%{y:.2f} pp<extra></extra>',
              }]}
              layout={{
                title: { text: '<b>Mean Uplift by Customer Segment (with Std Dev)</b>', font: { size: 13, color: '#0F172A' }, x: 0.02 },
                height: 310,
                autosize: true,
                margin: { l: 55, r: 20, t: 45, b: 50 },
                xaxis: { gridcolor: '#F1F5F9' },
                yaxis: { title: 'Uplift (pp)', ticksuffix: ' pp', gridcolor: '#E2E8F0' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </SectionCard>
      </div>

      {/* ── Segment Allocation Matrix Breakdown Table ────────────────────── */}
      <SectionCard
        title="Segment-by-Segment Prescriptive Allocation Matrix"
        subtitle="Greedy knapsack ordering prioritizes customer tiers with highest marginal uplift"
        icon={Target}
        badge="CATE Ranked"
        badgeType="blue"
      >
        <div className="table-wrapper">
          <table className="data-table" aria-label="Budget allocation table by customer segment">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Customer Segment</th>
                <th>Total Pool</th>
                <th>Eligible (60%)</th>
                <th>Offers Allocated</th>
                <th>Projected Spend</th>
                <th>Mean CATE</th>
                <th>Incr. Orders</th>
                <th>Incr. Revenue</th>
                <th>Estimated ROI</th>
              </tr>
            </thead>
            <tbody>
              {optResult.allocationRows.map((row, idx) => (
                <tr key={row.segment}>
                  <td style={{ fontWeight: 700, color: '#2563EB' }}>#{idx + 1}</td>
                  <td><strong>{row.segment}</strong></td>
                  <td>{row.population.toLocaleString()}</td>
                  <td>{row.eligible.toLocaleString()}</td>
                  <td>
                    <span className="badge badge-blue">
                      {row.allocated.toLocaleString()} offers
                    </span>
                  </td>
                  <td>{currencySymbol}{row.spend.toLocaleString()}</td>
                  <td>
                    <span className="badge badge-green">
                      +{(row.meanCate * 100).toFixed(1)} pp
                    </span>
                  </td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>
                    +{row.incrementalConv.toFixed(1)}
                  </td>
                  <td>{currencySymbol}{Math.round(row.incrementalRev).toLocaleString()}</td>
                  <td>
                    <span style={{ color: row.roi >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                      {row.roi >= 0 ? '+' : ''}{row.roi.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
                <td colSpan={4}>Campaign Total</td>
                <td>{optResult.allocationRows.reduce((s, r) => s + r.allocated, 0).toLocaleString()}</td>
                <td>{currencySymbol}{optResult.summary.totalSpend.toLocaleString()}</td>
                <td>—</td>
                <td style={{ color: '#059669' }}>+{optResult.summary.totalConversions}</td>
                <td>{currencySymbol}{Number(optResult.summary.totalRevenue).toLocaleString()}</td>
                <td style={{ color: Number(optResult.summary.roi) >= 0 ? '#059669' : '#DC2626' }}>
                  +{optResult.summary.roi}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
