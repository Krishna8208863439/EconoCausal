import React, { useState } from 'react'

/**
 * QiniCurve
 * Plots the Qini curve and excess area over random targeting.
 */
export default function QiniCurve({
  fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  causalGain = [0, 125.57, 243.9, 336.48, 399.97, 467.87, 510.3, 536.76, 523.67, 513.54, 458.86],
  randomGain = [0, 45.89, 91.77, 137.66, 183.55, 229.43, 275.32, 321.2, 367.09, 412.98, 458.86],
  qiniScore = 0.6839,
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const svgWidth = 720
  const svgHeight = 360
  const margin = { top: 40, right: 35, bottom: 65, left: 65 }
  const plotWidth = svgWidth - margin.left - margin.right
  const plotHeight = svgHeight - margin.top - margin.bottom

  const maxVal = Math.max(...causalGain, ...randomGain, 550) * 1.08
  const scaleX = (pct) => margin.left + (pct / 100) * plotWidth
  const scaleY = (val) => margin.top + plotHeight - (val / maxVal) * plotHeight

  const xPercents = fractions.map(f => Number((f * 100).toFixed(0)))

  // SVG paths
  const causalPoints = xPercents.map((x, i) => `${scaleX(x)},${scaleY(causalGain[i] || 0)}`)
  const randomPoints = xPercents.map((x, i) => `${scaleX(x)},${scaleY(randomGain[i] || 0)}`)

  const causalPath = `M ${causalPoints.join(' L ')}`
  const randomPath = `M ${randomPoints.join(' L ')}`

  // Shaded excess area between DML and Random curves
  const excessArea = `M ${causalPoints.join(' L ')} L ${randomPoints.slice().reverse().join(' L ')} Z`

  const yTicks = [0, 100, 200, 300, 400, 500, Math.round(maxVal)]

  return (
    <div className="chart-container" style={{ width: '100%', background: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
            Qini Evaluation Curve
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Qini Coefficient: <strong style={{ color: '#7C3AED' }}>+{qiniScore.toFixed(3)}</strong> (Normalized excess area above random)
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '3px', background: '#7C3AED', display: 'inline-block' }} />
            <span style={{ color: '#7C3AED', fontWeight: 600 }}>DML Policy (Qini = {qiniScore.toFixed(3)})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '0', borderTop: '2px dotted #475569', display: 'inline-block' }} />
            <span style={{ color: '#475569' }}>Random Allocation</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Y grid lines */}
          {yTicks.map(t => (
            <g key={t}>
              <line
                x1={margin.left}
                y1={scaleY(t)}
                x2={margin.left + plotWidth}
                y2={scaleY(t)}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text x={margin.left - 8} y={scaleY(t) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                {t}
              </text>
            </g>
          ))}

          {/* X ticks */}
          {xPercents.map(pct => (
            <g key={pct}>
              <line
                x1={scaleX(pct)}
                y1={margin.top}
                x2={scaleX(pct)}
                y2={margin.top + plotHeight}
                stroke="#F8FAFC"
                strokeWidth="1"
              />
              <text x={scaleX(pct)} y={margin.top + plotHeight + 18} textAnchor="middle" fontSize="10" fill="#94A3B8">
                {pct}%
              </text>
            </g>
          ))}

          {/* Excess Area Fill (Purple Shading) */}
          <path d={excessArea} fill="rgba(124, 58, 237, 0.12)" />

          {/* Random Dotted Line */}
          <path d={randomPath} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="3,3" />

          {/* DML Causal Curve */}
          <path d={causalPath} fill="none" stroke="#7C3AED" strokeWidth="3" />

          {/* Points */}
          {xPercents.map((pct, i) => {
            const cx = scaleX(pct)
            const cy = scaleY(causalGain[i] || 0)
            const rcy = scaleY(randomGain[i] || 0)
            const isHover = hoverIndex === i

            return (
              <g key={pct}>
                <circle cx={cx} cy={rcy} r="3" fill="#475569" />

                <polygon
                  points={`${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`}
                  fill={isHover ? '#5B21B6' : '#6D28D9'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />

                {isHover && (
                  <line
                    x1={cx}
                    y1={margin.top}
                    x2={cx}
                    y2={margin.top + plotHeight}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                )}
              </g>
            )
          })}

          {/* Axis Labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 42}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#475569"
          >
            % of Population Targeted
          </text>
          <text
            x={-(margin.top + plotHeight / 2)}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#475569"
          >
            Incremental Buyers (Qini Metric)
          </text>

          {/* Hover Tooltip */}
          {hoverIndex !== null && (
            <g transform={`translate(${Math.min(svgWidth - 145, Math.max(70, scaleX(xPercents[hoverIndex])))} , ${Math.max(margin.top + 10, scaleY(causalGain[hoverIndex]) - 50)})`}>
              <rect x="-65" y="-12" width="130" height="42" rx="6" fill="#0F172A" opacity="0.9" />
              <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="600">
                Targeted: {xPercents[hoverIndex]}%
              </text>
              <text x="0" y="16" textAnchor="middle" fill="#C084FC" fontSize="9.5" fontWeight="600">
                Incremental: ~{Math.round(causalGain[hoverIndex])} buyers
              </text>
              <text x="0" y="27" textAnchor="middle" fill="#94A3B8" fontSize="9">
                Random: ~{Math.round(randomGain[hoverIndex])} buyers
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
