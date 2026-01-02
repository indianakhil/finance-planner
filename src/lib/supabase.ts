import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isConfigured) {
  console.warn('Supabase credentials not configured. Using demo mode.')
}

// Create a dummy client for demo mode to avoid errors
const dummyUrl = 'https://placeholder.supabase.co'
const dummyKey = 'placeholder-key'

export const supabase: SupabaseClient = createClient(
  isConfigured ? supabaseUrl : dummyUrl,
  isConfigured ? supabaseAnonKey : dummyKey
)

export const isSupabaseConfigured = () => isConfigured

