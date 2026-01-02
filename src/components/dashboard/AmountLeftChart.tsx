import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useBudgetStore } from '../../store/budgetStore'
import { formatCurrency, formatFullCurrency } from '../../lib/utils'

export const AmountLeftChart: React.FC = () => {
  const { getOverview } = useBudgetStore()
  const overview = getOverview()

  const totalOutgoing = 
    overview.expenses.actual + 
    overview.bills.actual + 
    overview.savings.actual + 
    overview.debt.actual

  const remaining = overview.income.actual - totalOutgoing
  const hasData = overview.income.actual > 0 || totalOutgoing > 0

  const data = [
    { name: 'Remaining', value: Math.max(0, remaining), color: '#4F7CFF' },
    { name: 'Spent', value: totalOutgoing, color: '#E5E7EB' },
  ]

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
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatFullCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center mt-4">
                <span className="text-2xl font-bold text-primary-500">
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </>
        ) : (
          // Clean empty state - just show ₹0 centered
          <div className="h-[200px] flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-500">₹0</span>
          </div>
        )}
      </div>
    </div>
  )
}

