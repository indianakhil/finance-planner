import { useToastStore } from '../store/toastStore'

export const useToast = () => {
  const { addToast, removeToast, clearToasts, toasts } = useToastStore()

  const showSuccess = (message: string) => {
    return addToast({ type: 'success', message })
  }

  const showError = (message: string) => {
    return addToast({ type: 'error', message })
  }

  const showInfo = (message: string) => {
    return addToast({ type: 'info', message })
  }

  const showUndo = (message: string, undoAction: () => void, duration = 5000) => {
    return addToast({
      type: 'undo',
      message,
      undoAction,
      duration,
    })
  }

  return {
    toasts,
    showSuccess,
    showError,
    showInfo,
    showUndo,
    removeToast,
    clearToasts,
  }
}

