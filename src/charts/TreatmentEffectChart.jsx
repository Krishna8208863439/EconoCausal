import React, { useState } from 'react'

/**
 * TreatmentEffectChart
 * High-fidelity interactive SVG chart displaying the distribution of estimated
 * Individual Treatment Effects (ITE / CATE) with Mean ATE marker and 95% Confidence Interval.
 */
export default function TreatmentEffectChart({
  meanAte = 0.1947,
  ciLower = 0.0567,
  ciUpper = 0.3328,
  sampleSize = 2200,
  minIte = 0.0325,
  maxIte = 0.3528,
  stdIte = 0.0436,
}) {
  const [hoverPoint, setHoverPoint] = useState(null)

  // Generate simulated density
  const nPoints = 35
  const bars = []
  const step = (maxIte - minIte) / nPoints
  let maxCount = 0

  for (let i = 0; i < nPoints; i++) {
    const x = minIte + (i + 0.5) * step
    const z = (x - meanAte) / (stdIte || 0.04)
    const dens = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z)
    const count = dens * sampleSize * 0.026
    if (count > maxCount) maxCount = count
    bars.push({
      xPercent: x * 100,
      count: count,
      xStart: (minIte + i * step) * 100,
      xEnd: (minIte + (i + 1) * step) * 100,
    })
  }

  const svgWidth = 720
  const svgHeight = 360
  const margin = { top: 50, right: 35, bottom: 65, left: 60 }
  const plotWidth = svgWidth - margin.left - margin.right
  const plotHeight = svgHeight - margin.top - margin.bottom

  const xMin = Math.max(0, minIte * 100 - 2)
  const xMax = maxIte * 100 + 2
  const yMax = Math.ceil(maxCount * 1.15)

  const scaleX = (val) => margin.left + ((val - xMin) / (xMax - xMin)) * plotWidth
  const scaleY = (val) => margin.top + plotHeight - (val / yMax) * plotHeight

  // Ticks
  const xTicks = []
  const xStep = 5
  for (let t = Math.ceil(xMin / xStep) * xStep; t <= xMax; t += xStep) {
    xTicks.push(t)
  }

  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), yMax]

  const meanX = scaleX(meanAte * 100)
  const ciLeftX = scaleX(ciLower * 100)
  const ciRightX = scaleX(ciUpper * 100)
  const ciY = scaleY(yMax * 0.5)

  return (
    <div className="chart-container" style={{ width: '100%', background: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
            Distribution of Estimated Treatment Effects (CATE)
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Sample size: {sampleSize.toLocaleString()} customers · Model: CausalForestDML
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', background: '#2563EB', opacity: 0.75, borderRadius: '2px', display: 'inline-block' }} />
            <span>Customer Density</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '0', borderTop: '2px dashed #DC2626', display: 'inline-block' }} />
            <span style={{ color: '#DC2626', fontWeight: 600 }}>Mean ATE (+{(meanAte * 100).toFixed(1)} pp)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '0', borderTop: '2.5px solid #059669', display: 'inline-block' }} />
            <span style={{ color: '#059669', fontWeight: 600 }}>95% CI [{(ciLower * 100).toFixed(1)}, {(ciUpper * 100).toFixed(1)}]</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Grid lines */}
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

          {xTicks.map(t => (
            <g key={t}>
              <line
                x1={scaleX(t)}
                y1={margin.top}
                x2={scaleX(t)}
                y2={margin.top + plotHeight}
                stroke="#F8FAFC"
                strokeWidth="1"
              />
              <text x={scaleX(t)} y={margin.top + plotHeight + 18} textAnchor="middle" fontSize="10" fill="#94A3B8">
                +{t}%
              </text>
            </g>
          ))}

          {/* Bars */}
          {bars.map((b, i) => {
            const bx = scaleX(b.xStart)
            const bw = Math.max(1, scaleX(b.xEnd) - bx - 1.5)
            const by = scaleY(b.count)
            const bh = margin.top + plotHeight - by
            const isHover = hoverPoint?.index === i

            return (
              <rect
                key={i}
                x={bx}
                y={by}
                width={bw}
                height={bh}
                fill={isHover ? '#1D4ED8' : '#2563EB'}
                opacity={isHover ? 0.95 : 0.72}
                rx="2"
                style={{ cursor: 'pointer', transition: 'fill 0.15s, opacity 0.15s' }}
                onMouseEnter={() => setHoverPoint({ ...b, index: i, screenX: bx + bw / 2, screenY: by })}
                onMouseLeave={() => setHoverPoint(null)}
              />
            )
          })}

          {/* 95% Confidence Interval Line */}
          <line
            x1={ciLeftX}
            y1={ciY}
            x2={ciRightX}
            y2={ciY}
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* CI Cap Left */}
          <line x1={ciLeftX} y1={ciY - 7} x2={ciLeftX} y2={ciY + 7} stroke="#059669" strokeWidth="2.5" />
          {/* CI Cap Right */}
          <line x1={ciRightX} y1={ciY - 7} x2={ciRightX} y2={ciY + 7} stroke="#059669" strokeWidth="2.5" />

          {/* Mean ATE vertical line */}
          <line
            x1={meanX}
            y1={margin.top}
            x2={meanX}
            y2={margin.top + plotHeight}
            stroke="#DC2626"
            strokeWidth="2.5"
            strokeDasharray="5,4"
          />

          {/* Mean ATE label pin */}
          <circle cx={meanX} cy={margin.top + 10} r="4" fill="#DC2626" />
          <text x={meanX} y={margin.top - 6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#DC2626">
            +{ (meanAte * 100).toFixed(1) } pp
          </text>

          {/* Axis Labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 42}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#475569"
          >
            Estimated Treatment Effect (Percentage Point Uplift)
          </text>
          <text
            x={-(margin.top + plotHeight / 2)}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#475569"
          >
            Customer Frequency
          </text>

          {/* Hover Tooltip inside SVG */}
          {hoverPoint && (
            <g transform={`translate(${Math.min(svgWidth - 140, Math.max(70, hoverPoint.screenX))}, ${Math.max(margin.top + 10, hoverPoint.screenY - 45)})`}>
              <rect x="-60" y="-12" width="120" height="36" rx="6" fill="#0F172A" opacity="0.9" />
              <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="600">
                CATE: +{hoverPoint.xPercent.toFixed(1)} pp
              </text>
              <text x="0" y="16" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                Est. Count: ~{Math.round(hoverPoint.count)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
