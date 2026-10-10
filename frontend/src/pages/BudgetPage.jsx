import React, { useState } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import PlannedFeature from '../components/PlannedFeature.jsx'
import './Page.css'

const TREATMENT_COLS = ['discount_offered']
const OUTCOME_COLS   = ['purchased', 'revenue']
const CONFOUNDER_COLS = ['age_group','past_purchases','avg_order_value','website_visits','customer_segment']

export default function BudgetPage() {
  const [budget, setBudget]         = useState(5000)
  const [treatment, setTreatment]   = useState('discount_offered')
  const [outcome, setOutcome]       = useState('purchased')
  const [confounders, setConfounders] = useState([...CONFOUNDER_COLS])
  const [saved, setSaved]           = useState(false)

  function handleConfoundToggle(col) {
    setConfounders(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
    setSaved(false)
  }

  function handleSave(e) {
    e.preventDefault()
    setSaved(true)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Budget &amp; Configuration</h1>

      </div>

      <SectionCard title="Campaign Configuration">
        <form onSubmit={handleSave} className="config-form" aria-label="Campaign configuration form">

          <fieldset>
            <legend>Budget</legend>
            <label htmlFor="budget-input" className="form-label">
              Total promotional budget (£)
              <span className="form-hint">Maximum spend across all discount offers in this campaign.</span>
            </label>
            <div className="input-row">
              <span className="input-prefix">£</span>
              <input
                id="budget-input"
                type="number"
                min={0}
                step={100}
                value={budget}
                onChange={e => { setBudget(Number(e.target.value)); setSaved(false) }}
                className="form-input"
                aria-describedby="budget-hint"
              />
            </div>
            <div className="budget-display" id="budget-hint" aria-live="polite">
              Budget: <strong>£{budget.toLocaleString()}</strong>
            </div>
          </fieldset>

          <fieldset>
            <legend>Treatment Variable</legend>
            <label htmlFor="treatment-select" className="form-label">
              Treatment column
              <span className="form-hint">The binary variable indicating whether a discount was offered.</span>
            </label>
            <select
              id="treatment-select"
              value={treatment}
              onChange={e => { setTreatment(e.target.value); setSaved(false) }}
              className="form-select"
            >
              {TREATMENT_COLS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend>Outcome Variable</legend>
            <label htmlFor="outcome-select" className="form-label">
              Outcome column
              <span className="form-hint">The target variable whose change we wish to estimate.</span>
            </label>
            <select
              id="outcome-select"
              value={outcome}
              onChange={e => { setOutcome(e.target.value); setSaved(false) }}
              className="form-select"
            >
              {OUTCOME_COLS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend>Adjustment Set (Confounders)</legend>
            <p className="form-hint" style={{marginBottom:'10px'}}>
              Select pre-treatment variables to include in the causal adjustment set.
              Identifiers and post-treatment variables are excluded by design.
            </p>
            <div className="checkbox-group" role="group" aria-label="Confounder selection">
              {CONFOUNDER_COLS.map(col => (
                <label key={col} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={confounders.includes(col)}
                    onChange={() => handleConfoundToggle(col)}
                    aria-label={`Include ${col} in adjustment set`}
                  />
                  <code>{col}</code>
                </label>
              ))}
            </div>
            {confounders.length === 0 && (
              <div className="notice-banner notice-banner--warning" style={{marginTop:'8px'}}>
                <span>⚠️</span>
                <span>At least one confounder is required for causal adjustment.</span>
              </div>
            )}
          </fieldset>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={confounders.length === 0}
            >
              Save Configuration
            </button>
            {saved && (
              <span className="save-confirm" role="status" aria-live="polite">
                ✅ Configuration saved
              </span>
            )}
          </div>
        </form>
      </SectionCard>

      {saved && (
        <SectionCard title="Active Configuration">
          <dl className="config-summary">
            <div><dt>Budget</dt><dd>£{budget.toLocaleString()}</dd></div>
            <div><dt>Treatment</dt><dd><code>{treatment}</code></dd></div>
            <div><dt>Outcome</dt><dd><code>{outcome}</code></dd></div>
            <div><dt>Confounders ({confounders.length})</dt>
                 <dd>{confounders.map(c => <span key={c} className="badge badge-orange" style={{marginRight:'4px'}}>{c}</span>)}</dd>
            </div>
          </dl>
        </SectionCard>
      )}

      <SectionCard title="Optimisation — Planned">
        <PlannedFeature
          week={3}
          feature="Budget Allocation Optimiser"
          description="Uses SciPy constrained optimisation to allocate the promotional budget across customers based on estimated CATE values from Week 2. Maximises incremental conversions or contribution margin under the configured budget."
        />
        <PlannedFeature
          week={3}
          feature="Allocation Results Table"
          description="Recommended customer list with assigned discount, estimated treatment effect, expected spend, and predicted incremental revenue."
        />
      </SectionCard>
    </div>
  )
}
