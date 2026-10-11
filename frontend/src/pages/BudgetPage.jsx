import React, { useState, useEffect, useMemo } from 'react'
import Plot from 'react-plotly.js'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import './Page.css'

const TREATMENT_COLS  = ['discount_offered']
const OUTCOME_COLS    = ['purchased', 'revenue']
const CONFOUNDER_COLS = ['age_group','past_purchases','avg_order_value','website_visits','customer_segment']

// ── Pure budget-optimisation logic (client-side SciPy-equivalent greedy knapsack) ──
function optimiseBudget({ budget, discountAmount, causalResults }) {
  const policies = causalResults?.policy_comparison?.policies || []
  const segments = causalResults?.segment_breakdown || []
  const dmlAte   = causalResults?.dml_estimates?.mean_ate || 0.1947

  const maxTargets = Math.floor(budget / (discountAmount || 10))

  // Build allocation rows: one per segment, sorted by CATE descending (greedy knapsack)
  const avgRevPerConversion = 40.0 // assumed avg basket value

  const rows = segments
    .map(seg => ({
      segment: seg.customer_segment,
      population: seg.count,
      meanCate: seg.mean,
      cateStd: seg.std,
      priorityScore: seg.mean,  // greedy: allocate to highest CATE first
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)

  let remaining = maxTargets
  let totalSpend = 0
  let totalConversions = 0
  let totalRevenue = 0

  const allocationRows = rows.map(row => {
    const eligible   = Math.round(row.population * 0.6) // assume 60% opted-in
    const allocated  = Math.min(eligible, remaining)
    const spend      = allocated * (discountAmount || 10)
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

  // Policy comparison (causal vs random vs blanket)
  const causalInc    = totalConversions
  const randomInc    = maxTargets * dmlAte
  const randomRev    = randomInc * avgRevPerConversion
  const causalRev    = totalRevenue
  const gain         = causalInc - randomInc

  return {
    allocationRows,
    summary: {
      budget,
      maxTargets,
      totalSpend: Math.round(totalSpend),
      totalConversions: totalConversions.toFixed(1),
      totalRevenue:     totalRevenue.toFixed(0),
      roi:              totalSpend > 0 ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(1) : '0',
      causalGainVsRandom: gain.toFixed(1),
      causalGainPct:      randomInc > 0 ? ((gain / randomInc) * 100).toFixed(1) : '0',
      randomInc:          randomInc.toFixed(1),
      randomRev:          randomRev.toFixed(0),
    },
    policies: [
      { name: 'Causal DML Targeting', spend: Math.round(totalSpend), inc: +causalInc.toFixed(1), rev: +causalRev.toFixed(0), roi: +((causalRev - totalSpend)/totalSpend*100).toFixed(1), color: '#2563EB' },
      { name: 'Random Targeting',     spend: Math.round(maxTargets * discountAmount), inc: +randomInc.toFixed(1), rev: +randomRev.toFixed(0), roi: +((randomRev - maxTargets*discountAmount)/(maxTargets*discountAmount)*100).toFixed(1), color: '#F59E0B' },
      { name: 'No Campaign',          spend: 0, inc: 0, rev: 0, roi: 0, color: '#94A3B8' },
    ],
  }
}

export default function BudgetPage() {
  const [budget, setBudget]           = useState(50000)
  const [currency, setCurrency]       = useState('INR')
  const [discountAmount, setDiscountAmount] = useState(100)
  const [treatment, setTreatment]     = useState('discount_offered')
  const [outcome, setOutcome]         = useState('purchased')
  const [confounders, setConfounders] = useState([...CONFOUNDER_COLS])
  const [saved, setSaved]             = useState(false)
  const [causalResults, setCausalResults] = useState(null)
  const [metricView, setMetricView]   = useState('conversions')

  const currencySymbol = currency === 'INR' ? '₹' : '£'

  useEffect(() => {
    // Load saved config
    api.getBudgetConfig().then(cfg => {
      if (cfg) {
        if (cfg.budget)         setBudget(cfg.budget)
        if (cfg.currency)       setCurrency(cfg.currency)
        if (cfg.discount_amount) setDiscountAmount(cfg.discount_amount)
        if (cfg.treatment_col)  setTreatment(cfg.treatment_col)
        if (cfg.outcome_col)    setOutcome(cfg.outcome_col)
        if (cfg.covariates)     setConfounders(cfg.covariates)
      }
    })
    // Load causal results for optimisation
    api.getCausalResults().then(r => setCausalResults(r)).catch(() => {})
  }, [])

  function handleConfoundToggle(col) {
    setConfounders(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    await api.saveBudgetConfig({ budget, currency, discount_amount: discountAmount, treatment_col: treatment, outcome_col: outcome, covariates: confounders })
    setSaved(true)
  }

  // Run optimisation whenever budget/discount changes
  const optResult = useMemo(() => optimiseBudget({ budget, discountAmount, causalResults }), [budget, discountAmount, causalResults])

  const seg = causalResults?.segment_breakdown || []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget Config & Optimisation</h1>
          <p className="page-subtitle" style={{ color: '#64748B', marginTop: '4px' }}>
            Campaign configuration · Greedy causal allocation · Policy comparison
          </p>
        </div>
        <span className="badge badge-green">Optimiser Active</span>
      </div>

      {/* ── Configuration Form ────────────────────────────────────────── */}
      <SectionCard title="Campaign Configuration">
        <form onSubmit={handleSave} className="config-form" aria-label="Campaign configuration form">
          <fieldset>
            <legend>Currency &amp; Spend Settings</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label htmlFor="currency-select" className="form-label">Currency</label>
                <select id="currency-select" value={currency}
                  onChange={e => { setCurrency(e.target.value); setSaved(false) }} className="form-select">
                  <option value="INR">₹ INR (Indian Rupee)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                </select>
              </div>
              <div>
                <label htmlFor="budget-input" className="form-label">Total promotional budget ({currencySymbol})</label>
                <div className="input-row">
                  <span className="input-prefix">{currencySymbol}</span>
                  <input id="budget-input" type="number" min={0} step={100} value={budget}
                    onChange={e => { setBudget(Number(e.target.value)); setSaved(false) }}
                    className="form-input" aria-describedby="budget-hint" />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="discount-input" className="form-label">
                Cost per discount ({currencySymbol})
                <span className="form-hint">Unit cost of each promotional discount offered.</span>
              </label>
              <div className="input-row">
                <span className="input-prefix">{currencySymbol}</span>
                <input id="discount-input" type="number" min={1} step={5} value={discountAmount}
                  onChange={e => { setDiscountAmount(Number(e.target.value)); setSaved(false) }}
                  className="form-input" style={{ maxWidth: '160px' }} />
              </div>
            </div>
            <div className="budget-display" id="budget-hint" aria-live="polite">
              Active Budget: <strong>{currencySymbol}{budget.toLocaleString()}</strong> — Targeting capacity: ~<strong>{Math.floor(budget / (discountAmount || 1)).toLocaleString()}</strong> discounts at {currencySymbol}{discountAmount} each
            </div>
          </fieldset>

          <fieldset>
            <legend>Treatment Variable</legend>
            <label htmlFor="treatment-select" className="form-label">
              Treatment column
              <span className="form-hint">The binary variable indicating whether a discount was offered.</span>
            </label>
            <select id="treatment-select" value={treatment}
              onChange={e => { setTreatment(e.target.value); setSaved(false) }} className="form-select">
              {TREATMENT_COLS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend>Outcome Variable</legend>
            <label htmlFor="outcome-select" className="form-label">
              Outcome column
              <span className="form-hint">The target variable whose change we wish to estimate.</span>
            </label>
            <select id="outcome-select" value={outcome}
              onChange={e => { setOutcome(e.target.value); setSaved(false) }} className="form-select">
              {OUTCOME_COLS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend>Adjustment Set (Confounders)</legend>
            <p className="form-hint" style={{marginBottom:'10px'}}>
              Select pre-treatment variables to include in the causal adjustment set.
            </p>
            <div className="checkbox-group" role="group" aria-label="Confounder selection">
              {CONFOUNDER_COLS.map(col => (
                <label key={col} className="checkbox-label">
                  <input type="checkbox" checked={confounders.includes(col)}
                    onChange={() => handleConfoundToggle(col)}
                    aria-label={`Include ${col} in adjustment set`} />
                  <code>{col}</code>
                </label>
              ))}
            </div>
            {confounders.length === 0 && (
              <div className="notice-banner notice-banner--warning" style={{marginTop:'8px'}}>
                <span>⚠️</span><span>At least one confounder is required for causal adjustment.</span>
              </div>
            )}
          </fieldset>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={confounders.length === 0}>
              Save Configuration
            </button>
            {saved && <span className="save-confirm" role="status" aria-live="polite">✅ Configuration saved</span>}
          </div>
        </form>
      </SectionCard>

      {/* ── Optimisation KPI Cards ─────────────────────────────────────── */}
      <SectionCard title="Budget Optimisation Results" badge="Causal Greedy Allocation">
        <div className="stat-grid">
          <StatCard label="Total Budget" value={`${currencySymbol}${budget.toLocaleString()}`} icon="💰" color="blue" />
          <StatCard label="Max. Discount Offers" value={Math.floor(budget / (discountAmount || 1)).toLocaleString()} icon="🎯" color="orange"
            sub={`At ${currencySymbol}${discountAmount} per offer`} />
          <StatCard label="Causal Incremental Conversions" value={`+${optResult.summary.totalConversions}`} icon="📈" color="green"
            sub="DML-ranked targeting" />
          <StatCard label="Gain vs Random" value={`+${optResult.summary.causalGainVsRandom} conv (+${optResult.summary.causalGainPct}%)`}
            icon="⚗️" color="blue" sub="Causal efficiency uplift" />
        </div>

        {/* ── Policy Comparison Chart ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
              {['conversions','revenue','roi'].map(m => (
                <button key={m} type="button"
                  onClick={() => setMetricView(m)}
                  style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 500,
                    backgroundColor: metricView === m ? '#2563EB' : '#FFFFFF', color: metricView === m ? '#FFFFFF' : '#334155' }}>
                  {m === 'conversions' ? 'Conversions' : m === 'revenue' ? `Revenue` : 'ROI (%)'}
                </button>
              ))}
            </div>
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
                title: { text: `<b>Policy Comparison (${metricView === 'conversions' ? 'Incremental Conversions' : metricView === 'revenue' ? 'Revenue' : 'ROI %'})</b>`, font: { size: 13 }, x: 0.02 },
                height: 300, autosize: true, margin: { l: 50, r: 20, t: 45, b: 60 },
                xaxis: { tickangle: -10, gridcolor: '#E2E8F0' },
                yaxis: { gridcolor: '#E2E8F0', zeroline: true, zerolinecolor: '#94A3B8' },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%' }}
            />
          </div>

          {/* CATE by Segment Bar */}
          <div>
            <Plot
              data={[{
                x: seg.map(s => s.customer_segment),
                y: seg.map(s => +(s.mean * 100).toFixed(2)),
                error_y: { type: 'data', array: seg.map(s => +(s.std * 100).toFixed(2)), visible: true, color: '#94A3B8' },
                type: 'bar',
                marker: { color: ['#2563EB','#F59E0B','#7C3AED','#059669'] },
                text: seg.map(s => `+${(s.mean * 100).toFixed(1)} pp`),
                textposition: 'auto',
                hovertemplate: '%{x}<br>Mean CATE: +%{y:.2f} pp<extra></extra>',
              }]}
              layout={{
                title: { text: '<b>Mean CATE by Customer Segment</b>', font: { size: 13 }, x: 0.02 },
                height: 300, autosize: true, margin: { l: 50, r: 20, t: 45, b: 50 },
                xaxis: { gridcolor: '#E2E8F0' },
                yaxis: { title: 'Mean CATE (pp)', ticksuffix: ' pp', gridcolor: '#E2E8F0' },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                showlegend: false,
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* ── Allocation Table ─────────────────────────────────────────── */}
        <h3 className="sub-heading" style={{ marginBottom: '12px' }}>
          Recommended Allocation Table
          <span className="badge badge-blue" style={{ marginLeft: '10px' }}>Greedy DML Ranking</span>
        </h3>
        <div className="table-wrapper">
          <table className="data-table" aria-label="Budget allocation table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Segment</th>
                <th>Population</th>
                <th>Eligible</th>
                <th>Allocated</th>
                <th>Spend ({currencySymbol})</th>
                <th>Mean CATE</th>
                <th>Inc. Conversions</th>
                <th>Inc. Revenue ({currencySymbol})</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {optResult.allocationRows.map((row, idx) => (
                <tr key={row.segment} style={{ backgroundColor: idx === 0 ? '#EFF6FF' : idx % 2 === 0 ? '#F8FAFC' : '#FFF' }}>
                  <td style={{ fontWeight: 700, color: '#2563EB' }}>#{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{row.segment}</td>
                  <td>{row.population.toLocaleString()}</td>
                  <td>{row.eligible.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.allocated.toLocaleString()}</td>
                  <td>{currencySymbol}{row.spend.toLocaleString()}</td>
                  <td><span className="badge badge-blue">+{(row.meanCate * 100).toFixed(2)} pp</span></td>
                  <td style={{ color: '#16A34A', fontWeight: 600 }}>+{row.incrementalConv.toFixed(1)}</td>
                  <td>{currencySymbol}{Math.round(row.incrementalRev).toLocaleString()}</td>
                  <td>
                    <span style={{ color: row.roi >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                      {row.roi >= 0 ? '+' : ''}{row.roi.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #CBD5E1', backgroundColor: '#F1F5F9', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: '10px 8px' }}>Total</td>
                <td>{optResult.allocationRows.reduce((s, r) => s + r.allocated, 0).toLocaleString()}</td>
                <td>{currencySymbol}{optResult.summary.totalSpend.toLocaleString()}</td>
                <td>—</td>
                <td style={{ color: '#16A34A' }}>+{optResult.summary.totalConversions}</td>
                <td>{currencySymbol}{Number(optResult.summary.totalRevenue).toLocaleString()}</td>
                <td style={{ color: optResult.summary.roi >= 0 ? '#16A34A' : '#DC2626' }}>
                  {optResult.summary.roi >= 0 ? '+' : ''}{optResult.summary.roi}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      {/* ── Saved Config Summary ─────────────────────────────────────────── */}
      {saved && (
        <SectionCard title="Active Configuration">
          <dl className="config-summary">
            <div><dt>Budget</dt><dd>{currencySymbol}{budget.toLocaleString()}</dd></div>
            <div><dt>Discount Amount</dt><dd>{currencySymbol}{discountAmount}</dd></div>
            <div><dt>Treatment</dt><dd><code>{treatment}</code></dd></div>
            <div><dt>Outcome</dt><dd><code>{outcome}</code></dd></div>
            <div>
              <dt>Confounders ({confounders.length})</dt>
              <dd>{confounders.map(c => <span key={c} className="badge badge-orange" style={{marginRight:'4px'}}>{c}</span>)}</dd>
            </div>
          </dl>
        </SectionCard>
      )}
    </div>
  )
}
