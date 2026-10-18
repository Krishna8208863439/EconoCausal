import React, { useState, useEffect, useCallback } from 'react'
import Plot from 'react-plotly.js'
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  BarChart2,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'
import './Page.css'

export default function DriftPage() {
  const [report, setReport]                   = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [checking, setChecking]               = useState(false)
  const [error, setError]                     = useState(null)
  const [uploadSuccess, setUploadSuccess]     = useState(null)
  const [selectedFeature, setSelectedFeature] = useState('avg_order_value')
  const addToast = useToast()

  const fetchDriftReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDriftReport()
      if (data) {
        setReport(data)
      } else {
        setError('Could not retrieve data drift report. Backend may be offline.')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch drift report.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDriftReport()
  }, [fetchDriftReport])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setChecking(true)
    setError(null)
    setUploadSuccess(null)
    addToast(`Auditing dataset '${file.name}' against reference baseline...`, 'info')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.checkDatasetDrift(formData)
      setReport(res)
      setUploadSuccess(`Successfully evaluated '${file.name}' against approved reference cohort.`)
      addToast(`Drift audit complete: Status ${res.overall_drift_status}`, 'success')
    } catch (err) {
      setError(err.message || 'Failed to analyze uploaded dataset.')
      addToast(err.message || 'Drift audit failed', 'error')
    } finally {
      setChecking(false)
      e.target.value = ''
    }
  }

  // Derive stats
  const overallStatus   = report?.overall_drift_status || 'STABLE'
  const refSize         = report?.reference_sample_size || 2200
  const currSize        = report?.current_sample_size || 2200
  const highDriftCount  = report?.high_drift_features?.length || 0
  const modDriftCount   = report?.moderate_drift_features?.length || 0
  const schemaStatus    = report?.schema_status || 'valid'
  const features        = report?.features || {}

  const activeFeatureData = features[selectedFeature] || Object.values(features)[0] || null

  return (
    <div className="page">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Automated Data Drift & Covariate Monitor</h1>
          <p className="page-subtitle">
            Two-Sample Kolmogorov-Smirnov (KS) · Chi-Square Test · Population Stability Index (PSI) Audits
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchDriftReport}
            disabled={checking || loading}
          >
            <RefreshCw size={14} className={loading ? 'is-spinning' : ''} />
            <span>Refresh Drift Audit</span>
          </button>
        </div>
      </div>

      {/* ── Governance Callout ───────────────────────────────────────────── */}
      <div className="notice-banner notice-banner--info">
        <div className="notice-banner__icon">
          <ShieldCheck size={20} className="text-primary-600" />
        </div>
        <div>
          <strong>Econometric Drift Governance Principles:</strong> Statistical drift denotes shifts in incoming customer
          covariate distributions ($P(X)$) relative to baseline training data. Under Double Machine Learning,
          causal estimates remain consistent as long as positivity (common support) holds. Statistical drift does <em>not</em> prove
          treatment decay and must <strong>never</strong> trigger automated retraining without formal econometrical review.
        </div>
      </div>

      {error && (
        <div className="notice-banner notice-banner--danger">
          <div className="notice-banner__icon">
            <AlertTriangle size={20} className="text-rose-600" />
          </div>
          <div style={{ flex: 1 }}>{error}</div>
        </div>
      )}

      {uploadSuccess && (
        <div className="notice-banner notice-banner--success">
          <div className="notice-banner__icon">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div style={{ flex: 1 }}>{uploadSuccess}</div>
        </div>
      )}

      {/* ── Upload & Audit File Card ─────────────────────────────────────── */}
      <SectionCard
        title="Audit Candidate Cohort for Distribution Drift"
        subtitle="Compare a newly arriving customer batch or campaign CSV against the approved baseline reference cohort"
        icon={UploadCloud}
        badge="Live KS & PSI Audit"
        badgeType="blue"
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>
              Upload Candidate Campaign Cohort (CSV):
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={checking || loading}
              className="form-input"
              style={{ width: '100%', padding: '8px 12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchDriftReport}
              disabled={checking || loading}
            >
              <RefreshCw size={15} className={loading ? 'is-spinning' : ''} />
              <span>{loading ? 'Evaluating…' : 'Re-run Baseline Audit'}</span>
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '12px' }}>
          Statistical Drift Diagnostics & Covariate Stability Scores
        </h2>
      </div>

      <div className="stat-grid-4">
        <StatCard
          label="Overall Cohort Status"
          value={overallStatus.replace('_', ' ')}
          sub={`Schema verification: ${schemaStatus.toUpperCase()}`}
          trend={{ value: overallStatus === 'STABLE' ? 'Covariates Stable' : 'Shift Detected', positive: overallStatus === 'STABLE' }}
          tooltip="Global stability verdict across all 7 monitored demographic and behavioral covariates."
          icon={ShieldCheck}
          color={overallStatus === 'STABLE' ? 'green' : 'amber'}
          highlight={true}
        />
        <StatCard
          label="Baseline Reference Size"
          value={`${refSize.toLocaleString()} records`}
          sub="Approved benchmark training cohort"
          tooltip="Historical cohort used for DML nuisance model cross-fitting."
          icon={Database}
          color="blue"
        />
        <StatCard
          label="Evaluated Cohort Size"
          value={`${currSize.toLocaleString()} records`}
          sub="Active dataset sample size"
          tooltip="Current customer batch under drift auditing."
          icon={Layers}
          color="indigo"
        />
        <StatCard
          label="Drifted Covariates"
          value={`${highDriftCount + modDriftCount} / ${Object.keys(features).length || 7}`}
          sub={`${highDriftCount} critical, ${modDriftCount} moderate`}
          trend={{ value: highDriftCount === 0 ? 'All 0 Critical' : 'Alert Triggered', positive: highDriftCount === 0 }}
          tooltip="Number of variables exceeding the standard PSI warning threshold (PSI > 0.10)."
          icon={Activity}
          color={highDriftCount === 0 ? 'green' : 'rose'}
        />
      </div>

      {/* ── Feature Drift Table ──────────────────────────────────────────── */}
      <SectionCard
        title="Covariate Distribution Stability Matrix"
        subtitle="Individual feature audit using Two-Sample Kolmogorov-Smirnov (KS) tests, Chi-Square contingency, and decile PSI"
        icon={Activity}
        badge="7 Covariates Monitored"
        badgeType="gray"
      >
        <div className="table-wrapper">
          <table className="data-table" aria-label="Feature drift diagnostics table">
            <thead>
              <tr>
                <th>Feature Name</th>
                <th>Data Type</th>
                <th>Statistical Test</th>
                <th>PSI Metric</th>
                <th>p-Value</th>
                <th>Baseline Mean / Class</th>
                <th>Current Mean / Class</th>
                <th>Stability Status</th>
                <th>Inspection</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(features).map(([featName, f]) => {
                const psiVal = f.psi ?? 0
                const isSelected = selectedFeature === featName
                return (
                  <tr
                    key={featName}
                    style={{ background: isSelected ? 'var(--primary-50)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedFeature(featName)}
                  >
                    <td>
                      <code style={{ fontWeight: 700, color: isSelected ? 'var(--primary-800)' : 'var(--slate-800)' }}>
                        {featName}
                      </code>
                    </td>
                    <td><span className="badge badge-gray">{f.feature_type}</span></td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>{f.test}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: psiVal >= 0.25 ? '#DC2626' : psiVal >= 0.10 ? '#D97706' : '#059669',
                      }}>
                        {psiVal.toFixed(4)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                      {f.p_value != null ? f.p_value.toFixed(4) : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {f.ref_mean != null ? f.ref_mean.toFixed(2) : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {f.curr_mean != null ? f.curr_mean.toFixed(2) : '—'}
                    </td>
                    <td>
                      {f.severity === 'high' ? (
                        <span className="badge badge-red">Critical Shift</span>
                      ) : f.severity === 'moderate' ? (
                        <span className="badge badge-amber">Moderate Shift</span>
                      ) : (
                        <span className="badge badge-green">Stable</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedFeature(featName) }}
                      >
                        {isSelected ? 'Viewing' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Bin-Level Distribution Comparison Chart & Table ──────────────── */}
      {activeFeatureData && activeFeatureData.bin_details?.length > 0 && (
        <SectionCard
          title={`Distribution Shift Analysis: ${selectedFeature}`}
          subtitle={`Quantile and category proportion shift breakdown contributing to total PSI of ${activeFeatureData.psi?.toFixed(4)}`}
          icon={BarChart2}
          badge={`PSI: ${activeFeatureData.psi?.toFixed(4)}`}
          badgeType={activeFeatureData.psi >= 0.10 ? 'amber' : 'green'}
        >
          {/* Plotly Chart: Reference % vs Current % */}
          <div style={{ width: '100%', height: '320px', marginBottom: '20px' }}>
            <Plot
              data={[
                {
                  x: activeFeatureData.bin_details.map(b => b.bin_range || b.category),
                  y: activeFeatureData.bin_details.map(b => b.ref_pct),
                  name: 'Reference Baseline %',
                  type: 'bar',
                  marker: { color: '#2563EB', opacity: 0.8 },
                  hovertemplate: '%{x}<br>Reference: %{y}%<extra></extra>',
                },
                {
                  x: activeFeatureData.bin_details.map(b => b.bin_range || b.category),
                  y: activeFeatureData.bin_details.map(b => b.curr_pct),
                  name: 'Current Cohort %',
                  type: 'bar',
                  marker: { color: '#10B981', opacity: 0.8 },
                  hovertemplate: '%{x}<br>Current: %{y}%<extra></extra>',
                },
              ]}
              layout={{
                title: { text: `<b>${selectedFeature}: Reference vs Current Cohort Proportions</b>`, font: { size: 13, color: '#0F172A' }, x: 0.02 },
                barmode: 'group',
                height: 310,
                autosize: true,
                margin: { l: 50, r: 20, t: 45, b: 65 },
                xaxis: { tickangle: -15, gridcolor: '#F1F5F9' },
                yaxis: { title: 'Cohort Proportion (%)', ticksuffix: '%', gridcolor: '#E2E8F0' },
                legend: { orientation: 'h', x: 0.02, y: 1.15, font: { size: 11 } },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bin / Category</th>
                  <th>Reference Cohort %</th>
                  <th>Current Cohort %</th>
                  <th>Net Proportion Delta</th>
                  <th>PSI Contribution</th>
                </tr>
              </thead>
              <tbody>
                {activeFeatureData.bin_details.map((b, idx) => {
                  const shift = (b.curr_pct - b.ref_pct).toFixed(2)
                  return (
                    <tr key={idx}>
                      <td><strong>{b.bin_range || b.category}</strong></td>
                      <td>{b.ref_pct}%</td>
                      <td>{b.curr_pct}%</td>
                      <td style={{ color: Number(shift) > 0 ? '#0284C7' : '#64748B', fontWeight: 600 }}>
                        {Number(shift) > 0 ? `+${shift}` : shift}%
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {b.psi_contribution.toFixed(5)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

    </div>
  )
}
