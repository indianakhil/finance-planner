import React, { useMemo, memo } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { useTransactionStore } from '../../store/transactionStore'
import { useCategoryBudgetStore } from '../../store/categoryBudgetStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { formatCurrency } from '../../lib/utils'

export const CashFlowChart: React.FC = memo(() => {
  const { transactions } = useTransactionStore()
  const { budgets } = useCategoryBudgetStore()
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

    // Get top 4 categories by spending
    const categorySpending = parentCategories.map((cat) => {
      const subcategoryIds = categories
        .filter((c) => c.parent_id === cat.id)
        .map((c) => c.id)
      
      const spent = monthlyExpenses
        .filter((tx) => {
          const catId = tx.new_category_id || tx.category_id
          return catId === cat.id || subcategoryIds.includes(catId || '')
        })
        .reduce((sum, tx) => sum + tx.amount, 0)

      const budget = budgets.find((b) => b.category_id === cat.id)?.budget_amount || 0

      return {
        name: cat.name.length > 10 ? cat.name.substring(0, 10) + '…' : cat.name,
        fullName: cat.name,
        Budgeted: budget,
        Spent: spent,
        icon: cat.icon,
      }
    })
    .filter((c) => c.Spent > 0 || c.Budgeted > 0)
    .sort((a, b) => b.Spent - a.Spent)
    .slice(0, 4)

    return categorySpending
  }, [transactions, budgets, categories, currentMonth, currentYear])

  // Check if there's any data
  const hasData = data.length > 0

  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string; payload: { fullName: string } }>
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      const fullName = payload[0]?.payload?.fullName || label
      return (
        <div className="bg-white px-2 py-1.5 rounded shadow-md border border-gray-100">
          <p className="text-xs font-medium text-gray-700 mb-1">{fullName}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-[10px]" style={{ color: entry.color }}>
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
          Spending
        </h3>
      </div>

      <div className="p-3">
        {hasData ? (
          <>
            {/* Legend at top */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-300"></div>
                <span className="text-xs text-slate-600">Budgeted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                <span className="text-xs text-slate-600">Spent</span>
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
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Budgeted" fill="#93C5FD" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Spent" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          // Clean empty state
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-slate-300 text-sm">No spending data</p>
          </div>
        )}
      </div>
    </div>
  )
})

CashFlowChart.displayName = 'CashFlowChart'
