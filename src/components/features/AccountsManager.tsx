import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Wallet, CreditCard, PiggyBank, TrendingUp, Building, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { useAccountStore } from '../../store/accountStore'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../lib/utils'
import type { Account, AccountType } from '../../types'
import { ACCOUNT_TYPE_LABELS, isCreditTypeAccount } from '../../types'

const ACCOUNT_ICONS: Record<AccountType, React.ReactNode> = {
  general: <Wallet className="w-5 h-5" />,
  cash: <Wallet className="w-5 h-5" />,
  current: <Building className="w-5 h-5" />,
  credit_card: <CreditCard className="w-5 h-5" />,
  savings: <PiggyBank className="w-5 h-5" />,
  bonus: <TrendingUp className="w-5 h-5" />,
  insurance: <Building className="w-5 h-5" />,
  investment: <TrendingUp className="w-5 h-5" />,
  loan: <Building className="w-5 h-5" />,
  mortgage: <Building className="w-5 h-5" />,
  overdraft: <CreditCard className="w-5 h-5" />,
}

const ACCOUNT_COLORS: Record<AccountType, string> = {
  general: 'bg-slate-500',
  cash: 'bg-green-500',
  current: 'bg-blue-500',
  credit_card: 'bg-purple-500',
  savings: 'bg-emerald-500',
  bonus: 'bg-amber-500',
  insurance: 'bg-cyan-500',
  investment: 'bg-indigo-500',
  loan: 'bg-red-500',
  mortgage: 'bg-rose-500',
  overdraft: 'bg-orange-500',
}

interface AccountFormData {
  name: string
  account_number: string
  type: AccountType
  initial_balance: number
  credit_limit: number | null
  balance_display: 'available_credit' | 'credit_balance' | null
  payment_due_day: number | null
}

const initialFormData: AccountFormData = {
  name: '',
  account_number: '',
  type: 'general',
  initial_balance: 0,
  credit_limit: null,
  balance_display: null,
  payment_due_day: null,
}

export const AccountsManager: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { accounts, isLoading, loadAccounts, addAccount, updateAccount, deleteAccount } = useAccountStore()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState<AccountFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadAccounts(user.id)
    }
  }, [user?.id, loadAccounts])

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        name: account.name,
        account_number: account.account_number || '',
        type: account.type,
        initial_balance: account.initial_balance,
        credit_limit: account.credit_limit,
        balance_display: account.balance_display,
        payment_due_day: account.payment_due_day,
      })
    } else {
      setEditingAccount(null)
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
    setActiveMenu(null)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAccount(null)
    setFormData(initialFormData)
  }

  const handleSave = async () => {
    if (!user || !formData.name.trim()) return

    setIsSaving(true)

    if (editingAccount) {
      await updateAccount(editingAccount.id, {
        name: formData.name,
        account_number: formData.account_number || null,
        type: formData.type,
        credit_limit: formData.credit_limit,
        balance_display: formData.balance_display,
        payment_due_day: formData.payment_due_day,
      })
    } else {
      await addAccount({
        user_id: user.id,
        name: formData.name,
        account_number: formData.account_number || null,
        type: formData.type,
        initial_balance: formData.initial_balance,
        credit_limit: formData.credit_limit,
        balance_display: formData.balance_display,
        payment_due_day: formData.payment_due_day,
        is_active: true,
      })
    }

    setIsSaving(false)
    handleCloseModal()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account? This will also affect related transactions.')) {
      await deleteAccount(id)
    }
    setActiveMenu(null)
  }

  const totalBalance = accounts
    .filter(acc => acc.is_active && !['credit_card', 'loan', 'mortgage', 'overdraft'].includes(acc.type))
    .reduce((sum, acc) => sum + acc.current_balance, 0)

  const totalDebt = accounts
    .filter(acc => acc.is_active && ['credit_card', 'loan', 'mortgage', 'overdraft'].includes(acc.type))
    .reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0)

  const showCreditFields = isCreditTypeAccount(formData.type)

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
              <h1 className="text-2xl font-bold text-gray-800">Accounts</h1>
              <p className="text-sm text-gray-500">Manage your financial accounts</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Account
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1">Total Balance</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-1">Total Debt</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No accounts yet</h3>
              <p className="text-gray-400 mb-4">Add your first account to start tracking</p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg text-white ${ACCOUNT_COLORS[account.type]}`}>
                        {ACCOUNT_ICONS[account.type]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{account.name}</h3>
                        <p className="text-sm text-gray-500">
                          {ACCOUNT_TYPE_LABELS[account.type]}
                          {account.account_number && ` • ****${account.account_number.slice(-4)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${account.current_balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                          {formatCurrency(account.current_balance)}
                        </p>
                        {isCreditTypeAccount(account.type) && account.credit_limit && (
                          <p className="text-xs text-gray-400">
                            Limit: {formatCurrency(account.credit_limit)}
                          </p>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === account.id ? null : account.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                        {activeMenu === account.id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[120px]">
                            <button
                              onClick={() => handleOpenModal(account)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(account.id)}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAccount ? 'Edit Account' : 'Add Account'}>
          <div className="space-y-4">
            <Input
              label="Account Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Savings"
            />

            <Input
              label="Account Number (Optional)"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              placeholder="e.g., 1234567890"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {!editingAccount && (
              <Input
                label="Initial Balance"
                type="number"
                value={formData.initial_balance || ''}
                onChange={(e) => setFormData({ ...formData, initial_balance: Number(e.target.value) || 0 })}
                placeholder="0"
              />
            )}

            {showCreditFields && (
              <>
                <Input
                  label="Credit/Overdraft Limit"
                  type="number"
                  value={formData.credit_limit || ''}
                  onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) || null })}
                  placeholder="e.g., 100000"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Balance Display</label>
                  <select
                    value={formData.balance_display || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      balance_display: e.target.value as 'available_credit' | 'credit_balance' | null 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select display option</option>
                    <option value="available_credit">Available Credit</option>
                    <option value="credit_balance">Credit Balance</option>
                  </select>
                </div>

                <Input
                  label="Payment Due Day"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.payment_due_day || ''}
                  onChange={(e) => setFormData({ ...formData, payment_due_day: Number(e.target.value) || null })}
                  placeholder="e.g., 15"
                />
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()} className="flex-1">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingAccount ? 'Save Changes' : 'Add Account'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

