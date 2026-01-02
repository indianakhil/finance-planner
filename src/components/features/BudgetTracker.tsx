import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Target } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { useCategoryBudgetStore } from '../../store/categoryBudgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/useToast'
import { formatCurrency } from '../../lib/utils'
import type { Category, CategoryBudgetSummary } from '../../types'

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F59E0B', '#6366F1', '#14B8A6', '#EF4444',
]

export const BudgetTracker: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { categories, loadCategories, getSubcategories } = useHierarchicalCategoryStore()
  const { loadBudgets, setBudget, calculateBudgetSummary } = useCategoryBudgetStore()
  const { transactions, loadTransactions } = useTransactionStore()
  const { showSuccess } = useToast()

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showSubcategories, setShowSubcategories] = useState(false)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState<number>(0)

  useEffect(() => {
    if (user) {
      loadCategories(user.id)
      loadBudgets(user.id, selectedMonth, selectedYear)
      loadTransactions(user.id)
    }
  }, [user?.id, selectedMonth, selectedYear])

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
    setSelectedCategory(null)
    setShowSubcategories(false)
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
    setSelectedCategory(null)
    setShowSubcategories(false)
  }

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' })
  }

  const handleCategoryClick = (summary: CategoryBudgetSummary) => {
    if (selectedCategory?.id === summary.category.id) {
      // Already selected, toggle subcategory view
      if (summary.subcategories && summary.subcategories.length > 0) {
        setShowSubcategories(!showSubcategories)
      }
    } else {
      setSelectedCategory(summary.category)
      setShowSubcategories(false)
    }
  }

  const handleGoDeeper = () => {
    setShowSubcategories(true)
  }

  const handleGoBack = () => {
    setShowSubcategories(false)
    setSelectedCategory(null)
  }

  const handleSaveBudget = async (categoryId: string) => {
    if (!user) return
    await setBudget(user.id, categoryId, selectedMonth, selectedYear, editAmount)
    showSuccess('Budget updated')
    setEditingBudget(null)
  }

  const budgetSummary = calculateBudgetSummary(categories, transactions, selectedMonth, selectedYear)

  // Prepare chart data
  const getChartData = () => {
    if (showSubcategories && selectedCategory) {
      const parentSummary = budgetSummary.categories.find(c => c.category.id === selectedCategory.id)
      if (parentSummary?.subcategories) {
        return parentSummary.subcategories
          .filter(s => s.spent > 0 || s.budgeted > 0)
          .map((s, i) => ({
            ...s,
            color: s.category.color || CHART_COLORS[i % CHART_COLORS.length],
          }))
      }
      return []
    }
    
    return budgetSummary.categories
      .filter(c => c.spent > 0 || c.budgeted > 0)
      .map((c, i) => ({
        ...c,
        color: c.category.color || CHART_COLORS[i % CHART_COLORS.length],
      }))
  }

  const chartData = getChartData()
  const hasChartData = chartData.length > 0

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryBudgetSummary & { color: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-800">{data.category.icon} {data.category.name}</p>
          <p className="text-xs text-gray-500">Spent: {formatCurrency(data.spent)}</p>
          <p className="text-xs text-gray-500">Budget: {formatCurrency(data.budgeted)}</p>
        </div>
      )
    }
    return null
  }

  const displayData = showSubcategories && selectedCategory
    ? budgetSummary.categories.find(c => c.category.id === selectedCategory.id)?.subcategories || []
    : budgetSummary.categories

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Budget Tracker</h1>
              <p className="text-sm text-gray-500">Set budgets and track spending by category</p>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800 min-w-[180px] text-center">
            {getMonthName(selectedMonth)} {selectedYear}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="text-center">
              <p className="text-sm text-gray-500 mb-1">Total Budgeted</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(budgetSummary.totalBudgeted)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-sm text-gray-500 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(budgetSummary.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-sm text-gray-500 mb-1">Remaining</p>
              <p className={`text-2xl font-bold ${budgetSummary.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(budgetSummary.totalRemaining)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  {showSubcategories && selectedCategory 
                    ? `${selectedCategory.icon} ${selectedCategory.name}` 
                    : 'Spending by Category'}
                </h3>
                {showSubcategories && (
                  <Button variant="outline" size="sm" onClick={handleGoBack}>
                    ← Back
                  </Button>
                )}
              </div>

              {hasChartData ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="spent"
                        onClick={(data) => {
                          if (!showSubcategories) {
                            handleCategoryClick(data)
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            opacity={selectedCategory && selectedCategory.id !== entry.category.id && !showSubcategories ? 0.3 : 1}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatCurrency(chartData.reduce((s, c) => s + c.spent, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center">
                  <p className="text-gray-400">No spending data</p>
                </div>
              )}

              {/* Go Deeper Button */}
              {selectedCategory && !showSubcategories && (
                <div className="mt-4 text-center">
                  {getSubcategories(selectedCategory.id).length > 0 ? (
                    <Button onClick={handleGoDeeper}>
                      Go Deeper →
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-400">No subcategories</p>
                  )}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {chartData.slice(0, 6).map((item) => (
                  <div
                    key={item.category.id}
                    className="flex items-center gap-1.5 cursor-pointer"
                    onClick={() => !showSubcategories && handleCategoryClick(item)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-600">{item.category.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget List */}
          <Card>
            <CardContent>
              <h3 className="font-semibold text-gray-800 mb-4">
                {showSubcategories && selectedCategory 
                  ? 'Subcategory Budgets' 
                  : 'Category Budgets'}
              </h3>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {displayData.length === 0 ? (
                  <div className="py-8 text-center">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No categories with budgets</p>
                  </div>
                ) : (
                  displayData.map((summary) => {
                    const isEditing = editingBudget === summary.category.id
                    const percentage = summary.budgeted > 0 
                      ? Math.min((summary.spent / summary.budgeted) * 100, 100) 
                      : 0
                    const isOverBudget = summary.spent > summary.budgeted && summary.budgeted > 0

                    return (
                      <div key={summary.category.id} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{summary.category.icon}</span>
                            <span className="font-medium text-gray-800">{summary.category.name}</span>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-800'}`}>
                              {formatCurrency(summary.spent)} / {formatCurrency(summary.budgeted)}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOverBudget ? 'bg-red-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Edit Budget */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              value={editAmount || ''}
                              onChange={(e) => setEditAmount(Number(e.target.value))}
                              placeholder="Budget amount"
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleSaveBudget(summary.category.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingBudget(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBudget(summary.category.id)
                              setEditAmount(summary.budgeted)
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Set Budget
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}


