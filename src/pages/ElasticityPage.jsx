import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  Sliders,
  DollarSign,
  Scale,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  BarChart2,
  Activity
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import StatCard from '../components/StatCard.jsx'
import SimpleBarChart from '../charts/SimpleBarChart.jsx'
import { api } from '../services/api.js'
import './Page.css'

export default function ElasticityPage() {
  const [model, setModel] = useState(null)
  const [selectedSegment, setSelectedSegment] = useState('All')
  const [priceChangePct, setPriceChangePct] = useState(0) // -30% to +30%

  useEffect(() => {
    api.getElasticityModel().then(m => setModel(m))
  }, [])

  // Calculate simulated metrics
  const sim = useMemo(() => {
    return api.simulatePriceChange(priceChangePct, selectedSegment)
  }, [priceChangePct, selectedSegment])

  // Curve test points for continuous demand & profit curve
  const curvePoints = useMemo(() => {
    const pcts = [-30, -20, -10, -5, 0, 5, 10, 15, 20, 30]
    return pcts.map(p => {
      const s = api.simulatePriceChange(p, selectedSegment)
      return {
        pct: p,
        volume: s.newVolume,
        revenue: s.newRevenue,
        profit: s.newProfit,
      }
    })
  }, [selectedSegment])

  const segments = model?.segments || []

  return (
    <div className="page">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dynamic Pricing & Price Elasticity Lab</h1>
          <p className="page-subtitle">
            Continuous Treatment Economics · Segment Price Sensitivity ($\epsilon$) · Microeconomic Optimal Markup Rule
          </p>
        </div>
        <div className="page-header-actions">
          <div className="meta-row">
            <span>Market Elasticity: -1.54</span>
            <span className="meta-separator">·</span>
            <span>Formula: P* = (ε / (ε + 1)) × MC</span>
            <span className="meta-separator">·</span>
            <span>Continuous Demand Model</span>
          </div>
        </div>
      </div>

      {/* ── Metric Highlights ───────────────────────────────────────────── */}
      <div className="stat-grid">
        <StatCard
          title="Market Price Elasticity (ε)"
          value="-1.54"
          subtext="Elastic Market (|ε| > 1)"
          icon={Percent}
          color="blue"
        />
        <StatCard
          title="High Sensitivity Segment"
          value="Lapsed (ε = -2.15)"
          subtext="Extreme response to discounts"
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Inelastic Segment"
          value="Premium (ε = -0.85)"
          subtext="Discounts erode net profit"
          icon={Scale}
          color="purple"
        />
        <StatCard
          title="Optimal Price Surplus"
          value="+18.4%"
          subtext="Gain over blanket static pricing"
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* ── Section 1: Microeconomic Pricing Constitution ───────────────── */}
      <SectionCard
        title="Microeconomic Pricing Constitution: Dynamic vs Static Discounts"
        subtitle="Moving from binary coupon targeting to genuine continuous dynamic pricing"
        icon={Scale}
        badge="Economic Foundations"
        badgeType="blue"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Price Elasticity of Demand (ε)
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
              Defined as <code>ε = (%ΔQ) / (%ΔP)</code>. Segments with <code>|ε| &gt; 1</code> are price-elastic; lowering prices increases total gross revenue because quantity demanded surges more than the margin drop. Segments with <code>|ε| &lt; 1</code> (e.g. Premium) are inelastic; discounting them causes revenue destruction.
            </p>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              The Lerner Index & Optimal Price Rule (P*)
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
              The profit-maximizing price under heterogeneous elasticity is:
              <br />
              <strong style={{ color: '#2563EB', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                P* = (ε / (ε + 1)) × MC
              </strong>
              <br />
              Where <code>MC</code> is the marginal unit fulfillment cost. Inelastic tiers must be charged a higher markup, while highly elastic tiers receive targeted promotional rebates.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 2: Interactive Dynamic Price Change Simulator ────────── */}
      <SectionCard
        title="Continuous Price Change Simulator"
        subtitle="Simulate adjustments to retail list prices and project impact on order volume, gross revenue, and gross profit"
        icon={Sliders}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Controls */}
          <div style={{ background: 'var(--bg-subtle)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Select Customer Target Cohort:
              </label>
              <div className="segmented-control" style={{ width: '100%', display: 'flex', flexWrap: 'wrap' }}>
                {['All', 'Occasional', 'Lapsed', 'Regular', 'Premium'].map(seg => (
                  <button
                    key={seg}
                    type="button"
                    className={selectedSegment === seg ? 'active' : ''}
                    onClick={() => setSelectedSegment(seg)}
                    style={{ flex: 1, minWidth: '70px', textAlign: 'center' }}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Simulated Price Change (%):
                </label>
                <strong style={{ fontSize: '1rem', color: priceChangePct < 0 ? '#059669' : priceChangePct > 0 ? '#DC2626' : 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {priceChangePct > 0 ? `+${priceChangePct}%` : `${priceChangePct}%`}
                </strong>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="5"
                value={priceChangePct}
                onChange={e => setPriceChangePct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>-30% (Deep Discount)</span>
                <span>0% (Baseline)</span>
                <span>+30% (Premium Markup)</span>
              </div>
            </div>

            {/* Projected Simulation KPI Outputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Projected Orders</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  {sim.newVolume.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: sim.volumeDeltaPct >= 0 ? '#059669' : '#DC2626' }}>
                  {sim.volumeDeltaPct >= 0 ? `+${sim.volumeDeltaPct}%` : `${sim.volumeDeltaPct}%`} vs base
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Projected Revenue</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  ₹{sim.newRevenue.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: sim.revenueDeltaPct >= 0 ? '#059669' : '#DC2626' }}>
                  {sim.revenueDeltaPct >= 0 ? `+${sim.revenueDeltaPct}%` : `${sim.revenueDeltaPct}%`} vs base
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Gross Profit Contribution</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: sim.newProfit >= sim.baseProfit ? '#059669' : '#DC2626', marginTop: '2px' }}>
                      ₹{sim.newProfit.toLocaleString()}
                    </div>
                  </div>
                  <span className={`badge ${sim.profitDeltaPct >= 0 ? 'badge-green' : 'badge-red'}`}>
                    {sim.profitDeltaPct >= 0 ? `+${sim.profitDeltaPct}% Profit` : `${sim.profitDeltaPct}% Margin Loss`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous Response Curves */}
          <div>
            <SimpleBarChart
              categories={curvePoints.map(p => `${p.pct > 0 ? '+' : ''}${p.pct}%`)}
              values={curvePoints.map(p => p.profit)}
              colors={curvePoints.map(p => p.pct === priceChangePct ? '#10B981' : p.profit >= curvePoints.find(x => x.pct === 0)?.profit ? '#2563EB' : '#94A3B8')}
              valueLabels={curvePoints.map(p => `₹${Math.round(p.profit / 1000)}k`)}
              title="Continuous Gross Profit Curve Across Price Adjustments"
              yTitle="Net Contribution (₹)"
              height={280}
            />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
              Green highlight indicates currently selected price adjustment ({priceChangePct > 0 ? `+${priceChangePct}%` : `${priceChangePct}%`}).
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 3: Segment Elasticity Matrix & Optimal Price Breakdown ─ */}
      <SectionCard
        title="Segment Elasticity & Optimal Pricing Policy Matrix"
        subtitle="Empirical elasticity, marginal cost structure, and optimal price markups derived from causal DML"
        icon={Activity}
      >
        <div className="table-wrapper">
          <table className="data-table" aria-label="Price Elasticity Policy Matrix">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Price Elasticity (ε)</th>
                <th>Sensitivity Tier</th>
                <th>Baseline Price</th>
                <th>Marginal Cost (MC)</th>
                <th>Optimal Price (P*)</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {segments.map(seg => (
                <tr key={seg.segment}>
                  <td><strong>{seg.segment}</strong></td>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: seg.elasticity < -1 ? '#2563EB' : '#D97706' }}>
                      {seg.elasticity.toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge ${Math.abs(seg.elasticity) > 1.5 ? 'badge-blue' : Math.abs(seg.elasticity) < 1.0 ? 'badge-purple' : 'badge-amber'}`}>
                      {seg.price_sensitivity}
                    </span>
                  </td>
                  <td>₹{seg.current_price.toFixed(1)}</td>
                  <td>₹{seg.marginal_cost.toFixed(1)}</td>
                  <td>
                    <strong style={{ color: '#059669', fontSize: '0.9rem' }}>
                      ₹{seg.optimal_price.toFixed(1)}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      ({(((seg.optimal_price - seg.current_price) / seg.current_price) * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                    {seg.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
