/**
 * frontend/src/components/DiscountAllocationTable.jsx
 * =====================================================
 * EconoCausal — Week 3: Customer-level Discount Allocation Matrix
 *
 * Features:
 *  - Sortable columns (ITE, discount, value, status)
 *  - Customer ID search
 *  - Filter by eligibility / selected status
 *  - Pagination (configurable page size)
 *  - CSV export
 *  - Loading / empty / error states
 *  - Units and assumptions shown inline
 */

import React, { useState, useMemo, useCallback } from 'react'

const PAGE_SIZE = 25

const SORT_FIELDS = {
  customer_id:                       'Customer ID',
  estimated_treatment_effect:        'ITE',
  recommended_discount:              'Discount (₹)',
  estimated_incremental_conversions: 'Inc. Conversions',
  estimated_incremental_contribution: 'Inc. Contribution (₹)',
  optimization_status:               'Status',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function downloadCSV(rows, filename = 'discount_allocation.csv') {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const header = cols.join(',')
  const body = rows.map(r =>
    cols.map(c => {
      const v = r[c]
      if (v === null || v === undefined) return ''
      if (typeof v === 'string' && v.includes(',')) return `"${v}"`
      return v
    }).join(',')
  ).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function StatusBadge({ status }) {
  const styles = {
    selected: { background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' },
    eligible_not_selected: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' },
    ineligible: { background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' },
  }
  const labels = {
    selected: '✅ Selected',
    eligible_not_selected: '⏳ Eligible',
    ineligible: '⬜ Ineligible',
  }
  const s = styles[status] || styles.ineligible
  return (
    <span style={{
      ...s, padding: '2px 8px', borderRadius: '12px',
      fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {labels[status] || status}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DiscountAllocationTable({ rows = [], loading = false, error = null }) {
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilter]   = useState('all')   // all | selected | eligible | ineligible
  const [sortField, setSortField]   = useState('estimated_treatment_effect')
  const [sortDir, setSortDir]       = useState('desc')
  const [page, setPage]             = useState(1)

  const toggleSort = useCallback((field) => {
    setSortField(f => {
      if (f === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return f }
      setSortDir('desc'); return field
    })
    setPage(1)
  }, [])

  const filtered = useMemo(() => {
    let data = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      data = data.filter(r => String(r.customer_id || '').toLowerCase().includes(q))
    }
    if (filterStatus === 'selected')   data = data.filter(r => r.selected_for_campaign)
    if (filterStatus === 'eligible')   data = data.filter(r => r.eligible && !r.selected_for_campaign)
    if (filterStatus === 'ineligible') data = data.filter(r => !r.eligible)
    return data
  }, [rows, search, filterStatus])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField], bv = b[sortField]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const SortTh = ({ field, children }) => (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => { toggleSort(field); setPage(1) }}
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {children}
      {sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
    </th>
  )

  // ── States ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-box" role="status" aria-live="polite">
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚙️</div>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Running MILP Optimisation…</div>
        <div style={{ fontSize: '0.83rem', color: '#64748B' }}>
          Selecting optimal customer offers under budget constraint.
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="notice-banner notice-banner--danger" role="alert">
        <span>❌</span>
        <div>
          <strong>Optimisation Error</strong>
          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>
        </div>
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="loading-box" role="status">
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>No Allocation Data Yet</div>
        <div style={{ fontSize: '0.83rem', color: '#64748B' }}>
          Configure the budget and click <strong>Run Optimisation</strong> to generate the discount allocation matrix.
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Assumptions notice ─────────────────────────────────────────── */}
      <div className="notice-banner notice-banner--info" style={{ marginBottom: '12px', fontSize: '0.8rem' }}>
        <span>ℹ️</span>
        <span>
          <strong>Model estimates — not observed results.</strong>{' '}
          ITE = causal forest DML estimate of P(purchase | discount) − P(purchase | no discount).
          Incremental contribution = ITE × avg_order_value − discount_cost (₹).
          Values are predictions and carry uncertainty.
        </span>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search by Customer ID…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          aria-label="Search customer ID"
          style={{
            flex: 1, minWidth: '180px', maxWidth: '260px',
            padding: '7px 12px', border: '1px solid #CBD5E1',
            borderRadius: '6px', fontSize: '0.87rem',
          }}
        />

        <select
          value={filterStatus}
          onChange={e => { setFilter(e.target.value); setPage(1) }}
          aria-label="Filter by status"
          style={{ padding: '7px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.87rem' }}
        >
          <option value="all">All customers ({rows.length})</option>
          <option value="selected">✅ Selected ({rows.filter(r => r.selected_for_campaign).length})</option>
          <option value="eligible">⏳ Eligible, not selected</option>
          <option value="ineligible">⬜ Ineligible</option>
        </select>

        <button
          onClick={() => downloadCSV(sorted, 'discount_allocation_export.csv')}
          style={{
            padding: '7px 14px', border: '1px solid #CBD5E1',
            borderRadius: '6px', background: '#F8FAFC',
            fontSize: '0.87rem', cursor: 'pointer', fontWeight: 600,
          }}
          title="Export filtered view to CSV"
        >
          ⬇ Export CSV ({sorted.length} rows)
        </button>

        <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: 'auto' }}>
          {sorted.length} of {rows.length} customers
        </span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="table-wrapper">
        <table className="data-table" aria-label="Discount allocation matrix">
          <thead>
            <tr>
              <SortTh field="customer_id">Customer ID</SortTh>
              <th>Eligible</th>
              <SortTh field="estimated_treatment_effect">Est. ITE</SortTh>
              <th style={{ fontSize: '0.7rem' }}>ITE 95% CI</th>
              <SortTh field="recommended_discount">Disc. (₹)</SortTh>
              <SortTh field="optimization_status">Status</SortTh>
              <th>Disc. Cost (₹)</th>
              <SortTh field="estimated_incremental_conversions">Inc. Conv.</SortTh>
              <SortTh field="estimated_incremental_contribution">Inc. Contrib. (₹)</SortTh>
              <th>Uncertain</th>
              <th>Segment</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => {
              const isSelected = row.selected_for_campaign
              return (
                <tr
                  key={row.customer_id || idx}
                  style={{
                    backgroundColor: isSelected
                      ? '#F0FDF4'
                      : idx % 2 === 0 ? '#FAFAFA' : '#FFF',
                  }}
                >
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.customer_id}</td>
                  <td style={{ textAlign: 'center' }}>
                    {row.eligible ? '✅' : '⬜'}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: (row.estimated_treatment_effect || 0) > 0.2 ? '#059669' : '#334155',
                    }}>
                      +{(row.estimated_treatment_effect || 0).toFixed(4)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {row.treatment_effect_lower != null && row.treatment_effect_upper != null
                      ? `[${Number(row.treatment_effect_lower).toFixed(3)}, ${Number(row.treatment_effect_upper).toFixed(3)}]`
                      : '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {(row.recommended_discount || 0) > 0 ? `₹${row.recommended_discount}` : '—'}
                  </td>
                  <td><StatusBadge status={row.optimization_status} /></td>
                  <td>{(row.estimated_discount_cost || 0) > 0 ? `₹${row.estimated_discount_cost}` : '₹0'}</td>
                  <td style={{ color: '#0369A1' }}>
                    +{(row.estimated_incremental_conversions || 0).toFixed(4)}
                  </td>
                  <td style={{
                    color: (row.estimated_incremental_contribution || 0) > 0 ? '#15803D' : '#B91C1C',
                    fontWeight: 600,
                  }}>
                    {(row.estimated_incremental_contribution || 0) > 0 ? '+' : ''}
                    {(row.estimated_incremental_contribution || 0) !== 0
                      ? `₹${Number(row.estimated_incremental_contribution).toFixed(2)}`
                      : '₹0'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                    {row.uncertain_estimate ? '⚠️' : ''}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {row.customer_segment || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Table pagination">
          <button onClick={() => setPage(1)} disabled={currentPage === 1}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹ Prev</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next ›</button>
          <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>»</button>
        </div>
      )}
    </div>
  )
}
