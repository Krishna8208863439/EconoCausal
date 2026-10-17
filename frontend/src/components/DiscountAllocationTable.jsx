import React, { useState, useMemo, useCallback } from 'react'
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  MinusCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react'
import { useToast } from './Toast.jsx'

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
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function StatusBadge({ status }) {
  if (status === 'selected') {
    return (
      <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle2 size={12} />
        <span>Selected</span>
      </span>
    )
  }
  if (status === 'eligible_not_selected' || status === 'eligible') {
    return (
      <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={12} />
        <span>Eligible</span>
      </span>
    )
  }
  return (
    <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <MinusCircle size={12} />
      <span>Ineligible</span>
    </span>
  )
}

export default function DiscountAllocationTable({ rows = [], loading = false, error = null }) {
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilter]   = useState('all') // all | selected | eligible | ineligible
  const [sortField, setSortField]   = useState('estimated_treatment_effect')
  const [sortDir, setSortDir]       = useState('desc')
  const [page, setPage]             = useState(1)
  const [pageSize, setPageSize]     = useState(25)
  const addToast = useToast()

  const toggleSort = useCallback((field) => {
    setSortField(f => {
      if (f === field) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        return f
      }
      setSortDir('desc')
      return field
    })
    setPage(1)
  }, [])

  const filtered = useMemo(() => {
    let data = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      data = data.filter(r =>
        String(r.customer_id || '').toLowerCase().includes(q) ||
        String(r.customer_segment || '').toLowerCase().includes(q)
      )
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleExport = () => {
    downloadCSV(sorted, 'discount_allocation_matrix.csv')
    addToast(`Exported ${sorted.length.toLocaleString()} customer records to CSV`, 'success')
  }

  const SortTh = ({ field, children }) => {
    const isSorted = sortField === field
    return (
      <th
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => toggleSort(field)}
        aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>{children}</span>
          {isSorted ? (
            sortDir === 'asc' ? <ArrowUp size={13} style={{ color: '#2563EB' }} /> : <ArrowDown size={13} style={{ color: '#2563EB' }} />
          ) : (
            <ArrowUpDown size={12} style={{ color: '#94A3B8' }} />
          )}
        </div>
      </th>
    )
  }

  if (loading) {
    return (
      <div className="loading-box" role="status" aria-live="polite">
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
        <strong style={{ fontSize: '1rem', color: '#0F172A' }}>Running SciPy MILP Exact Optimisation…</strong>
        <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '6px' }}>
          Solving binary integer program across 2,200 customers under marketing budget ceiling.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="notice-banner notice-banner--danger" role="alert">
        <div>
          <strong>Optimisation Error:</strong> {error}
        </div>
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="loading-box" role="status">
        <FileSpreadsheet size={40} style={{ color: '#94A3B8', marginBottom: '12px' }} />
        <strong style={{ fontSize: '1rem', color: '#0F172A' }}>No Allocation Matrix Generated</strong>
        <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '4px' }}>
          Configure budget parameters above and click <strong>Run Prescriptive Optimiser</strong> to generate allocations.
        </p>
      </div>
    )
  }

  const selectedCount   = rows.filter(r => r.selected_for_campaign).length
  const eligibleCount   = rows.filter(r => r.eligible && !r.selected_for_campaign).length
  const ineligibleCount = rows.filter(r => !r.eligible).length

  return (
    <div>
      {/* ── Assumptions Notice ─────────────────────────────────────────── */}
      <div className="notice-banner notice-banner--info" style={{ marginBottom: '16px' }}>
        <div className="notice-banner__icon">
          <HelpCircle size={18} className="text-primary-600" />
        </div>
        <div style={{ fontSize: '0.84rem' }}>
          <strong>Customer Allocation Matrix:</strong> ITE represents the EconML CausalForestDML estimate of P(purchase | discount) - P(purchase | no discount).
          Selected customers represent the global optimum found by the SciPy HiGHS MILP solver maximizing expected net incremental margin.
        </div>
      </div>

      {/* ── Filters & Controls Bar ─────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="search"
            className="form-input"
            placeholder="Search by Customer ID (e.g. CUST_0042)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            aria-label="Search customer ID"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={filterStatus}
            onChange={e => { setFilter(e.target.value); setPage(1) }}
            aria-label="Filter by allocation status"
            style={{ padding: '8px 12px', fontSize: '0.84rem' }}
          >
            <option value="all">All Customers ({rows.length.toLocaleString()})</option>
            <option value="selected">Selected for Offer ({selectedCount.toLocaleString()})</option>
            <option value="eligible">Eligible, Not Selected ({eligibleCount.toLocaleString()})</option>
            <option value="ineligible">Ineligible ({ineligibleCount.toLocaleString()})</option>
          </select>

          <select
            className="form-select"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            aria-label="Rows per page"
            style={{ padding: '8px 10px', fontSize: '0.84rem' }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            title="Download full allocation as CSV"
          >
            <Download size={15} />
            <span>Export CSV ({sorted.length.toLocaleString()})</span>
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="table-wrapper">
        <table className="data-table" aria-label="Discount allocation customer table">
          <thead>
            <tr>
              <SortTh field="customer_id">Customer ID</SortTh>
              <SortTh field="customer_segment">Segment</SortTh>
              <SortTh field="estimated_treatment_effect">Est. ITE Uplift</SortTh>
              <SortTh field="ite_ci_lower_95">95% CI Range</SortTh>
              <SortTh field="recommended_discount">Offer (₹)</SortTh>
              <SortTh field="estimated_incremental_conversions">Incr. Conversion</SortTh>
              <SortTh field="estimated_incremental_contribution">Net Contribution</SortTh>
              <SortTh field="optimization_status">Allocation Status</SortTh>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const ite = Number(r.estimated_treatment_effect ?? 0)
              const ciLower = Number(r.ite_ci_lower_95 ?? 0)
              const ciUpper = Number(r.ite_ci_upper_95 ?? 0)
              const contrib = Number(r.estimated_incremental_contribution ?? 0)
              const isSelected = r.selected_for_campaign

              return (
                <tr key={r.customer_id} style={{ background: isSelected ? '#F0FDF4' : 'transparent' }}>
                  <td>
                    <code style={{ fontWeight: 600, color: isSelected ? '#15803D' : '#334155' }}>
                      {r.customer_id}
                    </code>
                  </td>
                  <td>{r.customer_segment || 'Regular'}</td>
                  <td>
                    <span className="badge badge-blue">
                      +{(ite * 100).toFixed(2)} pp
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      [+{(ciLower * 100).toFixed(1)}, +{(ciUpper * 100).toFixed(1)}] pp
                    </span>
                  </td>
                  <td>
                    <strong>₹{Number(r.recommended_discount || 0).toLocaleString()}</strong>
                  </td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>
                    +{Number(r.estimated_incremental_conversions ?? 0).toFixed(3)}
                  </td>
                  <td>
                    <span style={{ color: contrib >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                      ₹{contrib.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={r.optimization_status || (isSelected ? 'selected' : 'ineligible')} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Bar ─────────────────────────────────────────────── */}
      <div className="pagination-bar">
        <span className="pagination-info">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length.toLocaleString()} matching customers
        </span>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0 8px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
