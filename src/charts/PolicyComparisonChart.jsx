import React, { useState } from 'react'

const METRIC_LABELS = {
  estimated_incremental_conversions:   { label: 'Incremental Conversions', unit: 'conversions', prefix: '+' },
  estimated_incremental_contribution:  { label: 'Incremental Contribution (₹)', unit: '₹', prefix: '₹' },
  actual_spend:                        { label: 'Planned Spend (₹)', unit: '₹', prefix: '₹' },
}

const COLORS = {
  'No-Discount Policy':                                    '#94A3B8',
  'Random Targeting (same budget)':                        '#F59E0B',
  'Blanket-Discount Policy (all eligible, budget-capped)':  '#7C3AED',
  'Causal DML Targeting (MILP Optimal)':                   '#2563EB',
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
      <div className="loading-box" style={{ padding: '30px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</div>
        <div style={{ fontWeight: 600 }}>Awaiting Optimisation Results</div>
        <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Run the optimiser to see policy comparison.</div>
      </div>
    )
  }

  const metaInfo = METRIC_LABELS[metric]
  const values = baselines.map(b => Number(b[metric] ?? 0))
  const maxVal = Math.max(...values, 1)

  const svgWidth = 720
  const svgHeight = 290
  const margin = { top: 35, right: 30, bottom: 50, left: 60 }
  const plotWidth = svgWidth - margin.left - margin.right
  const plotHeight = svgHeight - margin.top - margin.bottom

  const nBars = baselines.length
  const barGap = 20
  const barWidth = (plotWidth - (nBars - 1) * barGap) / nBars

  const scaleY = (v) => margin.top + plotHeight - (Math.max(0, v) / (maxVal * 1.15)) * plotHeight

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
      {/* Metric toggle & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
          Policy Comparison — {metaInfo.label}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.entries(METRIC_LABELS).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
                fontWeight: 600,
                backgroundColor: metric === key ? '#2563EB' : '#FFFFFF',
                color: metric === key ? '#FFFFFF' : '#334155',
                transition: 'all 0.15s ease',
              }}
            >
              {meta.label.replace(' (₹)', '').replace('Incremental ', '')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Baseline grid */}
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map(fraction => {
            const val = maxVal * fraction
            const y = scaleY(val)
            return (
              <g key={fraction}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                  {metaInfo.prefix === '₹' ? `₹${Math.round(val)}` : `+${val.toFixed(1)}`}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {baselines.map((b, i) => {
            const val = Number(b[metric] ?? 0)
            const x = margin.left + i * (barWidth + barGap)
            const y = scaleY(val)
            const h = margin.top + plotHeight - y
            const isCausal = b.name.includes('Causal')
            const color = COLORS[b.name] || '#64748B'

            const displayVal = metaInfo.prefix === '₹'
              ? `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
              : `+${Number(val).toFixed(2)}`

            return (
              <g key={i}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, h)}
                  rx="4"
                  fill={color}
                  opacity={isCausal ? 1 : 0.85}
                />

                {/* Value on top */}
                <text
                  x={x + barWidth / 2}
                  y={y - 7}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={isCausal ? '#2563EB' : '#334155'}
                >
                  {displayVal}
                </text>

                {/* Optimal annotation for Causal */}
                {isCausal && (
                  <g transform={`translate(${x + barWidth / 2}, ${y - 23})`}>
                    <rect x="-35" y="-10" width="70" height="18" rx="9" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1" />
                    <text x="0" y="2.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#2563EB">
                      ⭐ Optimal
                    </text>
                  </g>
                )}

                {/* X label */}
                <text
                  x={x + barWidth / 2}
                  y={margin.top + plotHeight + 20}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight={isCausal ? '700' : '500'}
                  fill={isCausal ? '#1E40AF' : '#475569'}
                >
                  {shortName(b.name)}
                </text>

                <text
                  x={x + barWidth / 2}
                  y={margin.top + plotHeight + 35}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#94A3B8"
                >
                  {b.n_selected} selected
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '10px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
        ⚠️ <em>Model-based estimates (DML causal forest). Comparison uses identical eligible cohort and spend ceiling for all policies.</em>
      </div>
    </div>
  )
}
