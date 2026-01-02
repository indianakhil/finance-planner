import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useTransactionStore } from '../../store/transactionStore'
import { useAccountStore } from '../../store/accountStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { useAuthStore } from '../../store/authStore'
import type { TransactionType, TransactionStatus, Account, PaymentMethod } from '../../types'
import { isCreditTypeAccount } from '../../types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: TransactionType
}

interface FormData {
  type: TransactionType
  name: string
  source_account_id: string
  destination_account_id: string
  category_id: string
  amount: number
  transaction_date: string
  transaction_time: string
  note: string
  payee: string
  payment_method: PaymentMethod | ''
  status: TransactionStatus
}

const getDefaultStatus = (account: Account | undefined): TransactionStatus => {
  if (!account) return 'cleared'
  if (isCreditTypeAccount(account.type)) {
    return 'uncleared'
  }
  return 'cleared'
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
}) => {
  const { user } = useAuthStore()
  const { addTransaction } = useTransactionStore()
  const { accounts } = useAccountStore()
  const { getParentCategories, getSubcategories } = useHierarchicalCategoryStore()

  const [isSaving, setIsSaving] = useState(false)
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    type: initialType,
    name: '',
    source_account_id: '',
    destination_account_id: '',
    category_id: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_time: '',
    note: '',
    payee: '',
    payment_method: '',
    status: 'cleared',
  })

  // Reset form when modal opens with new type
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: initialType,
        name: '',
        source_account_id: '',
        destination_account_id: '',
        category_id: '',
        amount: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_time: '',
        note: '',
        payee: '',
        payment_method: '',
        status: 'cleared',
      })
      setExpandedCategoryId(null)
    }
  }, [isOpen, initialType])

  // Update status when account changes
  useEffect(() => {
    const accountId = formData.type === 'income' ? formData.destination_account_id : formData.source_account_id
    const account = accounts.find((a) => a.id === accountId)
    const defaultStatus = getDefaultStatus(account)
    setFormData((prev) => ({ ...prev, status: defaultStatus }))
  }, [formData.source_account_id, formData.destination_account_id, formData.type, accounts])

  const handleSubmit = async () => {
    if (!user || formData.amount <= 0) return

    setIsSaving(true)
    try {
      await addTransaction({
        user_id: user.id,
        type: formData.type,
        name: formData.name || null,
        source_account_id: formData.type === 'income' ? null : (formData.source_account_id || null),
        destination_account_id: formData.type === 'expense' ? null : (formData.destination_account_id || null),
        category_id: null,
        new_category_id: formData.category_id || null,
        amount: formData.amount,
        transaction_date: formData.transaction_date,
        transaction_time: formData.transaction_time || null,
        note: formData.note || null,
        payee: formData.payee || null,
        payment_type: null,
        payment_method: formData.payment_method || null,
        warranty_until: null,
        status: formData.status,
        place: null,
        planned_payment_id: null,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const activeAccounts = accounts.filter((a) => a.is_active)
  const parentCategories = getParentCategories()
  
  // Expand parent category if a subcategory is selected
  useEffect(() => {
    if (formData.category_id && parentCategories.length > 0) {
      // Check if selected category is a subcategory
      for (const parentCat of parentCategories) {
        const subs = getSubcategories(parentCat.id)
        if (subs.some(s => s.id === formData.category_id)) {
          setExpandedCategoryId(parentCat.id)
          break
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category_id, parentCategories.length])
  
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

  const getTitle = () => {
    switch (formData.type) {
      case 'income': return 'Add Income'
      case 'expense': return 'Add Expense'
      case 'transfer': return 'Add Transfer'
    }
  }

  const getAccentColor = () => {
    switch (formData.type) {
      case 'income': return 'focus:ring-green-500'
      case 'expense': return 'focus:ring-red-500'
      case 'transfer': return 'focus:ring-blue-500'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="space-y-4 pb-2">
        {/* Transaction Type Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFormData({ ...formData, type })}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                formData.type === type
                  ? type === 'income'
                    ? 'bg-green-500 text-white'
                    : type === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Name */}
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={formData.type === 'income' ? 'e.g., AK Salary, Freelance Payment' : 'e.g., Zomato Order, Electricity Bill'}
        />

        {/* Amount */}
        <Input
          label="Amount"
          type="number"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          placeholder="0"
        />

        {/* Source Account (for expense/transfer) */}
        {(formData.type === 'expense' || formData.type === 'transfer') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === 'transfer' ? 'From Account' : 'From Account'}
            </label>
            <select
              value={formData.source_account_id}
              onChange={(e) => setFormData({ ...formData, source_account_id: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${getAccentColor()}`}
            >
              <option value="">Select account</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Destination Account (for income/transfer) */}
        {(formData.type === 'income' || formData.type === 'transfer') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === 'transfer' ? 'To Account' : 'To Account'}
            </label>
            <select
              value={formData.destination_account_id}
              onChange={(e) => setFormData({ ...formData, destination_account_id: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${getAccentColor()}`}
            >
              <option value="">Select account</option>
              {activeAccounts
                .filter((a) => a.id !== formData.source_account_id)
                .map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
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
                  <div className="text-sm font-medium text-gray-800">{selectedCategoryDisplay.name}</div>
                  {!selectedCategoryDisplay.isParent && selectedCategoryDisplay.parentName && (
                    <div className="text-xs text-gray-500">{selectedCategoryDisplay.parentName}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category_id: '' })}
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
                  const isExpanded = expandedCategoryId === parent.id
                  const isParentSelected = formData.category_id === parent.id
                  
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
                          if (subcategories.length > 0) {
                            setExpandedCategoryId(isExpanded ? null : parent.id)
                          }
                          // Select parent category if clicking on it
                          if (!isExpanded || subcategories.length === 0) {
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
                        {subcategories.length > 0 && (
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Subcategories */}
                      {isExpanded && subcategories.length > 0 && (
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
                                  onClick={() => setFormData({ ...formData, category_id: sub.id })}
                                >
                                  <span className="text-base flex-shrink-0">{sub.icon}</span>
                                  <span className={`flex-1 text-sm truncate ${
                                    isSubSelected ? 'text-primary-700 font-medium' : 'text-gray-700'
                                  }`}>
                                    {sub.name}
                                  </span>
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

        {/* Payee */}
        <Input
          label={formData.type === 'income' ? 'Source / Payer' : 'Payee / Merchant'}
          value={formData.payee}
          onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
          placeholder={formData.type === 'income' ? 'e.g., Company Name' : 'e.g., Amazon, Zomato'}
        />

        {/* Date */}
        <Input
          label="Date"
          type="date"
          value={formData.transaction_date}
          onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
        />

        {/* Payment Method (for expenses) */}
        {formData.type === 'expense' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${getAccentColor()}`}
            >
              <option value="">Select method</option>
              <option value="cash">Cash</option>
              <option value="debit_card">Debit Card</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_payment">Mobile Payment (UPI)</option>
              <option value="web_payment">Web Payment</option>
            </select>
          </div>
        )}

        {/* Note */}
        <Input
          label="Note (optional)"
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Add a note..."
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4 pb-1">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={formData.amount <= 0 || isSaving} 
            className="flex-1"
          >
            {isSaving ? 'Saving...' : `Add ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

