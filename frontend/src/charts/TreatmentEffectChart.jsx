import React from 'react'
import Plot from 'react-plotly.js'

/**
 * TreatmentEffectChart
 * Displays the distribution of estimated Individual Treatment Effects (ITE / CATE).
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
  // Generate a smooth simulated density based on the actual estimated distribution parameters
  const nPoints = 50
  const xVals = []
  const yVals = []
  const step = (maxIte - minIte) / nPoints
  for (let i = 0; i <= nPoints; i++) {
    const x = minIte + i * step
    // Gaussian-like density centered near meanAte
    const z = (x - meanAte) / (stdIte || 0.04)
    const dens = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z)
    xVals.push(Number((x * 100).toFixed(2)))
    yVals.push(Number((dens * sampleSize * 0.02).toFixed(1)))
  }

  const data = [
    {
      x: xVals,
      y: yVals,
      type: 'bar',
      name: 'Customer Density',
      marker: {
        color: '#2563EB',
        opacity: 0.7,
      },
      hovertemplate: 'CATE: +%{x:.1f} pp<br>Est. Count: %{y:.0f}<extra></extra>',
    },
    {
      x: [meanAte * 100, meanAte * 100],
      y: [0, Math.max(...yVals) * 1.05],
      type: 'scatter',
      mode: 'lines',
      name: `Mean ATE (+${(meanAte * 100).toFixed(1)} pp)`,
      line: {
        color: '#DC2626',
        width: 3,
        dash: 'dash',
      },
      hoverinfo: 'name',
    },
    {
      x: [ciLower * 100, ciUpper * 100],
      y: [Math.max(...yVals) * 0.5, Math.max(...yVals) * 0.5],
      type: 'scatter',
      mode: 'lines+markers',
      name: `95% CI [${(ciLower * 100).toFixed(1)} pp, ${(ciUpper * 100).toFixed(1)} pp]`,
      line: {
        color: '#059669',
        width: 3,
      },
      marker: {
        size: 8,
        symbol: 'line-ns',
      },
      hoverinfo: 'name',
    },
  ]

  const layout = {
    title: {
      text: `<b>Distribution of Estimated Treatment Effects (CATE)</b><br><span style="font-size:12px;color:#64748B">Sample size: ${sampleSize.toLocaleString()} customers · Model: CausalForestDML</span>`,
      font: { size: 14, color: '#0F172A' },
      x: 0.05,
    },
    autosize: true,
    height: 380,
    margin: { l: 55, r: 25, t: 60, b: 50 },
    xaxis: {
      title: 'Estimated Treatment Effect (Percentage Point Uplift)',
      ticksuffix: ' pp',
      gridcolor: '#E2E8F0',
      zeroline: false,
    },
    yaxis: {
      title: 'Customer Frequency',
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
