import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Budget, Entry, Category, MonthlyOverview, CategorySummary } from '../types'
import { generateId, getCurrentMonthYear } from '../lib/utils'

interface BudgetState {
  currentBudget: Budget | null
  entries: Entry[]
  isLoading: boolean
  error: string | null
  selectedMonth: number
  selectedYear: number
  previousMonthRemaining: number | null
  
  // Actions
  setMonthYear: (month: number, year: number) => void
  loadBudget: (userId: string, month: number, year: number) => Promise<void>
  createBudget: (userId: string, month: number, year: number) => Promise<Budget | null>
  addEntry: (entry: Omit<Entry, 'id' | 'created_at'>) => Promise<Entry | null>
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<boolean>
  deleteEntry: (id: string) => Promise<boolean>
  restoreEntry: (entry: Entry) => Promise<boolean>
  getOverview: () => MonthlyOverview
  getCategorySummary: (category: Category) => CategorySummary
  getEntriesByCategory: (category: Category) => Entry[]
  fetchPreviousMonthRemaining: (userId: string, month: number, year: number) => Promise<number | null>
}

// Demo data
const createDemoEntries = (budgetId: string): Entry[] => [
  // Income
  { id: generateId(), budget_id: budgetId, category: 'income', name: 'Akhil Salary', planned: 130000, actual: 130000, is_locked: false, created_at: new Date().toISOString() },
  { id: generateId(), budget_id: budgetId, category: 'income', name: 'Shabnam Salary', planned: 60000, actual: 60000, is_locked: false, created_at: new Date().toISOString() },
  // Expenses
  { id: generateId(), budget_id: budgetId, category: 'expenses', name: 'Parents', planned: 35000, actual: 35000, is_locked: false, created_at: new Date().toISOString() },
  // Bills
  { id: generateId(), budget_id: budgetId, category: 'bills', name: 'Rent', planned: 21000, actual: 21000, is_locked: false, created_at: new Date().toISOString() },
  { id: generateId(), budget_id: budgetId, category: 'bills', name: 'Furniture', planned: 7000, actual: 7000, is_locked: false, created_at: new Date().toISOString() },
  // Savings
  { id: generateId(), budget_id: budgetId, category: 'savings', name: 'RD', planned: 2500, actual: 2500, is_locked: false, created_at: new Date().toISOString() },
  // Debt
  { id: generateId(), budget_id: budgetId, category: 'debt', name: 'Car Loan', planned: 10000, actual: 10000, is_locked: false, created_at: new Date().toISOString() },
]

