import { useEffect, useRef } from 'react'
import { useBudgetStore } from '../store/budgetStore'
import { useAuthStore } from '../store/authStore'
import { isSupabaseConfigured } from '../lib/supabase'

const ROLLOVER_ENTRY_NAME = 'Rollover from last month'

export const useBudget = () => {
  const store = useBudgetStore()
  const { user, isAuthenticated } = useAuthStore()
  const rolloverProcessed = useRef<string | null>(null)

  // Load budget when user/month/year changes
  useEffect(() => {
    // Don't load if not authenticated or no user
    if (!isAuthenticated || !user) return
    
    // Don't try to load demo user data from Supabase
    if (isSupabaseConfigured() && user.id === 'demo-user') return
    
    store.loadBudget(user.id, store.selectedMonth, store.selectedYear)
  }, [isAuthenticated, user?.id, store.selectedMonth, store.selectedYear])

  // Handle rollover income entry when budget is loaded and rollover is enabled
  useEffect(() => {
    const processRollover = async () => {
      const { currentBudget, entries, previousMonthRemaining, addEntry, updateEntry, deleteEntry } = store
      const rolloverEnabled = user?.settings?.rollover_enabled ?? false
      
      if (!currentBudget || store.isLoading) return
      
      // Create a unique key for this budget to prevent duplicate processing
      const budgetKey = `${currentBudget.id}-${rolloverEnabled}-${previousMonthRemaining}`
      if (rolloverProcessed.current === budgetKey) return
      rolloverProcessed.current = budgetKey

      // Find existing rollover entry
      const existingRolloverEntry = entries.find(
        e => e.category === 'income' && e.name === ROLLOVER_ENTRY_NAME
      )

      if (rolloverEnabled && previousMonthRemaining !== null && previousMonthRemaining !== 0) {
        // Rollover is enabled and there's an amount to roll over
        if (existingRolloverEntry) {
          // Update existing entry if amount changed
          if (existingRolloverEntry.planned !== previousMonthRemaining || 
              existingRolloverEntry.actual !== previousMonthRemaining) {
            await updateEntry(existingRolloverEntry.id, {
              planned: previousMonthRemaining,
              actual: previousMonthRemaining,
            })
          }
        } else {
          // Create new rollover entry
          await addEntry({
            budget_id: currentBudget.id,
            category: 'income',
            name: ROLLOVER_ENTRY_NAME,
            planned: previousMonthRemaining,
            actual: previousMonthRemaining,
            is_locked: true, // Lock it so it's not accidentally edited
          })
        }
      } else if (!rolloverEnabled && existingRolloverEntry) {
        // Rollover is disabled but entry exists - remove it
        await deleteEntry(existingRolloverEntry.id)
      }
    }

    processRollover()
  }, [
    store.currentBudget?.id, 
    store.isLoading, 
    store.previousMonthRemaining, 
    user?.settings?.rollover_enabled,
    store.entries.length
  ])

  return store
}

