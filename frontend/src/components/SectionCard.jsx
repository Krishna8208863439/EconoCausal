import React from 'react'
import './SectionCard.css'

/**
 * Enterprise SectionCard wrapper
 * Features icon, title, subtitle, badge with color, header action slot, and crisp styling.
 */
export default function SectionCard({
  title,
  subtitle,
  badge,
  badgeType = 'blue',
  icon: Icon,
  action,
  children,
  className = '',
  noPadding = false,
  headerBorder = true,
}) {
  return (
    <section className={`section-card ${className}`} aria-label={title}>
      {(title || action) && (
        <div className={`section-card__header ${headerBorder ? 'with-border' : ''}`}>
          <div className="section-card__header-left">
            {Icon && (
              <div className="section-card__icon">
                {React.isValidElement(Icon) ? Icon : React.createElement(Icon, { size: 18 })}
              </div>
            )}
            <div>
              <div className="section-card__title-row">
                <h2 className="section-card__title">{title}</h2>
                {badge && (
                  <span className={`badge badge-${badgeType}`}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && <p className="section-card__subtitle">{subtitle}</p>}
            </div>
          </div>

          {action && <div className="section-card__header-right">{action}</div>}
        </div>
      )}

      <div className={`section-card__body ${noPadding ? 'no-padding' : ''}`}>
        {children}
      </div>
    </section>
  )
}
