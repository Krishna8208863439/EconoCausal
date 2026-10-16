import React, { useState } from 'react'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import './StatCard.css'

/**
 * Enterprise StatCard (KPI Card)
 * Supports Lucide icons, confidence intervals, tooltips, trend indicators,
 * and semantic color badges.
 */
export default function StatCard({
  label,
  value,
  sub,
  ci,
  trend,
  tooltip,
  icon,
  color = 'blue',
  highlight = false,
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Render icon whether it's a React component, element, or string
  const renderIcon = () => {
    if (!icon) return null
    if (React.isValidElement(icon)) return icon
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && (icon.$$typeof || icon.render))) {
      const IconComponent = icon
      return <IconComponent size={20} />
    }
    return <span>{icon}</span>
  }

  return (
    <div
      className={`stat-card stat-card--${color} ${highlight ? 'stat-card--highlight' : ''}`}
      role="region"
      aria-label={label}
    >
      <div className="stat-card__top">
        <div className={`stat-card__icon-box stat-card__icon-box--${color}`}>
          {renderIcon()}
        </div>

        <div className="stat-card__top-right">
          {tooltip && (
            <div
              className="stat-card__tooltip-trigger"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(s => !s)}
              title={tooltip}
              aria-label={`About ${label}`}
            >
              <Info size={14} />
              {showTooltip && (
                <div className="stat-card__tooltip-popover" role="tooltip">
                  {tooltip}
                </div>
              )}
            </div>
          )}

          {trend && (
            <div
              className={`stat-card__trend ${
                trend.positive ? 'stat-card__trend--positive' : 'stat-card__trend--neutral'
              }`}
            >
              {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>

      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>

        {ci && (
          <div className="stat-card__ci-badge" title="Estimated 95% Confidence Interval">
            <span className="ci-tag">95% CI</span>
            <span className="ci-range">{ci}</span>
          </div>
        )}

        {sub && <div className="stat-card__sub">{sub}</div>}

        {trend?.label && (
          <div className="stat-card__trend-label">{trend.label}</div>
        )}
      </div>
    </div>
  )
}
