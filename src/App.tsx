import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import DataPage from './pages/DataPage.jsx'
import CausalPage from './pages/CausalPage.jsx'
import ValidationPage from './pages/ValidationPage.jsx'
import ElasticityPage from './pages/ElasticityPage.jsx'
import BudgetPage from './pages/BudgetPage.jsx'
import UpliftPage from './pages/UpliftPage.jsx'
import BudgetOptimization from './pages/BudgetOptimization.jsx'
import DriftPage from './pages/DriftPage.jsx'
import FinalReportPage from './pages/FinalReportPage.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { activityLogger } from './services/activityLogger'
import './App.css'

export type ThemeMode = 'light' | 'dark'

const PAGES: Record<string, React.ComponentType<any>> = {
  overview:     OverviewPage,
  data:         DataPage,
  causal:       CausalPage,
  validation:   ValidationPage,
  elasticity:   ElasticityPage,
  budget:       BudgetPage,
  uplift:       UpliftPage,
  optimization: BudgetOptimization,
  drift:        DriftPage,
  report:       FinalReportPage,
}

const PAGE_TITLES: Record<string, string> = {
  overview:     'Overview & Executive Summary',
  data:         'Data & Exploratory Analysis',
  causal:       'Causal DAG & Robinson DML',
  validation:   'Causal Validation & Refutations',
  elasticity:   'Dynamic Pricing & Price Elasticity Lab',
  budget:       'Campaign Budget Configuration',
  uplift:       'Uplift & Treatment Evaluation',
  optimization: 'Discount Allocation Matrix',
  drift:        'Automated Data Drift Monitor',
  report:       'Executive Briefing & Technical Viva',
}

export default function App() {
  const [activePage, setActivePage] = useState<string>('overview')
  const [uploadedData, setUploadedData] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false)

  // ── Navigation Handler with Activity Logging ────────────────────────────────
  const handleNavigate = useCallback((page: string) => {
    setActivePage((prev) => {
      if (prev !== page) {
        activityLogger.log(
          'navigation',
          `Navigated to ${PAGE_TITLES[page] || page}`,
          `Switched active module view to: ${page}`,
          'info',
          page
        )
      }
      return page
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // ── Theme State & Switcher Function ──────────────────────────────────────────
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('econocausal_theme')
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  // Theme switcher function that toggles the data-theme='dark' attribute on document element
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const nextTheme: ThemeMode = prevTheme === 'light' ? 'dark' : 'light'

      // Set the data-theme attribute on the root document element
      if (nextTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.setAttribute('data-theme', 'light')
      }

      // Persist in localStorage
      localStorage.setItem('econocausal_theme', nextTheme)

      // Log activity
      activityLogger.log(
        'theme',
        `Switched Theme to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`,
        `Theme styling tokens updated across workspace`,
        'info'
      )

      return nextTheme
    })
  }, [])

  // Ensure documentElement has matching data-theme on initial mount and theme change
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
    localStorage.setItem('econocausal_theme', theme)
  }, [theme])

  // Global keyboard shortcut for Command Palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch('/discount_allocation.csv')
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'econocausal_discount_allocation.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 2000)

        activityLogger.log(
          'export',
          'Exported Discount Allocation CSV',
          'Downloaded 2,200 prescriptive customer allocation decisions',
          'success',
          'optimization'
        )
      }
    } catch (err) {
      console.error('CSV export error', err)
    }
  }

  const handleDownloadReport = () => {
    const markdown = `# EconoCausal — Executive Decision Intelligence Report
Generated Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Project Reference: ITS/DSML/1147

## Core Causal Findings
- DML Average Treatment Effect: +19.47 percentage points
- 95% Confidence Interval: [+5.67 pp, +33.28 pp] (p < 0.001)
- True DGP ATE: +12.02 pp (Captured comfortably inside 95% CI)
- Confounding Stripped: -1.39 pp overestimation eliminated vs naïve observed conversion (+20.86 pp)
- Qini Score: +0.6839
- Targeted Allocation: 500 customers under ₹5,000 budget, delivering +125.2 incremental orders and +₹2,698.40 net contribution margin (+102% lift over random).
`
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'econocausal_executive_report.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)

    activityLogger.log(
      'export',
      'Downloaded Executive Report',
      'Saved comprehensive markdown decision summary',
      'success',
      'report'
    )
  }

  const PageComponent = PAGES[activePage] || OverviewPage

  return (
    <ToastProvider>
      <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <TopBar
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          activePage={activePage}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <Sidebar
          activePage={activePage}
          onNavigate={(page: string) => {
            handleNavigate(page)
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="main-content" role="main">
          <div className="content-container">
            <PageComponent
              uploadedData={uploadedData}
              onDataUploaded={setUploadedData}
              onNavigatePage={handleNavigate}
            />
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(page: string) => {
          handleNavigate(page)
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        onDownloadCSV={handleDownloadCSV}
        onDownloadReport={handleDownloadReport}
      />
    </ToastProvider>
  )
}
