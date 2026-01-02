import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Calculator, 
  Receipt, 
  FileText,
  Lock
} from 'lucide-react'

interface FeatureItem {
  icon: React.ReactNode
  label: string
  path: string
}

const features: FeatureItem[] = [
  { icon: <TrendingUp className="w-5 h-5" />, label: 'Net Worth', path: '/net-worth' },
  { icon: <Calendar className="w-5 h-5" />, label: 'Calendar', path: '/calendar' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Annual View', path: '/annual' },
  { icon: <Calculator className="w-5 h-5" />, label: 'Debt Payoff', path: '/debt-calculator' },
  { icon: <Receipt className="w-5 h-5" />, label: 'Bills Tracker', path: '/recurring-bills' },
  { icon: <FileText className="w-5 h-5" />, label: 'Templates', path: '/templates' },
]

export const PremiumFeatures: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Lock className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-600">Premium Features</span>
      </div>

      <div className="flex items-center justify-center gap-6 flex-wrap">
        {features.map((feature) => (
          <button
            key={feature.path}
            onClick={() => navigate(feature.path)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="text-gray-400 group-hover:text-primary-500 transition-colors">
              {feature.icon}
            </div>
            <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors">
              {feature.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

