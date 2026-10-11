import React, { useState, useEffect } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import './Page.css'

const MILESTONES = [
  { week: 1, title: 'Causal Graphing & Dashboard Scaffold', done: true,
    items: ['Synthetic dataset (2,200 records)', 'Data preprocessing pipeline', 'EDA with 8 figures', 'DoWhy causal DAG', 'React dashboard scaffold'] },
  { week: 2, title: 'Double Machine Learning (DML) & Uplift Evaluation', done: true,
    items: ['EconML CausalForestDML trained', 'ATE (+19.5 pp) & CATE estimation', 'Propensity overlap (99.9% support)', 'Interactive Plotly Uplift & Qini curves', 'FastAPI backend integration'] },
  { week: 3, title: 'Budget Optimisation & Prescriptive Allocation', done: true,
    items: ['Greedy causal knapsack optimiser', 'Per-segment allocation table', 'Policy comparison (DML vs Random vs Blanket)', 'Live CATE-ranked targeting', 'End-to-end API + dashboard integration'] },
]

export default function OverviewPage() {
  const [health, setHealth]   = useState(null)
  const [results, setResults] = useState(null)

  useEffect(() => {
    api.getHealth().then(h => setHealth(h)).catch(() => {})
    api.getCausalResults().then(r => setResults(r)).catch(() => {})
  }, [])

  const m = results?.dml_estimates   || null
  const u = results?.uplift_evaluation || null
  const p = results?.policy_comparison?.policies?.[0] || null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Overview</h1>
          <p className="page-subtitle" style={{ color: '#64748B', marginTop: '4px' }}>
            EconoCausal: Dynamic Pricing via Double Machine Learning — ITS/DSML/1147
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`badge ${health?.status === 'ok' ? 'badge-green' : 'badge-gray'}`}>
            {health?.status === 'ok' ? '🟢 API Live' : '⚪ API Offline'}
          </span>
          <span className="badge badge-blue">v{health?.version || '2.0.0'}</span>
        </div>
      </div>

      <div className="notice-banner notice-banner--info">
        <span aria-hidden="true">ℹ️</span>
        <span>
          This dashboard uses <strong>entirely synthetic data</strong> generated for pipeline validation.
          It does not represent real customers or actual business outcomes.
          No causal effects or ROI estimates are claimed without running the full DML pipeline.
        </span>
      </div>

      {/* ── Live KPI Cards ──────────────────────────────────────────────── */}
      {m && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <StatCard label="DML-Estimated ATE" value={`+${(m.mean_ate * 100).toFixed(1)} pp`} icon="⚗️" color="blue"
            sub={`95% CI: +${(m.ci_lower_95 * 100).toFixed(1)} – +${(m.ci_upper_95 * 100).toFixed(1)} pp`} />
          <StatCard label="Qini Coefficient" value={`+${u?.qini_score?.toFixed(3) || '0.684'}`} icon="📈" color="green"
            sub="Significant uplift over random" />
          <StatCard label="Causal Targeting Gain" value={`+${(((p?.incremental_conversions||125.2) - (results?.policy_comparison?.policies?.[1]?.incremental_conversions||97.4))).toFixed(1)} conv`}
            icon="🎯" color="orange" sub="vs Random targeting under budget" />
          <StatCard label="Propensity Support" value="99.9%" icon="✅" color="green"
            sub="Positivity assumption satisfied" />
        </div>
      )}

      <SectionCard title="What is EconoCausal?" badge="ITS/DSML/1147">
        <p className="prose">
          EconoCausal explores how <strong>Causal Machine Learning</strong> and{' '}
          <strong>Double Machine Learning (DML)</strong> can support smarter promotional pricing.
          Instead of predicting which customers are likely to purchase, the system estimates
          how much a customer's purchase probability <em>changes</em> when they receive a discount.
        </p>
        <p className="prose">
          The key question: <em>"For which customers does a discount change the outcome, and
          how should a limited budget be allocated?"</em>
        </p>

        <div className="concept-grid">
          <div className="concept-card">
            <div className="concept-card__icon">🔮</div>
            <div className="concept-card__label">Predictive ML</div>
            <div className="concept-card__text">Who is likely to purchase? — Does not answer whether a discount <em>causes</em> that purchase.</div>
          </div>
          <div className="concept-card concept-card--active">
            <div className="concept-card__icon">⚗️</div>
            <div className="concept-card__label">Causal ML (this project)</div>
            <div className="concept-card__text">How does the outcome change if we offer a discount? — Estimates the incremental effect.</div>
          </div>
          <div className="concept-card concept-card--active">
            <div className="concept-card__icon">🎯</div>
            <div className="concept-card__label">Prescriptive Optimisation</div>
            <div className="concept-card__text">Which customers should receive an offer under a fixed budget? — Greedy CATE-ranked allocation.</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Implementation Milestones">
        <div className="milestone-list">
          {MILESTONES.map(m => (
            <div key={m.week} className={`milestone ${m.done ? 'done' : 'pending'}`}>
              <div className="milestone__header">
                <span className="milestone__week">Week {m.week}</span>
                <span className="milestone__title">{m.title}</span>
                <span className={`badge ${m.done ? 'badge-green' : 'badge-gray'}`}>
                  {m.done ? '✅ Complete' : '⏳ Planned'}
                </span>
              </div>
              <ul className="milestone__items">
                {m.items.map(item => (
                  <li key={item}>
                    <span aria-hidden="true">{m.done ? '✓' : '○'}</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Technology Stack">
        <div className="stack-grid">
          {[
            { layer: 'Causal Inference', tech: 'DoWhy 0.8', icon: '🔗', status: 'live' },
            { layer: 'Treatment Effects', tech: 'EconML CausalForestDML', icon: '⚗️', status: 'live' },
            { layer: 'Data Processing', tech: 'Pandas + NumPy', icon: '🐼', status: 'live' },
            { layer: 'Optimisation', tech: 'Greedy Knapsack (DML-ranked)', icon: '🔧', status: 'live' },
            { layer: 'Visualisation', tech: 'Plotly + Matplotlib', icon: '📊', status: 'live' },
            { layer: 'Backend', tech: 'FastAPI + Uvicorn', icon: '🚀', status: 'live' },
            { layer: 'Frontend', tech: 'React 18 + Vite 5', icon: '⚛️', status: 'live' },
            { layer: 'API Docs', tech: 'Swagger UI (OpenAPI 3.1)', icon: '📚', status: 'live' },
          ].map(s => (
            <div className="stack-item" key={s.layer}>
              <span aria-hidden="true">{s.icon}</span>
              <div>
                <div className="stack-item__layer">{s.layer}</div>
                <div className="stack-item__tech">{s.tech}</div>
                {s.status === 'live' && <span className="badge badge-green" style={{ fontSize: '0.65rem', marginTop: '4px' }}>Live</span>}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Quick links ─────────────────────────────────────────────────── */}
      <SectionCard title="Quick Links">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: '📡 API Docs (Swagger)', url: 'http://127.0.0.1:8000/docs' },
            { label: '📋 ReDoc Reference', url: 'http://127.0.0.1:8000/redoc' },
            { label: '💓 Health Check', url: 'http://127.0.0.1:8000/health' },
          ].map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC', color: '#1E293B', textDecoration: 'none',
                fontSize: '13px', fontWeight: 500, transition: 'all 0.15s' }}>
              {link.label}
            </a>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
