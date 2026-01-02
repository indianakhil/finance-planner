import React from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { useBudgetStore } from '../../store/budgetStore'
import { formatCurrency } from '../../lib/utils'

export const CashFlowChart: React.FC = () => {
  const { getOverview } = useBudgetStore()
  const overview = getOverview()

  const data = [
    {
      name: 'Expenses',
      Planned: overview.expenses.planned,
      Actual: overview.expenses.actual,
    },
    {
      name: 'Bills',
      Planned: overview.bills.planned,
      Actual: overview.bills.actual,
    },
    {
      name: 'Savings',
      Planned: overview.savings.planned,
      Actual: overview.savings.actual,
    },
    {
      name: 'Debt',
      Planned: overview.debt.planned,
      Actual: overview.debt.actual,
    },
  ]

  // Check if there's any data
  const hasData = data.some(d => d.Planned > 0 || d.Actual > 0)

  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, '₹')}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden h-full">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <h3 className="text-center font-bold text-slate-700 text-sm uppercase tracking-wide">
          Cash Flow
        </h3>
      </div>

      <div className="p-3">
        {hasData ? (
          <>
            {/* Legend at top */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-300"></div>
                <span className="text-xs text-slate-600">Planned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                <span className="text-xs text-slate-600">Actual</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => value === 0 ? '0' : formatCurrency(value, '')}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Planned" fill="#93C5FD" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Actual" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </>
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

