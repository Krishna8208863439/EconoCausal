import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import {
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  RefreshCw,
  HardDrive,
  Layers,
  Sparkles,
  Database
} from 'lucide-react'
import { api } from '../services/api.js'
import { useToast } from './Toast.jsx'
import './CsvHistoryManager.css'

export default function CsvHistoryManager({ activeFileName, onDatasetSelected, currentData }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSnapshotInput, setShowSnapshotInput] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [savingSnapshot, setSavingSnapshot] = useState(false)
  const addToast = useToast()

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await api.getCsvHistory()
      setHistory(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Failed to load CSV history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleActivate = async (item) => {
    try {
      addToast(`Loading ${item.name}…`, 'info')
      let csvText = ''

      if (item.is_default) {
        const res = await fetch('/cleaned_retail_campaign.csv')
        csvText = await res.text()
      } else {
        const downloadUrl = api.getCsvDownloadUrl(item.id)
        const res = await fetch(downloadUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status} retrieving dataset`)
        csvText = await res.text()
      }

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async (results) => {
          onDatasetSelected(results.data, item.name || item.filename)
          try {
            await api.activateCsvHistory(item.id)
          } catch {
            // fallback
          }
          await loadHistory()
          addToast(`Active dataset set to "${item.name}" (${results.data.length.toLocaleString()} rows)`, 'success')
        },
        error: (err) => {
          addToast(`Failed to parse CSV: ${err.message}`, 'error')
        }
      })
    } catch (err) {
      addToast(`Activation failed: ${err.message}`, 'error')
    }
  }

  const handleDownload = async (item) => {
    try {
      addToast(`Preparing download for ${item.filename}…`, 'info')
      let downloadUrl = ''
      if (item.is_default) {
        downloadUrl = '/cleaned_retail_campaign.csv'
      } else {
        downloadUrl = api.getCsvDownloadUrl(item.id)
      }

      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error('File download unavailable')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.filename || 'dataset.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      addToast(`Downloaded ${item.filename}`, 'success')
    } catch (err) {
      addToast(`Download failed: ${err.message}`, 'error')
    }
  }

  const handleDelete = async (item) => {
    if (item.is_default) {
      addToast('Cannot delete default benchmark dataset', 'warning')
      return
    }

    if (!window.confirm(`Delete "${item.name}" from history?`)) return

    try {
      await api.deleteCsvHistory(item.id)
      await loadHistory()
      addToast(`Deleted "${item.name}" from history`, 'success')
    } catch (err) {
      addToast(`Delete failed: ${err.message}`, 'error')
    }
  }

  const handleSaveSnapshot = async (e) => {
    e.preventDefault()
    if (!snapshotName.trim()) {
      addToast('Please enter a name for the snapshot', 'warning')
      return
    }

    setSavingSnapshot(true)
    try {
      await api.saveCurrentCsvSnapshot(snapshotName.trim())
      setSnapshotName('')
      setShowSnapshotInput(false)
      await loadHistory()
      addToast(`Snapshot "${snapshotName.trim()}" saved to history`, 'success')
    } catch (err) {
      addToast(`Failed to save snapshot: ${err.message}`, 'error')
    } finally {
      setSavingSnapshot(false)
    }
  }

  const filteredHistory = history.filter(item => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.filename && item.filename.toLowerCase().includes(q)) ||
      (item.source && item.source.toLowerCase().includes(q))
    )
  })

  return (
    <div className="csv-history-manager">
      {/* ── Toolbar: Search & Create Snapshot ─────────────────────────────── */}
      <div className="history-toolbar">
        <div className="history-search-box">
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search saved datasets & versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="history-toolbar-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSnapshotInput(!showSnapshotInput)}
          >
            <Plus size={14} />
            <span>{showSnapshotInput ? 'Cancel Snapshot' : 'Save Current Snapshot'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadHistory}
            disabled={loading}
            title="Refresh dataset history"
          >
            <RefreshCw size={14} className={loading ? 'is-spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Inline Snapshot Creator Form ──────────────────────────────────── */}
      {showSnapshotInput && (
        <form className="snapshot-creator-bar" onSubmit={handleSaveSnapshot}>
          <Sparkles size={16} color="#D97706" />
          <input
            type="text"
            placeholder="Enter snapshot name (e.g., Q4 Festive Campaign Cohort, Diwali 2026 Test)..."
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={savingSnapshot || !snapshotName.trim()}
          >
            {savingSnapshot ? 'Saving Snapshot…' : 'Save Snapshot'}
          </button>
        </form>
      )}

      {/* ── Historical Datasets Cards Grid ────────────────────────────────── */}
      {filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px', color: '#64748B', background: '#F8FAFC', borderRadius: '8px' }}>
          No dataset history records matching "{searchTerm}".
        </div>
      ) : (
        <div className="history-cards-grid">
          {filteredHistory.map((item) => {
            const isActive = item.is_active || (activeFileName && activeFileName.includes(item.filename))
            const isBenchmark = item.is_default
            const badgeType = isBenchmark ? 'benchmark' : item.source === 'Saved Snapshot' ? 'snapshot' : 'upload'

            return (
              <div key={item.id} className={`history-card ${isActive ? 'is-active' : ''}`}>
                <div>
                  <div className="history-card-header">
                    <div className="history-card-icon-title">
                      <div className={`history-icon-badge ${badgeType}`}>
                        {isBenchmark ? <Database size={18} /> : <FileSpreadsheet size={18} />}
                      </div>
                      <div>
                        <h4 className="history-card-name">{item.name}</h4>
                        <div className="history-card-file">{item.filename}</div>
                      </div>
                    </div>

                    <div>
                      {isActive ? (
                        <span className="history-tag-badge active-pulse">
                          <CheckCircle2 size={11} /> Active
                        </span>
                      ) : isBenchmark ? (
                        <span className="history-tag-badge default">Benchmark</span>
                      ) : (
                        <span className="history-tag-badge user-upload">{item.source || 'Upload'}</span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="history-metrics-row" style={{ marginTop: '12px' }}>
                    <span title="Total customer rows">
                      <Layers size={13} color="#64748B" />
                      <strong>{(item.rows || 2200).toLocaleString()}</strong> rows
                    </span>
                    <span title="File size on disk">
                      <HardDrive size={13} color="#64748B" />
                      {item.size_formatted || '136.7 KB'}
                    </span>
                    {item.treated_count !== undefined && (
                      <span title="Treated vs Control Breakdown" style={{ color: '#059669', fontSize: '0.76rem' }}>
                        T: {item.treated_count} / C: {item.control_count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with date & actions */}
                <div className="history-card-footer">
                  <div className="history-timestamp" title={`Saved: ${item.upload_time || ''}`}>
                    <Clock size={12} />
                    <span>{item.formatted_date || 'Initial Benchmark'}</span>
                  </div>

                  <div className="history-card-actions">
                    {isActive ? (
                      <span className="btn-active-indicator">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-activate"
                        onClick={() => handleActivate(item)}
                        title="Load and switch to this dataset"
                      >
                        Activate
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={() => handleDownload(item)}
                      title="Download CSV"
                      aria-label="Download CSV"
                    >
                      <Download size={13} />
                    </button>

                    {!isBenchmark && (
                      <button
                        type="button"
                        className="btn-icon-action danger"
                        onClick={() => handleDelete(item)}
                        title="Delete dataset"
                        aria-label="Delete dataset"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
