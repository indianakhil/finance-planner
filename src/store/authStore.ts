import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User, UserSettings } from '../types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  signOut: () => Promise<void>
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>
  clearError: () => void
}

// Demo user for when Supabase is not configured
const demoUser: User = {
  id: 'demo-user',
  email: 'demo@example.com',
  display_name: 'Demo User',
  settings: {
    currency: '₹',
  },
  created_at: new Date().toISOString(),
}

// Helper to add timeout to promises (works with both Promise and PromiseLike/thenable)
const withTimeout = <T>(promise: PromiseLike<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), ms)
  })
  return Promise.race([Promise.resolve(promise), timeout])
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      initialize: async () => {
        const currentState = get()
        
        // If Supabase is configured but we have demo user data, clear it
        if (isSupabaseConfigured() && currentState.user?.id === 'demo-user') {
          set({ user: null, isAuthenticated: false, isLoading: true })
        }
        
        // Check if we already have valid persisted auth state
        if (currentState.isAuthenticated && currentState.user && currentState.user.id !== 'demo-user') {
          set({ isLoading: false })
          return
        }

        if (!isSupabaseConfigured()) {
          // Demo mode - auto-login
          set({ user: demoUser, isAuthenticated: true, isLoading: false })
          return
        }

        try {
          // Add 5 second timeout to prevent hanging
          const { data: { session } } = await withTimeout(
            supabase.auth.getSession(),
            5000
          )
          
          if (session?.user) {
            // Fetch user profile from our users table
            const { data: profile } = await withTimeout(
              supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single(),
              5000
            )

            if (profile) {
              set({ user: profile, isAuthenticated: true, isLoading: false })
            } else {
              // Create profile if it doesn't exist
              const newUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                display_name: session.user.user_metadata?.full_name || null,
                settings: { currency: '₹' },
                created_at: new Date().toISOString(),
              }
              
              await supabase.from('users').insert(newUser)
              set({ user: newUser, isAuthenticated: true, isLoading: false })
            }
          } else {
            // No session - show login page
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          // On error, just show login page instead of hanging
          set({ isLoading: false, error: null })
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            try {
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (profile) {
                set({ user: profile, isAuthenticated: true })
              }
            } catch (err) {
              console.error('Error fetching profile:', err)
            }
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false })
          }
        })
      },

      signUp: async (email: string, password: string, displayName?: string) => {
        if (!isSupabaseConfigured()) {
          set({ user: demoUser, isAuthenticated: true })
          return true
        }

        set({ isLoading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: displayName },
            },
          })

          if (error) throw error

          if (data.user) {
            const newUser: User = {
              id: data.user.id,
              email: data.user.email || '',
              display_name: displayName || null,
              settings: { currency: '₹' },
              created_at: new Date().toISOString(),
            }

            await supabase.from('users').insert(newUser)
            set({ user: newUser, isAuthenticated: true, isLoading: false })
            return true
          }

          set({ isLoading: false })
          return false
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sign up failed'
          set({ error: message, isLoading: false })
          return false
        }
      },

      signIn: async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
          set({ user: demoUser, isAuthenticated: true })
          return true
        }

        set({ isLoading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          if (data.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            set({ user: profile, isAuthenticated: true, isLoading: false })
            return true
          }

          set({ isLoading: false })
          return false
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sign in failed'
          set({ error: message, isLoading: false })
          return false
        }
      },

      signInWithGoogle: async () => {
        if (!isSupabaseConfigured()) {
          set({ user: demoUser, isAuthenticated: true })
          return true
        }

        set({ isLoading: true, error: null })

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/FinancePlanner/auth/callback`,
            },
          })

          if (error) throw error
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google sign in failed'
          set({ error: message, isLoading: false })
          return false
        }
      },

      signOut: async () => {
        if (!isSupabaseConfigured()) {
          set({ user: null, isAuthenticated: false })
          return
        }

        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false })
      },

      updateSettings: async (settings: Partial<UserSettings>) => {
        const { user } = get()
        if (!user) return

        const updatedSettings = { ...user.settings, ...settings }

        if (isSupabaseConfigured()) {
          await supabase
            .from('users')
            .update({ settings: updatedSettings })
            .eq('id', user.id)
        }

        set({ user: { ...user, settings: updatedSettings } })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

