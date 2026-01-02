import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/useToast'
import type { Category } from '../../types'

interface FormData {
  name: string
  icon: string
  color: string
  parent_id: string
}

const initialFormData: FormData = {
  name: '',
  icon: '',
  color: '#6366F1',
  parent_id: '',
}

const COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#64748B', '#1E293B',
]

export const CategoryManager: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    categories, 
    loadCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    getParentCategories,
    getSubcategories 
  } = useHierarchicalCategoryStore()
  const { showSuccess, showError } = useToast()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      loadCategories(user.id)
    }
  }, [user?.id])

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleOpenModal = (category?: Category, parentId?: string) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        icon: category.icon,
        color: category.color,
        parent_id: category.parent_id || '',
      })
    } else {
      setEditingCategory(null)
      setFormData({
        ...initialFormData,
        parent_id: parentId || '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData(initialFormData)
  }

  const handleSave = async () => {
    if (!user || !formData.name.trim()) return

    const categoryData = {
      user_id: user.id,
      name: formData.name.trim(),
      icon: formData.icon.trim() || '📁',
      color: formData.color,
      parent_id: formData.parent_id || null,
      sort_order: editingCategory?.sort_order || categories.length,
    }

    if (editingCategory) {
      const success = await updateCategory(editingCategory.id, categoryData)
      if (success) showSuccess('Category updated')
      else showError('Failed to update category')
    } else {
      const result = await addCategory(categoryData)
      if (result) showSuccess('Category created')
      else showError('Failed to create category')
    }
    handleCloseModal()
  }

  const handleDelete = async (id: string) => {
    const subcats = getSubcategories(id)
    if (subcats.length > 0) {
      showError('Delete subcategories first')
      return
    }

    if (confirm('Are you sure you want to delete this category?')) {
      const success = await deleteCategory(id)
      if (success) showSuccess('Category deleted')
      else showError('Failed to delete category')
    }
  }

  const parentCategories = getParentCategories()

  const renderCategory = (category: Category, level: number = 0) => {
    const subcategories = getSubcategories(category.id)
    const hasSubcategories = subcategories.length > 0
    const isExpanded = expandedCategories.has(category.id)

    return (
      <div key={category.id}>
        <div 
          className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors ${
            level > 0 ? 'ml-8 border-l-2 border-gray-100' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            {hasSubcategories ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: category.color + '20' }}
            >
              {category.icon}
            </div>
            <div>
              <p className="font-medium text-gray-800">{category.name}</p>
              {hasSubcategories && (
                <p className="text-xs text-gray-400">{subcategories.length} subcategories</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {level === 0 && (
              <button
                onClick={() => handleOpenModal(undefined, category.id)}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                title="Add subcategory"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleOpenModal(category)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && subcategories.map((sub) => renderCategory(sub, level + 1))}
      </div>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
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
              <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
              <p className="text-sm text-gray-500">Organize your transactions with custom categories</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Add Category
          </Button>
        </div>

        {/* Categories List */}
        <Card>
          <CardContent className="p-0">
            {parentCategories.length === 0 ? (
              <div className="py-12 text-center">
                <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No categories yet</p>
                <Button onClick={() => handleOpenModal()} className="mt-4">
                  Create Your First Category
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {parentCategories.map((category) => renderCategory(category))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingCategory ? 'Edit Category' : formData.parent_id ? 'Add Subcategory' : 'Add Category'}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Food & Dining"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-2xl"
                placeholder="📁"
                maxLength={2}
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter an emoji (leave empty for default)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg transition-transform ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  placeholder="#6366F1"
                />
              </div>
            </div>

            {!editingCategory && !formData.parent_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None (top-level category)</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="flex-1"
              >
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}


