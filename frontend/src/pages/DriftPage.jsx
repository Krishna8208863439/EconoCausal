/**
 * frontend/src/pages/DriftPage.jsx
 * ================================
 * EconoCausal — Week 4: Automated Data Drift Monitoring & Quality Auditing
 * Project Reference: ITS/DSML/1147
 *
 * Implements:
 *  - Covariate distribution stability monitoring (Kolmogorov-Smirnov & Chi² tests, PSI).
 *  - Live cohort auditing via interactive CSV drag-and-drop / upload.
 *  - Natural-language drift diagnostics and plain-language interpretation.
 *  - Missing-value spike detection and schema integrity auditing.
 *  - Econometric governance guidelines (no autonomous retraining without human review).
 */

import React, { useState, useEffect, useCallback } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import './Page.css'

export default function DriftPage() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [selectedFeature, setSelectedFeature] = useState('avg_order_value')

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

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.checkDatasetDrift(formData)
      setReport(res)
      setUploadSuccess(`Successfully evaluated '${file.name}' against approved reference dataset.`)
    } catch (err) {
      setError(err.message || 'Failed to analyze uploaded dataset.')
    } finally {
      setChecking(false)
      e.target.value = ''
    }
  }

  // Derive stats
  const overallStatus = report?.overall_drift_status || 'STABLE'
  const refSize = report?.reference_sample_size || 2200
  const currSize = report?.current_sample_size || 2200
  const highDriftCount = report?.high_drift_features?.length || 0
  const modDriftCount = report?.moderate_drift_features?.length || 0
  const schemaStatus = report?.schema_status || 'valid'
  const features = report?.features || {}

  const getStatusBadge = (status) => {
    switch (status) {
      case 'STABLE':
        return <span className="badge badge-green">🟢 Stable (No Drift)</span>
      case 'MODERATE_DRIFT':
        return <span className="badge badge-yellow">🟡 Moderate Shift</span>
      case 'DRIFT_DETECTED':
      case 'CRITICAL_DRIFT':
        return <span className="badge badge-red">🔴 Drift Warning</span>
      default:
        return <span className="badge badge-gray">{status}</span>
    }
  }

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'none':
        return <span style={{ color: '#059669', fontWeight: 600 }}>Stable</span>
      case 'moderate':
        return <span style={{ color: '#D97706', fontWeight: 600 }}>Moderate</span>
      case 'high':
        return <span style={{ color: '#DC2626', fontWeight: 600 }}>High Drift</span>
      default:
        return <span>{sev}</span>
    }
  }

  return (
    <div className="page" style={{ paddingBottom: '40px' }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">Week 4 Live</span>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              Reliability & Drift Diagnostics • Statistical Monitoring
            </span>
          </div>
          <h1>Automated Data Drift & Quality Monitor</h1>
          <p className="page-desc">
            Monitor covariate distributions, missingness spikes, and population stability across customer segments
            to ensure reliable causal Double Machine Learning inferences.
          </p>
        </div>
      </div>

      {/* ── Alerts & Disclaimers ─────────────────────────────────────────────── */}
      <div className="notice-banner notice-banner--info" style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '1.2rem' }}>🛡️</span>
        <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: '1.45' }}>
          <strong>Econometric Drift Governance:</strong> A statistical drift alert indicates that incoming customer
          covariates have shifted relative to the baseline training population. Under Double Machine Learning,
          causal estimates remain consistent if common support holds. Statistical drift does <em>not</em> prove
          model decay and must <strong>never</strong> trigger automated retraining without human review.
        </div>
      </div>

      {error && (
        <div className="notice-banner notice-banner--danger" style={{ marginBottom: '20px' }}>
          <span>❌</span>
          <div style={{ flex: 1 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {uploadSuccess && (
        <div className="notice-banner notice-banner--success" style={{ marginBottom: '20px', background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
          <span>✅</span>
          <div style={{ flex: 1 }}>{uploadSuccess}</div>
          <button onClick={() => setUploadSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Interactive Upload & Action Bar ──────────────────────────────────── */}
      <SectionCard
        title="Cohort Drift Audit & Controls"
        subtitle="Compare newly arriving customer batches or campaign responses against the approved reference cohort"
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Audit New Campaign Cohort CSV:
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={checking || loading}
              style={{
                fontSize: '0.85rem',
                border: '1px solid #CBD5E1',
                padding: '6px 10px',
                borderRadius: '6px',
                width: '100%',
                backgroundColor: '#F8FAFC',
              }}
            />
          </div>

          <button
            onClick={fetchDriftReport}
            className="btn btn-secondary"
            disabled={checking || loading}
            style={{ height: '38px', marginTop: '20px' }}
          >
            {loading ? 'Evaluating…' : '🔄 Refresh Baseline Audit'}
          </button>
        </div>
      </SectionCard>

      {/* ── KPI Stat Cards ───────────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginTop: '20px', marginBottom: '24px' }}>
        <StatCard
          title="Overall Status"
          value={overallStatus.replace('_', ' ')}
          subtext={`Schema: ${schemaStatus.toUpperCase()}`}
          badge={overallStatus === 'STABLE' ? 'Passed' : 'Warning'}
          badgeType={overallStatus === 'STABLE' ? 'success' : 'warning'}
        />
        <StatCard
          title="Baseline Cohort"
          value={`${refSize.toLocaleString()} rows`}
          subtext="Approved reference data"
          badge="Reference"
          badgeType="default"
        />
        <StatCard
          title="Evaluated Cohort"
          value={`${currSize.toLocaleString()} rows`}
          subtext="Active/Uploaded dataset"
          badge="Current"
          badgeType="info"
        />
        <StatCard
          title="Drifted Features"
          value={`${highDriftCount + modDriftCount} / ${Object.keys(features).length}`}
          subtext={`${highDriftCount} high, ${modDriftCount} moderate`}
          badge={highDriftCount === 0 ? "Normal" : "Alert"}
          badgeType={highDriftCount === 0 ? "success" : "danger"}
        />
      </div>

      {/* ── Feature-Level Drift Table ────────────────────────────────────────── */}
      <SectionCard
        title="Covariate Distribution Stability Matrix"
        subtitle="Two-Sample Kolmogorov-Smirnov (KS) test, Chi-Square contingency test, and decile Population Stability Index (PSI)"
      >
        <div className="table-wrapper">
          <table className="data-table" aria-label="Feature drift diagnostics">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Type</th>
                <th>Statistical Test</th>
                <th>PSI Metric</th>
                <th>p-value</th>
                <th>Baseline Avg / Class</th>
                <th>Current Avg / Class</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(features).map(([featName, f]) => {
                const psiVal = f.psi ?? 0
                const isSelected = selectedFeature === featName
                return (
                  <tr
                    key={featName}
                    style={{
                      backgroundColor: isSelected ? '#EFF6FF' : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedFeature(featName)}
                    title="Click to view detailed bin breakdown below"
                  >
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>
                      {featName}
                      {f.severity === 'high' && ' ⚠️'}
                    </td>
                    <td>
                      <span className="badge badge-gray">{f.feature_type}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>{f.test}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: psiVal >= 0.25 ? '#DC2626' : psiVal >= 0.10 ? '#D97706' : '#059669',
                      }}>
                        {psiVal.toFixed(4)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {f.p_value != null ? f.p_value.toFixed(4) : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {f.ref_mean != null ? f.ref_mean.toFixed(2) : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {f.curr_mean != null ? f.curr_mean.toFixed(2) : '—'}
                    </td>
                    <td>{getSeverityBadge(f.severity)}</td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedFeature(featName) }}
                        style={{
                          background: isSelected ? '#2563EB' : '#F1F5F9',
                          color: isSelected ? '#FFF' : '#334155',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
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

      {/* ── Bin-Level PSI Breakdown ─────────────────────────────────────────── */}
      {selectedFeature && features[selectedFeature]?.bin_details?.length > 0 && (
        <SectionCard
          title={`Detailed Bin Analysis: ${selectedFeature}`}
          subtitle={`Quantile and category proportion shift breakdown contributing to the total PSI of ${features[selectedFeature].psi?.toFixed(4)}`}
        >
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bin / Category</th>
                  <th>Reference Cohort %</th>
                  <th>Current Cohort %</th>
                  <th>Net Shift (pp)</th>
                  <th>PSI Contribution</th>
                </tr>
              </thead>
              <tbody>
                {features[selectedFeature].bin_details.map((b, idx) => {
                  const shift = (b.curr_pct - b.ref_pct).toFixed(2)
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{b.bin_range || b.category}</td>
                      <td>{b.ref_pct}%</td>
                      <td>{b.curr_pct}%</td>
                      <td style={{ color: Number(shift) > 0 ? '#0284C7' : '#64748B' }}>
                        {Number(shift) > 0 ? `+${shift}` : shift}%
                      </td>
                      <td style={{ fontWeight: 600, color: b.psi_contribution > 0.05 ? '#D97706' : '#334155' }}>
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

      {/* ── Missingness and Data Quality Auditing ────────────────────────────── */}
      <SectionCard
        title="Data Quality & Missingness Auditing"
        subtitle="Auditing completeness of incoming customer attributes against approved baselines"
      >
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Baseline Missing %</th>
                <th>Current Missing %</th>
                <th>Net Delta (pp)</th>
                <th>Quality Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report?.missingness_summary || {}).map(([col, m]) => (
                <tr key={col}>
                  <td style={{ fontWeight: 600 }}>{col}</td>
                  <td>{m.ref_missing_pct}%</td>
                  <td>{m.curr_missing_pct}%</td>
                  <td>{m.delta_pct > 0 ? `+${m.delta_pct}` : m.delta_pct}%</td>
                  <td>
                    {m.alert ? (
                      <span className="badge badge-red">⚠️ Missingness Spike (&gt;5 pp)</span>
                    ) : (
                      <span className="badge badge-green">✅ Normal (&lt;5% Missing)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Plain-Language Recommendations ─────────────────────────────────── */}
      <SectionCard
        title="Recommended Operational Actions"
        subtitle="Plain-language business directives based on data stability and econometric governance rules"
      >
        <ul style={{ paddingLeft: '20px', lineHeight: '1.7', fontSize: '0.88rem', color: '#334155' }}>
          {report?.recommendations?.map((rec, idx) => (
            <li key={idx} style={{ marginBottom: '8px' }}>{rec}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
