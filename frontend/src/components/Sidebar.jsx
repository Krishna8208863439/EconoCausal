import React from 'react'
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
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'
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
    description: 'Prescriptive MILP matrix',
    icon: Target,
  },
  {
    id: 'drift',
    label: 'Data Drift Monitor',
    description: 'KS & PSI stability audits',
    icon: ShieldCheck,
  },
]

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
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
            <span className="modules-count">6 Modules</span>
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
    </>
  )
}
