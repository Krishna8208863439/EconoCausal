import React, { useState, useEffect } from 'react'
import {
  Menu,
  RefreshCw,
  GitFork,
  ChevronRight
} from 'lucide-react'
import { api } from '../services/api.js'
import './TopBar.css'

export default function TopBar({ onMenuToggle, activePage = 'overview' }) {
  const [health, setHealth] = useState(null)
  const [driftReport, setDriftReport] = useState(null)
  const [lastUpdated, setLastUpdated] = useState('Just now')
  const [refreshing, setRefreshing] = useState(false)

  const PAGE_NAMES = {
    overview: 'Overview & Executive Summary',
    data: 'Data & Exploratory Analysis',
    causal: 'Causal Inference & DAG',
    budget: 'Campaign Budget Configuration',
    uplift: 'Uplift & Treatment Evaluation',
    optimization: 'Discount Allocation Matrix',
    drift: 'Automated Data Drift Monitor',
    report: 'Final Delivery & Reports',
  }

  const loadStatus = async () => {
    try {
      const [h, d] = await Promise.all([
        api.getHealth().catch(() => ({ status: 'offline', version: '4.0.0' })),
        api.getDriftReport().catch(() => null),
      ])
      setHealth(h)
      if (d) setDriftReport(d)
      const now = new Date()
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch {
      // safe fallback
    }
  }

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 20000)
    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadStatus()
    setTimeout(() => setRefreshing(false), 600)
  }

  const isLive = health?.status === 'ok'
  const isDriftStable = driftReport?.overall_drift_status === 'STABLE' || !driftReport

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <GitFork size={18} className="brand-icon" />
          </div>
          <div className="brand-text-container">
            <div className="brand-title-row">
              <span className="brand-title">EconoCausal</span>
              <span className="brand-badge-ref">ITS/DSML/1147</span>
            </div>
            <span className="brand-subtitle">Dynamic Pricing via Double Machine Learning</span>
          </div>
        </div>

        <div className="breadcrumb-divider" aria-hidden="true">
          <ChevronRight size={16} />
        </div>
        <div className="current-page-tag">
          {PAGE_NAMES[activePage] || 'Dashboard'}
        </div>
      </div>

      <div className="topbar-right">
        {/* Timestamp & Refresh */}
        <div className="topbar-actions">
          <span className="last-sync-time" title="Last checked with backend API">
            Synced {lastUpdated}
          </span>
          <button
            className={`refresh-btn ${refreshing ? 'is-spinning' : ''}`}
            onClick={handleManualRefresh}
            title="Refresh System Status"
            aria-label="Refresh Status"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
