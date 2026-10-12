import React, { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import DataPage from './pages/DataPage.jsx'
import CausalPage from './pages/CausalPage.jsx'
import BudgetPage from './pages/BudgetPage.jsx'
import UpliftPage from './pages/UpliftPage.jsx'
import BudgetOptimization from './pages/BudgetOptimization.jsx'
import DriftPage from './pages/DriftPage.jsx'
import FinalReportPage from './pages/FinalReportPage.jsx'
import './App.css'

const PAGES = {
  overview:     OverviewPage,
  data:         DataPage,
  causal:       CausalPage,
  budget:       BudgetPage,
  uplift:       UpliftPage,
  optimization: BudgetOptimization,
  drift:        DriftPage,
  report:       FinalReportPage,
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')
  const [uploadedData, setUploadedData] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const PageComponent = PAGES[activePage] || OverviewPage

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <TopBar onMenuToggle={() => setSidebarOpen(o => !o)} />
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={sidebarOpen}
      />
      <main className="main-content" role="main">
        <PageComponent
          uploadedData={uploadedData}
          onDataUploaded={setUploadedData}
        />
      </main>
    </div>
  )
}
