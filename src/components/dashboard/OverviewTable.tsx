import React from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { formatCurrency } from '../../lib/utils'

export const OverviewTable: React.FC = () => {
  const { getOverview } = useBudgetStore()
  const overview = getOverview()

  const rows = [
    { label: 'Income', planned: overview.income.planned, actual: overview.income.actual, sign: '+' },
    { label: 'Expenses', planned: overview.expenses.planned, actual: overview.expenses.actual, sign: '-' },
    { label: 'Bills', planned: overview.bills.planned, actual: overview.bills.actual, sign: '-' },
    { label: 'Savings', planned: overview.savings.planned, actual: overview.savings.actual, sign: '-' },
    { label: 'Debt', planned: overview.debt.planned, actual: overview.debt.actual, sign: '-' },
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
              <th className="text-right py-1 px-2 font-semibold">Planned</th>
              <th className="text-right py-1 font-semibold">Actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-1.5 text-slate-600">
                  <span className="text-slate-400 mr-1">{row.sign}</span>
                  {row.label}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  {formatCurrency(row.planned)}
                </td>
                <td className="py-1.5 text-right text-slate-700">
                  {formatCurrency(row.actual)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <td className="py-1.5 font-bold text-slate-700 uppercase text-[11px] tracking-wide">Remaining</td>
              <td className="py-1.5 px-2 text-right font-bold text-slate-800">
                {formatCurrency(overview.remaining.planned)}
              </td>
              <td className="py-1.5 text-right font-bold text-slate-800">
                {formatCurrency(overview.remaining.actual)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

