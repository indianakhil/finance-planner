import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { TransactionType as TxType } from '../../types'
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Loader2, Filter, Calendar, Search, MoreVertical, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { useTransactionStore } from '../../store/transactionStore'
import { useAccountStore } from '../../store/accountStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { useAuthStore } from '../../store/authStore'
import { formatFullCurrency } from '../../lib/utils'
import { logger } from '../../lib/logger'
import { useToast } from '../../hooks/useToast'
import type { Transaction, TransactionType, TransactionStatus, Account } from '../../types'
import { isCreditTypeAccount } from '../../types'

interface TransactionFormData {
  type: TransactionType
  name: string
  source_account_id: string | null
  destination_account_id: string | null
  category_id: string | null
  amount: number
  transaction_date: string
  transaction_time: string
  note: string
  payee: string
  payment_type: string
  warranty_until: string
  status: TransactionStatus
  place: string
}

const initialFormData: TransactionFormData = {
  type: 'expense',
  name: '',
  source_account_id: null,
  destination_account_id: null,
  category_id: null,
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  transaction_time: '',
  note: '',
  payee: '',
  payment_type: '',
  warranty_until: '',
  status: 'uncleared',
  place: '',
}

const TYPE_ICONS: Record<TransactionType, React.ReactNode> = {
  income: <ArrowDownLeft className="w-4 h-4" />,
  expense: <ArrowUpRight className="w-4 h-4" />,
  transfer: <ArrowLeftRight className="w-4 h-4" />,
}

const TYPE_COLORS: Record<TransactionType, string> = {
  income: 'bg-green-100 text-green-600',
  expense: 'bg-red-100 text-red-600',
  transfer: 'bg-blue-100 text-blue-600',
}

const STATUS_COLORS: Record<TransactionStatus, string> = {
  reconciled: 'bg-green-100 text-green-700',
  cleared: 'bg-blue-100 text-blue-700',
  uncleared: 'bg-gray-100 text-gray-600',
}

// Get default status based on account type
const getDefaultStatus = (account: Account | undefined): TransactionStatus => {
  if (!account) return 'cleared'
  // Credit cards and overdraft accounts default to uncleared
  if (isCreditTypeAccount(account.type)) {
    return 'uncleared'
  }
  // All other accounts default to cleared
  return 'cleared'
}