export const useBudgetStore = create<BudgetState>((set, get) => {
  const { month, year } = getCurrentMonthYear()
  
  return {
    currentBudget: null,
    entries: [],
    isLoading: false,
    error: null,
    selectedMonth: month,
    selectedYear: year,
    previousMonthRemaining: null,

    setMonthYear: (month: number, year: number) => {
      set({ selectedMonth: month, selectedYear: year })
    },

    loadBudget: async (userId: string, month: number, year: number) => {
      set({ isLoading: true, error: null })

      // Fetch previous month's remaining in parallel
      get().fetchPreviousMonthRemaining(userId, month, year)

      if (!isSupabaseConfigured()) {
        // Demo mode
        const demoBudget: Budget = {
          id: 'demo-budget',
          user_id: userId,
          year,
          month,
          rollover_data: null,
          created_at: new Date().toISOString(),
        }
        const demoEntries = createDemoEntries(demoBudget.id)
        set({ 
          currentBudget: demoBudget, 
          entries: demoEntries, 
          isLoading: false,
          selectedMonth: month,
          selectedYear: year,
        })
        return
      }

      try {
        // Try to find existing budget
        let { data: budget } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('month', month)
          .eq('year', year)
          .single()

        // Create if not exists
        if (!budget) {
          const newBudget = await get().createBudget(userId, month, year)
          budget = newBudget
        }

        if (budget) {
          // Load entries for this budget
          const { data: entries } = await supabase
            .from('entries')
            .select('*')
            .eq('budget_id', budget.id)
            .order('created_at', { ascending: true })

          set({ 
            currentBudget: budget, 
            entries: entries || [], 
            isLoading: false,
            selectedMonth: month,
            selectedYear: year,
          })
        }
      } catch (error) {
        console.error('Error loading budget:', error)
        set({ error: 'Failed to load budget', isLoading: false })
      }
    },

    createBudget: async (userId: string, month: number, year: number) => {
      const newBudget: Omit<Budget, 'id'> = {
        user_id: userId,
        year,
        month,
        rollover_data: null,
        created_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured()) {
        const budget = { ...newBudget, id: generateId() }
        return budget
      }

      try {
        const { data, error } = await supabase
          .from('budgets')
          .insert(newBudget)
          .select()
          .single()

        if (error) throw error
        return data
      } catch (error) {
        console.error('Error creating budget:', error)
        return null
      }
    },

    addEntry: async (entryData: Omit<Entry, 'id' | 'created_at'>) => {
      const newEntry: Entry = {
        ...entryData,
        id: generateId(),
        created_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured()) {
        set(state => ({ entries: [...state.entries, newEntry] }))
        return newEntry
      }

      try {
        const { data, error } = await supabase
          .from('entries')
          .insert(newEntry)
          .select()
          .single()

        if (error) throw error

        set(state => ({ entries: [...state.entries, data] }))
        return data
      } catch (error) {
        console.error('Error adding entry:', error)
        return null
      }
    },

    updateEntry: async (id: string, updates: Partial<Entry>) => {
      if (!isSupabaseConfigured()) {
        set(state => ({
          entries: state.entries.map(e => 
            e.id === id ? { ...e, ...updates } : e
          ),
        }))
        return true
      }

      try {
        const { error } = await supabase
          .from('entries')
          .update(updates)
          .eq('id', id)

        if (error) throw error

        set(state => ({
          entries: state.entries.map(e => 
            e.id === id ? { ...e, ...updates } : e
          ),
        }))
        return true
      } catch (error) {
        console.error('Error updating entry:', error)
        return false
      }
    },

    deleteEntry: async (id: string) => {
      if (!isSupabaseConfigured()) {
        set(state => ({
          entries: state.entries.filter(e => e.id !== id),
        }))
        return true
      }

      try {
        const { error } = await supabase
          .from('entries')
          .delete()
          .eq('id', id)

        if (error) throw error

        set(state => ({
          entries: state.entries.filter(e => e.id !== id),
        }))
        return true
      } catch (error) {
        console.error('Error deleting entry:', error)
        return false
      }
    },

    restoreEntry: async (entry: Entry) => {
      if (!isSupabaseConfigured()) {
        set(state => ({ entries: [...state.entries, entry] }))
        return true
      }

      try {
        const { error } = await supabase
          .from('entries')
          .insert(entry)

        if (error) throw error

        set(state => ({ entries: [...state.entries, entry] }))
        return true
      } catch (error) {
        console.error('Error restoring entry:', error)
        return false
      }
    },

    getOverview: () => {
      const { entries } = get()
      
      const sumByCategory = (category: Category): CategorySummary => {
        const categoryEntries = entries.filter(e => e.category === category)
        const planned = categoryEntries.reduce((sum, e) => sum + e.planned, 0)
        const actual = categoryEntries.reduce((sum, e) => sum + e.actual, 0)
        return {
          category,
          planned,
          actual,
          percentage: planned > 0 ? Math.round((actual / planned) * 100) : 0,
        }
      }

      const income = sumByCategory('income')
      const expenses = sumByCategory('expenses')
      const bills = sumByCategory('bills')
      const savings = sumByCategory('savings')
      const debt = sumByCategory('debt')

      const totalOutgoing = expenses.actual + bills.actual + savings.actual + debt.actual
      const totalPlannedOutgoing = expenses.planned + bills.planned + savings.planned + debt.planned

      return {
        income,
        expenses,
        bills,
        savings,
        debt,
        remaining: {
          planned: income.planned - totalPlannedOutgoing,
          actual: income.actual - totalOutgoing,
        },
      }
    },

    getCategorySummary: (category: Category) => {
      const { entries } = get()
      const categoryEntries = entries.filter(e => e.category === category)
      const planned = categoryEntries.reduce((sum, e) => sum + e.planned, 0)
      const actual = categoryEntries.reduce((sum, e) => sum + e.actual, 0)
      return {
        category,
        planned,
        actual,
        percentage: planned > 0 ? Math.round((actual / planned) * 100) : 0,
      }
    },

    getEntriesByCategory: (category: Category) => {
      return get().entries.filter(e => e.category === category)
    },

    fetchPreviousMonthRemaining: async (userId: string, month: number, year: number) => {
      // Calculate previous month/year
      let prevMonth = month - 1
      let prevYear = year
      if (prevMonth < 1) {
        prevMonth = 12
        prevYear = year - 1
      }

      if (!isSupabaseConfigured()) {
        // Demo mode - return sample rollover amount
        set({ previousMonthRemaining: 54500 })
        return 54500
      }

      try {
        // Find previous month's budget
        const { data: prevBudget } = await supabase
          .from('budgets')
          .select('id')
          .eq('user_id', userId)
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .single()

        if (!prevBudget) {
          set({ previousMonthRemaining: null })
          return null
        }

        // Get entries for previous budget
        const { data: prevEntries } = await supabase
          .from('entries')
          .select('*')
          .eq('budget_id', prevBudget.id)

        if (!prevEntries || prevEntries.length === 0) {
          set({ previousMonthRemaining: null })
          return null
        }

        // Calculate remaining from previous month
        const income = prevEntries
          .filter(e => e.category === 'income')
          .reduce((sum, e) => sum + e.actual, 0)
        const outgoing = prevEntries
          .filter(e => e.category !== 'income')
          .reduce((sum, e) => sum + e.actual, 0)
        const remaining = income - outgoing

        set({ previousMonthRemaining: remaining })
        return remaining
      } catch (error) {
        console.error('Error fetching previous month:', error)
        set({ previousMonthRemaining: null })
        return null
      }
    },

  }
})

