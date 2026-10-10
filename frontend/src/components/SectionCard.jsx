import React from 'react'
import './SectionCard.css'

/**
 * Generic content section container with optional header badge.
 *
 * Props
 * -----
 * title    string
 * badge    string   Optional badge text
 * children ReactNode
 */
export default function SectionCard({ title, badge, children, className = '' }) {
  return (
    <section className={`section-card ${className}`} aria-label={title}>
      <div className="section-card__header">
        <h2 className="section-card__title">{title}</h2>
        {badge && <span className="badge badge-blue">{badge}</span>}
      </div>
      <div className="section-card__body">
        {children}
      </div>
    </section>
  )
}