export const TransactionsManager: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { transactions, isLoading, loadTransactions, addTransaction, updateTransaction, deleteTransaction } = useTransactionStore()
  const { accounts, loadAccounts } = useAccountStore()
  const { categories, loadCategories, getParentCategories, getSubcategories } = useHierarchicalCategoryStore()
  const { showSuccess, showError } = useToast()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | ''>('')
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | ''>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')

  const hasActiveFilters = filterType || filterAccount || filterCategory || filterStatus || filterStartDate || filterEndDate

  const clearFilters = () => {
    setFilterType('')
    setFilterAccount('')
    setFilterCategory('')
    setFilterStatus('')
    setFilterStartDate('')
    setFilterEndDate('')
    setSearchQuery('')
  }

  useEffect(() => {
    if (user) {
      loadTransactions(user.id)
      loadAccounts(user.id)
      loadCategories(user.id)
    }
  }, [user?.id])

  // Handle URL query parameters for filtering
  useEffect(() => {
    const typeParam = searchParams.get('type') as TxType | null
    
    if (typeParam && ['income', 'expense', 'transfer'].includes(typeParam)) {
      // Set the filter to show that type
      setFilterType(typeParam)
    }
  }, [searchParams])

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setFormData({
        type: transaction.type,
        name: transaction.name || '',
        source_account_id: transaction.source_account_id,
        destination_account_id: transaction.destination_account_id,
        category_id: transaction.new_category_id || transaction.category_id, // Prefer new_category_id, fallback to legacy
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        transaction_time: transaction.transaction_time || '',
        note: transaction.note || '',
        payee: transaction.payee || '',
        payment_type: transaction.payment_type || '',
        warranty_until: transaction.warranty_until || '',
        status: transaction.status,
        place: transaction.place || '',
      })
    } else {
      setEditingTransaction(null)
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
    setActiveMenu(null)
    setExpandedCategories(new Set())
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTransaction(null)
    setFormData(initialFormData)
  }

  // Get account by ID
  const getAccountById = (id: string | null) => {
    if (!id) return undefined
    return accounts.find(acc => acc.id === id)
  }

  // Handle source account selection - updates status based on account type
  const handleSourceAccountChange = (accountId: string | null) => {
    const account = getAccountById(accountId)
    const newStatus = editingTransaction ? formData.status : getDefaultStatus(account)
    setFormData({ 
      ...formData, 
      source_account_id: accountId,
      status: newStatus 
    })
  }

  // Handle destination account selection for income
  const handleDestinationAccountChange = (accountId: string | null) => {
    const account = getAccountById(accountId)
    // For income, the destination account determines default status
    const newStatus = editingTransaction ? formData.status : getDefaultStatus(account)
    setFormData({ 
      ...formData, 
      destination_account_id: accountId,
      status: formData.type === 'income' ? newStatus : formData.status
    })
  }

  const handleSave = async () => {
    if (!user || formData.amount <= 0) return

    setIsSaving(true)

    try {
      const transactionData = {
        user_id: user.id,
        type: formData.type,
        name: formData.name || null,
        source_account_id: formData.source_account_id || null,
        destination_account_id: formData.destination_account_id || null,
        category_id: null, // Legacy field - always null, use new_category_id instead
        new_category_id: formData.category_id || null, // References new categories table
        amount: formData.amount,
        transaction_date: formData.transaction_date,
        transaction_time: formData.transaction_time || null,
        note: formData.note || null,
        payee: formData.payee || null,
        payment_type: formData.payment_type || null,
        payment_method: null,
        warranty_until: formData.warranty_until || null,
        status: formData.status,
        place: formData.place || null,
        planned_payment_id: null,
      }

      if (editingTransaction) {
        const success = await updateTransaction(editingTransaction.id, transactionData)
        if (!success) {
          const currentError = useTransactionStore.getState().error
          showError(currentError || 'Failed to update transaction. Please try again.')
          return
        }
        showSuccess('Transaction updated')
      } else {
        const result = await addTransaction(transactionData)
        if (!result) {
          const currentError = useTransactionStore.getState().error
          showError(currentError || 'Failed to create transaction. Please try again.')
          return
        }
        showSuccess('Transaction created')
      }

      handleCloseModal()
    } catch (error) {
      showError('An error occurred. Please try again.')
      logger.error('Error saving transaction', error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await deleteTransaction(id)
    }
    setActiveMenu(null)
  }

  // Get parent categories for hierarchical selection
  const parentCategories = getParentCategories()

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Get selected category display info
  const getSelectedCategoryDisplay = () => {
    if (!formData.category_id) return null
    // Check if it's a parent category
    const parent = parentCategories.find(c => c.id === formData.category_id)
    if (parent) return { name: parent.name, icon: parent.icon, isParent: true }
    // Check if it's a subcategory
    for (const parentCat of parentCategories) {
      const subs = getSubcategories(parentCat.id)
      const sub = subs.find(s => s.id === formData.category_id)
      if (sub) return { name: sub.name, icon: sub.icon, isParent: false, parentName: parentCat.name }
    }
    return null
  }

  const selectedCategoryDisplay = getSelectedCategoryDisplay()

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    // Type filter
    if (filterType && txn.type !== filterType) return false
    
    // Account filter
    if (filterAccount) {
      const matchesSource = txn.source_account_id === filterAccount
      const matchesDest = txn.destination_account_id === filterAccount
      if (!matchesSource && !matchesDest) return false
    }
    
    // Category filter
    if (filterCategory && txn.category_id !== filterCategory) return false
    
    // Status filter
    if (filterStatus && txn.status !== filterStatus) return false
    
    // Date range filter
    if (filterStartDate && txn.transaction_date < filterStartDate) return false
    if (filterEndDate && txn.transaction_date > filterEndDate) return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = txn.name?.toLowerCase().includes(query)
      const matchesPayee = txn.payee?.toLowerCase().includes(query)
      const matchesNote = txn.note?.toLowerCase().includes(query)
      const matchesPlace = txn.place?.toLowerCase().includes(query)
      const matchesAmount = txn.amount.toString().includes(query)
      if (!matchesName && !matchesPayee && !matchesNote && !matchesPlace && !matchesAmount) return false
    }
    return true
  })

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, txn) => {
    const date = txn.transaction_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(txn)
    return groups
  }, {} as Record<string, Transaction[]>)

  const getAccountName = (id: string | null) => {
    if (!id) return ''
    const account = accounts.find((acc) => acc.id === id)
    return account?.name || 'Unknown'
  }

  const getCategoryName = (id: string | null) => {
    if (!id) return ''
    const category = categories.find((cat) => cat.id === id)
    return category?.name || 'Uncategorized'
  }

  const getCategoryIcon = (id: string | null) => {
    if (!id) return '📁'
    const category = categories.find((cat) => cat.id === id)
    return category?.icon || '📁'
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
              <p className="text-sm text-gray-500">Track your income, expenses & transfers</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, payee, note, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button
            variant={showFilters || hasActiveFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 relative"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                {/* Account Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                  <select
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as TransactionStatus | '')}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Status</option>
                    <option value="uncleared">Uncleared</option>
                    <option value="cleared">Cleared</option>
                    <option value="reconciled">Reconciled</option>
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Filter Summary & Clear */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No transactions yet</h3>
              <p className="text-gray-400 mb-4">Add your first transaction to start tracking</p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTransactions)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, txns]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    {new Date(date).toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <Card>
                    <CardContent className="divide-y divide-gray-100">
                      {txns.map((txn) => (
                        <div key={txn.id} className="flex items-center justify-between py-3 px-3 md:px-4 active:bg-gray-50 hover:bg-gray-50">
                          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                            <div className={`p-1.5 md:p-2 rounded-lg flex-shrink-0 ${TYPE_COLORS[txn.type]}`}>
                              {TYPE_ICONS[txn.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="text-base md:text-lg flex-shrink-0">{getCategoryIcon(txn.new_category_id || txn.category_id)}</span>
                                <span className="font-medium text-gray-800 text-sm md:text-base truncate">
                                  {txn.type === 'transfer' 
                                    ? `${getAccountName(txn.source_account_id)} → ${getAccountName(txn.destination_account_id)}`
                                    : txn.name || txn.payee || getCategoryName(txn.new_category_id || txn.category_id) || 'Transaction'
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500 flex-wrap">
                                {getCategoryName(txn.new_category_id || txn.category_id) && txn.name && (
                                  <span className="text-gray-400">{getCategoryName(txn.new_category_id || txn.category_id)}</span>
                                )}
                                {txn.payee && txn.name !== txn.payee && <span>• {txn.payee}</span>}
                                {txn.note && <span>• {txn.note}</span>}
                                <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${STATUS_COLORS[txn.status]}`}>
                                  {txn.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            <span className={`text-base md:text-lg font-semibold whitespace-nowrap ${
                              txn.type === 'income' ? 'text-green-600' : 
                              txn.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
                              {formatFullCurrency(txn.amount)}
                            </span>
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenu(activeMenu === txn.id ? null : txn.id)}
                                className="p-2 active:bg-gray-100 hover:bg-gray-100 rounded touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                aria-label="More options"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-400" />
                              </button>
                              {activeMenu === txn.id && (
                                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[120px]">
                                  <button
                                    onClick={() => handleOpenModal(txn)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(txn.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type, category_id: null })}
                    className={`py-2 px-3 rounded-lg border-2 capitalize flex items-center justify-center gap-2 ${
                      formData.type === type 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {TYPE_ICONS[type]}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === 'income' ? 'e.g., AK Salary' : 'e.g., Zomato Order'}
            />

            {/* Amount */}
            <Input
              label="Amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="0"
            />

            {/* Source Account (for expense and transfer) */}
            {(formData.type === 'expense' || formData.type === 'transfer') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'transfer' ? 'From Account' : 'Account'}
                </label>
                <select
                  value={formData.source_account_id || ''}
                  onChange={(e) => handleSourceAccountChange(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select account</option>
                  {accounts.filter(acc => acc.is_active).map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Destination Account (for income and transfer) */}
            {(formData.type === 'income' || formData.type === 'transfer') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'transfer' ? 'To Account' : 'Account'}
                </label>
                <select
                  value={formData.destination_account_id || ''}
                  onChange={(e) => handleDestinationAccountChange(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select account</option>
                  {accounts.filter(acc => acc.is_active).map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category (not for transfers) - Hierarchical Selection */}
            {formData.type !== 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                
                {/* Selected Category Display */}
                {selectedCategoryDisplay && (
                  <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
                    <span className="text-lg">{selectedCategoryDisplay.icon}</span>
                    <div className="flex-1 min-w-0">
                      {selectedCategoryDisplay.isParent ? (
                        <div className="text-sm font-medium text-gray-800">{selectedCategoryDisplay.name}</div>
                      ) : (
                        <div className="text-sm font-medium text-gray-800">
                          {selectedCategoryDisplay.name}
                          {selectedCategoryDisplay.parentName && (
                            <span className="text-gray-500 font-normal"> in {selectedCategoryDisplay.parentName}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category_id: null })}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded active:bg-gray-200 touch-manipulation"
                    >
                      Clear
                    </button>
                  </div>
                )}
                
                {/* Category Selection List */}
                <div className="space-y-1.5 max-h-[180px] md:max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-2 scrollbar-hide">
                  {parentCategories.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No categories available. Create categories in Settings first.
                    </div>
                  ) : (
                    parentCategories.map((parent) => {
                      const subcategories = getSubcategories(parent.id)
                      const isExpanded = expandedCategories.has(parent.id)
                      const isParentSelected = formData.category_id === parent.id
                      const hasSubcategories = subcategories.length > 0
                      
                      return (
                        <div key={parent.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Parent Category */}
                          <div
                            className={`flex items-center gap-2.5 p-2.5 cursor-pointer transition-colors touch-manipulation min-h-[44px] ${
                              isParentSelected
                                ? 'bg-primary-50 border-primary-200'
                                : 'bg-white hover:bg-gray-50 active:bg-gray-50'
                            }`}
                            onClick={() => {
                              if (hasSubcategories) {
                                toggleCategoryExpansion(parent.id)
                                if (isExpanded && !isParentSelected) {
                                  setFormData({ ...formData, category_id: parent.id })
                                }
                              } else {
                                setFormData({ ...formData, category_id: parent.id })
                              }
                            }}
                          >
                            <span className="text-lg flex-shrink-0">{parent.icon}</span>
                            <span className={`flex-1 text-sm font-medium truncate ${
                              isParentSelected ? 'text-primary-700' : 'text-gray-800'
                            }`}>
                              {parent.name}
                            </span>
                            {hasSubcategories && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-xs text-gray-400">({subcategories.length})</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Subcategories */}
                          {isExpanded && hasSubcategories && (
                            <div className="bg-gray-50 border-t border-gray-200">
                              <div className="p-1.5 space-y-1">
                                {subcategories.map((sub) => {
                                  const isSubSelected = formData.category_id === sub.id
                                  return (
                                    <div
                                      key={sub.id}
                                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors touch-manipulation min-h-[40px] ${
                                        isSubSelected
                                          ? 'bg-primary-50 border border-primary-200'
                                          : 'hover:bg-white active:bg-white'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFormData({ ...formData, category_id: sub.id })
                                      }}
                                    >
                                      <span className="text-base flex-shrink-0">{sub.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm block truncate ${
                                          isSubSelected ? 'text-primary-700 font-medium' : 'text-gray-700'
                                        }`}>
                                          {sub.name}
                                          <span className="text-gray-500 font-normal"> in {parent.name}</span>
                                        </span>
                                      </div>
                                      {isSubSelected && (
                                        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              />
              <Input
                label="Time (Optional)"
                type="time"
                value={formData.transaction_time}
                onChange={(e) => setFormData({ ...formData, transaction_time: e.target.value })}
              />
            </div>

            {/* Optional Fields */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700">
                More Options
              </summary>
              <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-100">
                <Input
                  label="Payee"
                  value={formData.payee}
                  onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                  placeholder="e.g., Amazon, Swiggy"
                />

                <Input
                  label="Note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Add a note..."
                />

                <Input
                  label="Payment Type"
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  placeholder="e.g., UPI, Card, Cash"
                />

                <Input
                  label="Place"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  placeholder="e.g., Mall, Online"
                />

                <Input
                  label="Warranty Until"
                  type="date"
                  value={formData.warranty_until}
                  onChange={(e) => setFormData({ ...formData, warranty_until: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TransactionStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="uncleared">Uncleared</option>
                    <option value="cleared">Cleared</option>
                    <option value="reconciled">Reconciled</option>
                  </select>
                </div>
              </div>
            </details>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || formData.amount <= 0} className="flex-1">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTransaction ? 'Save Changes' : 'Add Transaction'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

