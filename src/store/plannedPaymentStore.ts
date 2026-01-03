import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import { logger } from '../lib/logger'
import { getUserFriendlyError } from '../lib/errorMessages'
import type { PlannedPayment, Transaction } from '../types'

interface PlannedPaymentState {
  plannedPayments: PlannedPayment[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadPlannedPayments: (userId: string) => Promise<void>
  addPlannedPayment: (payment: Omit<PlannedPayment, 'id' | 'created_at' | 'last_executed_at' | 'next_execution_date'>) => Promise<PlannedPayment | null>
  updatePlannedPayment: (id: string, updates: Partial<PlannedPayment>) => Promise<boolean>
  deletePlannedPayment: (id: string) => Promise<boolean>
  toggleActive: (id: string) => Promise<boolean>
  
  // Auto-execution
  checkAndExecuteDuePayments: (userId: string, createTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction | null>) => Promise<void>
  
  // Getters
  getPaymentById: (id: string) => PlannedPayment | undefined
  getActivePayments: () => PlannedPayment[]
  getUpcomingPayments: (days?: number) => PlannedPayment[]
  getDuePayments: () => PlannedPayment[]
}

// Calculate next execution date helper
const calculateNextExecutionDate = (payment: Partial<PlannedPayment>, lastExecuted?: Date): string | null => {
  if (payment.frequency === 'one_time') {
    if (lastExecuted) return null // Already executed
    return payment.scheduled_date || null
  }

  const baseDate = lastExecuted || (payment.start_date ? new Date(payment.start_date) : new Date())
  const base = new Date(baseDate)

  switch (payment.recurrence_type) {
    case 'daily':
      base.setDate(base.getDate() + 1)
      break
    case 'weekly':
      // Find next occurrence based on weekly_days
      if (payment.weekly_days && payment.weekly_days.length > 0) {
        let found = false
        for (let i = 1; i <= 7 && !found; i++) {
          base.setDate(base.getDate() + 1)
          if (payment.weekly_days.includes(base.getDay())) {
            found = true
          }
        }
      } else {
        base.setDate(base.getDate() + 7)
      }
      break
    case 'monthly':
      base.setMonth(base.getMonth() + (payment.monthly_interval || 1))
      break
    case 'yearly':
      base.setFullYear(base.getFullYear() + 1)
      break
    default:
      return null
  }

  return base.toISOString().split('T')[0]
}

export const usePlannedPaymentStore = create<PlannedPaymentState>((set, get) => ({
  plannedPayments: [],
  isLoading: false,
  error: null,

  loadPlannedPayments: async (userId: string) => {
    // Prevent duplicate simultaneous loads
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      // Demo mode - empty for now
      set({ plannedPayments: [], isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('planned_payments')
        .select(`
          *,
          category:categories(*),
          account:accounts!planned_payments_account_id_fkey(*),
          destination_account:accounts!planned_payments_destination_account_id_fkey(*)
        `)
        .eq('user_id', userId)
        .order('next_execution_date', { ascending: true })

      if (error) throw error

      set({ plannedPayments: data || [], isLoading: false })
    } catch (error) {
      const userFriendlyError = getUserFriendlyError(error, 'loadPlannedPayments')
      logger.error('Error loading planned payments', error instanceof Error ? error : new Error('Unknown error'))
      set({ 
        error: userFriendlyError,
        isLoading: false 
      })
    }
  },

  addPlannedPayment: async (paymentData) => {
    const nextDate = calculateNextExecutionDate(paymentData)
    
    if (!isSupabaseConfigured()) {
      // Demo mode - add locally
      const newPayment: PlannedPayment = {
        ...paymentData,
        id: generateId(),
        last_executed_at: null,
        next_execution_date: nextDate,
        created_at: new Date().toISOString(),
      }
      set((state) => ({ plannedPayments: [...state.plannedPayments, newPayment] }))
      return newPayment
    }

    try {
      const { data, error } = await supabase
        .from('planned_payments')
        .insert({
          ...paymentData,
          next_execution_date: nextDate,
        })
        .select()
        .single()

      if (error) throw error

      set((state) => ({ plannedPayments: [...state.plannedPayments, data] }))
      return data
    } catch (error) {
      const userFriendlyError = getUserFriendlyError(error, 'addPlannedPayment')
      logger.error('Error adding planned payment', error instanceof Error ? error : new Error('Unknown error'))
      set({ error: userFriendlyError })
      return null
    }
  },

  updatePlannedPayment: async (id, updates) => {
    // Recalculate next execution date if relevant fields changed
    const payment = get().getPaymentById(id)
    let nextDate = updates.next_execution_date
    
    if (payment && (updates.frequency || updates.recurrence_type || updates.weekly_days || updates.monthly_interval || updates.start_date || updates.scheduled_date)) {
      const merged = { ...payment, ...updates }
      nextDate = calculateNextExecutionDate(merged, payment.last_executed_at ? new Date(payment.last_executed_at) : undefined)
    }

    const finalUpdates = { ...updates, next_execution_date: nextDate ?? null }

    if (!isSupabaseConfigured()) {
      set((state) => ({
        plannedPayments: state.plannedPayments.map((p) =>
          p.id === id ? { ...p, ...finalUpdates } : p
        ),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('planned_payments')
        .update(finalUpdates)
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        plannedPayments: state.plannedPayments.map((p) =>
          p.id === id ? { ...p, ...finalUpdates } : p
        ),
      }))
      return true
    } catch (error) {
      const userFriendlyError = getUserFriendlyError(error, 'updatePlannedPayment')
      logger.error('Error updating planned payment', error instanceof Error ? error : new Error('Unknown error'))
      set({ error: userFriendlyError })
      return false
    }
  },

  deletePlannedPayment: async (id) => {
    if (!isSupabaseConfigured()) {
      set((state) => ({
        plannedPayments: state.plannedPayments.filter((p) => p.id !== id),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('planned_payments')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        plannedPayments: state.plannedPayments.filter((p) => p.id !== id),
      }))
      return true
    } catch (error) {
      const userFriendlyError = getUserFriendlyError(error, 'deletePlannedPayment')
      logger.error('Error deleting planned payment', error instanceof Error ? error : new Error('Unknown error'))
      set({ error: userFriendlyError })
      return false
    }
  },

  toggleActive: async (id) => {
    const payment = get().getPaymentById(id)
    if (!payment) return false

    return get().updatePlannedPayment(id, { is_active: !payment.is_active })
  },

  checkAndExecuteDuePayments: async (userId, createTransaction) => {
    const duePayments = get().getDuePayments()
    const today = new Date().toISOString().split('T')[0]

    for (const payment of duePayments) {
      if (!payment.is_active) continue
      if (!payment.next_execution_date) continue
      if (payment.next_execution_date > today) continue

      // Create transaction from planned payment
      const transactionData: Omit<Transaction, 'id' | 'created_at'> = {
        user_id: userId,
        source_account_id: payment.type === 'expense' || payment.type === 'transfer' ? payment.account_id : null,
        destination_account_id: payment.type === 'income' ? payment.account_id : payment.destination_account_id,
        category_id: null,
        new_category_id: payment.category_id,
        type: payment.type,
        name: payment.name, // Use planned payment name as transaction name
        amount: payment.amount,
        transaction_date: today,
        transaction_time: null,
        note: payment.note ? `[Auto] ${payment.note}` : `[Auto] ${payment.name}`,
        payee: payment.payee,
        payment_type: null,
        payment_method: payment.payment_method,
        warranty_until: null,
        status: 'cleared',
        place: null,
        planned_payment_id: payment.id,
      }

      const result = await createTransaction(transactionData)
      
      if (result) {
        // Update the planned payment with new execution date
        const nextDate = calculateNextExecutionDate(payment, new Date())
        
        await get().updatePlannedPayment(payment.id, {
          last_executed_at: new Date().toISOString(),
          next_execution_date: nextDate,
          // Deactivate one-time payments after execution
          is_active: payment.frequency === 'one_time' ? false : payment.is_active,
        })
      }
    }
  },

  getPaymentById: (id) => {
    return get().plannedPayments.find((p) => p.id === id)
  },

  getActivePayments: () => {
    return get().plannedPayments.filter((p) => p.is_active)
  },

  getUpcomingPayments: (days = 30) => {
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    return get().plannedPayments
      .filter((p) => {
        if (!p.is_active || !p.next_execution_date) return false
        const nextDate = new Date(p.next_execution_date)
        return nextDate >= today && nextDate <= endDate
      })
      .sort((a, b) => {
        if (!a.next_execution_date || !b.next_execution_date) return 0
        return new Date(a.next_execution_date).getTime() - new Date(b.next_execution_date).getTime()
      })
  },

  getDuePayments: () => {
    const today = new Date().toISOString().split('T')[0]
    return get().plannedPayments.filter((p) => {
      if (!p.is_active || !p.next_execution_date) return false
      return p.next_execution_date <= today
    })
  },
}))


