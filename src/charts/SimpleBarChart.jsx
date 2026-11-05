import React from 'react'

/**
 * SimpleBarChart
 * Lightweight SVG bar chart supporting error bars, custom colors, and annotations.
 */
export default function SimpleBarChart({
  categories = [],
  values = [],
  colors = [],
  errorBars = [],
  valueLabels = [],
  title = '',
  yTitle = '',
  ySuffix = '',
  height = 300,
}) {
  const maxVal = Math.max(...values.map((v, i) => v + (errorBars[i] || 0)), 1) * 1.15

  const svgWidth = 680
  const svgHeight = height
  const margin = { top: 35, right: 25, bottom: 50, left: 55 }
  const plotWidth = svgWidth - margin.left - margin.right
  const plotHeight = svgHeight - margin.top - margin.bottom

  const n = Math.max(1, categories.length)
  const barGap = 16
  const barWidth = Math.max(8, (plotWidth - (n - 1) * barGap) / n)

  const scaleY = (v) => margin.top + plotHeight - (Math.max(0, v) / maxVal) * plotHeight

  return (
    <div style={{ width: '100%', background: '#FFFFFF', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0' }}>
      {title && (
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '8px' }}>
          {title}
        </div>
      )}

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Y grid lines */}
          {[0, 0.33, 0.66, 1.0].map(frac => {
            const val = maxVal * frac
            const y = scaleY(val)
            return (
              <g key={frac}>
                <line x1={margin.left} y1={y} x2={margin.left + plotWidth} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                  {val.toFixed(0)}{ySuffix}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {categories.map((cat, i) => {
            const val = values[i] ?? 0
            const bx = margin.left + i * (barWidth + barGap)
            const by = scaleY(val)
            const bh = margin.top + plotHeight - by
            const color = colors[i] || '#2563EB'
            const err = errorBars[i] || 0
            const label = valueLabels[i] ?? `${val.toFixed(1)}${ySuffix}`

            return (
              <g key={cat}>
                {/* Bar */}
                <rect x={bx} y={by} width={barWidth} height={Math.max(2, bh)} rx="3" fill={color} opacity="0.85" />

                {/* Value on top */}
                <text x={bx + barWidth / 2} y={by - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">
                  {label}
                </text>

                {/* Error bar if provided */}
                {err > 0 && (
                  <g>
                    <line
                      x1={bx + barWidth / 2}
                      y1={scaleY(val - err)}
                      x2={bx + barWidth / 2}
                      y2={scaleY(val + err)}
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={bx + barWidth / 2 - 4}
                      y1={scaleY(val + err)}
                      x2={bx + barWidth / 2 + 4}
                      y2={scaleY(val + err)}
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={bx + barWidth / 2 - 4}
                      y1={scaleY(val - err)}
                      x2={bx + barWidth / 2 + 4}
                      y2={scaleY(val - err)}
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* X Label */}
                <text x={bx + barWidth / 2} y={margin.top + plotHeight + 18} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#475569">
                  {cat}
                </text>
              </g>
            )
          })}

          {yTitle && (
            <text
              x={-(margin.top + plotHeight / 2)}
              y={14}
              transform="rotate(-90)"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="600"
              fill="#64748B"
            >
              {yTitle}
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
