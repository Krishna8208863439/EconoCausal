/**
 * frontend/src/charts/PolicyComparisonChart.jsx  (Week 3 update)
 * ================================================================
 * EconoCausal — Week 3: Policy Comparison Chart
 * Compares No-Discount / Random / Blanket / Causal DML policies
 * across incremental conversions and incremental contribution.
 *
 * Replaces the Week 2 version which used segment-level greedy results.
 * Data now comes from the actual MILP optimiser baselines.
 */

import React, { useState } from 'react'
import Plot from 'react-plotly.js'

const METRIC_LABELS = {
  estimated_incremental_conversions:   { label: 'Incremental Conversions', unit: 'conversions', prefix: '+' },
  estimated_incremental_contribution:  { label: 'Incremental Contribution (₹)', unit: '₹', prefix: '₹' },
  actual_spend:                        { label: 'Planned Spend (₹)', unit: '₹', prefix: '₹' },
}

const COLORS = {
  'No-Discount Policy':                           '#94A3B8',
  'Random Targeting (same budget)':               '#F59E0B',
  'Blanket-Discount Policy (all eligible, budget-capped)': '#7C3AED',
  'Causal DML Targeting (MILP Optimal)':          '#2563EB',
}

function shortName(name) {
  if (name.includes('No-Discount'))  return 'No Discount'
  if (name.includes('Random'))       return 'Random'
  if (name.includes('Blanket'))      return 'Blanket'
  if (name.includes('Causal'))       return 'Causal DML'
  return name
}

export default function PolicyComparisonChart({ baselines = [] }) {
  const [metric, setMetric] = useState('estimated_incremental_conversions')

  if (!baselines.length) {
    return (
      <div className="loading-box">
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</div>
        <div style={{ fontWeight: 600 }}>Awaiting Optimisation Results</div>
        <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Run the optimiser to see policy comparison.</div>
      </div>
    )
  }

  const metaInfo = METRIC_LABELS[metric]
  const xLabels  = baselines.map(b => shortName(b.name))
  const yValues  = baselines.map(b => b[metric] ?? 0)
  const colors   = baselines.map(b => COLORS[b.name] || '#64748B')
  const textVals = baselines.map(b => {
    const v = b[metric] ?? 0
    return metaInfo.prefix === '₹'
      ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : `+${Number(v).toFixed(2)}`
  })

  return (
    <div>
      {/* Metric toggle */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
        {Object.entries(METRIC_LABELS).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            style={{
              padding: '4px 12px', fontSize: '12px', borderRadius: '4px',
              border: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 500,
              backgroundColor: metric === key ? '#2563EB' : '#FFFFFF',
              color: metric === key ? '#FFFFFF' : '#334155',
            }}
          >
            {meta.label.replace(' (₹)', '').replace('Incremental ', '')}
          </button>
        ))}
      </div>

      <Plot
        data={[{
          x: xLabels,
          y: yValues,
          type: 'bar',
          marker: { color: colors },
          text: textVals,
          textposition: 'auto',
          hovertemplate: '%{x}<br>' + metaInfo.label + ': %{text}<extra></extra>',
        }]}
        layout={{
          title: {
            text: `<b>Policy Comparison — ${metaInfo.label}</b>`,
            font: { size: 13 },
            x: 0.02,
          },
          height: 320, autosize: true,
          margin: { l: 55, r: 20, t: 48, b: 55 },
          xaxis: { tickangle: -5, gridcolor: '#E2E8F0' },
          yaxis: {
            title: metaInfo.label,
            tickprefix: metaInfo.prefix === '₹' ? '₹' : '',
            gridcolor: '#E2E8F0',
            zeroline: true, zerolinecolor: '#94A3B8',
          },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          annotations: [{
            x: shortName(baselines.find(b => b.name.includes('Causal'))?.name || ''),
            y: baselines.find(b => b.name.includes('Causal'))?.[metric] ?? 0,
            xref: 'x', yref: 'y',
            text: '⭐ Optimal',
            showarrow: true, arrowhead: 2,
            ax: 0, ay: -35,
            font: { size: 11, color: '#2563EB' },
          }],
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />

      {/* Assumptions note */}
      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '8px' }}>
        ⚠️ <em>Model-based estimates (DML causal forest). Not observed revenue. Comparison uses same eligible population, discount amount, and budget for all policies.</em>
      </div>
    </div>
  )
}
