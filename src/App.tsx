import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Pages
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { AuthCallbackPage } from './pages/AuthCallback'
import { Settings } from './pages/Settings'
import { Export } from './pages/Export'

// Feature Pages
import { NetWorthTracker } from './components/features/NetWorthTracker'
import { FinancialCalendar } from './components/features/FinancialCalendar'
import { AnnualDashboard } from './components/features/AnnualDashboard'
import { DebtPayoffCalculator } from './components/features/DebtPayoffCalculator'
import { RecurringBillsManager } from './components/features/RecurringBillsManager'
import { BudgetTemplates } from './components/features/BudgetTemplates'
import { AIInsights } from './components/features/AIInsights'
import { AccountsManager } from './components/features/AccountsManager'
import { TransactionsManager } from './components/features/TransactionsManager'
import { BudgetTracker } from './components/features/BudgetTracker'
import { PlannedPaymentsManager } from './components/features/PlannedPaymentsManager'
import { CategoryManager } from './components/features/CategoryManager'

// Components
import { AuthGuard } from './components/auth/AuthGuard'
import { ToastContainer } from './components/ui/Toast'

const App: React.FC = () => {
  // useAuth hook initializes auth on mount
  useAuth()

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Settings />
            </AuthGuard>
          }
        />
        <Route
          path="/export"
          element={
            <AuthGuard>
              <Export />
            </AuthGuard>
          }
        />
        <Route
          path="/net-worth"
          element={
            <AuthGuard>
              <NetWorthTracker />
            </AuthGuard>
          }
        />
        <Route
          path="/calendar"
          element={
            <AuthGuard>
              <FinancialCalendar />
            </AuthGuard>
          }
        />
        <Route
          path="/annual"
          element={
            <AuthGuard>
              <AnnualDashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/debt-calculator"
          element={
            <AuthGuard>
              <DebtPayoffCalculator />
            </AuthGuard>
          }
        />
        <Route
          path="/recurring-bills"
          element={
            <AuthGuard>
              <RecurringBillsManager />
            </AuthGuard>
          }
        />
        <Route
          path="/templates"
          element={
            <AuthGuard>
              <BudgetTemplates />
            </AuthGuard>
          }
        />
        <Route
          path="/ai-insights"
          element={
            <AuthGuard>
              <AIInsights />
            </AuthGuard>
          }
        />
        <Route
          path="/accounts"
          element={
            <AuthGuard>
              <AccountsManager />
            </AuthGuard>
          }
        />
        <Route
          path="/transactions"
          element={
            <AuthGuard>
              <TransactionsManager />
            </AuthGuard>
          }
        />
        <Route
          path="/budget-tracker"
          element={
            <AuthGuard>
              <BudgetTracker />
            </AuthGuard>
          }
        />
        <Route
          path="/planned-payments"
          element={
            <AuthGuard>
              <PlannedPaymentsManager />
            </AuthGuard>
          }
        />
        <Route
          path="/categories"
          element={
            <AuthGuard>
              <CategoryManager />
            </AuthGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}

export default App

