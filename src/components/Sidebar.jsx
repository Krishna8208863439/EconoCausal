import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Database,
  GitFork,
  Sliders,
  TrendingUp,
  Target,
  ShieldCheck,
  Presentation,
  CheckCircle,
  X,
  Sparkles,
  Percent,
  Award,
  Activity,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ExternalLink,
  Clock,
  Compass,
  FileDown,
  Layers,
  Palette
} from 'lucide-react'
import { activityLogger } from '../services/activityLogger'
import './Sidebar.css'

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Executive KPI dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'data',
    label: 'Data & EDA',
    description: 'Dataset & exploratory stats',
    icon: Database,
  },
  {
    id: 'causal',
    label: 'Causal DAG & DML',
    description: 'DoWhy DAG & Robinson DML',
    icon: GitFork,
  },
  {
    id: 'validation',
    label: 'Causal Validation',
    description: 'Refutations & Estimator Bake-Off',
    icon: Award,
  },
  {
    id: 'elasticity',
    label: 'Dynamic Pricing',
    description: 'Price Elasticity & Markup Rule',
    icon: Percent,
  },
  {
    id: 'budget',
    label: 'Budget Config',
    description: 'Simulate campaign spend',
    icon: Sliders,
  },
  {
    id: 'uplift',
    label: 'Uplift Analysis',
    description: 'Qini & treatment curves',
    icon: TrendingUp,
  },
  {
    id: 'optimization',
    label: 'Discount Allocation',
    description: 'Profit-aware MILP matrix',
    icon: Target,
  },
  {
    id: 'drift',
    label: 'Data Drift Monitor',
    description: 'KS & PSI stability audits',
    icon: ShieldCheck,
  },
  {
    id: 'report',
    label: 'Executive Report & Viva',
    description: 'Briefing, A/B Planner & PDF',
    icon: Presentation,
  },
]

