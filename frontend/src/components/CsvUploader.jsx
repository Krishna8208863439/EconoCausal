import React, { useRef, useState } from 'react'
import Papa from 'papaparse'
import './CsvUploader.css'

const REQUIRED_COLUMNS = [
  'customer_id', 'age_group', 'past_purchases', 'avg_order_value',
  'website_visits', 'customer_segment', 'discount_offered',
  'discount_amount', 'purchased', 'revenue', 'campaign_date',
]

const MAX_FILE_SIZE_MB = 20

/**
 * CSV file uploader with client-side validation.
 *
 * Props
 * -----
 * onDataLoaded  (data: object[], fileName: string) => void
 */
export default function CsvUploader({ onDataLoaded }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState(null)  // { type: 'error'|'success'|'loading', message }
  const [dragOver, setDragOver] = useState(false)

  function validateAndParse(file) {
    setStatus({ type: 'loading', message: 'Parsing file…' })

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatus({ type: 'error', message: 'Only CSV files are accepted. Please select a .csv file.' })
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setStatus({ type: 'error', message: `File is ${sizeMB.toFixed(1)} MB. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.` })
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const cols = results.meta.fields || []
        const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c))

        if (missing.length > 0) {
          setStatus({
            type: 'error',
            message: `Missing required columns: ${missing.join(', ')}. Please upload the EconoCausal campaign dataset.`,
          })
          return
        }

        if (results.data.length === 0) {
          setStatus({ type: 'error', message: 'The uploaded file contains no data rows.' })
          return
        }

        setStatus({
          type: 'success',
          message: `Loaded ${results.data.length.toLocaleString()} rows from "${file.name}".`,
        })
        onDataLoaded(results.data, file.name)
      },
      error: (err) => {
        setStatus({ type: 'error', message: `Parse error: ${err.message}` })
      },
    })
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) validateAndParse(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndParse(file)
  }

  return (
    <div className="csv-uploader">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Drop zone for CSV file upload"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <span className="drop-zone__icon" aria-hidden="true">📂</span>
        <div className="drop-zone__text">
          <strong>Drag and drop a CSV file here</strong>
          <span>or click to browse</span>
          <span className="drop-zone__hint">
            Accepts EconoCausal campaign CSV · max {MAX_FILE_SIZE_MB} MB
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="CSV file input"
      />

      {status && (
        <div
          className={`upload-status upload-status--${status.type}`}
          role={status.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span className="upload-status__icon" aria-hidden="true">
            {status.type === 'success' ? '✅' : status.type === 'loading' ? '⏳' : '❌'}
          </span>
          {status.message}
        </div>
      )}

      <details className="required-cols">
        <summary>Required columns ({REQUIRED_COLUMNS.length})</summary>
        <ul>
          {REQUIRED_COLUMNS.map(c => <li key={c}><code>{c}</code></li>)}
        </ul>
      </details>
    </div>
  )
}
