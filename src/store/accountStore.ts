import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import { logger } from '../lib/logger'
import type { Account, AccountType } from '../types'

interface AccountState {
  accounts: Account[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadAccounts: (userId: string) => Promise<void>
  addAccount: (account: Omit<Account, 'id' | 'created_at' | 'current_balance'>) => Promise<Account | null>
  updateAccount: (id: string, updates: Partial<Account>) => Promise<boolean>
  deleteAccount: (id: string) => Promise<boolean>
  
  // Getters
  getAccountById: (id: string) => Account | undefined
  getAccountsByType: (type: AccountType) => Account[]
  getActiveAccounts: () => Account[]
  getTotalBalance: () => number
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,

  loadAccounts: async (userId: string) => {
    // Prevent duplicate simultaneous loads
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      // Demo mode - empty accounts
      set({ accounts: [], isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ accounts: data || [], isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load accounts'
      logger.error('Error loading accounts', error instanceof Error ? error : new Error(errorMessage), { userId })
      set({ 
        error: errorMessage,
        isLoading: false 
      })
    }
  },

  addAccount: async (accountData) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - add locally
      const newAccount: Account = {
        ...accountData,
        id: generateId(),
        current_balance: accountData.initial_balance,
        created_at: new Date().toISOString(),
      }
      set((state) => ({ accounts: [newAccount, ...state.accounts] }))
      return newAccount
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...accountData,
          current_balance: accountData.initial_balance,
        })
        .select()
        .single()

      if (error) throw error

      set((state) => ({ accounts: [data, ...state.accounts] }))
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add account'
      logger.error('Error adding account', error instanceof Error ? error : new Error(errorMessage), { accountData })
      set({ error: errorMessage })
      return null
    }
  },

  updateAccount: async (id, updates) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - update locally
      set((state) => ({
        accounts: state.accounts.map((acc) =>
          acc.id === id ? { ...acc, ...updates } : acc
        ),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        accounts: state.accounts.map((acc) =>
          acc.id === id ? { ...acc, ...updates } : acc
        ),
      }))
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update account'
      logger.error('Error updating account', error instanceof Error ? error : new Error(errorMessage), { id, updates })
      set({ error: errorMessage })
      return false
    }
  },

  deleteAccount: async (id) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - delete locally
      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== id),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== id),
      }))
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account'
      logger.error('Error deleting account', error instanceof Error ? error : new Error(errorMessage), { id })
      set({ error: errorMessage })
      return false
    }
  },

  getAccountById: (id) => {
    return get().accounts.find((acc) => acc.id === id)
  },

  getAccountsByType: (type) => {
    return get().accounts.filter((acc) => acc.type === type)
  },

  getActiveAccounts: () => {
    return get().accounts.filter((acc) => acc.is_active)
  },

  getTotalBalance: () => {
    return get().accounts
      .filter((acc) => acc.is_active)
      .reduce((sum, acc) => sum + acc.current_balance, 0)
  },
}))

