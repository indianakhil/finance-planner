import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import type { UserCategory, LegacyCategory } from '../types'

// Default categories for demo mode
const DEFAULT_CATEGORIES: Omit<UserCategory, 'id' | 'user_id' | 'created_at'>[] = [
  // Income
  { name: 'Salary', main_category: 'income', icon: '💰', color: '#22C55E', is_default: true },
  { name: 'Freelance', main_category: 'income', icon: '💼', color: '#16A34A', is_default: true },
  { name: 'Investments', main_category: 'income', icon: '📈', color: '#15803D', is_default: true },
  { name: 'Other Income', main_category: 'income', icon: '💵', color: '#14532D', is_default: true },
  // Expenses
  { name: 'Groceries', main_category: 'expenses', icon: '🛒', color: '#3B82F6', is_default: true },
  { name: 'Dining', main_category: 'expenses', icon: '🍽️', color: '#2563EB', is_default: true },
  { name: 'Shopping', main_category: 'expenses', icon: '🛍️', color: '#1D4ED8', is_default: true },
  { name: 'Entertainment', main_category: 'expenses', icon: '🎬', color: '#1E40AF', is_default: true },
  { name: 'Transport', main_category: 'expenses', icon: '🚗', color: '#1E3A8A', is_default: true },
  { name: 'Healthcare', main_category: 'expenses', icon: '🏥', color: '#172554', is_default: true },
  // Bills
  { name: 'Rent', main_category: 'bills', icon: '🏠', color: '#6366F1', is_default: true },
  { name: 'Utilities', main_category: 'bills', icon: '💡', color: '#4F46E5', is_default: true },
  { name: 'Phone', main_category: 'bills', icon: '📱', color: '#4338CA', is_default: true },
  { name: 'Internet', main_category: 'bills', icon: '🌐', color: '#3730A3', is_default: true },
  { name: 'Subscriptions', main_category: 'bills', icon: '📺', color: '#312E81', is_default: true },
  // Savings
  { name: 'Emergency Fund', main_category: 'savings', icon: '🆘', color: '#10B981', is_default: true },
  { name: 'Retirement', main_category: 'savings', icon: '👴', color: '#059669', is_default: true },
  { name: 'Vacation', main_category: 'savings', icon: '✈️', color: '#047857', is_default: true },
  { name: 'Goals', main_category: 'savings', icon: '🎯', color: '#065F46', is_default: true },
  // Debt
  { name: 'Credit Card Payment', main_category: 'debt', icon: '💳', color: '#EC4899', is_default: true },
  { name: 'Loan EMI', main_category: 'debt', icon: '🏦', color: '#DB2777', is_default: true },
  { name: 'Mortgage', main_category: 'debt', icon: '🏘️', color: '#BE185D', is_default: true },
]

interface CategoryState {
  categories: UserCategory[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadCategories: (userId: string) => Promise<void>
  addCategory: (category: Omit<UserCategory, 'id' | 'created_at'>) => Promise<UserCategory | null>
  updateCategory: (id: string, updates: Partial<UserCategory>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  
  // Getters
  getCategoryById: (id: string) => UserCategory | undefined
  getCategoriesByMainCategory: (mainCategory: LegacyCategory) => UserCategory[]
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  loadCategories: async (userId: string) => {
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      // Demo mode - use default categories
      const demoCategories: UserCategory[] = DEFAULT_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `demo-cat-${index}`,
        user_id: userId,
        created_at: new Date().toISOString(),
      }))
      set({ categories: demoCategories, isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', userId)
        .order('main_category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      set({ categories: data || [], isLoading: false })
    } catch (error) {
      console.error('Error loading categories:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load categories',
        isLoading: false 
      })
    }
  },

  addCategory: async (categoryData) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - add locally
      const newCategory: UserCategory = {
        ...categoryData,
        id: generateId(),
        created_at: new Date().toISOString(),
      }
      set((state) => ({ categories: [...state.categories, newCategory] }))
      return newCategory
    }

    try {
      const { data, error } = await supabase
        .from('user_categories')
        .insert(categoryData)
        .select()
        .single()

      if (error) throw error

      set((state) => ({ categories: [...state.categories, data] }))
      return data
    } catch (error) {
      console.error('Error adding category:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to add category' })
      return null
    }
  },

  updateCategory: async (id, updates) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - update locally
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('user_categories')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      }))
      return true
    } catch (error) {
      console.error('Error updating category:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update category' })
      return false
    }
  },

  deleteCategory: async (id) => {
    const category = get().getCategoryById(id)
    if (category?.is_default) {
      set({ error: 'Cannot delete default categories' })
      return false
    }

    if (!isSupabaseConfigured()) {
      // Demo mode - delete locally
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
      }))
      return true
    } catch (error) {
      console.error('Error deleting category:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete category' })
      return false
    }
  },

  getCategoryById: (id) => {
    return get().categories.find((cat) => cat.id === id)
  },

  getCategoriesByMainCategory: (mainCategory) => {
    return get().categories.filter((cat) => cat.main_category === mainCategory)
  },
}))

