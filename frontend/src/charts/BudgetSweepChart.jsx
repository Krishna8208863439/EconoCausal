import React from 'react'
import Plot from 'react-plotly.js'

/**
 * BudgetSweepChart
 * Day 2 Requirement: Visualizes the budget sweep across 5-8 budgets,
 * plotting budget capacity vs actual spend, net incremental margin, and customer count.
 */
export default function BudgetSweepChart({ sweepData = [] }) {
  if (!sweepData || sweepData.length === 0) {
    return (
      <div className="loading-box" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
        Awaiting Budget Sweep data...
      </div>
    )
  }

  const budgets = sweepData.map(d => `₹${Number(d.budget).toLocaleString()}`)
  const margins = sweepData.map(d => d.incremental_margin)
  const orders = sweepData.map(d => d.incremental_purchases)
  const spends = sweepData.map(d => d.actual_spend)

  return (
    <div style={{ width: '100%', minHeight: '340px' }}>
      <Plot
        data={[
          {
            x: budgets,
            y: margins,
            type: 'bar',
            name: 'Net Incr. Margin (₹)',
            marker: { color: '#2563EB', opacity: 0.85 },
            yaxis: 'y1',
            hovertemplate: 'Budget: %{x}<br>Net Margin: ₹%{y:,.2f}<extra></extra>',
          },
          {
            x: budgets,
            y: orders,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Incremental Orders',
            marker: { color: '#10B981', size: 8 },
            line: { color: '#10B981', width: 3 },
            yaxis: 'y2',
            hovertemplate: 'Budget: %{x}<br>Orders Lift: +%{y:.1f}<extra></extra>',
          },
          {
            x: budgets,
            y: spends,
            type: 'scatter',
            mode: 'lines',
            name: 'Actual Spend (₹)',
            line: { color: '#F59E0B', width: 2, dash: 'dot' },
            yaxis: 'y1',
            hovertemplate: 'Budget: %{x}<br>Spend: ₹%{y:,.0f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 340,
          margin: { l: 60, r: 50, t: 30, b: 60 },
          legend: { orientation: 'h', y: 1.15, x: 0.1 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          xaxis: {
            title: { text: 'Promotional Budget Ceiling (₹)', font: { size: 12, color: '#64748B' } },
            tickfont: { size: 11, color: '#475569' },
            gridcolor: '#F1F5F9',
          },
          yaxis: {
            title: { text: 'Net Incremental Margin (₹)', font: { size: 12, color: '#2563EB' } },
            tickfont: { size: 11, color: '#2563EB' },
            gridcolor: '#E2E8F0',
          },
          yaxis2: {
            title: { text: 'Incremental Orders', font: { size: 12, color: '#10B981' } },
            tickfont: { size: 11, color: '#10B981' },
            overlaying: 'y',
            side: 'right',
            gridcolor: 'transparent',
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
