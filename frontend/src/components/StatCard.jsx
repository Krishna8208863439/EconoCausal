import React from 'react'
import './StatCard.css'

/**
 * Reusable summary statistics card.
 *
 * Props
 * -----
 * label       string   Card title
 * value       string   Primary displayed value
 * sub         string   Optional subtitle / context line
 * icon        string   Emoji icon
 * color       string   'blue' | 'green' | 'amber' | 'orange' | 'gray'
 * highlight   bool     Makes the card visually prominent
 */
export default function StatCard({ label, value, sub, icon, color = 'blue', highlight = false }) {
  return (
    <div className={`stat-card stat-card--${color} ${highlight ? 'stat-card--highlight' : ''}`}
         role="region" aria-label={label}>
      <div className="stat-card__icon" aria-hidden="true">{icon}</div>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {sub && <div className="stat-card__sub">{sub}</div>}
      </div>
    </div>
  )
}
