import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import type { CategoryBudget, Category, CategoryBudgetSummary, MonthlyBudgetOverview, Transaction } from '../types'

interface CategoryBudgetState {
  budgets: CategoryBudget[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadBudgets: (userId: string, month: number, year: number) => Promise<void>
  setBudget: (userId: string, categoryId: string, month: number, year: number, amount: number) => Promise<CategoryBudget | null>
  deleteBudget: (id: string) => Promise<boolean>
  
  // Getters
  getBudgetForCategory: (categoryId: string, month: number, year: number) => CategoryBudget | undefined
  
  // Analysis
  calculateBudgetSummary: (
    categories: Category[],
    transactions: Transaction[],
    month: number,
    year: number
  ) => MonthlyBudgetOverview
  
  getCategorySpending: (
    categoryId: string,
    transactions: Transaction[],
    month: number,
    year: number,
    includeSubcategories?: boolean,
    subcategoryIds?: string[]
  ) => number
}

export const useCategoryBudgetStore = create<CategoryBudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,
  error: null,

  loadBudgets: async (userId: string, month: number, year: number) => {
    // Prevent duplicate simultaneous loads
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      // Demo mode - empty budgets
      set({ budgets: [], isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('category_budgets')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)

      if (error) throw error

      set({ budgets: data || [], isLoading: false })
    } catch (error) {
      console.error('Error loading budgets:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load budgets',
        isLoading: false 
      })
    }
  },

  setBudget: async (userId, categoryId, month, year, amount) => {
    const existingBudget = get().getBudgetForCategory(categoryId, month, year)

    if (!isSupabaseConfigured()) {
      // Demo mode
      if (existingBudget) {
        // Update existing
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === existingBudget.id ? { ...b, budget_amount: amount } : b
          ),
        }))
        return { ...existingBudget, budget_amount: amount }
      } else {
        // Create new
        const newBudget: CategoryBudget = {
          id: generateId(),
          user_id: userId,
          category_id: categoryId,
          month,
          year,
          budget_amount: amount,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ budgets: [...state.budgets, newBudget] }))
        return newBudget
      }
    }

    try {
      if (existingBudget) {
        // Update existing
        const { error } = await supabase
          .from('category_budgets')
          .update({ budget_amount: amount })
          .eq('id', existingBudget.id)

        if (error) throw error

        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === existingBudget.id ? { ...b, budget_amount: amount } : b
          ),
        }))
        return { ...existingBudget, budget_amount: amount }
      } else {
        // Create new (upsert)
        const { data, error } = await supabase
          .from('category_budgets')
          .upsert({
            user_id: userId,
            category_id: categoryId,
            month,
            year,
            budget_amount: amount,
          }, {
            onConflict: 'user_id,category_id,month,year'
          })
          .select()
          .single()

        if (error) throw error

        set((state) => ({ budgets: [...state.budgets, data] }))
        return data
      }
    } catch (error) {
      console.error('Error setting budget:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to set budget' })
      return null
    }
  },

  deleteBudget: async (id) => {
    if (!isSupabaseConfigured()) {
      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id),
      }))
      return true
    } catch (error) {
      console.error('Error deleting budget:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete budget' })
      return false
    }
  },

  getBudgetForCategory: (categoryId, month, year) => {
    return get().budgets.find(
      (b) => b.category_id === categoryId && b.month === month && b.year === year
    )
  },

  getCategorySpending: (categoryId, transactions, month, year, includeSubcategories = false, subcategoryIds = []) => {
    const categoryIds = includeSubcategories ? [categoryId, ...subcategoryIds] : [categoryId]
    
    return transactions
      .filter((tx) => {
        if (tx.type !== 'expense') return false
        const txDate = new Date(tx.transaction_date)
        if (txDate.getMonth() + 1 !== month || txDate.getFullYear() !== year) return false
        // Check both old category_id and new new_category_id
        return categoryIds.includes(tx.new_category_id || '') || categoryIds.includes(tx.category_id || '')
      })
      .reduce((sum, tx) => sum + tx.amount, 0)
  },

  calculateBudgetSummary: (categories, transactions, month, year) => {
    const budgets = get().budgets
    const parentCategories = categories.filter((c) => !c.parent_id)
    
    let totalBudgeted = 0
    let totalSpent = 0

    const categorySummaries: CategoryBudgetSummary[] = parentCategories.map((parent) => {
      const subcategories = categories.filter((c) => c.parent_id === parent.id)
      const subcategoryIds = subcategories.map((s) => s.id)
      
      // Get budget for parent category
      const budget = budgets.find((b) => b.category_id === parent.id)
      const budgeted = budget?.budget_amount || 0
      
      // Calculate spending including subcategories
      const spent = get().getCategorySpending(
        parent.id,
        transactions,
        month,
        year,
        true,
        subcategoryIds
      )
      
      totalBudgeted += budgeted
      totalSpent += spent

      // Build subcategory summaries
      const subSummaries: CategoryBudgetSummary[] = subcategories.map((sub) => {
        const subBudget = budgets.find((b) => b.category_id === sub.id)
        const subBudgeted = subBudget?.budget_amount || 0
        const subSpent = get().getCategorySpending(sub.id, transactions, month, year)
        
        return {
          category: sub,
          budgeted: subBudgeted,
          spent: subSpent,
          remaining: subBudgeted - subSpent,
          percentage: subBudgeted > 0 ? (subSpent / subBudgeted) * 100 : 0,
        }
      })

      return {
        category: parent,
        budgeted,
        spent,
        remaining: budgeted - spent,
        percentage: budgeted > 0 ? (spent / budgeted) * 100 : 0,
        subcategories: subSummaries.length > 0 ? subSummaries : undefined,
      }
    })

    return {
      month,
      year,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      categories: categorySummaries,
    }
  },
}))


