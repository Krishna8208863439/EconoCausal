import React from 'react'

/**
 * BudgetAllocationChart
 * Donut + stacked bar chart showing budget utilisation and customer allocation breakdown.
 */
export default function BudgetAllocationChart({ summary, currency = '₹' }) {
  if (!summary) return null

  const {
    total_budget = 5000,
    actual_spend = 5000,
    remaining_budget = 0,
    n_selected_customers = 500,
    n_eligible_customers = 1420,
    n_total_customers = 2200,
  } = summary

  const n_not_selected = Math.max(0, n_eligible_customers - n_selected_customers)
  const n_ineligible   = Math.max(0, n_total_customers - n_eligible_customers)

  // Donut calculations
  const spendPct = total_budget > 0 ? (actual_spend / total_budget) : 1
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - spendPct)

  // Stacked bar calculations
  const total = Math.max(1, n_total_customers)
  const selPct = (n_selected_customers / total) * 100
  const notSelPct = (n_not_selected / total) * 100
  const inelPct = (n_ineligible / total) * 100

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      {/* ── Budget utilisation donut ─────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '14px', alignSelf: 'flex-start' }}>
          Budget Utilisation
        </div>

        <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#E2E8F0"
              strokeWidth="20"
            />
            {/* Active spend ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#2563EB"
              strokeWidth="20"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              {currency}{actual_spend.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              of {currency}{total_budget.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: '#2563EB', fontWeight: 600, marginTop: '2px' }}>
              {(spendPct * 100).toFixed(1)}% spend
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: '#2563EB', borderRadius: '50%' }} />
            <span>Planned Spend: <strong>{currency}{actual_spend.toLocaleString()}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: '#E2E8F0', borderRadius: '50%' }} />
            <span>Remaining: <strong>{currency}{remaining_budget.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Customer allocation breakdown ─────────────────────────────── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '14px' }}>
          Customer Allocation Breakdown ({n_total_customers.toLocaleString()} total)
        </div>

        {/* Stacked bar visual */}
        <div style={{ width: '100%', height: '24px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
          <div
            title={`Selected: ${n_selected_customers}`}
            style={{ width: `${selPct}%`, background: '#2563EB', height: '100%', transition: 'width 0.4s' }}
          />
          <div
            title={`Eligible, not selected: ${n_not_selected}`}
            style={{ width: `${notSelPct}%`, background: '#FCD34D', height: '100%', transition: 'width 0.4s' }}
          />
          <div
            title={`Ineligible: ${n_ineligible}`}
            style={{ width: `${inelPct}%`, background: '#CBD5E1', height: '100%', transition: 'width 0.4s' }}
          />
        </div>

        {/* Breakdown Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#EFF6FF', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', background: '#2563EB', borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E40AF' }}>Selected for Discount</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
              {n_selected_customers.toLocaleString()} ({selPct.toFixed(1)}%)
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#FEF3C7', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', background: '#FCD34D', borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400E' }}>Eligible, Not Selected</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
              {n_not_selected.toLocaleString()} ({notSelPct.toFixed(1)}%)
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F1F5F9', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', background: '#CBD5E1', borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Ineligible (Low Elasticity / Negative ROI)</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              {n_ineligible.toLocaleString()} ({inelPct.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
