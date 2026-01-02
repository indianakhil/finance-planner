import React, { useMemo, memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTransactionStore } from '../../store/transactionStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { formatCurrency } from '../../lib/utils'

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F59E0B', '#6366F1', '#14B8A6', '#EF4444',
]

export const AllocationChart: React.FC = memo(() => {
  const { transactions } = useTransactionStore()
  const { categories, getParentCategories } = useHierarchicalCategoryStore()
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Data is loaded by Dashboard, no need to reload here

  // Calculate spending by category
  const data = useMemo(() => {
    const parentCategories = getParentCategories()
    const monthlyExpenses = transactions.filter((tx) => {
      if (tx.type !== 'expense') return false
      const txDate = new Date(tx.transaction_date)
      return txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear
    })

    const total = monthlyExpenses.reduce((sum, tx) => sum + tx.amount, 0)

    // Calculate spending per parent category
    const categoryData = parentCategories.map((cat, index) => {
      const subcategoryIds = categories
        .filter((c) => c.parent_id === cat.id)
        .map((c) => c.id)
      
      const spent = monthlyExpenses
        .filter((tx) => {
          const catId = tx.new_category_id || tx.category_id
          return catId === cat.id || subcategoryIds.includes(catId || '')
        })
        .reduce((sum, tx) => sum + tx.amount, 0)

      return {
        name: cat.name.length > 12 ? cat.name.substring(0, 12) + '…' : cat.name,
        fullName: cat.name,
        value: spent,
        color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        percentage: total > 0 ? ((spent / total) * 100).toFixed(1) : '0',
        icon: cat.icon,
      }
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

    return categoryData
  }, [transactions, categories, currentMonth, currentYear])

  const hasData = data.length > 0

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { 
    active?: boolean
    payload?: Array<{ payload: { fullName: string; value: number; percentage: string; icon: string } }>
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white px-2 py-1.5 rounded shadow-md border border-gray-100">
          <p className="text-xs font-medium text-gray-700">{item.icon} {item.fullName}</p>
          <p className="text-xs text-gray-500">{formatCurrency(item.value)} ({item.percentage}%)</p>
        </div>
      )
    }
    return null
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
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={55}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend below chart */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] text-slate-600">
                    {item.icon} {item.name} {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Clean empty state
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-slate-300 text-sm">No spending data</p>
          </div>
        )}
      </div>
    </div>
  )
})

AllocationChart.displayName = 'AllocationChart'
