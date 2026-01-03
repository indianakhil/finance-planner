import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, RefreshCw, Clock } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { usePlannedPaymentStore } from '../../store/plannedPaymentStore'
import { useAccountStore } from '../../store/accountStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/useToast'
import { formatCurrency } from '../../lib/utils'
import type { PlannedPayment, PaymentMethod, RecurrenceType, TransactionType } from '../../types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface FormData {
  name: string
  category_id: string
  account_id: string
  destination_account_id: string
  amount: number
  type: TransactionType
  payment_method: PaymentMethod | ''
  payee: string
  frequency: 'one_time' | 'recurrent'
  scheduled_date: string
  start_date: string
  recurrence_type: RecurrenceType | ''
  weekly_days: number[]
  monthly_interval: number
  note: string
}

const initialFormData: FormData = {
  name: '',
  category_id: '',
  account_id: '',
  destination_account_id: '',
  amount: 0,
  type: 'expense',
  payment_method: '',
  payee: '',
  frequency: 'one_time',
  scheduled_date: new Date().toISOString().split('T')[0],
  start_date: new Date().toISOString().split('T')[0],
  recurrence_type: '',
  weekly_days: [],
  monthly_interval: 1,
  note: '',
}

export const PlannedPaymentsManager: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { plannedPayments, loadPlannedPayments, addPlannedPayment, updatePlannedPayment, deletePlannedPayment, toggleActive } = usePlannedPaymentStore()
  const { accounts, loadAccounts } = useAccountStore()
  const { categories, loadCategories, getParentCategories } = useHierarchicalCategoryStore()
  const { showSuccess, showError } = useToast()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PlannedPayment | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    if (user) {
      loadPlannedPayments(user.id)
      loadAccounts(user.id)
      loadCategories(user.id)
    }
  }, [user?.id])

  const handleOpenModal = (payment?: PlannedPayment) => {
    if (payment) {
      setEditingPayment(payment)
      setFormData({
        name: payment.name,
        category_id: payment.category_id || '',
        account_id: payment.account_id || '',
        destination_account_id: payment.destination_account_id || '',
        amount: payment.amount,
        type: payment.type,
        payment_method: payment.payment_method || '',
        payee: payment.payee || '',
        frequency: payment.frequency,
        scheduled_date: payment.scheduled_date || new Date().toISOString().split('T')[0],
        start_date: payment.start_date || new Date().toISOString().split('T')[0],
        recurrence_type: payment.recurrence_type || '',
        weekly_days: payment.weekly_days || [],
        monthly_interval: payment.monthly_interval || 1,
        note: payment.note || '',
      })
    } else {
      setEditingPayment(null)
      setFormData(initialFormData)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPayment(null)
    setFormData(initialFormData)
  }

  const handleSave = async () => {
    if (!user || !formData.name || formData.amount <= 0) return

    const paymentData = {
      user_id: user.id,
      name: formData.name,
      category_id: formData.category_id || null,
      account_id: formData.account_id || null,
      destination_account_id: formData.type === 'transfer' ? formData.destination_account_id || null : null,
      amount: formData.amount,
      type: formData.type,
      payment_method: formData.payment_method || null,
      payee: formData.payee || null,
      frequency: formData.frequency,
      scheduled_date: formData.frequency === 'one_time' ? formData.scheduled_date : null,
      start_date: formData.frequency === 'recurrent' ? formData.start_date : null,
      recurrence_type: formData.frequency === 'recurrent' ? formData.recurrence_type || null : null,
      weekly_days: formData.frequency === 'recurrent' && formData.recurrence_type === 'weekly' ? formData.weekly_days : null,
      monthly_interval: formData.frequency === 'recurrent' && formData.recurrence_type === 'monthly' ? formData.monthly_interval : 1,
      note: formData.note || null,
      is_active: true,
    }

    if (editingPayment) {
      const success = await updatePlannedPayment(editingPayment.id, paymentData)
      if (success) {
        showSuccess('Payment updated')
        handleCloseModal()
      } else {
        const currentError = usePlannedPaymentStore.getState().error
        showError(currentError || 'Failed to update payment. Please try again.')
      }
    } else {
      const result = await addPlannedPayment(paymentData)
      if (result) {
        showSuccess('Payment scheduled')
        handleCloseModal()
      } else {
        const currentError = usePlannedPaymentStore.getState().error
        showError(currentError || 'Failed to schedule payment. Please try again.')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this planned payment?')) {
      const success = await deletePlannedPayment(id)
      if (success) {
        showSuccess('Payment deleted')
      } else {
        const currentError = usePlannedPaymentStore.getState().error
        showError(currentError || 'Failed to delete payment. Please try again.')
      }
    }
  }

  const handleToggleActive = async (id: string) => {
    await toggleActive(id)
  }

  const activeAccounts = accounts.filter((a) => a.is_active)
  const parentCategories = getParentCategories()

  const filteredPayments = plannedPayments.filter((p) => {
    if (filter === 'active') return p.is_active
    if (filter === 'inactive') return !p.is_active
    return true
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-700'
      case 'expense': return 'bg-red-100 text-red-700'
      case 'transfer': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-'
    const cat = categories.find((c) => c.id === categoryId)
    return cat ? `${cat.icon} ${cat.name}` : '-'
  }

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return '-'
    const acc = accounts.find((a) => a.id === accountId)
    return acc?.name || '-'
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Planned Payments</h1>
              <p className="text-sm text-gray-500">Schedule one-time and recurring transactions</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Add Payment
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Payments List */}
        <div className="space-y-3">
          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent>
                <div className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No planned payments yet</p>
                  <Button onClick={() => handleOpenModal()} className="mt-4">
                    Schedule Your First Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map((payment) => (
              <Card key={payment.id} className={!payment.is_active ? 'opacity-50' : ''}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${getTypeColor(payment.type)}`}>
                        {payment.frequency === 'recurrent' ? (
                          <RefreshCw className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{payment.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{getCategoryName(payment.category_id)}</span>
                          <span>•</span>
                          <span>{getAccountName(payment.account_id)}</span>
                          {payment.frequency === 'recurrent' && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{payment.recurrence_type}</span>
                            </>
                          )}
                        </div>
                        {payment.next_execution_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Next: {new Date(payment.next_execution_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold ${
                        payment.type === 'income' ? 'text-green-600' : 
                        payment.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {payment.type === 'income' ? '+' : '-'}{formatCurrency(payment.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(payment.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            payment.is_active 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={payment.is_active ? 'Pause' : 'Activate'}
                        >
                          {payment.is_active ? '✓' : '○'}
                        </button>
                        <button
                          onClick={() => handleOpenModal(payment)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingPayment ? 'Edit Planned Payment' : 'Add Planned Payment'}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monthly Rent, Salary"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <Input
                label="Amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select category</option>
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'income' ? 'To Account' : 'From Account'}
              </label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select account</option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {formData.type === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
                <select
                  value={formData.destination_account_id}
                  onChange={(e) => setFormData({ ...formData, destination_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select account</option>
                  {activeAccounts.filter((a) => a.id !== formData.account_id).map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select method</option>
                <option value="cash">Cash</option>
                <option value="debit_card">Debit Card</option>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_payment">Mobile Payment (UPI)</option>
                <option value="web_payment">Web Payment</option>
                <option value="voucher">Voucher</option>
              </select>
            </div>

            <Input
              label="Payee (optional)"
              value={formData.payee}
              onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
              placeholder="e.g., Landlord, Company Name"
            />

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, frequency: 'one_time' })}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    formData.frequency === 'one_time'
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  One Time
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, frequency: 'recurrent' })}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    formData.frequency === 'recurrent'
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Recurring
                </button>
              </div>
            </div>

            {formData.frequency === 'one_time' ? (
              <Input
                label="Scheduled Date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            ) : (
              <>
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, recurrence_type: type })}
                        className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                          formData.recurrence_type === type
                            ? 'bg-primary-100 border-primary-500 text-primary-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.recurrence_type === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on</label>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const newDays = formData.weekly_days.includes(index)
                              ? formData.weekly_days.filter((d) => d !== index)
                              : [...formData.weekly_days, index]
                            setFormData({ ...formData, weekly_days: newDays })
                          }}
                          className={`w-10 h-10 rounded-full border text-sm font-medium transition-colors ${
                            formData.weekly_days.includes(index)
                              ? 'bg-primary-500 border-primary-500 text-white'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {day[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.recurrence_type === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Every {formData.monthly_interval} month(s)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={formData.monthly_interval}
                      onChange={(e) => setFormData({ ...formData, monthly_interval: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1</span>
                      <span>6</span>
                      <span>12</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <Input
              label="Note (optional)"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Add a note..."
            />

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || formData.amount <= 0}
                className="flex-1"
              >
                {editingPayment ? 'Save Changes' : 'Schedule Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}


