import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  LayoutDashboard,
  Database,
  GitFork,
  Award,
  Percent,
  Sliders,
  TrendingUp,
  Target,
  ShieldCheck,
  Presentation,
  Sun,
  Moon,
  Download,
  FileText,
  Calculator,
  ArrowRight,
  X,
  Sparkles,
  Activity
} from 'lucide-react'
import './CommandPalette.css'

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  theme,
  onToggleTheme,
  onDownloadCSV,
  onDownloadReport,
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // All commands
  const commands = [
    // Navigation items
    {
      id: 'nav_overview',
      category: 'Navigation',
      label: 'Overview & Executive Summary',
      description: 'KPI metrics, treatment gain, and executive highlights',
      icon: LayoutDashboard,
      action: () => { onNavigate('overview'); onClose(); }
    },
    {
      id: 'nav_data',
      category: 'Navigation',
      label: 'Data & Exploratory Analysis',
      description: '2,200 campaign records, feature distributions, and EDA figures',
      icon: Database,
      action: () => { onNavigate('data'); onClose(); }
    },
    {
      id: 'nav_causal',
      category: 'Navigation',
      label: 'Causal DAG & Robinson DML',
      description: 'Structural DoWhy DAG, nuisance models, and ATE estimation',
      icon: GitFork,
      action: () => { onNavigate('causal'); onClose(); }
    },
    {
      id: 'nav_validation',
      category: 'Navigation',
      label: 'Causal Validation & Refutations',
      description: 'DoWhy refutation tests, estimator bake-off, and Hillstrom RCT benchmark',
      icon: Award,
      action: () => { onNavigate('validation'); onClose(); }
    },
    {
      id: 'nav_elasticity',
      category: 'Navigation',
      label: 'Dynamic Pricing & Price Elasticity Lab',
      description: 'Continuous price elasticity (ε), optimal markup rule, and demand simulator',
      icon: Percent,
      action: () => { onNavigate('elasticity'); onClose(); }
    },
    {
      id: 'nav_budget',
      category: 'Navigation',
      label: 'Campaign Budget Configuration',
      description: 'Fixed budget simulation, discount offers, and baseline projections',
      icon: Sliders,
      action: () => { onNavigate('budget'); onClose(); }
    },
    {
      id: 'nav_uplift',
      category: 'Navigation',
      label: 'Uplift & Treatment Evaluation',
      description: 'Cumulative uplift curves, Qini score (+0.684), and decile targeting',
      icon: TrendingUp,
      action: () => { onNavigate('uplift'); onClose(); }
    },
    {
      id: 'nav_optimization',
      category: 'Navigation',
      label: 'Discount Allocation Matrix',
      description: 'Profit-aware MILP solver, multi-tier discounts, and marginal ROI',
      icon: Target,
      action: () => { onNavigate('optimization'); onClose(); }
    },
    {
      id: 'nav_drift',
      category: 'Navigation',
      label: 'Automated Data Drift Monitor',
      description: 'Two-sample KS tests, chi-square, and decile PSI audits',
      icon: ShieldCheck,
      action: () => { onNavigate('drift'); onClose(); }
    },
    {
      id: 'nav_report',
      category: 'Navigation',
      label: 'Executive Briefing & Technical Viva',
      description: 'A/B power planner, Viva Voce sheet, and PDF print layout',
      icon: Presentation,
      action: () => { onNavigate('report'); onClose(); }
    },

    // Quick Actions
    {
      id: 'action_theme',
      category: 'Actions',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      description: `Toggle data-theme attribute on document root (currently ${theme})`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => { onToggleTheme(); onClose(); }
    },
    {
      id: 'action_ab_test',
      category: 'Actions',
      label: 'Open A/B Test Power Calculator',
      description: 'Size test duration, holdout sample, and MDE requirements',
      icon: Calculator,
      action: () => { onNavigate('report'); onClose(); }
    },
    {
      id: 'action_download_csv',
      category: 'Actions',
      label: 'Download Allocation Matrix (CSV)',
      description: 'Export 2,200 prescriptive customer discount decisions',
      icon: Download,
      action: () => { if (onDownloadCSV) onDownloadCSV(); onClose(); }
    },
    {
      id: 'action_download_report',
      category: 'Actions',
      label: 'Download Executive Report (Markdown)',
      description: 'Export comprehensive C-suite brief and model disclosure',
      icon: FileText,
      action: () => { if (onDownloadReport) onDownloadReport(); onClose(); }
    },
    {
      id: 'action_activity_log',
      category: 'Actions',
      label: 'View Live Activity Log',
      description: 'Audit trail of tracked user actions and optimizations',
      icon: Activity,
      action: () => {
        onClose();
        const actBtn = document.querySelector('.activity-view-all-btn');
        if (actBtn) {
          actBtn.click();
        } else {
          const actHeader = document.querySelector('.sidebar-activity-header');
          if (actHeader) actHeader.click();
        }
      }
    },
  ]

  // Filter commands by search query
  const filtered = commands.filter(c => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) ||
           c.description.toLowerCase().includes(q) ||
           c.category.toLowerCase().includes(q)
  })

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="cmd-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="cmd-container" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-search-header">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a command or search modules... (Press Esc to close)"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <button className="cmd-close-btn" onClick={onClose} aria-label="Close command palette">
            <X size={16} />
          </button>
        </div>

        <div className="cmd-results-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="cmd-empty-state">
              No matching modules or actions found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="cmd-item-icon-box">
                    <Icon size={16} />
                  </div>
                  <div className="cmd-item-content">
                    <div className="cmd-item-title-row">
                      <span className="cmd-item-title">{item.label}</span>
                      <span className="cmd-item-category">{item.category}</span>
                    </div>
                    <span className="cmd-item-desc">{item.description}</span>
                  </div>
                  <ArrowRight size={14} className="cmd-item-arrow" />
                </div>
              )
            })
          )}
        </div>

        <div className="cmd-footer">
          <div className="cmd-shortcuts">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <div className="cmd-hint">
            <Sparkles size={12} />
            <span>EconoCausal Omnisearch</span>
          </div>
        </div>
      </div>
    </div>
  )
}
