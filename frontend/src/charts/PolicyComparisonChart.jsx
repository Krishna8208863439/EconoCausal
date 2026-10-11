import React, { useState } from 'react'
import Plot from 'react-plotly.js'

/**
 * PolicyComparisonChart
 * Compares marketing policies across incremental conversions, revenue, spend, and ROI.
 */
export default function PolicyComparisonChart({
  policies = [
    { name: 'Causal DML Targeting', targeted_customers: 500, spend: 5000, incremental_conversions: 104.5, incremental_revenue: 4180, roi_percent: -16.4, mean_ite: 0.209 },
    { name: 'Random Targeting', targeted_customers: 500, spend: 5000, incremental_conversions: 97.4, incremental_revenue: 3894, roi_percent: -22.1, mean_ite: 0.195 },
    { name: 'Blanket Discount (All)', targeted_customers: 2200, spend: 22000, incremental_conversions: 428.4, incremental_revenue: 17136, roi_percent: -22.1, mean_ite: 0.195 },
    { name: 'No Discount (Baseline)', targeted_customers: 0, spend: 0, incremental_conversions: 0, incremental_revenue: 0, roi_percent: 0, mean_ite: 0 },
  ],
  budget = 5000,
}) {
  const [metric, setMetric] = useState('conversions') // 'conversions' | 'revenue' | 'roi'

  const names = policies.map(p => p.name)
  let yVals = []
  let yTitle = ''
  let hoverSuffix = ''

  if (metric === 'conversions') {
    yVals = policies.map(p => p.incremental_conversions)
    yTitle = 'Incremental Conversions'
    hoverSuffix = ' buyers'
  } else if (metric === 'revenue') {
    yVals = policies.map(p => p.incremental_revenue)
    yTitle = 'Incremental Revenue (£)'
    hoverSuffix = ' £'
  } else {
    yVals = policies.map(p => p.roi_percent)
    yTitle = 'Campaign ROI (%)'
    hoverSuffix = '%'
  }

  const colors = ['#2563EB', '#F59E0B', '#7C3AED', '#94A3B8']

  const data = [
    {
      x: names,
      y: yVals,
      type: 'bar',
      marker: {
        color: colors,
      },
      text: yVals.map(v => (metric === 'roi' ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : metric === 'revenue' ? `£${v.toLocaleString()}` : `+${v.toFixed(1)}`)),
      textposition: 'auto',
      hovertemplate: '%{x}<br>' + yTitle + ': %{text}<extra></extra>',
    },
  ]

  const layout = {
    title: {
      text: `<b>Policy Evaluation (Campaign Budget: £${budget.toLocaleString()})</b>`,
      font: { size: 14, color: '#0F172A' },
      x: 0.05,
    },
    autosize: true,
    height: 380,
    margin: { l: 55, r: 25, t: 60, b: 65 },
    xaxis: {
      tickangle: -15,
      gridcolor: '#E2E8F0',
    },
    yaxis: {
      title: yTitle,
      gridcolor: '#E2E8F0',
      zeroline: true,
      zerolinecolor: '#94A3B8',
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  }

  const config = {
    responsive: true,
    displayModeBar: false,
  }

  return (
    <div className="policy-chart-wrapper" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '8px' }}>
        <button
          type="button"
          className={`btn-filter ${metric === 'conversions' ? 'active' : ''}`}
          onClick={() => setMetric('conversions')}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #CBD5E1',
            backgroundColor: metric === 'conversions' ? '#2563EB' : '#FFFFFF',
            color: metric === 'conversions' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Conversions
        </button>
        <button
          type="button"
          className={`btn-filter ${metric === 'revenue' ? 'active' : ''}`}
          onClick={() => setMetric('revenue')}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #CBD5E1',
            backgroundColor: metric === 'revenue' ? '#2563EB' : '#FFFFFF',
            color: metric === 'revenue' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Revenue (£)
        </button>
        <button
          type="button"
          className={`btn-filter ${metric === 'roi' ? 'active' : ''}`}
          onClick={() => setMetric('roi')}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #CBD5E1',
            backgroundColor: metric === 'roi' ? '#2563EB' : '#FFFFFF',
            color: metric === 'roi' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          ROI (%)
        </button>
      </div>
      <div className="chart-container" style={{ width: '100%', minHeight: '380px' }}>
        <Plot data={data} layout={layout} config={config} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
