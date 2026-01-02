import React, { useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { PremiumFeatures } from '../components/layout/PremiumFeatures'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { OverviewTable } from '../components/dashboard/OverviewTable'
import { AmountLeftChart } from '../components/dashboard/AmountLeftChart'
import { CashFlowChart } from '../components/dashboard/CashFlowChart'
import { AllocationChart } from '../components/dashboard/AllocationChart'
import { CategoryTable } from '../components/dashboard/CategoryTable'
import { useBudget } from '../hooks/useBudget'
import { Loader2 } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { isLoading } = useBudget()

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Premium Features Bar */}
        <PremiumFeatures />

        {/* Summary Cards */}
        <SummaryCards />

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewTable />
          <AmountLeftChart />
          <CashFlowChart />
          <AllocationChart />
        </div>

        {/* Category Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CategoryTable category="income" />
          <CategoryTable category="expenses" />
          <CategoryTable category="bills" />
          <div className="space-y-4">
            <CategoryTable category="savings" />
            <CategoryTable category="debt" />
          </div>
        </div>
      </div>
    </Layout>
  )
}

