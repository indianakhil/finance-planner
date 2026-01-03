/**
 * Converts technical database/API errors into user-friendly messages
 * Technical details are logged to console for debugging
 */

interface SupabaseError {
  message?: string
  code?: string
  details?: string
  hint?: string
}

export const getUserFriendlyError = (error: unknown, context: string): string => {
  // Log technical error for debugging
  console.error(`[${context}] Technical error:`, error)

  if (!error) {
    return 'Something went wrong. Please try again.'
  }

  // Handle Supabase errors
  if (typeof error === 'object' && 'code' in error) {
    const supabaseError = error as SupabaseError
    
    // RLS Policy errors
    if (supabaseError.code === '42501' || supabaseError.message?.includes('row-level security')) {
      return 'You don\'t have permission to perform this action. Please make sure you\'re logged in.'
    }

    // Foreign key violations
    if (supabaseError.code === '23503') {
      return 'This item is being used elsewhere and cannot be deleted or modified.'
    }

    // Unique constraint violations
    if (supabaseError.code === '23505') {
      return 'This item already exists. Please use a different name.'
    }

    // Check constraint violations
    if (supabaseError.code === '23514') {
      if (supabaseError.message?.includes('balance_display')) {
        return 'Please select a balance display option for credit card/overdraft accounts.'
      }
      if (supabaseError.message?.includes('type')) {
        return 'Invalid account type selected. Please choose a valid option.'
      }
      if (supabaseError.message?.includes('status')) {
        return 'Invalid status selected. Please choose a valid option.'
      }
      return 'Invalid data provided. Please check your input and try again.'
    }

    // Not null violations
    if (supabaseError.code === '23502') {
      return 'Please fill in all required fields.'
    }

    // Network/connection errors
    if (supabaseError.code === 'PGRST301' || supabaseError.message?.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    }

    // Table not found
    if (supabaseError.code === 'PGRST205' || supabaseError.message?.includes('does not exist')) {
      return 'Database configuration error. Please contact support.'
    }

    // Generic database error
    if (supabaseError.code?.startsWith('23') || supabaseError.code?.startsWith('42')) {
      return 'Invalid data provided. Please check your input and try again.'
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request took too long. Please try again.'
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'You don\'t have permission to perform this action.'
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('login') || message.includes('session')) {
      return 'Your session has expired. Please log in again.'
    }
  }

  // Default user-friendly message
  return 'Something went wrong. Please try again. If the problem persists, try refreshing the page.'
}

