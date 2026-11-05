import React, { useState } from 'react'

/**
 * UpliftCurve
 * Plots cumulative incremental conversions against % of customer population targeted.
 */
export default function UpliftCurve({
  fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  causalGain = [0, 125.57, 243.9, 336.48, 399.97, 467.87, 510.3, 536.76, 523.67, 513.54, 458.86],
  randomGain = [0, 45.89, 91.77, 137.66, 183.55, 229.43, 275.32, 321.2, 367.09, 412.98, 458.86],
  totalIncremental = 458.86,
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

  // SVG path generators
  const causalPoints = xPercents.map((x, i) => `${scaleX(x)},${scaleY(causalGain[i] || 0)}`)
  const randomPoints = xPercents.map((x, i) => `${scaleX(x)},${scaleY(randomGain[i] || 0)}`)

  const causalPath = `M ${causalPoints.join(' L ')}`
  const randomPath = `M ${randomPoints.join(' L ')}`

  // Shaded area under causal line
  const causalArea = `M ${scaleX(0)},${scaleY(0)} L ${causalPoints.join(' L ')} L ${scaleX(100)},${scaleY(0)} Z`

  const yTicks = [0, 100, 200, 300, 400, 500, Math.round(maxVal)]

  return (
    <div className="chart-container" style={{ width: '100%', background: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
            Cumulative Uplift Curve
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Incremental purchase gains by customer targeting fraction
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '3px', background: '#2563EB', display: 'inline-block' }} />
            <span style={{ color: '#2563EB', fontWeight: 600 }}>Causal DML Policy (Ranked by ITE)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '0', borderTop: '2px dashed #64748B', display: 'inline-block' }} />
            <span style={{ color: '#64748B' }}>Random Baseline</span>
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
                +{t}
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

          {/* Shaded Causal Fill */}
          <path d={causalArea} fill="rgba(37, 99, 235, 0.08)" />

          {/* Random Baseline Line */}
          <path d={randomPath} fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="5,4" />

          {/* Causal Line */}
          <path d={causalPath} fill="none" stroke="#2563EB" strokeWidth="3" />

          {/* Markers and Hover triggers */}
          {xPercents.map((pct, i) => {
            const cx = scaleX(pct)
            const cy = scaleY(causalGain[i] || 0)
            const rcy = scaleY(randomGain[i] || 0)
            const isHover = hoverIndex === i

            return (
              <g key={pct}>
                {/* Random point */}
                <circle cx={cx} cy={rcy} r="3" fill="#64748B" />

                {/* Causal point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHover ? '6' : '4'}
                  fill={isHover ? '#1D4ED8' : '#2563EB'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />

                {/* Vertical hover crosshair */}
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
            % of Customers Targeted (Sorted by Estimated Uplift)
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
            Cumulative Incremental Conversions
          </text>

          {/* Active Tooltip */}
          {hoverIndex !== null && (
            <g transform={`translate(${Math.min(svgWidth - 145, Math.max(70, scaleX(xPercents[hoverIndex])))} , ${Math.max(margin.top + 10, scaleY(causalGain[hoverIndex]) - 50)})`}>
              <rect x="-65" y="-12" width="130" height="42" rx="6" fill="#0F172A" opacity="0.9" />
              <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="600">
                Targeted: {xPercents[hoverIndex]}%
              </text>
              <text x="0" y="16" textAnchor="middle" fill="#60A5FA" fontSize="9.5" fontWeight="600">
                Causal: +{causalGain[hoverIndex]?.toFixed(1)} orders
              </text>
              <text x="0" y="27" textAnchor="middle" fill="#94A3B8" fontSize="9">
                Random: +{randomGain[hoverIndex]?.toFixed(1)} orders
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
