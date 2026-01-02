import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { PremiumFeatures } from '../components/layout/PremiumFeatures'
import { AccountsBalanceRow } from '../components/dashboard/AccountsBalanceRow'
import { OverviewTable } from '../components/dashboard/OverviewTable'
import { AmountLeftChart } from '../components/dashboard/AmountLeftChart'
import { CashFlowChart } from '../components/dashboard/CashFlowChart'
import { AllocationChart } from '../components/dashboard/AllocationChart'
import { IncomeTable } from '../components/dashboard/IncomeTable'
import { ExpensesTable } from '../components/dashboard/ExpensesTable'
import { UpcomingPaymentsTable } from '../components/dashboard/UpcomingPaymentsTable'
import { useAuthStore } from '../store/authStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import { useHierarchicalCategoryStore } from '../store/hierarchicalCategoryStore'
import { usePlannedPaymentStore } from '../store/plannedPaymentStore'
import { useCategoryBudgetStore } from '../store/categoryBudgetStore'
import { useCustomTileStore } from '../store/customTileStore'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { Loader2 } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { loadAccounts, isLoading: accountsLoading } = useAccountStore()
  const { loadTransactions, isLoading: transactionsLoading } = useTransactionStore()
  const { loadCategories, isLoading: categoriesLoading } = useHierarchicalCategoryStore()
  const { loadPlannedPayments, checkAndExecuteDuePayments } = usePlannedPaymentStore()
  const { loadBudgets } = useCategoryBudgetStore()
  const { loadTiles } = useCustomTileStore()
  const { addTransaction } = useTransactionStore()
  
  const [hasInitialized, setHasInitialized] = useState(false)
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        // Load all data in parallel
        await Promise.all([
          loadAccounts(user.id),
          loadTransactions(user.id),
          loadCategories(user.id),
          loadPlannedPayments(user.id),
          loadBudgets(user.id, currentMonth, currentYear),
          loadTiles(user.id),
        ])
        setHasInitialized(true)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentMonth, currentYear])

  // Check and execute due planned payments
  useEffect(() => {
    if (user && hasInitialized) {
      checkAndExecuteDuePayments(user.id, addTransaction)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasInitialized])

  // Show loading state only on initial load
  const isLoading = !hasInitialized && (accountsLoading || transactionsLoading || categoriesLoading)

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 px-3 md:px-4">
        {/* Premium Features Bar */}
        <PremiumFeatures />

        {/* Summary Cards (Income, Expenses, Custom Tiles) */}
        <SummaryCards />

        {/* Account Balances Row */}
        <AccountsBalanceRow />

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <OverviewTable />
          <AmountLeftChart />
          <CashFlowChart />
          <AllocationChart />
        </div>

        {/* Income / Expenses / Upcoming Payments */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <IncomeTable />
          <ExpensesTable />
          <UpcomingPaymentsTable />
        </div>
      </div>
    </Layout>
  )
}
