import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, FileText, Sparkles } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useToast } from '../../hooks/useToast'
import type { BudgetTemplate } from '../../types'

const templates: BudgetTemplate[] = [
  {
    id: '1',
    name: '50/30/20 Rule',
    description: 'A balanced approach: 50% needs, 30% wants, 20% savings',
    allocations: [
      { category: 'bills', percentage: 50, name: 'Needs (Bills & Essentials)' },
      { category: 'expenses', percentage: 30, name: 'Wants (Lifestyle)' },
      { category: 'savings', percentage: 20, name: 'Savings & Debt' },
    ],
  },
  {
    id: '2',
    name: 'Aggressive Saver',
    description: 'For those focused on building wealth fast: 40% needs, 20% wants, 40% savings',
    allocations: [
      { category: 'bills', percentage: 40, name: 'Needs' },
      { category: 'expenses', percentage: 20, name: 'Wants' },
      { category: 'savings', percentage: 30, name: 'Savings' },
      { category: 'debt', percentage: 10, name: 'Extra Debt Payment' },
    ],
  },
  {
    id: '3',
    name: 'Debt Destroyer',
    description: 'Focus on eliminating debt: 50% needs, 15% wants, 35% debt payoff',
    allocations: [
      { category: 'bills', percentage: 50, name: 'Essential Bills' },
      { category: 'expenses', percentage: 15, name: 'Minimal Lifestyle' },
      { category: 'savings', percentage: 5, name: 'Emergency Fund' },
      { category: 'debt', percentage: 30, name: 'Debt Payoff' },
    ],
  },
  {
    id: '4',
    name: 'Balanced Family',
    description: 'For families balancing multiple priorities',
    allocations: [
      { category: 'bills', percentage: 55, name: 'Housing & Utilities' },
      { category: 'expenses', percentage: 25, name: 'Food & Activities' },
      { category: 'savings', percentage: 15, name: 'Savings & Education' },
      { category: 'debt', percentage: 5, name: 'Debt' },
    ],
  },
  {
    id: '5',
    name: 'Minimalist',
    description: 'Live simply, save more: 35% needs, 15% wants, 50% savings',
    allocations: [
      { category: 'bills', percentage: 35, name: 'Essentials Only' },
      { category: 'expenses', percentage: 15, name: 'Minimal Wants' },
      { category: 'savings', percentage: 50, name: 'Maximum Savings' },
    ],
  },
  {
    id: '6',
    name: 'Zero-Based Budget',
    description: 'Every rupee has a job - allocate 100% of income',
    allocations: [
      { category: 'bills', percentage: 45, name: 'Fixed Expenses' },
      { category: 'expenses', percentage: 20, name: 'Variable Expenses' },
      { category: 'savings', percentage: 20, name: 'Savings Goals' },
      { category: 'debt', percentage: 15, name: 'Debt Reduction' },
    ],
  },
]

const categoryColors: Record<string, string> = {
  bills: 'bg-indigo-500',
  expenses: 'bg-blue-500',
  savings: 'bg-green-500',
  debt: 'bg-pink-500',
  income: 'bg-emerald-500',
}

export const BudgetTemplates: React.FC = () => {
  const navigate = useNavigate()
  const { showSuccess } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      // In production, this would update the budget store
      showSuccess(`Applied "${selectedTemplate.name}" template to your budget`)
      setIsModalOpen(false)
    }
  }

  const handleSelectTemplate = (template: BudgetTemplate) => {
    setSelectedTemplate(template)
    setIsModalOpen(true)
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Budget Templates</h1>
            <p className="text-gray-500">Choose a template that fits your financial goals</p>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className="hover:shadow-card-hover transition-shadow cursor-pointer"
            >
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary-100">
                    <FileText className="w-6 h-6 text-primary-600" />
                  </div>
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {template.description}
                </p>

                {/* Allocation Preview */}
                <div className="mb-4">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {template.allocations.map((allocation, index) => (
                      <div
                        key={index}
                        className={`${categoryColors[allocation.category]}`}
                        style={{ width: `${allocation.percentage}%` }}
                        title={`${allocation.name}: ${allocation.percentage}%`}
                      />
                    ))}
                  </div>
                </div>

                {/* Allocation Details */}
                <div className="space-y-2 mb-4">
                  {template.allocations.map((allocation, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${categoryColors[allocation.category]}`} />
                        <span className="text-gray-600">{allocation.name}</span>
                      </div>
                      <span className="font-medium text-gray-800">{allocation.percentage}%</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleSelectTemplate(template)}
                >
                  Use This Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Apply Template Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Apply Budget Template"
        >
          {selectedTemplate && (
            <div>
              <div className="p-4 bg-primary-50 rounded-xl mb-4">
                <h3 className="font-semibold text-primary-800 mb-1">
                  {selectedTemplate.name}
                </h3>
                <p className="text-sm text-primary-600">
                  {selectedTemplate.description}
                </p>
              </div>

              <p className="text-gray-600 mb-4">
                This will update your budget allocations based on your total income. 
                Your existing entries will be preserved.
              </p>

              <div className="space-y-2 mb-6">
                {selectedTemplate.allocations.map((allocation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors[allocation.category]}`} />
                      <span className="text-gray-700">{allocation.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{allocation.percentage}%</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplyTemplate} leftIcon={<Check className="w-4 h-4" />}>
                  Apply Template
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  )
}

