import React, { memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTransactionStore } from '../../store/transactionStore'
import { useCategoryBudgetStore } from '../../store/categoryBudgetStore'
import { formatCurrency, formatFullCurrency } from '../../lib/utils'

export const AmountLeftChart: React.FC = memo(() => {
  const { transactions } = useTransactionStore()
  const { budgets } = useCategoryBudgetStore()
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Data is loaded by Dashboard, no need to reload here

  // Calculate current month totals from transactions
  const monthlyTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.transaction_date)
    return txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear
  })

  const totalIncome = monthlyTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpenses = monthlyTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Total budgeted amount
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budget_amount, 0)

  const remaining = totalIncome - totalExpenses
  const hasData = totalIncome > 0 || totalExpenses > 0

  const data = [
    { name: 'Remaining', value: Math.max(0, remaining), color: '#4F7CFF' },
    { name: 'Spent', value: totalExpenses, color: '#E5E7EB' },
  ]

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { 
    active?: boolean
    payload?: Array<{ payload: { name: string; value: number } }>
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white px-2 py-1.5 rounded shadow-md border border-gray-100">
          <p className="text-xs text-gray-600">
            {item.name}: {formatFullCurrency(item.value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden h-full">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <h3 className="text-center font-bold text-slate-700 text-sm uppercase tracking-wide">
          Amount Left
        </h3>
      </div>

      <div className="p-3 relative">
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className={`text-xl font-bold ${remaining >= 0 ? 'text-primary-500' : 'text-red-500'}`}>
                  {formatCurrency(remaining)}
                </span>
                {totalBudgeted > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    of {formatCurrency(totalBudgeted)} budget
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          // Clean empty state - just show ₹0 centered
          <div className="h-[180px] flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-500">₹0</span>
          </div>
        )}
      </div>
    </div>
  )
})

AmountLeftChart.displayName = 'AmountLeftChart'
