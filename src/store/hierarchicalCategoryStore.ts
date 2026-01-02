import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import type { Category } from '../types'

// Default categories for demo mode with hierarchy
const DEFAULT_PARENT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at' | 'children'>[] = [
  { name: 'Salary', icon: '💰', color: '#22C55E', parent_id: null, sort_order: 0 },
  { name: 'Freelance', icon: '💼', color: '#16A34A', parent_id: null, sort_order: 1 },
  { name: 'Food & Dining', icon: '🍽️', color: '#F97316', parent_id: null, sort_order: 2 },
  { name: 'Shopping', icon: '🛍️', color: '#3B82F6', parent_id: null, sort_order: 3 },
  { name: 'Transport', icon: '🚗', color: '#8B5CF6', parent_id: null, sort_order: 4 },
  { name: 'Entertainment', icon: '🎬', color: '#EC4899', parent_id: null, sort_order: 5 },
  { name: 'Bills & Utilities', icon: '💡', color: '#6366F1', parent_id: null, sort_order: 6 },
  { name: 'Health', icon: '🏥', color: '#10B981', parent_id: null, sort_order: 7 },
]

interface HierarchicalCategoryState {
  categories: Category[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadCategories: (userId: string) => Promise<void>
  addCategory: (category: Omit<Category, 'id' | 'created_at' | 'children'>) => Promise<Category | null>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  
  // Getters
  getCategoryById: (id: string) => Category | undefined
  getParentCategories: () => Category[]
  getSubcategories: (parentId: string) => Category[]
  getCategoryTree: () => Category[]
  getAllCategoriesFlat: () => Category[]
}

// Build tree structure from flat array
const buildCategoryTree = (categories: Category[]): Category[] => {
  const categoryMap = new Map<string, Category>()
  const roots: Category[] = []

  // First pass: create a map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] })
  })

  // Second pass: build the tree
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!
      parent.children = parent.children || []
      parent.children.push(category)
    } else {
      roots.push(category)
    }
  })

  // Sort roots and children by sort_order
  const sortBySortOrder = (a: Category, b: Category) => a.sort_order - b.sort_order
  roots.sort(sortBySortOrder)
  roots.forEach(root => {
    if (root.children) {
      root.children.sort(sortBySortOrder)
    }
  })

  return roots
}

export const useHierarchicalCategoryStore = create<HierarchicalCategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  loadCategories: async (userId: string) => {
    // Prevent duplicate simultaneous loads
    if (get().isLoading) return
    
    set({ isLoading: true, error: null })

    if (!isSupabaseConfigured()) {
      // Demo mode - create demo categories with hierarchy
      const demoCategories: Category[] = []
      let idCounter = 0

      // Create parent categories
      const parentIds: Record<string, string> = {}
      DEFAULT_PARENT_CATEGORIES.forEach((cat) => {
        const id = `demo-cat-${idCounter++}`
        parentIds[cat.name] = id
        demoCategories.push({
          ...cat,
          id,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
      })

      // Create subcategories for Food & Dining
      const foodId = parentIds['Food & Dining']
      if (foodId) {
        const foodSubs = [
          { name: 'Groceries', icon: '🛒', color: '#FB923C' },
          { name: 'Restaurants', icon: '🍴', color: '#F97316' },
          { name: 'Delivery Apps', icon: '📱', color: '#EA580C' },
          { name: 'Coffee & Snacks', icon: '☕', color: '#C2410C' },
        ]
        foodSubs.forEach((sub, i) => {
          demoCategories.push({
            ...sub,
            id: `demo-cat-${idCounter++}`,
            user_id: userId,
            parent_id: foodId,
            sort_order: i,
            created_at: new Date().toISOString(),
          })
        })
      }

      // Create subcategories for Shopping
      const shoppingId = parentIds['Shopping']
      if (shoppingId) {
        const shoppingSubs = [
          { name: 'Clothing', icon: '👕', color: '#60A5FA' },
          { name: 'Electronics', icon: '📱', color: '#3B82F6' },
          { name: 'Home & Garden', icon: '🏡', color: '#2563EB' },
        ]
        shoppingSubs.forEach((sub, i) => {
          demoCategories.push({
            ...sub,
            id: `demo-cat-${idCounter++}`,
            user_id: userId,
            parent_id: shoppingId,
            sort_order: i,
            created_at: new Date().toISOString(),
          })
        })
      }

      // Create subcategories for Bills
      const billsId = parentIds['Bills & Utilities']
      if (billsId) {
        const billsSubs = [
          { name: 'Electricity', icon: '⚡', color: '#818CF8' },
          { name: 'Internet', icon: '🌐', color: '#6366F1' },
          { name: 'Phone', icon: '📞', color: '#4F46E5' },
          { name: 'Subscriptions', icon: '📺', color: '#4338CA' },
          { name: 'Rent', icon: '🏠', color: '#3730A3' },
        ]
        billsSubs.forEach((sub, i) => {
          demoCategories.push({
            ...sub,
            id: `demo-cat-${idCounter++}`,
            user_id: userId,
            parent_id: billsId,
            sort_order: i,
            created_at: new Date().toISOString(),
          })
        })
      }

      set({ categories: demoCategories, isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })

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
      const newCategory: Category = {
        ...categoryData,
        id: generateId(),
        created_at: new Date().toISOString(),
      }
      set((state) => ({ categories: [...state.categories, newCategory] }))
      return newCategory
    }

    try {
      const { data, error } = await supabase
        .from('categories')
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
        .from('categories')
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
    // Check if category has children
    const children = get().getSubcategories(id)
    if (children.length > 0) {
      set({ error: 'Cannot delete category with subcategories. Delete subcategories first.' })
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
        .from('categories')
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

  getParentCategories: () => {
    return get().categories
      .filter((cat) => !cat.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order)
  },

  getSubcategories: (parentId) => {
    return get().categories
      .filter((cat) => cat.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  },

  getCategoryTree: () => {
    return buildCategoryTree(get().categories)
  },

  getAllCategoriesFlat: () => {
    return get().categories.sort((a, b) => {
      // Sort by parent first (nulls first), then by sort_order
      if (!a.parent_id && b.parent_id) return -1
      if (a.parent_id && !b.parent_id) return 1
      return a.sort_order - b.sort_order
    })
  },
}))


