import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Key, Globe, Sparkles, Save, RefreshCw } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { isOpenAIConfigured, initializeOpenAI } from '../lib/openai'

const currencies = [
  { code: '₹', name: 'Indian Rupee (₹)' },
  { code: '$', name: 'US Dollar ($)' },
  { code: '€', name: 'Euro (€)' },
  { code: '£', name: 'British Pound (£)' },
  { code: '¥', name: 'Japanese Yen (¥)' },
]

export const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { user, updateSettings } = useAuthStore()
  const { showSuccess, showError } = useToast()
  
  const [currency, setCurrency] = useState(user?.settings?.currency || '₹')
  const [openaiKey, setOpenaiKey] = useState(user?.settings?.openai_api_key || '')
  const [rolloverEnabled, setRolloverEnabled] = useState(user?.settings?.rollover_enabled ?? false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // Validate OpenAI key if provided
      if (openaiKey && openaiKey !== user?.settings?.openai_api_key) {
        const isValid = initializeOpenAI(openaiKey)
        if (!isValid) {
          showError('Invalid OpenAI API key')
          setIsLoading(false)
          return
        }
      }

      await updateSettings({
        currency,
        openai_api_key: openaiKey || undefined,
        rollover_enabled: rolloverEnabled,
      })

      showSuccess('Settings saved successfully')
    } catch {
      showError('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Currency Settings */}
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-100">
                  <Globe className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">Currency</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Choose your preferred currency for displaying amounts
                  </p>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rollover Settings */}
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <RefreshCw className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800">Rollover to Income</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rolloverEnabled}
                        onChange={(e) => setRolloverEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">
                    When enabled, the remaining amount from the previous month is automatically added as an income entry called "Rollover from last month"
                  </p>
                  {rolloverEnabled && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm text-green-700">
                        ✓ Rollover will be automatically added to your income each month
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OpenAI Settings */}
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">AI Insights</h3>
                    {isOpenAIConfigured() ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Add your OpenAI API key to enable AI-powered financial insights and recommendations
                  </p>
                  <Input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    leftIcon={<Key className="w-4 h-4" />}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Your API key is stored securely and only used for generating insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              isLoading={isLoading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

