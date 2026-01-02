import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Edit2, Receipt, Check, Loader2 } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { formatCurrency, generateId } from '../../lib/utils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { RecurringBill } from '../../types'

const frequencies = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const
const categories = ['Housing', 'Utilities', 'Debt', 'Insurance', 'Entertainment', 'Health', 'Other']

export const RecurringBillsManager: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)
  const [formData, setFormData] = useState<Partial<RecurringBill>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Load bills from Supabase
  useEffect(() => {
    const loadBills = async () => {
      if (!user) return
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        // Demo mode
        setBills([])
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('recurring_bills')
          .select('*')
          .eq('user_id', user.id)
          .order('due_day', { ascending: true })

        if (error) throw error
        setBills(data || [])
      } catch (error) {
        console.error('Error loading bills:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBills()
  }, [user?.id])

  const totalMonthly = bills
    .filter(b => b.is_active)
    .reduce((sum, b) => {
      if (b.frequency === 'monthly') return sum + b.amount
      if (b.frequency === 'weekly') return sum + b.amount * 4
      if (b.frequency === 'biweekly') return sum + b.amount * 2
      if (b.frequency === 'quarterly') return sum + b.amount / 3
      if (b.frequency === 'yearly') return sum + b.amount / 12
      return sum
    }, 0)

  const handleOpenModal = (bill?: RecurringBill) => {
    if (bill) {
      setEditingBill(bill)
      setFormData(bill)
    } else {
      setEditingBill(null)
      setFormData({ frequency: 'monthly', is_active: true, category: 'Other' })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.amount || !formData.due_day || !user) return
    setIsSaving(true)

    try {
      if (editingBill) {
        // Update existing bill
        if (isSupabaseConfigured()) {
          const { error } = await supabase
            .from('recurring_bills')
            .update({
              name: formData.name,
              amount: formData.amount,
              due_day: formData.due_day,
              frequency: formData.frequency,
              category: formData.category,
              is_active: formData.is_active,
            })
            .eq('id', editingBill.id)

          if (error) throw error
        }
        setBills(bills.map(b => b.id === editingBill.id ? { ...b, ...formData } as RecurringBill : b))
      } else {
        // Create new bill
        const newBill: RecurringBill = {
          id: generateId(),
          user_id: user.id,
          name: formData.name,
          amount: formData.amount,
          due_day: formData.due_day,
          frequency: formData.frequency || 'monthly',
          category: formData.category || 'Other',
          is_active: formData.is_active ?? true,
        }

        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('recurring_bills')
            .insert(newBill)
            .select()
            .single()

          if (error) throw error
          setBills([...bills, data])
        } else {
          setBills([...bills, newBill])
        }
      }

      setIsModalOpen(false)
      setFormData({})
      setEditingBill(null)
    } catch (error) {
      console.error('Error saving bill:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('recurring_bills')
          .delete()
          .eq('id', id)

        if (error) throw error
      }
      setBills(bills.filter(b => b.id !== id))
    } catch (error) {
      console.error('Error deleting bill:', error)
    }
  }

  const handleToggleActive = async (id: string) => {
    const bill = bills.find(b => b.id === id)
    if (!bill) return

    const newActiveState = !bill.is_active

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('recurring_bills')
          .update({ is_active: newActiveState })
          .eq('id', id)

        if (error) throw error
      }
      setBills(bills.map(b => b.id === id ? { ...b, is_active: newActiveState } : b))
    } catch (error) {
      console.error('Error toggling bill:', error)
    }
  }

  const groupedBills = bills.reduce((acc, bill) => {
    const cat = bill.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(bill)
    return acc
  }, {} as Record<string, RecurringBill[]>)

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Recurring Bills</h1>
          </div>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Add Bill
          </Button>
        </div>

        {/* Summary */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-indigo-100">
                  <Receipt className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Monthly Bills</p>
                  <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalMonthly)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Active Bills</p>
                <p className="text-2xl font-bold text-gray-800">
                  {bills.filter(b => b.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {bills.length === 0 && (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">No bills yet</h3>
                <p className="text-gray-500 mb-4">Start tracking your recurring bills</p>
                <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
                  Add Your First Bill
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bills by Category */}
        <div className="space-y-6">
          {Object.entries(groupedBills).map(([category, categoryBills]) => (
            <Card key={category}>
              <CardContent>
                <h3 className="font-semibold text-gray-800 mb-4">{category}</h3>
                <div className="space-y-3">
                  {categoryBills.map((bill) => (
                    <div
                      key={bill.id}
                      className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                        bill.is_active ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleActive(bill.id)}
                          className={`p-2 rounded-full transition-colors ${
                            bill.is_active 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <div>
                          <p className={`font-medium ${bill.is_active ? 'text-gray-800' : 'text-gray-500'}`}>
                            {bill.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Due: {bill.due_day}th • {bill.frequency}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-gray-800">
                          {formatCurrency(bill.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(bill)}
                            className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setFormData({})
            setEditingBill(null)
          }}
          title={editingBill ? 'Edit Bill' : 'Add New Bill'}
        >
          <div className="space-y-4">
            <Input
              label="Bill Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Netflix"
            />
            <Input
              label="Amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="0"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
              <Input
                type="number"
                value={formData.due_day || ''}
                onChange={(e) => setFormData({ ...formData, due_day: Number(e.target.value) })}
                placeholder="1-31"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={formData.frequency || 'monthly'}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurringBill['frequency'] })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {frequencies.map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category || 'Other'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                {editingBill ? 'Save Changes' : 'Add Bill'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
