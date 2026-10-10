import React from 'react'
import './TopBar.css'

export default function TopBar({ onMenuToggle }) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div className="topbar-brand">
          <span className="brand-name">EconoCausal</span>
          <span className="brand-sub">Dynamic Pricing via Double Machine Learning</span>
        </div>
      </div>
      <div className="topbar-right">
        <span className="topbar-ref">ITS/DSML/1147</span>
      </div>
    </header>
  )
}
