import React, { useState, useMemo } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import CsvUploader from '../components/CsvUploader.jsx'
import './Page.css'

const COLUMN_ROLES = {
  customer_id:      { role: 'Identifier',   color: 'gray',   exclude: true },
  age_group:        { role: 'Confounder',   color: 'orange', exclude: false },
  past_purchases:   { role: 'Confounder',   color: 'orange', exclude: false },
  avg_order_value:  { role: 'Confounder',   color: 'orange', exclude: false },
  website_visits:   { role: 'Confounder',   color: 'orange', exclude: false },
  customer_segment: { role: 'Confounder',   color: 'orange', exclude: false },
  discount_offered: { role: 'Treatment',    color: 'blue',   exclude: false },
  discount_amount:  { role: 'Treat. Attr.', color: 'blue',   exclude: true },
  purchased:        { role: 'Outcome',      color: 'green',  exclude: false },
  revenue:          { role: 'Post-treat.',  color: 'gray',   exclude: true },
  campaign_date:    { role: 'Admin',        color: 'gray',   exclude: true },
}

function computeSummary(data) {
  if (!data || data.length === 0) return null
  const n = data.length
  const treated = data.filter(r => Number(r.discount_offered) === 1)
  const control  = data.filter(r => Number(r.discount_offered) === 0)
  const purchasedAll     = data.filter(r => Number(r.purchased) === 1).length
  const purchasedTreated = treated.filter(r => Number(r.purchased) === 1).length
  const purchasedControl = control.filter(r => Number(r.purchased) === 1).length
  const totalRevenue = data.reduce((s, r) => s + (Number(r.revenue) || 0), 0)

  return {
    n, treated: treated.length, control: control.length,
    purchaseRate: purchasedAll / n,
    purchaseRateTreated: treated.length ? purchasedTreated / treated.length : 0,
    purchaseRateControl: control.length  ? purchasedControl / control.length : 0,
    naiveAte: (treated.length ? purchasedTreated / treated.length : 0) -
              (control.length  ? purchasedControl / control.length  : 0),
    totalRevenue,
  }
}

