import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import { logger } from '../lib/logger'
import type { Transaction, TransactionType } from '../types'

interface TransactionFilters {
  type?: TransactionType
  accountId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
  status?: string
}

interface TransactionState {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  filters: TransactionFilters
  
  // Actions
  loadTransactions: (userId: string, filters?: TransactionFilters) => Promise<void>
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction | null>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  setFilters: (filters: TransactionFilters) => void
  clearFilters: () => void
  
  // Getters
  getTransactionById: (id: string) => Transaction | undefined
  getTransactionsByAccount: (accountId: string) => Transaction[]
  getTransactionsByCategory: (categoryId: string) => Transaction[]
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[]
  getMonthlyTotal: (type: TransactionType, year: number, month: number) => number
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  filters: {},

  loadTransactions: async (userId: string, filters?: TransactionFilters) => {
    // Prevent duplicate simultaneous loads
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      // Demo mode - empty transactions
      set({ transactions: [], isLoading: false })
      return
    }

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.accountId) {
        query = query.or(`source_account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`)
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      set({ transactions: data || [], isLoading: false, filters: filters || {} })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load transactions'
      logger.error('Error loading transactions', error instanceof Error ? error : new Error(errorMessage), { userId })
      set({ 
        error: errorMessage,
        isLoading: false 
      })
    }
  },

  addTransaction: async (transactionData) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - add locally
      const newTransaction: Transaction = {
        ...transactionData,
        id: generateId(),
        created_at: new Date().toISOString(),
      }
      set((state) => ({ transactions: [newTransaction, ...state.transactions] }))
      return newTransaction
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()

      if (error) throw error

      set((state) => ({ transactions: [data, ...state.transactions] }))
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add transaction'
      logger.error('Error adding transaction', error instanceof Error ? error : new Error(errorMessage), { transactionData })
      set({ error: errorMessage })
      return null
    }
  },

  updateTransaction: async (id, updates) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - update locally
      set((state) => ({
        transactions: state.transactions.map((txn) =>
          txn.id === id ? { ...txn, ...updates } : txn
        ),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        transactions: state.transactions.map((txn) =>
          txn.id === id ? { ...txn, ...updates } : txn
        ),
      }))
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction'
      logger.error('Error updating transaction', error instanceof Error ? error : new Error(errorMessage), { id, updates })
      set({ error: errorMessage })
      return false
    }
  },

  deleteTransaction: async (id) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - delete locally
      set((state) => ({
        transactions: state.transactions.filter((txn) => txn.id !== id),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        transactions: state.transactions.filter((txn) => txn.id !== id),
      }))
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction'
      logger.error('Error deleting transaction', error instanceof Error ? error : new Error(errorMessage), { id })
      set({ error: errorMessage })
      return false
    }
  },

  setFilters: (filters) => {
    set({ filters })
  },

  clearFilters: () => {
    set({ filters: {} })
  },

  getTransactionById: (id) => {
    return get().transactions.find((txn) => txn.id === id)
  },

  getTransactionsByAccount: (accountId) => {
    return get().transactions.filter(
      (txn) => txn.source_account_id === accountId || txn.destination_account_id === accountId
    )
  },

  getTransactionsByCategory: (categoryId) => {
    return get().transactions.filter((txn) => txn.category_id === categoryId)
  },

  getTransactionsByDateRange: (startDate, endDate) => {
    return get().transactions.filter(
      (txn) => txn.transaction_date >= startDate && txn.transaction_date <= endDate
    )
  },

  getMonthlyTotal: (type, year, month) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    
    return get().transactions
      .filter(
        (txn) =>
          txn.type === type &&
          txn.transaction_date >= startDate &&
          txn.transaction_date <= endDate
      )
      .reduce((sum, txn) => sum + txn.amount, 0)
  },
}))

