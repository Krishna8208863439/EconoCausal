import React from 'react'
import SectionCard from '../components/SectionCard.jsx'
import PlannedFeature from '../components/PlannedFeature.jsx'
import './Page.css'

const MILESTONES = [
  { week: 1, title: 'Causal Graphing & Dashboard Scaffold', done: true,
    items: ['Synthetic dataset (2 200 records)', 'Data preprocessing pipeline', 'EDA with 8 figures', 'DoWhy causal DAG', 'React dashboard scaffold'] },
  { week: 2, title: 'Double Machine Learning (DML) & Uplift Evaluation', done: true,
    items: ['EconML CausalForestDML trained', 'ATE (+19.5 pp) & CATE estimation', 'Propensity overlap (99.9% support)', 'Interactive Plotly Uplift & Qini curves', 'FastAPI backend integration'] },
  { week: 3, title: 'Budget Optimisation & API Packaging', done: false,
    items: ['SciPy constrained optimisation', 'Allocation table & recommendations', 'End-to-end API polish', 'Production deployment'] },
]

export default function OverviewPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Project Overview</h1>

      </div>

      <div className="notice-banner notice-banner--info">
        <span aria-hidden="true">ℹ️</span>
        <span>
          This dashboard uses <strong>entirely synthetic data</strong> generated for pipeline validation.
          It does not represent real customers or actual business outcomes.
          No causal effects or ROI estimates are claimed without running the full DML pipeline.
        </span>
      </div>

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
          <div className="concept-card">
            <div className="concept-card__icon">🎯</div>
            <div className="concept-card__label">Prescriptive Optimisation</div>
            <div className="concept-card__text">Which customers should receive an offer under a fixed budget? — Week 3.</div>
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
            { layer: 'Causal Inference', tech: 'DoWhy 0.8', icon: '🔗' },
            { layer: 'Treatment Effects', tech: 'EconML (Week 2)', icon: '⚗️' },
            { layer: 'Data Processing', tech: 'Pandas + NumPy', icon: '🐼' },
            { layer: 'Optimisation', tech: 'SciPy (Week 3)', icon: '🔧' },
            { layer: 'Visualisation', tech: 'Plotly + Matplotlib', icon: '📊' },
            { layer: 'Frontend', tech: 'React 18 + Vite', icon: '⚛️' },
          ].map(s => (
            <div className="stack-item" key={s.layer}>
              <span aria-hidden="true">{s.icon}</span>
              <div>
                <div className="stack-item__layer">{s.layer}</div>
                <div className="stack-item__tech">{s.tech}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