export default function DataPage({ uploadedData, onDataUploaded }) {
  const [fileName, setFileName] = useState(null)
  const [previewPage, setPreviewPage] = useState(0)
  const PAGE_SIZE = 5

  const summary = useMemo(() => computeSummary(uploadedData), [uploadedData])
  const previewRows = uploadedData
    ? uploadedData.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE)
    : []
  const totalPages = uploadedData ? Math.ceil(uploadedData.length / PAGE_SIZE) : 0

  function handleLoaded(data, name) {
    setFileName(name)
    setPreviewPage(0)
    onDataUploaded(data)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Data &amp; EDA</h1>

      </div>

      <SectionCard title="Upload Campaign Dataset">
        <CsvUploader onDataLoaded={handleLoaded} />
      </SectionCard>

      {summary && (
        <>
          <div className="stat-grid">
            <StatCard label="Total Records"    value={summary.n.toLocaleString()}          icon="👥" color="blue" />
            <StatCard label="Treated"          value={summary.treated.toLocaleString()}    icon="🎯" color="orange"
                      sub={`${(100*summary.treated/summary.n).toFixed(1)}% of customers`} />
            <StatCard label="Control"          value={summary.control.toLocaleString()}    icon="⚖️"  color="gray"
                      sub={`${(100*summary.control/summary.n).toFixed(1)}% of customers`} />
            <StatCard label="Purchase Rate"    value={`${(100*summary.purchaseRate).toFixed(1)}%`}  icon="🛒" color="green" />
            <StatCard label="Treated Purchase" value={`${(100*summary.purchaseRateTreated).toFixed(1)}%`} icon="✅" color="green"
                      sub="Potentially biased — see causal analysis" />
            <StatCard label="Control Purchase" value={`${(100*summary.purchaseRateControl).toFixed(1)}%`} icon="📉" color="amber"
                      sub="Baseline without discount" />
            <StatCard label="Naïve ATE"
                      value={`${summary.naiveAte >= 0 ? '+' : ''}${(100*summary.naiveAte).toFixed(1)} pp`}
                      icon="⚠️" color="amber"
                      sub="Biased — confounders not yet adjusted" />
            <StatCard label="Total Revenue"    value={`£${summary.totalRevenue.toLocaleString(undefined,{maximumFractionDigits:0})}`} icon="💷" color="blue" />
          </div>

          <div className="notice-banner notice-banner--warning">
            <span aria-hidden="true">⚠️</span>
            <span>
              The naïve ATE (+{(100*summary.naiveAte).toFixed(1)} pp) compares treated vs. control purchase
              rates without adjusting for confounders. This estimate is <strong>biased</strong> because
              higher-engagement customers were more likely to receive a discount AND more likely to purchase
              regardless. The true causal ATE will be estimated using Double Machine Learning in Week 2.
            </span>
          </div>
        </>
      )}

      <SectionCard title="Column Roles">
        <p className="prose" style={{marginBottom: '14px'}}>
          Column roles determine which variables enter the causal adjustment set.
          Identifiers and post-treatment variables must be excluded to avoid bias.
        </p>
        <div className="col-role-table-wrapper">
          <table className="col-role-table" aria-label="Column role reference">
            <thead>
              <tr>
                <th>Column</th>
                <th>Causal Role</th>
                <th>In Adjustment Set</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(COLUMN_ROLES).map(([col, meta]) => (
                <tr key={col}>
                  <td><code>{col}</code></td>
                  <td><span className={`badge badge-${meta.color}`}>{meta.role}</span></td>
                  <td>{meta.exclude ? <span style={{color:'#C62828'}}>❌ Excluded</span> : <span style={{color:'#2E7D32'}}>✅ Included</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {uploadedData && previewRows.length > 0 && (
        <SectionCard title={`Data Preview — ${fileName}`} badge={`${uploadedData.length.toLocaleString()} rows`}>
          <div className="table-wrapper">
            <table className="data-table" aria-label="Dataset preview">
              <thead>
                <tr>
                  {Object.keys(previewRows[0]).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val === null || val === undefined ? <em>—</em> : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination" role="navigation" aria-label="Table pagination">
            <button onClick={() => setPreviewPage(p => Math.max(0, p-1))}
                    disabled={previewPage === 0} aria-label="Previous page">‹ Prev</button>
            <span>Page {previewPage + 1} of {totalPages}</span>
            <button onClick={() => setPreviewPage(p => Math.min(totalPages-1, p+1))}
                    disabled={previewPage >= totalPages-1} aria-label="Next page">Next ›</button>
          </div>
        </SectionCard>
      )}

      {!uploadedData && (
        <SectionCard title="EDA Figures" badge="Pre-generated">
          <p className="prose">
            Upload a dataset above to see summary statistics. The EDA figures below
            were generated by <code>src/data/eda.py</code> on the synthetic dataset.
          </p>
          <div className="figure-grid">
            {[
              ['01_treatment_control_counts.png',   'Treatment vs. Control Counts'],
              ['02_purchase_rate_by_treatment.png', 'Purchase Rate Comparison'],
              ['03_numeric_distributions.png',      'Numeric Distributions'],
              ['05_correlation_heatmap.png',        'Correlation Heatmap'],
            ].map(([file, label]) => (
              <figure key={file} className="eda-figure">
                <figcaption>{label}</figcaption>
                <img
                  src={`/eda_figures/${file}`}
                  alt={label}
                  onError={(e) => { e.target.style.display='none' }}
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
          <p className="prose" style={{marginTop:'12px', color:'var(--color-text-muted)', fontSize:'0.82rem'}}>
            Note: figures appear here only when served via <code>npm run dev</code> with the
            <code>public/eda_figures/</code> directory populated. See frontend README for details.
          </p>
        </SectionCard>
      )}
    </div>
  )
}
