import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import { CheckCircle2, ChevronRight, Activity, Terminal } from 'lucide-react'
import './MainLayout.css'

const PAGE_METADATA = {
  overview: {
    title: 'Overview & Executive Summary',
    category: 'Dashboard',
    description: 'High-level commercial KPIs, Average Treatment Effect (ATE), and milestone status.',
  },
  data: {
    title: 'Data & Exploratory Analysis',
    category: 'Pipeline',
    description: 'Sanitized retail campaign cohort, feature correlations, and covariate distributions.',
  },
  causal: {
    title: 'Causal Inference & DAG',
    category: 'Econometrics',
    description: 'Structural Directed Acyclic Graph, unconfoundedness, and positivity common support.',
  },
  budget: {
    title: 'Campaign Budget Configuration',
    category: 'Prescriptive',
    description: 'Marketing expenditure limits, discount tiers, and customer segment quotas.',
  },
  uplift: {
    title: 'Uplift & Treatment Evaluation',
    category: 'Models',
    description: 'Cumulative Uplift curves, Qini coefficient (+0.6839), and decile targeting efficiency.',
  },
  optimization: {
    title: 'Discount Allocation Matrix',
    category: 'Optimization',
    description: 'SciPy HiGHS Mixed-Integer Linear Programming (MILP) knapsack solver with cannibalization penalty.',
  },
  drift: {
    title: 'Automated Data Drift Monitor',
    category: 'Governance',
    description: 'Two-sample Kolmogorov-Smirnov tests and decile Population Stability Index (PSI) audits.',
  },
  report: {
    title: 'Final Delivery & Executive Deck',
    category: 'Review',
    description: '10-slide executive presentation, oral viva rehearsal examiner, and final evaluation report.',
  },
}

/**
 * MainLayout Component
 * ====================
 * Root responsive application layout utilizing CSS Grid and Flexbox for the EconoCausal Dashboard.
 * Includes a collapsible sidebar navigation, persistent top header, responsive mobile drawer,
 * scrollable main content area, breadcrumb bar, and an enterprise footer.
 *
 * @param {React.ReactNode} children - Active page content to render in the main content container
 * @param {string} activePage - Identifier of current active page (e.g., 'overview', 'data', 'causal')
 * @param {function} onNavigate - Navigation callback invoked when a sidebar link or breadcrumb is clicked
 * @param {React.ReactNode} [headerActions] - Optional action buttons slot (e.g., export, filters)
 * @param {boolean} [showBreadcrumbs=true] - Whether to render the breadcrumb bar
 */
export default function MainLayout({
  children,
  activePage = 'overview',
  onNavigate,
  headerActions,
  showBreadcrumbs = true,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Keyboard shortcut: Press Ctrl+B or Cmd+B to toggle sidebar navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNavigate = (pageId) => {
    if (onNavigate) {
      onNavigate(pageId)
    }
    // Smooth scroll back to top of main content on page switch
    const mainEl = document.querySelector('.main-layout-content')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const pageMeta = PAGE_METADATA[activePage] || {
    title: 'Dashboard',
    category: 'EconoCausal',
    description: 'Dynamic Pricing via Double Machine Learning and Prescriptive Knapsack Optimization.',
  }

  return (
    <div className={`main-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <TopBar
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
        activePage={activePage}
      />

      {/* ── Sidebar Navigation ─────────────────────────────────────────── */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="main-layout-content" role="main" id="main-content-area">
        <div className="main-layout-container">
          {/* Optional Breadcrumb Sub-Header */}
          {showBreadcrumbs && (
            <div className="main-layout-breadcrumb-bar">
              <nav aria-label="Breadcrumb" className="main-layout-breadcrumbs">
                <button
                  type="button"
                  onClick={() => handleNavigate('overview')}
                  title="Navigate to Overview"
                >
                  EconoCausal
                </button>
                <ChevronRight size={13} aria-hidden="true" />
                <span>{pageMeta.category}</span>
                <ChevronRight size={13} aria-hidden="true" />
                <span className="current" aria-current="page">{pageMeta.title}</span>
              </nav>

              {/* Action buttons slot if provided */}
              {headerActions && (
                <div className="main-layout-quick-actions">
                  {headerActions}
                </div>
              )}
            </div>
          )}

          {/* Page Body View */}
          <div className="main-layout-page-body">
            {children}
          </div>
        </div>

        {/* ── Enterprise Footer ─────────────────────────────────────────── */}
        <footer className="main-layout-footer" role="contentinfo">
          <div className="footer-left">
            <span className="footer-ref-badge">ITS/DSML/1147</span>
            <span>EconoCausal Analytics Platform v4.0.0</span>
            <span style={{ color: 'var(--slate-300)' }}>•</span>
            <span className="footer-status-indicator">
              <CheckCircle2 size={13} />
              <span>DML Point Estimate Verified (+19.47 pp ATE)</span>
            </span>
          </div>

          <div className="footer-right">
            <span>Infotact Solutions DSML</span>
            <span style={{ color: 'var(--slate-300)' }}>•</span>
            <button
              type="button"
              className="footer-link"
              onClick={() => handleNavigate('report')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
            >
              Review Readiness Deck
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}

export { MainLayout }
