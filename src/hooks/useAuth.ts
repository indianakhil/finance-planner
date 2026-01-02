import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const error = useAuthStore((state) => state.error)
  const initialize = useAuthStore((state) => state.initialize)
  const signUp = useAuthStore((state) => state.signUp)
  const signIn = useAuthStore((state) => state.signIn)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const signOut = useAuthStore((state) => state.signOut)
  const updateSettings = useAuthStore((state) => state.updateSettings)
  const clearError = useAuthStore((state) => state.clearError)

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    initialize,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateSettings,
    clearError,
  }
}

