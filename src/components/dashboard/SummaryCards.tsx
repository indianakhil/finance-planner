import React from 'react'
import { RefreshCw } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { formatCurrency, getCategoryGradient, getCategoryLabel } from '../../lib/utils'
import type { Category } from '../../types'

const categories: Category[] = ['income', 'expenses', 'bills', 'savings', 'debt']

export const SummaryCards: React.FC = () => {
  const { getCategorySummary, previousMonthRemaining } = useBudgetStore()

  // Always show the previous month's remaining amount
  const rolloverAmount = previousMonthRemaining ?? 0
  const hasRollover = previousMonthRemaining !== null && previousMonthRemaining !== 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {/* Rollover card - always displays previous month remaining */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-4 py-2 bg-gray-100 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-sm font-medium">
            <RefreshCw className="w-3 h-3" />
            <span>ROLLOVER</span>
          </div>
        </div>
        <div className="px-4 py-4 text-center">
          <span className={`text-2xl font-bold ${hasRollover ? (rolloverAmount >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
            {formatCurrency(rolloverAmount)}
          </span>
        </div>
      </div>

      {/* Category cards */}
      {categories.map((category) => {
        const summary = getCategorySummary(category)
        return (
          <div
            key={category}
            className="bg-white rounded-2xl shadow-card overflow-hidden"
          >
            <div className={`px-4 py-2 ${getCategoryGradient(category)} text-center`}>
              <span className="text-white text-sm font-medium uppercase tracking-wide">
                {getCategoryLabel(category)}
              </span>
            </div>
            <div className="px-4 py-4 text-center">
              <span className="text-2xl font-bold text-gray-800">
                {formatCurrency(summary.actual)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

