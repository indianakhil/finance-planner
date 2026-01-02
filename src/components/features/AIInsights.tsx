import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, TrendingUp, AlertTriangle, Trophy, Lightbulb, Settings, Loader2 } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { useBudgetStore } from '../../store/budgetStore'
import { isOpenAIConfigured, generateFinancialInsights } from '../../lib/openai'
import type { AIInsight } from '../../types'

const insightIcons = {
  tip: Lightbulb,
  warning: AlertTriangle,
  achievement: Trophy,
  recommendation: TrendingUp,
}

const insightColors = {
  tip: 'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
  achievement: 'bg-green-100 text-green-600',
  recommendation: 'bg-purple-100 text-purple-600',
}

const impactBadges = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-green-100 text-green-600',
}

// Demo insights for when AI is not configured
const demoInsights: AIInsight[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'Great job on savings!',
    description: 'You\'ve consistently met your savings goal for the past 3 months. Keep up the momentum!',
    category: 'savings',
    impact: 'high',
  },
  {
    id: '2',
    type: 'tip',
    title: 'Optimize your expenses',
    description: 'Your expenses category is at 100% of planned. Consider reviewing subscriptions or dining out expenses.',
    category: 'expenses',
    impact: 'medium',
  },
  {
    id: '3',
    type: 'recommendation',
    title: 'Increase emergency fund',
    description: 'Based on your monthly expenses, aim for 6 months of expenses saved. Currently at 2 months.',
    category: 'savings',
    impact: 'high',
  },
  {
    id: '4',
    type: 'warning',
    title: 'Bills slightly above budget',
    description: 'Your utilities are trending 5% higher than last month. Check for any unusual usage.',
    category: 'bills',
    impact: 'low',
  },
]

export const AIInsights: React.FC = () => {
  const navigate = useNavigate()
  const { getOverview, entries } = useBudgetStore()
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfigured = isOpenAIConfigured()

  useEffect(() => {
    if (isConfigured) {
      generateInsights()
    } else {
      setInsights(demoInsights)
    }
  }, [isConfigured])

  const generateInsights = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const overview = getOverview()
      const newInsights = await generateFinancialInsights(overview, entries)
      
      if (newInsights.length > 0) {
        setInsights(newInsights)
      } else {
        setInsights(demoInsights)
      }
    } catch (err) {
      setError('Failed to generate insights. Please try again.')
      setInsights(demoInsights)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                AI Insights
                <Sparkles className="w-6 h-6 text-amber-400" />
              </h1>
              <p className="text-gray-500">Personalized financial recommendations</p>
            </div>
          </div>
          {isConfigured && (
            <Button
              onClick={generateInsights}
              isLoading={isLoading}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Refresh Insights
            </Button>
          )}
        </div>

        {/* Not Configured State */}
        {!isConfigured && (
          <Card className="mb-6">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    AI Insights Not Configured
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add your OpenAI API key in Settings to get personalized AI-powered 
                    financial insights and recommendations based on your spending patterns.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/settings')}
                      leftIcon={<Settings className="w-4 h-4" />}
                    >
                      Configure in Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analyzing your finances...</p>
            </div>
          </div>
        )}

        {/* Insights List */}
        {!isLoading && (
          <div className="space-y-4">
            {!isConfigured && (
              <p className="text-sm text-gray-500 mb-4">
                Showing demo insights. Configure AI for personalized recommendations.
              </p>
            )}
            
            {insights.map((insight) => {
              const Icon = insightIcons[insight.type]
              return (
                <Card key={insight.id}>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${insightColors[insight.type]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800">
                            {insight.title}
                          </h3>
                          {insight.impact && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${impactBadges[insight.impact]}`}>
                              {insight.impact} impact
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">
                          {insight.description}
                        </p>
                        {insight.category && (
                          <p className="text-sm text-gray-400 mt-2 capitalize">
                            Category: {insight.category}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

