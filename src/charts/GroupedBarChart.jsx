import React, { useState } from 'react'

/**
 * GroupedBarChart
 * High-performance SVG grouped bar chart with hover tooltips and responsive layout.
 */
export default function GroupedBarChart({
  categories = [],
  series = [],
  title = '',
  yTitle = '',
  ySuffix = '%',
  height = 320,
}) {
  const [hoveredBar, setHoveredBar] = useState(null)

  const allValues = series.flatMap(s => s.values || [])
  const maxVal = Math.max(...allValues, 1) * 1.15

  const svgWidth = 680
  const svgHeight = height
  const margin = { top: 35, right: 25, bottom: 55, left: 55 }
  const plotWidth = svgWidth - margin.left - margin.right
  const plotHeight = svgHeight - margin.top - margin.bottom

  const nCat = Math.max(1, categories.length)
  const catWidth = plotWidth / nCat
  const nSeries = Math.max(1, series.length)
  const barGap = 4
  const groupPadding = Math.min(20, catWidth * 0.18)
  const availableGroupWidth = catWidth - groupPadding * 2
  const barWidth = Math.max(4, (availableGroupWidth - (nSeries - 1) * barGap) / nSeries)

  const scaleY = (v) => margin.top + plotHeight - (Math.max(0, v) / maxVal) * plotHeight

  return (
    <div style={{ width: '100%', background: '#FFFFFF', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0' }}>
      {/* Legend & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        {title && <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{title}</span>}
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
          {series.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: s.color, borderRadius: '2px', display: 'inline-block' }} />
              <span style={{ color: '#475569', fontWeight: 500 }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Y grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(fraction => {
            const val = maxVal * fraction
            const y = scaleY(val)
            return (
              <g key={fraction}>
                <line x1={margin.left} y1={y} x2={margin.left + plotWidth} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                  {val.toFixed(0)}{ySuffix}
                </text>
              </g>
            )
          })}

          {/* Grouped Bars */}
          {categories.map((cat, catIdx) => {
            const groupX = margin.left + catIdx * catWidth + groupPadding

            return (
              <g key={cat}>
                {series.map((s, seriesIdx) => {
                  const val = s.values[catIdx] ?? 0
                  const bx = groupX + seriesIdx * (barWidth + barGap)
                  const by = scaleY(val)
                  const bh = margin.top + plotHeight - by
                  const isHover = hoveredBar?.catIdx === catIdx && hoveredBar?.seriesIdx === seriesIdx

                  return (
                    <rect
                      key={seriesIdx}
                      x={bx}
                      y={by}
                      width={barWidth}
                      height={Math.max(2, bh)}
                      rx="3"
                      fill={s.color}
                      opacity={isHover ? 1 : 0.82}
                      style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                      onMouseEnter={() => setHoveredBar({ catIdx, seriesIdx, cat, seriesName: s.name, val, x: bx + barWidth / 2, y: by })}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  )
                })}

                {/* X Category Label */}
                <text
                  x={margin.left + catIdx * catWidth + catWidth / 2}
                  y={margin.top + plotHeight + 18}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="600"
                  fill="#475569"
                >
                  {cat}
                </text>
              </g>
            )
          })}

          {/* Y Axis Label */}
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

          {/* Tooltip */}
          {hoveredBar && (
            <g transform={`translate(${Math.min(svgWidth - 90, Math.max(80, hoveredBar.x))}, ${Math.max(margin.top + 5, hoveredBar.y - 35)})`}>
              <rect x="-55" y="-12" width="110" height="28" rx="5" fill="#0F172A" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="600">
                {hoveredBar.seriesName}: {hoveredBar.val}{ySuffix}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
