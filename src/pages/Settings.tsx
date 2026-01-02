import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Key, Globe, Sparkles, RefreshCw, Tags, Plus, Trash2, Pencil, Grid3x3 } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'
import { useCategoryStore } from '../store/categoryStore'
import { useToast } from '../hooks/useToast'
import { isOpenAIConfigured, initializeOpenAI } from '../lib/openai'
import type { LegacyCategory, UserCategory } from '../types'

const currencies = [
  { code: '₹', name: 'Indian Rupee (₹)' },
  { code: '$', name: 'US Dollar ($)' },
  { code: '€', name: 'Euro (€)' },
  { code: '£', name: 'British Pound (£)' },
  { code: '¥', name: 'Japanese Yen (¥)' },
]

const MAIN_CATEGORY_LABELS: Record<LegacyCategory, string> = {
  income: 'Income',
  expenses: 'Expenses',
  bills: 'Bills',
  savings: 'Savings',
  debt: 'Debt',
}

const MAIN_CATEGORY_COLORS: Record<LegacyCategory, string> = {
  income: 'bg-green-100 text-green-700',
  expenses: 'bg-blue-100 text-blue-700',
  bills: 'bg-indigo-100 text-indigo-700',
  savings: 'bg-emerald-100 text-emerald-700',
  debt: 'bg-pink-100 text-pink-700',
}

interface CategoryFormData {
  name: string
  main_category: LegacyCategory
  icon: string
  color: string
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  main_category: 'expenses',
  icon: '',
  color: '#6366F1',
}

