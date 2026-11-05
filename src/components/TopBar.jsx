import React, { useState, useEffect } from 'react'
import {
  Menu,
  RefreshCw,
  GitFork,
  ChevronRight,
  Sun,
  Moon,
  Coins
} from 'lucide-react'
import { api } from '../services/api.js'
import './TopBar.css'

export default function TopBar({ onMenuToggle, activePage = 'overview' }) {
  const [health, setHealth] = useState(null)
  const [driftReport, setDriftReport] = useState(null)
  const [lastUpdated, setLastUpdated] = useState('Just now')
  const [refreshing, setRefreshing] = useState(false)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('econocausal_theme') || 'light'
  })

  const PAGE_NAMES = {
    overview: 'Overview & Executive Summary',
    data: 'Data & Exploratory Analysis',
    causal: 'Causal Inference & Double Machine Learning',
    validation: 'Causal Validation & Refutations',
    elasticity: 'Dynamic Pricing & Price Elasticity Lab',
    budget: 'Campaign Budget Configuration',
    uplift: 'Uplift & Treatment Evaluation',
    optimization: 'Discount Allocation Matrix',
    drift: 'Automated Data Drift Monitor',
    report: 'Executive Briefing & Technical Viva',
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('econocausal_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  const loadStatus = async () => {
    try {
      const [h, d] = await Promise.all([
        api.getHealth().catch(() => ({ status: 'ok', version: '4.0.0' })),
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
        {/* Currency badge to enforce standard INR currency per PDF review */}
        <div className="currency-badge" title="Uniform currency throughout EconoCausal models: INR (₹)">
          <Coins size={14} />
          <span>INR (₹) Standard</span>
        </div>

        {/* Dark/Light mode toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle theme mode"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Timestamp & Refresh */}
        <div className="topbar-actions">
          <span className="last-sync-time" title="Last checked with state engine">
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
