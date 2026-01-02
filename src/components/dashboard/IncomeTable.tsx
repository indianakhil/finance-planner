import React, { useState } from 'react'
import { Plus, TrendingUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '../../store/transactionStore'
import { useAccountStore } from '../../store/accountStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { formatCurrency } from '../../lib/utils'
import { TransactionModal } from '../shared/TransactionModal'

export const IncomeTable: React.FC = () => {
  const navigate = useNavigate()
  const { transactions } = useTransactionStore()
  const { accounts } = useAccountStore()
  const { categories } = useHierarchicalCategoryStore()
  
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Get income transactions for current month
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  
  const incomeTransactions = transactions
    .filter((tx) => {
      if (tx.type !== 'income') return false
      const txDate = new Date(tx.transaction_date)
      return txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5) // Show last 5

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)

  const getCategoryDisplay = (categoryId: string | null) => {
    if (!categoryId) return { name: '', icon: '' }
    const category = categories.find((c) => c.id === categoryId)
    return category ? { name: category.name, icon: category.icon } : { name: '', icon: '' }
  }

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return '-'
    const account = accounts.find((a) => a.id === accountId)
    return account?.name || '-'
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-card overflow-hidden h-full">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/80" />
            <span className="text-white font-semibold text-sm uppercase tracking-wide">Income</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 active:bg-white/20 hover:bg-white/20 rounded transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Add Income"
            aria-label="Add Income"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {incomeTransactions.length > 0 ? (
            <div className="space-y-2">
            {incomeTransactions.map((tx) => {
              const categoryDisplay = getCategoryDisplay(tx.new_category_id || tx.category_id)
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 px-2 active:bg-gray-50 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer touch-manipulation"
                  onClick={() => navigate('/transactions?type=income')}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {categoryDisplay.icon && <span className="text-lg">{categoryDisplay.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {tx.name || tx.payee || categoryDisplay.name || 'Income'}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {categoryDisplay.name && (
                          <span className="text-gray-400">{categoryDisplay.name}</span>
                        )}
                        {categoryDisplay.name && <span className="text-gray-300">•</span>}
                        <span>{new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        {tx.destination_account_id && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{getAccountName(tx.destination_account_id)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(tx.amount)}
                  </span>
                </div>
              )
            })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No income this month</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-sm text-green-600 active:text-green-700 hover:text-green-700 font-medium py-2 px-4 rounded touch-manipulation"
              >
                Add income
              </button>
            </div>
          )}

          {/* Total & View All */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => navigate('/transactions?type=income')}
              className="flex items-center gap-1 text-xs text-gray-500 active:text-gray-700 hover:text-gray-700 py-2 px-2 -ml-2 rounded touch-manipulation"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</span>
          </div>
        </div>
      </div>

      {/* Shared Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType="income"
      />
    </>
  )
}