export const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { user, updateSettings } = useAuthStore()
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore()
  const { showSuccess, showError } = useToast()
  
  const [currency, setCurrency] = useState(user?.settings?.currency || '₹')
  const [openaiKey, setOpenaiKey] = useState(user?.settings?.openai_api_key || '')
  const [rolloverEnabled, setRolloverEnabled] = useState(user?.settings?.rollover_enabled ?? false)
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(user?.settings?.ai_insights_enabled ?? true)
  const hiddenDefaultTiles = user?.settings?.hidden_default_tiles || []
  
  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm)
  const [expandedMainCategory, setExpandedMainCategory] = useState<LegacyCategory | null>(null)

  useEffect(() => {
    if (user) {
      loadCategories(user.id)
    }
  }, [user?.id])

  const handleOpenCategoryModal = (category?: UserCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        main_category: category.main_category,
        icon: category.icon,
        color: category.color,
      })
    } else {
      setEditingCategory(null)
      setCategoryForm(initialCategoryForm)
    }
    setIsCategoryModalOpen(true)
  }

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setEditingCategory(null)
    setCategoryForm(initialCategoryForm)
  }

  const handleSaveCategory = async () => {
    if (!user || !categoryForm.name.trim()) return

    // Use default icon if empty
    const categoryData = {
      ...categoryForm,
      icon: categoryForm.icon.trim() || '📁',
    }

    if (editingCategory) {
      const success = await updateCategory(editingCategory.id, categoryData)
      if (success) showSuccess('Category updated')
    } else {
      const result = await addCategory({
        user_id: user.id,
        ...categoryData,
        is_default: false,
      })
      if (result) showSuccess('Category added')
    }
    handleCloseCategoryModal()
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Delete this category? Transactions using it will become uncategorized.')) {
      const success = await deleteCategory(id)
      if (success) showSuccess('Category deleted')
      else showError('Cannot delete default categories')
    }
  }

  const getCategoriesByMain = (mainCategory: LegacyCategory) => {
    return categories.filter((cat) => cat.main_category === mainCategory)
  }

  // Auto-save settings when they change
  const saveSettings = async (newSettings: Partial<{
    currency: string
    openai_api_key: string | undefined
    rollover_enabled: boolean
    ai_insights_enabled: boolean
  }>) => {
    try {
      await updateSettings({
        currency,
        openai_api_key: openaiKey || undefined,
        rollover_enabled: rolloverEnabled,
        ai_insights_enabled: aiInsightsEnabled,
        ...newSettings,
      })
    } catch {
      showError('Failed to save settings')
    }
  }

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency)
    saveSettings({ currency: newCurrency })
  }

  const handleRolloverChange = (enabled: boolean) => {
    setRolloverEnabled(enabled)
    saveSettings({ rollover_enabled: enabled })
  }

  const handleAiInsightsChange = (enabled: boolean) => {
    setAiInsightsEnabled(enabled)
    saveSettings({ ai_insights_enabled: enabled })
  }

  const handleOpenAIKeyBlur = async () => {
    if (openaiKey && openaiKey !== user?.settings?.openai_api_key) {
      const isValid = initializeOpenAI(openaiKey)
      if (!isValid) {
        showError('Invalid OpenAI API key')
        return
      }
    }
    saveSettings({ openai_api_key: openaiKey || undefined })
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
                    onChange={(e) => handleCurrencyChange(e.target.value)}
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
                        onChange={(e) => handleRolloverChange(e.target.checked)}
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

          {/* AI Insights Settings */}
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${aiInsightsEnabled ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Sparkles className={`w-6 h-6 ${aiInsightsEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">AI Insights</h3>
                      {aiInsightsEnabled && isOpenAIConfigured() && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiInsightsEnabled}
                        onChange={(e) => handleAiInsightsChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Enable AI-powered financial insights and recommendations
                  </p>
                  <div className={aiInsightsEnabled ? '' : 'opacity-50 pointer-events-none'}>
                    <Input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      onBlur={handleOpenAIKeyBlur}
                      placeholder="sk-..."
                      leftIcon={<Key className="w-4 h-4" />}
                      disabled={!aiInsightsEnabled}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Your API key is stored securely and only used for generating insights
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden Default Tiles */}
          {hiddenDefaultTiles.length > 0 && (
            <Card>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <Grid3x3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">Hidden Dashboard Tiles</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Restore hidden default tiles to show them on your dashboard
                    </p>
                    <div className="space-y-2">
                      {hiddenDefaultTiles.map((tileLabel) => (
                        <div
                          key={tileLabel}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className="text-sm font-medium text-gray-700">{tileLabel}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updated = hiddenDefaultTiles.filter((t) => t !== tileLabel)
                              updateSettings({ hidden_default_tiles: updated })
                              showSuccess(`${tileLabel} tile restored`)
                            }}
                          >
                            Show
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Management */}
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-indigo-100">
                  <Tags className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800">Transaction Categories</h3>
                    <Button size="sm" onClick={() => handleOpenCategoryModal()} className="gap-1">
                      <Plus className="w-3 h-3" />
                      Add
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Manage your custom categories for tracking transactions
                  </p>

                  <div className="space-y-2">
                    {(['income', 'expenses', 'bills', 'savings', 'debt'] as LegacyCategory[]).map((mainCat) => (
                      <div key={mainCat} className="border border-gray-100 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedMainCategory(expandedMainCategory === mainCat ? null : mainCat)}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${MAIN_CATEGORY_COLORS[mainCat]}`}>
                              {MAIN_CATEGORY_LABELS[mainCat]}
                            </span>
                            <span className="text-sm text-gray-500">
                              {getCategoriesByMain(mainCat).length} categories
                            </span>
                          </div>
                          <span className="text-gray-400">{expandedMainCategory === mainCat ? '−' : '+'}</span>
                        </button>
                        
                        {expandedMainCategory === mainCat && (
                          <div className="border-t border-gray-100 divide-y divide-gray-50">
                            {getCategoriesByMain(mainCat).map((cat) => (
                              <div key={cat.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                                <div className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  <span className="text-sm text-gray-700">{cat.name}</span>
                                  {cat.is_default && (
                                    <span className="text-xs text-gray-400">(default)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenCategoryModal(cat)}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {!cat.is_default && (
                                    <button
                                      onClick={() => handleDeleteCategory(cat.id)}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {getCategoriesByMain(mainCat).length === 0 && (
                              <p className="px-4 py-3 text-sm text-gray-400 text-center">
                                No categories yet
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Category Modal */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={handleCloseCategoryModal}
          title={editingCategory ? 'Edit Category' : 'Add Category'}
        >
          <div className="space-y-4">
            <Input
              label="Category Name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g., Groceries, Rent"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Category</label>
              <select
                value={categoryForm.main_category}
                onChange={(e) => setCategoryForm({ ...categoryForm, main_category: e.target.value as LegacyCategory })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(['income', 'expenses', 'bills', 'savings', 'debt'] as LegacyCategory[]).map((cat) => (
                  <option key={cat} value={cat}>{MAIN_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                This determines how the category affects your budget
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-2xl"
                placeholder="📁"
                maxLength={2}
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty for default icon (📁)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#6366F1"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseCategoryModal} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} disabled={!categoryForm.name.trim()} className="flex-1">
                {editingCategory ? 'Save Changes' : 'Add Category'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

