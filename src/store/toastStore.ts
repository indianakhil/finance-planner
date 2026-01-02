import { create } from 'zustand'
import type { ToastMessage } from '../types'
import { generateId } from '../lib/utils'

interface ToastState {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId()
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    }

    set(state => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-remove after duration (unless it's an undo toast with no auto-dismiss)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set(state => ({
          toasts: state.toasts.filter(t => t.id !== id),
        }))
      }, newToast.duration)
    }

    return id
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))

