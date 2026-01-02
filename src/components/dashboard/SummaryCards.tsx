import React, { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, Plus } from 'lucide-react'
import { useTransactionStore } from '../../store/transactionStore'
import { useCategoryBudgetStore } from '../../store/categoryBudgetStore'
import { useCustomTileStore } from '../../store/customTileStore'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../lib/utils'
import { CustomTileModal } from '../shared/CustomTileModal'
import type { CustomDashboardTile, TransactionType } from '../../types'

export const SummaryCards: React.FC = () => {
  const { user } = useAuthStore()
  const { transactions } = useTransactionStore()
  const { budgets } = useCategoryBudgetStore()
  const { loadTiles, getActiveTiles, calculateTileTotal } = useCustomTileStore()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTile, setEditingTile] = useState<CustomDashboardTile | null>(null)
  
  const hiddenDefaultTiles = user?.settings?.hidden_default_tiles || []
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (user) {
      loadTiles(user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Calculate current month totals from transactions - memoized for performance
  const { totalIncome, totalExpenses, totalTransfers, netBalance, budgetRemaining, totalBudget } = useMemo(() => {
    const monthlyTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.transaction_date)
      return txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear
    })

    const income = monthlyTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const expenses = monthlyTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const transfers = monthlyTransactions
      .filter((tx) => tx.type === 'transfer')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const totalBudget = budgets.reduce((sum, b) => sum + b.budget_amount, 0)
    const balance = income - expenses
    const remaining = totalBudget - expenses

    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalTransfers: transfers,
      netBalance: balance,
      budgetRemaining: remaining,
      totalBudget,
    }
  }, [transactions, budgets, currentMonth, currentYear])

  const defaultCards = useMemo(() => [
    {
      label: 'Income',
      value: totalIncome,
      icon: <TrendingUp className="w-4 h-4" />,
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
      textColor: 'text-green-600',
      isDefault: true,
    },
    {
      label: 'Expenses',
      value: totalExpenses,
      icon: <TrendingDown className="w-4 h-4" />,
      gradient: 'bg-gradient-to-br from-red-500 to-rose-600',
      textColor: 'text-red-600',
      isDefault: true,
    },
    {
      label: 'Balance',
      value: netBalance,
      icon: <Wallet className="w-4 h-4" />,
      gradient: netBalance >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-red-600',
      textColor: netBalance >= 0 ? 'text-blue-600' : 'text-red-600',
      isDefault: true,
    },
    {
      label: 'Budget Left',
      value: budgetRemaining,
      icon: <Wallet className="w-4 h-4" />,
      gradient: budgetRemaining >= 0 ? 'bg-gradient-to-br from-purple-500 to-violet-600' : 'bg-gradient-to-br from-orange-500 to-red-600',
      textColor: budgetRemaining >= 0 ? 'text-purple-600' : 'text-red-600',
      show: totalBudget > 0,
      isDefault: true,
    },
    {
      label: 'Transfers',
      value: totalTransfers,
      icon: <ArrowLeftRight className="w-4 h-4" />,
      gradient: 'bg-gradient-to-br from-cyan-500 to-teal-600',
      textColor: 'text-cyan-600',
      show: totalTransfers > 0,
      isDefault: true,
    },
  ].filter((card) => card.show !== false && !hiddenDefaultTiles.includes(card.label)), [totalIncome, totalExpenses, netBalance, budgetRemaining, totalTransfers, budgets, hiddenDefaultTiles])

  // Get custom tiles with calculated totals - memoized
  const activeTiles = getActiveTiles()
  const customCards = useMemo(() => activeTiles.map((tile) => ({
    label: tile.name,
    value: calculateTileTotal(tile, transactions, currentMonth, currentYear),
    gradient: `bg-gradient-to-br`,
    style: { background: `linear-gradient(135deg, ${tile.color} 0%, ${tile.color}dd 100%)` },
    textColor: 'text-gray-800',
    isDefault: false,
    tile,
  })), [activeTiles, transactions, currentMonth, currentYear])

  const allCards = useMemo(() => [...defaultCards, ...customCards], [defaultCards, customCards])
  const totalCards = allCards.length + 1 // +1 for the Add button

  return (
    <>
      <div className={`grid gap-3 md:gap-4 ${
        totalCards <= 3 
          ? 'grid-cols-2 sm:grid-cols-3' 
          : totalCards === 4 
          ? 'grid-cols-2 md:grid-cols-4' 
          : totalCards <= 6
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
      }`}>
        {/* Default Cards */}
        {defaultCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl shadow-card overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
            onClick={() => {
              // Convert default card to custom tile for editing
              const defaultTileConfig: Partial<CustomDashboardTile> = {
                name: card.label,
                icon: '📊',
                color: card.label === 'Income' ? '#10B981' : 
                       card.label === 'Expenses' ? '#EF4444' :
                       card.label === 'Balance' ? '#3B82F6' :
                       card.label === 'Budget Left' ? '#8B5CF6' :
                       '#14B8A6',
                transaction_types: card.label === 'Income' ? ['income'] :
                                  card.label === 'Expenses' ? ['expense'] :
                                  card.label === 'Transfers' ? ['transfer'] :
                                  ['income', 'expense'] as TransactionType[],
                category_ids: [],
              }
              // Create a temporary tile object for editing
              setEditingTile({
                id: `default-${card.label.toLowerCase().replace(' ', '-')}`,
                user_id: user?.id || '',
                name: defaultTileConfig.name || card.label,
                icon: defaultTileConfig.icon || '📊',
                color: defaultTileConfig.color || '#6366F1',
                transaction_types: defaultTileConfig.transaction_types || ['expense'],
                category_ids: [],
                is_active: true,
                sort_order: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as CustomDashboardTile)
              setIsModalOpen(true)
            }}
          >
            <div className={`px-4 py-2 ${card.gradient} text-center`}>
              <div className="flex items-center justify-center gap-1.5 text-white text-sm font-medium uppercase tracking-wide">
                {card.icon}
                <span>{card.label}</span>
              </div>
            </div>
            <div className="px-4 py-4 text-center relative">
              <span className={`text-2xl font-bold ${card.textColor}`}>
                {formatCurrency(card.value)}
              </span>
            </div>
          </div>
        ))}

        {/* Custom Tiles */}
        {customCards.map((card) => (
          <div
            key={card.tile.id}
            className="bg-white rounded-2xl shadow-card overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
            onClick={() => {
              setEditingTile(card.tile)
              setIsModalOpen(true)
            }}
          >
            <div className="px-4 py-2 text-center text-white text-sm font-medium uppercase tracking-wide" style={card.style}>
              <span>{card.label}</span>
            </div>
            <div className="px-4 py-4 text-center relative">
              <span className={`text-2xl font-bold ${card.textColor}`}>
                {formatCurrency(card.value)}
              </span>
            </div>
          </div>
        ))}

        {/* Add Custom Tile Button */}
        <button
          onClick={() => {
            setEditingTile(null)
            setIsModalOpen(true)
          }}
          className="bg-white rounded-2xl shadow-card overflow-hidden border-2 border-dashed border-gray-300 active:border-primary-500 active:bg-primary-50 hover:border-primary-500 hover:bg-primary-50 transition-colors flex flex-col items-center justify-center min-h-[100px] md:min-h-[120px] touch-manipulation"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6 text-gray-400 mb-1 md:mb-2" />
          <span className="text-xs md:text-sm font-medium text-gray-600">Add Tile</span>
        </button>
      </div>

      {/* Custom Tile Modal */}
      <CustomTileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTile(null)
        }}
        editingTile={editingTile}
      />
    </>
  )
}
