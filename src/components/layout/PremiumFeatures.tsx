import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Calculator, 
  FileText,
  Wallet,
  ArrowLeftRight,
  Sparkles,
  Target,
  Clock,
  FolderTree
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface FeatureItem {
  icon: React.ReactNode
  label: string
  path: string
  key?: string
}

const baseFeatures: FeatureItem[] = [
  { icon: <Wallet className="w-5 h-5" />, label: 'Accounts', path: '/accounts' },
  { icon: <ArrowLeftRight className="w-5 h-5" />, label: 'Transactions', path: '/transactions' },
  { icon: <Target className="w-5 h-5" />, label: 'Budget', path: '/budget-tracker' },
  { icon: <Clock className="w-5 h-5" />, label: 'Planned', path: '/planned-payments' },
  { icon: <FolderTree className="w-5 h-5" />, label: 'Categories', path: '/categories' },
  { icon: <TrendingUp className="w-5 h-5" />, label: 'Net Worth', path: '/net-worth' },
  { icon: <Calendar className="w-5 h-5" />, label: 'Calendar', path: '/calendar' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Annual', path: '/annual' },
  { icon: <Calculator className="w-5 h-5" />, label: 'Debt Payoff', path: '/debt-calculator' },
  { icon: <FileText className="w-5 h-5" />, label: 'Templates', path: '/templates' },
  { icon: <Sparkles className="w-5 h-5" />, label: 'AI Insights', path: '/ai-insights', key: 'ai-insights' },
]

export const PremiumFeatures: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const aiInsightsEnabled = user?.settings?.ai_insights_enabled ?? true
  
  const features = baseFeatures.filter(f => {
    if (f.key === 'ai-insights' && !aiInsightsEnabled) return false
    return true
  })

  return (
    <div className="bg-white rounded-2xl shadow-card p-3 md:p-4">
      <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
        {features.map((feature) => (
          <button
            key={feature.path}
            onClick={() => navigate(feature.path)}
            className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 rounded-xl active:bg-gray-50 hover:bg-gray-50 transition-colors touch-manipulation min-w-[70px] md:min-w-[80px]"
          >
            <div className="text-gray-400 active:text-primary-500 hover:text-primary-500 transition-colors">
              {feature.icon}
            </div>
            <span className="text-[10px] md:text-xs text-gray-600 active:text-gray-800 hover:text-gray-800 transition-colors text-center">
              {feature.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

