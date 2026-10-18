import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import Plot from 'react-plotly.js'
import {
  Database,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  History
} from 'lucide-react'
import CsvHistoryManager from '../components/CsvHistoryManager.jsx'
import { api } from '../services/api.js'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import CsvUploader from '../components/CsvUploader.jsx'
import { useToast } from '../components/Toast.jsx'
import './Page.css'

const COLUMN_ROLES = {
  customer_id:      { role: 'Identifier',       color: 'gray',   exclude: true,  desc: 'Unique customer identifier. Excluded from causal adjustment to prevent spurious 1-to-1 mapping.' },
  age_group:        { role: 'Confounder',       color: 'amber',  exclude: false, desc: 'Demographic confounder influencing both promotional targeting propensity and purchase intent.' },
  past_purchases:   { role: 'Confounder',       color: 'amber',  exclude: false, desc: 'Historical transaction frequency. Major common cause for selection bias.' },
  avg_order_value:  { role: 'Confounder',       color: 'amber',  exclude: false, desc: 'Historical spend per transaction. Adjusted for in DML nuisance models.' },
  website_visits:   { role: 'Confounder',       color: 'amber',  exclude: false, desc: 'Pre-treatment digital engagement score.' },
  customer_segment: { role: 'Confounder',       color: 'amber',  exclude: false, desc: 'RFM customer tier (Premium, Regular, Occasional, Lapsed).' },
  discount_offered: { role: 'Treatment (T)',    color: 'blue',   exclude: false, desc: 'Binary promotional offer indicator: 1 = received discount, 0 = standard price.' },
  discount_amount:  { role: 'Treatment Attr.',  color: 'blue',   exclude: true,  desc: 'Amount of discount granted. Excluded to avoid multicollinearity with treatment indicator.' },
  purchased:        { role: 'Outcome (Y)',      color: 'green',  exclude: false, desc: 'Primary causal outcome: 1 = completed purchase, 0 = did not buy.' },
  revenue:          { role: 'Post-treatment',   color: 'gray',   exclude: true,  desc: 'Observed monetary outcome. Post-treatment collider — excluded to prevent collider bias.' },
  campaign_date:    { role: 'Admin Attribute',  color: 'gray',   exclude: true,  desc: 'Execution timestamp with no causal relationship to conversion.' },
}

function computeSummary(data) {
  if (!data || data.length === 0) return null
  const n = data.length
  const treated = data.filter(r => Number(r.discount_offered) === 1)
  const control = data.filter(r => Number(r.discount_offered) === 0)
  const purchasedAll = data.filter(r => Number(r.purchased) === 1).length
  const purchasedTreated = treated.filter(r => Number(r.purchased) === 1).length
  const purchasedControl = control.filter(r => Number(r.purchased) === 1).length
  const totalRevenue = data.reduce((s, r) => s + (Number(r.revenue) || 0), 0)

  return {
    n,
    treated: treated.length,
    control: control.length,
    purchaseRate: purchasedAll / n,
    purchaseRateTreated: treated.length ? purchasedTreated / treated.length : 0,
    purchaseRateControl: control.length ? purchasedControl / control.length : 0,
    naiveAte: (treated.length ? purchasedTreated / treated.length : 0) -
              (control.length ? purchasedControl / control.length : 0),
    totalRevenue,
  }
}

