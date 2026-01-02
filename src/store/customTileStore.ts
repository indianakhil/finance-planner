import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import type { CustomDashboardTile } from '../types'

interface CustomTileState {
  tiles: CustomDashboardTile[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadTiles: (userId: string) => Promise<void>
  addTile: (tile: Omit<CustomDashboardTile, 'id' | 'created_at' | 'updated_at'>) => Promise<CustomDashboardTile | null>
  updateTile: (id: string, updates: Partial<CustomDashboardTile>) => Promise<boolean>
  deleteTile: (id: string) => Promise<boolean>
  toggleActive: (id: string) => Promise<boolean>
  
  // Getters
  getTileById: (id: string) => CustomDashboardTile | undefined
  getActiveTiles: () => CustomDashboardTile[]
  
  // Calculate total for a tile based on transactions
  calculateTileTotal: (tile: CustomDashboardTile, transactions: any[], currentMonth: number, currentYear: number) => number
}

export const useCustomTileStore = create<CustomTileState>((set, get) => ({
  tiles: [],
  isLoading: false,
  error: null,

  loadTiles: async (userId: string) => {
    // Prevent duplicate simultaneous loads
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      set({ tiles: [], isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('custom_dashboard_tiles')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      set({ tiles: data || [], isLoading: false })
    } catch (error) {
      console.error('Error loading custom tiles:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load custom tiles',
        isLoading: false 
      })
    }
  },

  addTile: async (tileData) => {
    if (!isSupabaseConfigured()) {
      const newTile: CustomDashboardTile = {
        ...tileData,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      set((state) => ({ tiles: [...state.tiles, newTile] }))
      return newTile
    }

    try {
      const { data, error } = await supabase
        .from('custom_dashboard_tiles')
        .insert(tileData)
        .select()
        .single()

      if (error) throw error

      set((state) => ({ tiles: [...state.tiles, data] }))
      return data
    } catch (error) {
      console.error('Error adding custom tile:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to add custom tile' })
      return null
    }
  },

  updateTile: async (id, updates) => {
    if (!isSupabaseConfigured()) {
      set((state) => ({
        tiles: state.tiles.map((tile) =>
          tile.id === id ? { ...tile, ...updates, updated_at: new Date().toISOString() } : tile
        ),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('custom_dashboard_tiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        tiles: state.tiles.map((tile) =>
          tile.id === id ? { ...tile, ...updates, updated_at: new Date().toISOString() } : tile
        ),
      }))
      return true
    } catch (error) {
      console.error('Error updating custom tile:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update custom tile' })
      return false
    }
  },

  deleteTile: async (id) => {
    if (!isSupabaseConfigured()) {
      set((state) => ({
        tiles: state.tiles.filter((tile) => tile.id !== id),
      }))
      return true
    }

    try {
      const { error } = await supabase
        .from('custom_dashboard_tiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        tiles: state.tiles.filter((tile) => tile.id !== id),
      }))
      return true
    } catch (error) {
      console.error('Error deleting custom tile:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete custom tile' })
      return false
    }
  },

  toggleActive: async (id) => {
    const tile = get().tiles.find((t) => t.id === id)
    if (!tile) return false
    return get().updateTile(id, { is_active: !tile.is_active })
  },

  getTileById: (id) => {
    return get().tiles.find((tile) => tile.id === id)
  },

  getActiveTiles: () => {
    return get().tiles.filter((tile) => tile.is_active).sort((a, b) => a.sort_order - b.sort_order)
  },

  calculateTileTotal: (tile, transactions, currentMonth, currentYear) => {
    return transactions
      .filter((tx) => {
        // Filter by transaction type
        if (!tile.transaction_types.includes(tx.type)) return false
        
        // Filter by date (current month)
        const txDate = new Date(tx.transaction_date)
        if (txDate.getMonth() + 1 !== currentMonth || txDate.getFullYear() !== currentYear) {
          return false
        }
        
        // If no categories selected, include all transactions of the selected types
        if (!tile.category_ids || tile.category_ids.length === 0) {
          return true
        }
        
        // Filter by category
        const categoryId = tx.new_category_id || tx.category_id
        if (!categoryId) return false
        
        // Check if transaction's category matches
        return tile.category_ids.includes(categoryId)
      })
      .reduce((sum, tx) => sum + tx.amount, 0)
  },
}))

