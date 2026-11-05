import React from 'react'
import './PlannedFeature.css'

/**
 * Placeholder banner for Week 2 / Week 3 features.
 * Clearly marks unimplemented functionality so no fabricated results appear.
 *
 * Props
 * -----
 * week       number   Scheduled implementation week
 * feature    string   Feature name
 * description string  Brief description of what will be here
 */
export default function PlannedFeature({ week, feature, description }) {
  return (
    <div className="planned-feature" role="status" aria-label={`Planned: ${feature}`}>
      <div className="planned-feature__icon" aria-hidden="true">🔜</div>
      <div className="planned-feature__body">
        <div className="planned-feature__header">
          <span className="planned-feature__name">{feature}</span>
          <span className="badge badge-amber">Week {week} — Planned</span>
        </div>
        {description && (
          <p className="planned-feature__desc">{description}</p>
        )}
      </div>
    </div>
  )
}
