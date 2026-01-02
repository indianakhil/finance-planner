import React from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { useCategoryBudgetStore } from '../../store/categoryBudgetStore'
import { formatCurrency } from '../../lib/utils'

export const OverviewTable: React.FC = () => {
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

  const totalTransfers = monthlyTransactions
    .filter((tx) => tx.type === 'transfer')
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Total budgeted amount
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budget_amount, 0)

  const netBalance = totalIncome - totalExpenses

  const rows = [
    { label: 'Income', budgeted: '-', actual: totalIncome, sign: '+', color: 'text-green-600' },
    { label: 'Expenses', budgeted: formatCurrency(totalBudgeted), actual: totalExpenses, sign: '-', color: 'text-red-600' },
    { label: 'Transfers', budgeted: '-', actual: totalTransfers, sign: '↔', color: 'text-blue-600' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden h-full">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <h3 className="text-center font-bold text-slate-700 text-sm uppercase tracking-wide">
          Overview
        </h3>
      </div>
      
      <div className="p-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[11px] text-slate-400 uppercase tracking-wide">
              <th className="text-left py-1"></th>
              <th className="text-right py-1 px-2 font-semibold">Budget</th>
              <th className="text-right py-1 font-semibold">Actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-1.5 text-slate-600">
                  <span className={`mr-1 ${row.color}`}>{row.sign}</span>
                  {row.label}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-500">
                  {row.budgeted}
                </td>
                <td className={`py-1.5 text-right font-medium ${row.color}`}>
                  {formatCurrency(row.actual)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <td className="py-1.5 font-bold text-slate-700 uppercase text-[11px] tracking-wide">Net</td>
              <td className="py-1.5 px-2 text-right text-slate-400">-</td>
              <td className={`py-1.5 text-right font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netBalance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
