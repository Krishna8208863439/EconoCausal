import React from 'react'
import Plot from 'react-plotly.js'

/**
 * QiniCurve
 * Plots the Qini curve and excess area over random targeting.
 */
export default function QiniCurve({
  fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  causalGain = [0, 52, 108, 164, 218, 270, 318, 362, 404, 442, 458],
  randomGain = [0, 45.8, 91.6, 137.4, 183.2, 229.0, 274.8, 320.6, 366.4, 412.2, 458.0],
  qiniScore = 0.6839,
}) {
  const xPercent = fractions.map(f => Number((f * 100).toFixed(0)))

  const data = [
    {
      x: xPercent,
      y: causalGain,
      type: 'scatter',
      mode: 'lines+markers',
      name: `DML Policy (Qini = ${qiniScore.toFixed(3)})`,
      line: {
        color: '#7C3AED',
        width: 3,
      },
      marker: {
        size: 7,
        color: '#6D28D9',
        symbol: 'diamond',
      },
      fill: 'tonexty',
      fillcolor: 'rgba(124, 58, 237, 0.12)',
      hovertemplate: 'Targeted: %{x}%<br>Incremental Buyers: %{y:.0f}<extra></extra>',
    },
    {
      x: xPercent,
      y: randomGain,
      type: 'scatter',
      mode: 'lines',
      name: 'Random Allocation',
      line: {
        color: '#475569',
        width: 2,
        dash: 'dot',
      },
      hovertemplate: 'Targeted: %{x}%<br>Random Buyers: %{y:.0f}<extra></extra>',
    },
  ]

  const layout = {
    title: {
      text: `<b>Qini Evaluation Curve</b><br><span style="font-size:12px;color:#64748B">Qini Coefficient: <b>+${qiniScore.toFixed(3)}</b> (Normalized excess area above random)</span>`,
      font: { size: 14, color: '#0F172A' },
      x: 0.05,
    },
    autosize: true,
    height: 380,
    margin: { l: 55, r: 25, t: 60, b: 50 },
    xaxis: {
      title: '% of Population Targeted',
      ticksuffix: '%',
      gridcolor: '#E2E8F0',
      zeroline: false,
    },
    yaxis: {
      title: 'Incremental Buyers (Qini Metric)',
      gridcolor: '#E2E8F0',
      zeroline: false,
    },
    legend: {
      orientation: 'h',
      x: 0.05,
      y: 1.15,
      font: { size: 11 },
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  }

  const config = {
    responsive: true,
    displayModeBar: false,
  }

  return (
    <div className="chart-container" style={{ width: '100%', minHeight: '380px' }}>
      <Plot data={data} layout={layout} config={config} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
