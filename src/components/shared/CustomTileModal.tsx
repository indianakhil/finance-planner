import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useCustomTileStore } from '../../store/customTileStore'
import { useHierarchicalCategoryStore } from '../../store/hierarchicalCategoryStore'
import { useAuthStore } from '../../store/authStore'
import type { CustomDashboardTile, TransactionType } from '../../types'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'

// Default tile labels that can be hidden
const DEFAULT_TILE_LABELS = ['Income', 'Expenses', 'Balance', 'Budget Left', 'Transfers']

interface CustomTileModalProps {
  isOpen: boolean
  onClose: () => void
  editingTile?: CustomDashboardTile | null
}

const TILE_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
]


export const CustomTileModal: React.FC<CustomTileModalProps> = ({
  isOpen,
  onClose,
  editingTile,
}) => {
  const { user, updateSettings } = useAuthStore()
  const { addTile, updateTile, deleteTile } = useCustomTileStore()
  const { getParentCategories, getSubcategories } = useHierarchicalCategoryStore()

  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366F1')
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>(['expense'])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editingTile) {
        setName(editingTile.name)
        setColor(editingTile.color)
        setTransactionTypes(editingTile.transaction_types)
        setSelectedCategoryIds(editingTile.category_ids)
        // Expand categories that have selected subcategories
        const parentCategories = getParentCategories()
        const toExpand = new Set<string>()
        editingTile.category_ids.forEach((catId) => {
          const parent = parentCategories.find((p) => {
            const subs = getSubcategories(p.id)
            return subs.some((s) => s.id === catId)
          })
          if (parent) toExpand.add(parent.id)
        })
        setExpandedCategories(toExpand)
      } else {
        setName('')
        setColor('#6366F1')
        setTransactionTypes(['expense'])
        setSelectedCategoryIds([])
        setExpandedCategories(new Set())
      }
    }
  }, [isOpen, editingTile])

  const toggleCategoryExpansion = (categoryId: string) => {
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

  const handleToggleType = (type: TransactionType) => {
    setTransactionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSelectAllSubcategories = (parentId: string) => {
    const subcategories = getSubcategories(parentId)
    const subcategoryIds = subcategories.map((sub) => sub.id)
    const allSelected = subcategoryIds.every((id) => selectedCategoryIds.includes(id))
    
    setSelectedCategoryIds((prev) => {
      if (allSelected) {
        // Deselect all subcategories and parent
        return prev.filter((id) => !subcategoryIds.includes(id) && id !== parentId)
      } else {
        // Select all subcategories
        const newIds = [...prev]
        subcategoryIds.forEach((id) => {
          if (!newIds.includes(id)) newIds.push(id)
        })
        return newIds
      }
    })
  }

  // Check if we're editing an existing custom tile (not a default tile)
  const isEditingCustomTile = editingTile && !editingTile.id.startsWith('default-')
  // Check if we're editing a default tile (can be hidden)
  const isEditingDefaultTile = editingTile && editingTile.id.startsWith('default-')

  const handleSave = async () => {
    if (!user || !name.trim() || transactionTypes.length === 0) {
      return
    }

    setIsSaving(true)
    try {
      const tileData = {
        user_id: user.id,
        name: name.trim(),
        icon: '📊', // Default icon
        color,
        transaction_types: transactionTypes,
        category_ids: selectedCategoryIds,
        is_active: true,
        sort_order: editingTile?.sort_order || 0,
      }

      // If editingTile exists and is not a default tile (doesn't start with "default-"), update it
      // Otherwise, create a new tile
      if (isEditingCustomTile) {
        await updateTile(editingTile.id, tileData)
      } else {
        await addTile(tileData)
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingTile) return
    
    // Handle default tile deletion (hide it)
    if (isEditingDefaultTile) {
      const tileLabel = editingTile.name
      if (DEFAULT_TILE_LABELS.includes(tileLabel)) {
        if (confirm(`Hide "${tileLabel}" tile? You can show it again later in Settings.`)) {
          const hiddenTiles = user?.settings?.hidden_default_tiles || []
          if (!hiddenTiles.includes(tileLabel)) {
            await updateSettings({
              hidden_default_tiles: [...hiddenTiles, tileLabel]
            })
          }
          onClose()
        }
      }
      return
    }
    
    // Handle custom tile deletion
    if (isEditingCustomTile) {
      if (confirm(`Delete "${editingTile.name}" tile?`)) {
        await deleteTile(editingTile.id)
        onClose()
      }
    }
  }

  const parentCategories = getParentCategories()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditingCustomTile ? 'Edit Custom Tile' : 'Create Custom Tile'}
      size="xl"
    >
      <div className="flex flex-col h-full md:h-auto md:max-h-[calc(85vh-120px)]">
        {/* Top Section - Compact Basic Info */}
        <div className="space-y-3 pb-3 border-b border-gray-200 flex-shrink-0">
          {/* Name */}
          <Input
            label="Tile Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Online Delivery Tracker"
          />

          {/* Color and Types in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Color - Compact */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {TILE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 md:w-7 md:h-7 rounded border-2 transition-all touch-manipulation ${
                      color === c.value ? 'border-gray-800 scale-110 ring-2 ring-gray-300' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Transaction Types - Compact */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Types</label>
              <div className="flex gap-1.5">
                {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleToggleType(type)}
                    className={`flex-1 px-2.5 py-2 text-xs rounded-lg border-2 font-medium transition-all touch-manipulation min-h-[36px] ${
                      transactionTypes.includes(type)
                        ? type === 'income'
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : type === 'expense'
                          ? 'bg-red-50 border-red-500 text-red-700'
                          : 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 active:border-gray-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Categories (Maximized Scrollable) */}
        <div className="flex-1 overflow-y-auto py-3 min-h-0">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Select Categories / Subcategories <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Leave empty to track all transactions of selected types
          </p>
          
          <div className="space-y-1.5">
            {parentCategories.map((parent) => {
              const subcategories = getSubcategories(parent.id)
              const isExpanded = expandedCategories.has(parent.id)
              const parentSelected = selectedCategoryIds.includes(parent.id)
              const subcategoryIds = subcategories.map((s) => s.id)
              const selectedSubs = subcategoryIds.filter((id) => selectedCategoryIds.includes(id))
              const allSubsSelected = subcategories.length > 0 && selectedSubs.length === subcategories.length

              return (
                <div key={parent.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Parent Category Header - Compact */}
                  <div 
                    className="flex items-center gap-2.5 p-2.5 bg-gray-50 active:bg-gray-100 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation min-h-[44px]"
                    onClick={(e) => {
                      // Don't toggle if clicking on checkbox
                      if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        if (subcategories.length > 0) {
                          toggleCategoryExpansion(parent.id)
                        }
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={parentSelected || allSubsSelected}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleToggleCategory(parent.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0 touch-manipulation"
                    />
                    <span className="text-lg">{parent.icon}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{parent.name}</span>
                    
                    {subcategories.length > 0 && (
                      <>
                        {selectedSubs.length > 0 && (
                          <span className="text-xs text-gray-500 flex-shrink-0 px-1.5 py-0.5 bg-gray-200 rounded">
                            {selectedSubs.length}/{subcategories.length}
                          </span>
                        )}
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subcategories - Compact */}
                  {isExpanded && subcategories.length > 0 && (
                    <div className="bg-white border-t border-gray-200">
                      {subcategories.length > 1 && (
                        <div className="px-2.5 py-1.5 border-b border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleSelectAllSubcategories(parent.id)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors touch-manipulation min-h-[36px] ${
                              allSubsSelected
                                ? 'bg-primary-100 text-primary-700 active:bg-primary-200'
                                : 'text-gray-600 active:bg-gray-50 hover:bg-gray-50'
                            }`}
                          >
                            {allSubsSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      )}
                      <div className="p-2 space-y-1">
                        {subcategories.map((sub) => (
                          <label
                            key={sub.id}
                            className="flex items-center gap-2.5 p-2 rounded-lg active:bg-gray-50 hover:bg-gray-50 cursor-pointer transition-colors touch-manipulation min-h-[44px]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(sub.id)}
                              onChange={() => handleToggleCategory(sub.id)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0 touch-manipulation"
                            />
                            <span className="text-base">{sub.icon}</span>
                            <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {parentCategories.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No categories available</p>
              <p className="text-xs mt-1">Create categories in Settings first</p>
            </div>
          )}
        </div>

        {/* Bottom Section - Actions */}
        <div className="pt-3 border-t border-gray-200 flex gap-2 flex-shrink-0 mt-auto">
          {/* Delete button - Show when editing an existing tile (custom or default) */}
          {(isEditingCustomTile || isEditingDefaultTile) && (
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex-shrink-0 min-w-[80px]"
              title={isEditingDefaultTile ? "Hide this tile" : "Delete this tile"}
            >
              <Trash2 className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{isEditingDefaultTile ? 'Hide' : 'Delete'}</span>
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || transactionTypes.length === 0}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : editingTile ? 'Save Changes' : 'Create Tile'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