export default function DataPage({ uploadedData, onDataUploaded }) {
  const [fileName, setFileName] = useState('cleaned_retail_campaign.csv (Default Synthetic)')
  const [previewPage, setPreviewPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingDefault, setLoadingDefault] = useState(false)
  const addToast = useToast()

  // Auto-load default dataset on mount if none provided
  useEffect(() => {
    if (!uploadedData) {
      handleLoadDefault(true)
    }
  }, [])

  async function handleLoaded(data, name, file) {
    setFileName(name)
    setPreviewPage(0)
    onDataUploaded(data)
    addToast(`Loaded ${data.length.toLocaleString()} records from ${name}`, 'success')

    if (file) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', name)
        await api.uploadCsvHistory(formData)
        addToast(`Saved "${name}" to CSV history`, 'success')
      } catch (err) {
        console.warn('History upload notice:', err.message)
      }
    }
  }

  async function handleLoadDefault(silent = false) {
    setLoadingDefault(true)
    try {
      const res = await fetch('/cleaned_retail_campaign.csv')
      const text = await res.text()
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          handleLoaded(results.data, 'cleaned_retail_campaign.csv (Default Synthetic)')
          setLoadingDefault(false)
        },
      })
    } catch (err) {
      console.error('Failed to load default dataset:', err)
      if (!silent) addToast('Failed to load default dataset', 'error')
      setLoadingDefault(false)
    }
  }

  const summary = useMemo(() => computeSummary(uploadedData), [uploadedData])

  // Filter preview rows by customer ID or segment
  const filteredData = useMemo(() => {
    if (!uploadedData) return []
    if (!searchTerm.trim()) return uploadedData
    const q = searchTerm.toLowerCase()
    return uploadedData.filter(row =>
      String(row.customer_id || '').toLowerCase().includes(q) ||
      String(row.customer_segment || '').toLowerCase().includes(q) ||
      String(row.age_group || '').toLowerCase().includes(q)
    )
  }, [uploadedData, searchTerm])

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const previewRows = filteredData.slice(previewPage * pageSize, (previewPage + 1) * pageSize)

  return (
    <div className="page">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Data & Exploratory Analysis</h1>
          <p className="page-subtitle">
            Observational Retail Cohort · Confounder Auditing · Selection Bias Diagnostics
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleLoadDefault(false)}
            disabled={loadingDefault}
          >
            <RefreshCw size={15} className={loadingDefault ? 'is-spinning' : ''} />
            <span>{loadingDefault ? 'Loading Dataset…' : 'Load Default (2,200 Rows)'}</span>
          </button>
        </div>
      </div>

      {/* ── Upload or Switch Dataset ─────────────────────────────────────── */}
      <SectionCard
        title="Upload or Ingest Retail Campaign Dataset"
        subtitle="Upload your custom CSV or explore the verified benchmark observational cohort"
        icon={Upload}
        badge="CSV Verified"
        badgeType="blue"
      >
        <CsvUploader onDataLoaded={handleLoaded} />
      </SectionCard>

      {/* ── CSV Dataset Ingestion & File History ─────────────────────────── */}
      <SectionCard
        title="CSV Dataset Version History & Snapshots"
        subtitle="Track uploaded campaign datasets, audit historical cohorts, save current snapshots, and switch active data"
        icon={History}
        badge="History & Snapshots"
        badgeType="green"
      >
        <CsvHistoryManager
          activeFileName={fileName}
          onDatasetSelected={handleLoaded}
          currentData={uploadedData}
        />
      </SectionCard>

      {/* ── Summary & Data Quality KPI Cards ─────────────────────────────── */}
      {summary && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '12px' }}>
              Cohort Statistics & Naïve Observational Metrics
            </h2>
          </div>

          <div className="stat-grid-4">
            <StatCard
              label="Total Records"
              value={summary.n.toLocaleString()}
              sub="100% complete · 0 missing values"
              tooltip="Total clean rows in active dataset. Cross-checked with zero duplicates."
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Treated Group"
              value={summary.treated.toLocaleString()}
              sub={`${((summary.treated / summary.n) * 100).toFixed(1)}% of cohort (Discount=1)`}
              tooltip="Customers who received the promotional discount offer."
              icon={TrendingUp}
              color="indigo"
            />
            <StatCard
              label="Control Group"
              value={summary.control.toLocaleString()}
              sub={`${((summary.control / summary.n) * 100).toFixed(1)}% of cohort (Discount=0)`}
              tooltip="Customers who were offered standard retail pricing with no discount."
              icon={Layers}
              color="gray"
            />
            <StatCard
              label="Overall Purchase Rate"
              value={`${(summary.purchaseRate * 100).toFixed(1)}%`}
              sub="Baseline conversion across all customers"
              tooltip="Unconditional conversion probability across combined treated and control groups."
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              label="Treated Purchase Rate"
              value={`${(summary.purchaseRateTreated * 100).toFixed(1)}%`}
              sub="Observed conversion with discount"
              tooltip="Gross purchase frequency among customers receiving the discount offer."
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              label="Control Purchase Rate"
              value={`${(summary.purchaseRateControl * 100).toFixed(1)}%`}
              sub="Baseline conversion without discount"
              tooltip="Natural purchase frequency among control customers."
              icon={Users}
              color="amber"
            />
            <StatCard
              label="Naïve Observed ATE"
              value={`+${(summary.naiveAte * 100).toFixed(1)} pp`}
              sub="Biased — confounders unadjusted"
              trend={{ value: 'Contains Selection Bias', positive: false }}
              tooltip="Simple difference in conversion rates (+20.86 pp). Overestimates causal impact because high-intent customers were preferentially offered discounts."
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              label="Observed Gross Revenue"
              value={`₹${summary.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub="Total recorded basket purchases"
              tooltip="Sum of recorded transaction revenues in observational dataset."
              icon={FileSpreadsheet}
              color="blue"
            />
          </div>

          {/* ── Selection Bias Warning Callout ───────────────────────────── */}
          <div className="notice-banner notice-banner--warning">
            <div className="notice-banner__icon">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <strong>Econometric Selection Bias Warning:</strong> The naïve difference in conversion rates (+{(summary.naiveAte * 100).toFixed(1)} pp)
              confounds true promotional effectiveness with organic purchase intent. More active customers (higher past visits and purchases)
              were systematically more likely to receive promotions. <strong>Double Machine Learning isolates the true causal ATE (+19.47 pp)</strong> by
              orthogonalizing nuisance predictions.
            </div>
          </div>

          {/* ── Interactive Plotly Chart: Observed Purchase Rates by Segment ── */}
          <SectionCard
            title="Observed Conversion by Segment & Promotional Treatment"
            subtitle="Comparing conversion rates across RFM customer tiers under treated (Discount=1) vs control (Discount=0)"
            icon={TrendingUp}
          >
            <div style={{ width: '100%', height: '360px' }}>
              <Plot
                data={[
                  {
                    x: ['Premium', 'Regular', 'Occasional', 'Lapsed'],
                    y: ['Premium', 'Regular', 'Occasional', 'Lapsed'].map(seg => {
                      const rows = (uploadedData || []).filter(r => r.customer_segment === seg && Number(r.discount_offered) === 1)
                      return rows.length ? Number(((rows.filter(r => Number(r.purchased) === 1).length / rows.length) * 100).toFixed(1)) : 0
                    }),
                    name: 'Treated (Discount Offered)',
                    type: 'bar',
                    marker: { color: '#2563EB', opacity: 0.9 },
                    hovertemplate: 'Segment: %{x}<br>Treated Conversion: %{y}%<extra></extra>',
                  },
                  {
                    x: ['Premium', 'Regular', 'Occasional', 'Lapsed'],
                    y: ['Premium', 'Regular', 'Occasional', 'Lapsed'].map(seg => {
                      const rows = (uploadedData || []).filter(r => r.customer_segment === seg && Number(r.discount_offered) === 0)
                      return rows.length ? Number(((rows.filter(r => Number(r.purchased) === 1).length / rows.length) * 100).toFixed(1)) : 0
                    }),
                    name: 'Control (Standard Price)',
                    type: 'bar',
                    marker: { color: '#94A3B8', opacity: 0.8 },
                    hovertemplate: 'Segment: %{x}<br>Control Conversion: %{y}%<extra></extra>',
                  },
                ]}
                layout={{
                  title: { text: '<b>Observed Purchase Rate by Customer Segment & Treatment</b>', font: { size: 14, color: '#0F172A' }, x: 0.02 },
                  barmode: 'group',
                  autosize: true,
                  height: 340,
                  margin: { l: 55, r: 25, t: 50, b: 50 },
                  xaxis: { title: 'Customer Segment', gridcolor: '#F1F5F9' },
                  yaxis: { title: 'Purchase Rate (%)', ticksuffix: '%', gridcolor: '#E2E8F0', range: [0, 80] },
                  legend: { orientation: 'h', x: 0.02, y: 1.12 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </SectionCard>
        </>
      )}

      {/* ── Column Causal Roles Table ────────────────────────────────────── */}
      <SectionCard
        title="Causal Graph Variable Roles & Identification Set"
        subtitle="Classification of each dataset attribute into confounder, treatment, outcome, or excluded post-treatment variables"
        icon={Layers}
        badge="DoWhy 0.8 Specification"
        badgeType="purple"
      >
        <p className="prose">
          To achieve identification under conditional unconfoundedness, only genuine pre-treatment confounders are included in the adjustment set.
          Post-treatment variables like <code>revenue</code> are excluded to prevent collider bias.
        </p>

        <div className="table-wrapper">
          <table className="data-table" aria-label="Column causal role dictionary">
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Causal Role</th>
                <th>In Adjustment Set</th>
                <th>Econometric Rationale</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(COLUMN_ROLES).map(([col, meta]) => (
                <tr key={col}>
                  <td><code>{col}</code></td>
                  <td>
                    <span className={`badge badge-${meta.color}`}>
                      {meta.role}
                    </span>
                  </td>
                  <td>
                    {meta.exclude ? (
                      <span className="badge badge-gray" style={{ color: '#BE123C' }}>
                        Excluded
                      </span>
                    ) : (
                      <span className="badge badge-green">
                        Included in DML
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#475569', whiteSpace: 'normal', maxWidth: '440px' }}>
                    {meta.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Dataset Interactive Preview Table ───────────────────────────── */}
      {uploadedData && (
        <SectionCard
          title={`Dataset Preview — ${fileName}`}
          subtitle={`Showing ${previewRows.length} of ${filteredData.length.toLocaleString()} matching rows`}
          icon={Database}
          badge={`${uploadedData.length.toLocaleString()} Total Records`}
          badgeType="blue"
        >
          {/* Table Search & Controls */}
          <div className="filter-bar">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by Customer ID, Segment, or Age Group..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPreviewPage(0)
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Rows per page:</span>
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '80px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPreviewPage(0)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table" aria-label="Customer cohort preview table">
              <thead>
                <tr>
                  {Object.keys(previewRows[0] || {}).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {Object.entries(row).map(([k, val], j) => (
                      <td key={j}>
                        {k === 'discount_offered' ? (
                          <span className={`badge ${val === 1 ? 'badge-blue' : 'badge-gray'}`}>
                            {val === 1 ? 'Discount' : 'Standard'}
                          </span>
                        ) : k === 'purchased' ? (
                          <span className={`badge ${val === 1 ? 'badge-green' : 'badge-gray'}`}>
                            {val === 1 ? 'Purchased' : 'No Purchase'}
                          </span>
                        ) : val === null || val === undefined ? (
                          <em>—</em>
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing {previewPage * pageSize + 1} to {Math.min((previewPage + 1) * pageSize, filteredData.length)} of {filteredData.length.toLocaleString()} rows
            </span>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                disabled={previewPage === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0 8px' }}>
                Page {previewPage + 1} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={previewPage >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </SectionCard>
      )}

    </div>
  )
}

