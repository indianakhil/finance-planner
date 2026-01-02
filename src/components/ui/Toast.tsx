import React from 'react'
import { X, CheckCircle, AlertCircle, Info, Undo2 } from 'lucide-react'
import { useToastStore } from '../../store/toastStore'
import type { ToastMessage } from '../../types'

const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToastStore()

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    undo: <Undo2 className="w-5 h-5 text-gray-600" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    undo: 'bg-white border-gray-200',
  }

  const handleUndo = () => {
    if (toast.undoAction) {
      toast.undoAction()
      removeToast(toast.id)
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in ${bgColors[toast.type]}`}
    >
      {icons[toast.type]}
      <span className="flex-1 text-sm text-gray-700">{toast.message}</span>
      
      {toast.type === 'undo' && toast.undoAction && (
        <button
          onClick={handleUndo}
          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
      )}
      
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 min-w-[320px] max-w-md">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

