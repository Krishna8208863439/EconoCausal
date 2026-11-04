import React, { useState } from 'react'
import MainLayout from './components/MainLayout.jsx'
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

  const PageComponent = PAGES[activePage] || OverviewPage

  return (
    <ToastProvider>
      <MainLayout
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page)
        }}
      >
        <PageComponent
          uploadedData={uploadedData}
          onDataUploaded={setUploadedData}
          onNavigatePage={setActivePage}
        />
      </MainLayout>
    </ToastProvider>
  )
}
