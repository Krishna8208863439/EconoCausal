/**
 * frontend/src/charts/BudgetAllocationChart.jsx
 * ==============================================
 * EconoCausal — Week 3
 * Donut + bar chart showing budget utilisation and customer allocation breakdown.
 */

import React from 'react'
import Plot from 'react-plotly.js'

export default function BudgetAllocationChart({ summary, currency = '₹' }) {
  if (!summary) return null

  const {
    total_budget = 0,
    actual_spend = 0,
    remaining_budget = 0,
    n_selected_customers = 0,
    n_eligible_customers = 0,
    n_total_customers = 0,
  } = summary

  const n_not_selected = n_eligible_customers - n_selected_customers
  const n_ineligible   = n_total_customers - n_eligible_customers

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {/* ── Budget utilisation donut ─────────────────────────────────────── */}
      <Plot
        data={[{
          type: 'pie',
          values: [actual_spend, remaining_budget],
          labels: ['Planned Spend', 'Remaining Budget'],
          hole: 0.58,
          marker: { colors: ['#2563EB', '#E2E8F0'] },
          textinfo: 'label+percent',
          hovertemplate: '%{label}<br>%{customdata}<extra></extra>',
          customdata: [
            `${currency}${actual_spend.toLocaleString()}`,
            `${currency}${remaining_budget.toLocaleString()}`,
          ],
          textfont: { size: 11 },
        }]}
        layout={{
          title: { text: '<b>Budget Utilisation</b>', font: { size: 13 }, x: 0.5 },
          annotations: [{
            text: `<b>${currency}${actual_spend.toLocaleString()}</b><br><span style="font-size:10px">of ${currency}${total_budget.toLocaleString()}</span>`,
            showarrow: false, x: 0.5, y: 0.5, xref: 'paper', yref: 'paper',
            font: { size: 12 },
          }],
          height: 270, margin: { l: 20, r: 20, t: 45, b: 20 },
          showlegend: true,
          legend: { orientation: 'h', y: -0.05 },
          paper_bgcolor: 'transparent',
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />

      {/* ── Customer allocation stacked bar ─────────────────────────────── */}
      <Plot
        data={[
          {
            name: 'Selected',
            x: ['Customers'],
            y: [n_selected_customers],
            type: 'bar',
            marker: { color: '#2563EB' },
            hovertemplate: 'Selected: %{y}<extra></extra>',
          },
          {
            name: 'Eligible, not selected',
            x: ['Customers'],
            y: [n_not_selected],
            type: 'bar',
            marker: { color: '#FCD34D' },
            hovertemplate: 'Eligible, not selected: %{y}<extra></extra>',
          },
          {
            name: 'Ineligible',
            x: ['Customers'],
            y: [n_ineligible],
            type: 'bar',
            marker: { color: '#E2E8F0' },
            hovertemplate: 'Ineligible: %{y}<extra></extra>',
          },
        ]}
        layout={{
          barmode: 'stack',
          title: { text: '<b>Customer Allocation Breakdown</b>', font: { size: 13 }, x: 0.5 },
          height: 270, margin: { l: 45, r: 20, t: 45, b: 40 },
          yaxis: { title: 'Customers', gridcolor: '#E2E8F0' },
          xaxis: { visible: false },
          legend: { orientation: 'h', y: -0.12 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
