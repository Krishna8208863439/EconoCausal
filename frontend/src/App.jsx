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
import { ToastProvider } from './components/Toast.jsx'
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
    <ToastProvider>
      <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <TopBar
          onMenuToggle={() => setSidebarOpen(o => !o)}
          activePage={activePage}
        />
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => {
            setActivePage(page)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="main-content" role="main">
          <div className="content-container">
            <PageComponent
              uploadedData={uploadedData}
              onDataUploaded={setUploadedData}
              onNavigatePage={setActivePage}
            />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