function getActivityIcon(type) {
  switch (type) {
    case 'optimization':
      return Target
    case 'navigation':
      return Compass
    case 'config':
      return Sliders
    case 'validation':
      return Award
    case 'export':
      return FileDown
    case 'theme':
      return Palette
    case 'audit':
      return ShieldCheck
    case 'system':
    default:
      return Layers
  }
}

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  const [activities, setActivities] = useState([])
  const [activityExpanded, setActivityExpanded] = useState(true)
  const [showFullModal, setShowFullModal] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('all')

  // Load activities and subscribe to real-time events
  useEffect(() => {
    setActivities(activityLogger.getLogs())
    const unsubscribe = activityLogger.subscribe((updated) => {
      setActivities(updated)
    })
    return unsubscribe
  }, [])

  const handleClearActivities = (e) => {
    e.stopPropagation()
    activityLogger.clearLogs()
  }

  const handleItemClick = (act) => {
    if (act.pageId) {
      onNavigate(act.pageId)
      if (window.innerWidth <= 768 && onClose) {
        onClose()
      }
      setShowFullModal(false)
    }
  }

  const filteredModalActivities = activities.filter(act => {
    if (selectedFilter === 'all') return true
    return act.type === selectedFilter
  })

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-mobile-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        className={`sidebar ${isOpen ? 'open' : 'closed'}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-nav-title">
            <span>Modules</span>
            <span className="modules-count">10 Modules</span>
          </div>
          {/* Close button for mobile */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-scrollable">
          <ul className="nav-list" role="list">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <li key={item.id} className="nav-list-item">
                  <button
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onNavigate(item.id)
                      if (window.innerWidth <= 768 && onClose) {
                        onClose()
                      }
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.description}
                  >
                    <div className="nav-icon-box">
                      <Icon size={18} className="nav-icon" />
                    </div>
                    <div className="nav-text-block">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-desc">{item.description}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* ── New Activity Section in Sidebar ─────────────────────────── */}
          <div className="sidebar-activity-section">
            <div
              className="sidebar-activity-header"
              onClick={() => setActivityExpanded(v => !v)}
              role="button"
              tabIndex={0}
              aria-expanded={activityExpanded}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActivityExpanded(v => !v)
                }
              }}
            >
              <div className="sidebar-activity-title">
                <div className="activity-live-indicator" title="Live action stream active">
                  <span className="pulse-dot green" />
                </div>
                <Activity size={14} className="activity-title-icon" />
                <span>Live Activity</span>
                <span className="activity-count-badge" title="Tracked user actions">
                  {activities.length}
                </span>
              </div>

              <div className="sidebar-activity-controls" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="activity-mini-btn"
                  onClick={handleClearActivities}
                  title="Clear Activity History"
                  aria-label="Clear Activity History"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  type="button"
                  className="activity-mini-btn"
                  onClick={() => setShowFullModal(true)}
                  title="View Full Activity Stream"
                  aria-label="View Full Activity Stream"
                >
                  <ExternalLink size={12} />
                </button>
                <button
                  type="button"
                  className="activity-mini-btn"
                  onClick={() => setActivityExpanded(v => !v)}
                  title={activityExpanded ? 'Collapse Activity Section' : 'Expand Activity Section'}
                  aria-label="Toggle Activity Section"
                >
                  {activityExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {activityExpanded && (
              <div className="sidebar-activity-body">
                {activities.length === 0 ? (
                  <div className="sidebar-activity-empty">
                    <Clock size={14} />
                    <span>No recent activity yet. Actions will appear here as you navigate and optimize.</span>
                  </div>
                ) : (
                  <div className="sidebar-activity-list" role="list">
                    {activities.slice(0, 5).map((act) => {
                      const ActIcon = getActivityIcon(act.type)
                      return (
                        <div
                          key={act.id}
                          className={`sidebar-activity-item ${act.pageId ? 'clickable' : ''}`}
                          onClick={() => handleItemClick(act)}
                          title={act.pageId ? `Jump to ${act.title}` : act.title}
                          role="listitem"
                        >
                          <div className={`activity-type-badge ${act.type}`}>
                            <ActIcon size={12} />
                          </div>
                          <div className="activity-item-details">
                            <div className="activity-item-top">
                              <span className="activity-item-title">{act.title}</span>
                              <span className="activity-item-time">{act.timeFormatted}</span>
                            </div>
                            {act.description && (
                              <div className="activity-item-desc">{act.description}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activities.length > 5 && (
                  <button
                    type="button"
                    className="activity-view-all-btn"
                    onClick={() => setShowFullModal(true)}
                  >
                    <span>View all {activities.length} activity records</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="causal-engine-badge">
            <div className="engine-badge-header">
              <Sparkles size={14} className="engine-sparkle" />
              <span className="engine-title">Double Machine Learning</span>
            </div>
            <p className="engine-meta">
              EconML CausalForest · 5-Fold Cross-Fitting · MILP HiGHS
            </p>
            <div className="engine-status-row">
              <span className="pulse-dot green" />
              <span className="engine-status-text">Production Causal Engine</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Full Activity History Modal ────────────────────────────────────── */}
      {showFullModal && (
        <div className="activity-modal-backdrop" onClick={() => setShowFullModal(false)}>
          <div className="activity-modal-container" onClick={e => e.stopPropagation()}>
            <div className="activity-modal-header">
              <div className="activity-modal-title-row">
                <div className="activity-modal-icon-wrapper">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="activity-modal-title">Live User Activity Log</h3>
                  <p className="activity-modal-subtitle">
                    Audit trail of page navigations, MILP optimization runs, parameter tweaks, and report exports
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="activity-modal-close-btn"
                onClick={() => setShowFullModal(false)}
                aria-label="Close activity log"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="activity-filter-bar">
              {[
                { id: 'all', label: 'All Activities' },
                { id: 'navigation', label: 'Navigation' },
                { id: 'optimization', label: 'Optimizations' },
                { id: 'config', label: 'Config & Budget' },
                { id: 'validation', label: 'Causal Validation' },
                { id: 'export', label: 'Exports' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`activity-filter-tab ${selectedFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}

              <div className="activity-filter-actions">
                <button
                  type="button"
                  className="activity-clear-all-btn"
                  onClick={handleClearActivities}
                  title="Clear all recorded history"
                >
                  <RotateCcw size={13} />
                  <span>Clear History</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="activity-modal-body">
              {filteredModalActivities.length === 0 ? (
                <div className="activity-modal-empty">
                  <Clock size={24} />
                  <p>No activity logs recorded under this filter.</p>
                </div>
              ) : (
                <div className="activity-modal-stream">
                  {filteredModalActivities.map((act) => {
                    const ActIcon = getActivityIcon(act.type)
                    return (
                      <div
                        key={act.id}
                        className={`activity-stream-row ${act.pageId ? 'clickable' : ''}`}
                        onClick={() => handleItemClick(act)}
                      >
                        <div className={`activity-type-badge ${act.type}`}>
                          <ActIcon size={14} />
                        </div>
                        <div className="activity-stream-content">
                          <div className="activity-stream-header">
                            <span className="activity-stream-title">{act.title}</span>
                            <span className="activity-stream-badge">{act.type}</span>
                            <span className="activity-stream-time">{act.timeFormatted}</span>
                          </div>
                          {act.description && (
                            <div className="activity-stream-desc">{act.description}</div>
                          )}
                          <div className="activity-stream-meta">
                            <span>Recorded: {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            {act.pageId && (
                              <span className="activity-jump-hint">Click to navigate →</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="activity-modal-footer">
              <span>Showing {filteredModalActivities.length} of {activities.length} tracked user interactions</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowFullModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
