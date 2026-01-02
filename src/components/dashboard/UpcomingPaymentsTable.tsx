import React from 'react'
import { Calendar, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlannedPaymentStore } from '../../store/plannedPaymentStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { formatCurrency } from '../../lib/utils'

export const UpcomingPaymentsTable: React.FC = () => {
  const navigate = useNavigate()
  const { getUpcomingPayments } = usePlannedPaymentStore()
  const { categories } = useHierarchicalCategoryStore()

  // Planned payments are loaded by Dashboard, no need to reload here

  const upcomingPayments = getUpcomingPayments(30) // Next 30 days

  const getCategoryDisplay = (categoryId: string | null) => {
    if (!categoryId) return { name: '-', icon: '📝' }
    const category = categories.find((c) => c.id === categoryId)
    return category ? { name: category.name, icon: category.icon } : { name: '-', icon: '📝' }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 bg-green-50'
      case 'expense': return 'text-red-600 bg-red-50'
      case 'transfer': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return 'IN'
      case 'expense': return 'OUT'
      case 'transfer': return 'TRF'
      default: return type
    }
  }

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/80" />
          <span className="text-white font-semibold text-sm uppercase tracking-wide">Upcoming</span>
        </div>
        <button
          onClick={() => navigate('/planned-payments')}
          className="flex items-center gap-1 text-white/80 hover:text-white text-xs transition-colors"
        >
          <span>Manage</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {upcomingPayments.length > 0 ? (
          <div className="space-y-2">
            {upcomingPayments.slice(0, 5).map((payment) => {
              const categoryDisplay = getCategoryDisplay(payment.category_id)
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{categoryDisplay.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {payment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.next_execution_date && formatRelativeDate(payment.next_execution_date)}
                        {payment.frequency === 'recurrent' && ' • Recurring'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getTypeColor(payment.type)}`}>
                      {getTypeLabel(payment.type)}
                    </span>
                    <span className={`text-sm font-semibold ${
                      payment.type === 'income' ? 'text-green-600' : 
                      payment.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {payment.type === 'income' ? '+' : '-'}{formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">No upcoming payments</p>
            <button
              onClick={() => navigate('/planned-payments')}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Schedule a payment
            </button>
          </div>
        )}

        {/* View All Link */}
        {upcomingPayments.length > 5 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => navigate('/planned-payments')}
              className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all {upcomingPayments.length} scheduled
            </button>
          </div>
        )}

        {/* Summary */}
        {upcomingPayments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Next 30 days</span>
              <div className="flex items-center gap-3">
                <span className="text-green-600">
                  +{formatCurrency(upcomingPayments.filter(p => p.type === 'income').reduce((s, p) => s + p.amount, 0))}
                </span>
                <span className="text-red-600">
                  -{formatCurrency(upcomingPayments.filter(p => p.type === 'expense').reduce((s, p) => s + p.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


