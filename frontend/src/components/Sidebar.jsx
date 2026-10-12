import React from 'react'
import './Sidebar.css'

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',            icon: '🏠', week: 1 },
  { id: 'data',         label: 'Data & EDA',           icon: '📊', week: 1 },
  { id: 'causal',       label: 'Causal Analysis',      icon: '🔗', week: 1 },
  { id: 'budget',       label: 'Budget Config',         icon: '💰', week: 1 },
  { id: 'uplift',       label: 'Uplift Analysis',       icon: '📈', week: 2 },
  { id: 'optimization', label: 'Discount Allocation',   icon: '🎯', week: 3 },
  { id: 'drift',        label: 'Data Drift Monitor',    icon: '🛡️', week: 4 },
  { id: 'report',       label: 'Final Delivery & Deck', icon: '📑', week: 4 },
]

export default function Sidebar({ activePage, onNavigate, isOpen }) {
  return (
    <nav
      className={`sidebar ${isOpen ? 'open' : 'closed'}`}
      aria-label="Main navigation"
    >
      <div className="sidebar-section-label">Navigation</div>

      <ul className="nav-list" role="list">
        {NAV_ITEMS.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item ${activePage === item.id ? 'active' : ''} ${item.planned ? 'planned' : ''}`}
              onClick={() => !item.planned && onNavigate(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
              aria-disabled={item.planned ? 'true' : undefined}
              title={item.planned ? `Week ${item.week} — not yet implemented` : item.label}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.planned && (
                <span className="badge badge-gray nav-badge">Week {item.week}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="status-block">
          <span className="status-dot active" aria-hidden="true" />
          <span>Week 1, 2, 3 & 4 Live</span>
        </div>
      </div>
    </nav>
  )
}
