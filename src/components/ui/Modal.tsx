import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal content - Full screen on mobile, centered on desktop */}
      <div
        className={`relative w-full h-full md:h-auto md:max-h-[90vh] ${sizeStyles[size]} md:mx-4 bg-white md:rounded-2xl shadow-xl animate-fade-in overflow-hidden flex flex-col`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 active:text-gray-600 hover:text-gray-600 transition-colors rounded-lg active:bg-gray-100 hover:bg-gray-100 touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body - Scrollable */}
        <div className="px-4 md:px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}

