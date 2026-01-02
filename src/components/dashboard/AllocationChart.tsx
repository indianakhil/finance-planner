import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useBudgetStore } from '../../store/budgetStore'
import { formatCurrency } from '../../lib/utils'
import type { Category } from '../../types'

const COLORS: Record<Category, string> = {
  expenses: '#3B82F6',
  bills: '#6366F1',
  savings: '#10B981',
  debt: '#EC4899',
  income: '#22C55E',
}

export const AllocationChart: React.FC = () => {
  const { getOverview } = useBudgetStore()
  const overview = getOverview()

  const total = 
    overview.expenses.actual + 
    overview.bills.actual + 
    overview.savings.actual + 
    overview.debt.actual

  const data = [
    { 
      name: 'Expenses', 
      value: overview.expenses.actual, 
      color: COLORS.expenses,
      percentage: total > 0 ? ((overview.expenses.actual / total) * 100).toFixed(1) : 0
    },
    { 
      name: 'Bills', 
      value: overview.bills.actual, 
      color: COLORS.bills,
      percentage: total > 0 ? ((overview.bills.actual / total) * 100).toFixed(1) : 0
    },
    { 
      name: 'Savings', 
      value: overview.savings.actual, 
      color: COLORS.savings,
      percentage: total > 0 ? ((overview.savings.actual / total) * 100).toFixed(1) : 0
    },
    { 
      name: 'Debt', 
      value: overview.debt.actual, 
      color: COLORS.debt,
      percentage: total > 0 ? ((overview.debt.actual / total) * 100).toFixed(1) : 0
    },
  ].filter(item => item.value > 0)

  const hasData = data.length > 0

  const renderCustomLabel = ({ 
    cx, 
    cy, 
    midAngle, 
    innerRadius, 
    outerRadius, 
    name,
    percentage 
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    name: string
    percentage: string | number
  }) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 25
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs"
      >
        {name} ({percentage}%)
      </text>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden h-full">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <h3 className="text-center font-bold text-slate-700 text-sm uppercase tracking-wide">
          Allocation
        </h3>
      </div>

      <div className="p-3">
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={60}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          // Clean empty state
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-slate-300 text-sm">No data to display</p>
          </div>
        )}
      </div>
    </div>
  )
}

