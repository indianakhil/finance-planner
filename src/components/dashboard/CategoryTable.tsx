import React, { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { useToast } from '../../hooks/useToast'
import { calculatePercentage, getCategoryGradient, getCategoryLabel, formatCurrency } from '../../lib/utils'
import type { LegacyCategory, Entry } from '../../types'

interface CategoryTableProps {
  category: LegacyCategory
}

export const CategoryTable: React.FC<CategoryTableProps> = ({ category }) => {
  const { 
    getEntriesByCategory, 
    getCategorySummary, 
    currentBudget,
    addEntry,
    updateEntry,
    deleteEntry,
    restoreEntry
  } = useBudgetStore()
  const { showUndo } = useToast()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Entry>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newEntry, setNewEntry] = useState({ name: '', planned: 0, actual: 0 })

  const entries = getEntriesByCategory(category)
  const summary = getCategorySummary(category)

  const handleStartEdit = (entry: Entry) => {
    setEditingId(entry.id)
    setEditValues({ name: entry.name, planned: entry.planned, actual: entry.actual })
  }

  const handleSaveEdit = async () => {
    if (editingId && editValues) {
      await updateEntry(editingId, editValues)
      setEditingId(null)
      setEditValues({})
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const handleDelete = async (entry: Entry) => {
    await deleteEntry(entry.id)
    
    showUndo(
      `Row "${entry.name}" deleted`,
      async () => {
        await restoreEntry(entry)
      }
    )
  }

  const handleAddEntry = async () => {
    if (!currentBudget || !newEntry.name.trim()) return

    await addEntry({
      budget_id: currentBudget.id,
      category,
      name: newEntry.name,
      planned: newEntry.planned,
      actual: newEntry.actual,
      is_locked: false,
    })

    setNewEntry({ name: '', planned: 0, actual: 0 })
    setIsAdding(false)
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-emerald-600'
    if (percentage >= 75) return 'text-amber-600'
    return 'text-rose-600'
  }


  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className={`${getCategoryGradient(category)} px-3 py-2.5 flex items-center justify-between`}>
        <button className="p-1 text-white/70 hover:text-white transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <span className="text-white font-bold uppercase tracking-wide text-sm">
          {getCategoryLabel(category)}
        </span>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-1 text-white/70 hover:text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[11px] text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50/50">
              <th className="text-left py-1 px-2 font-semibold w-2/5">Name</th>
              <th className="text-right py-1 px-2 font-semibold">Planned</th>
              <th className="text-right py-1 px-2 font-semibold">Actual</th>
              <th className="text-right py-1 px-2 font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr 
                key={entry.id} 
                className="group hover:bg-slate-50 transition-colors border-b border-slate-50"
              >
                {editingId === entry.id ? (
                  // Editing mode
                  <>
                    <td className="py-1.5 px-1">
                      <input
                        type="text"
                        value={editValues.name || ''}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-400"
                        autoFocus
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={editValues.planned || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            setEditValues({ ...editValues, planned: Number(val) || 0 })
                          }}
                          placeholder="0"
                          className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded text-xs text-right focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-1">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={editValues.actual || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            setEditValues({ ...editValues, actual: Number(val) || 0 })
                          }}
                          placeholder="0"
                          className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded text-xs text-right focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-1">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="py-1.5 px-2 text-slate-700 cursor-pointer" onClick={() => handleStartEdit(entry)}>
                      {entry.name}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-600 cursor-pointer" onClick={() => handleStartEdit(entry)}>
                      {formatCurrency(entry.planned)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-600 cursor-pointer" onClick={() => handleStartEdit(entry)}>
                      {formatCurrency(entry.actual)}
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium ${getPercentageColor(calculatePercentage(entry.actual, entry.planned))}`}>
                          {calculatePercentage(entry.actual, entry.planned)}%
                        </span>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-0.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Add new entry row */}
            {isAdding && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 px-1">
                  <input
                    type="text"
                    value={newEntry.name}
                    onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                    placeholder="Entry name"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:border-blue-400"
                    autoFocus
                  />
                </td>
                <td className="py-1.5 px-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newEntry.planned || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        setNewEntry({ ...newEntry, planned: Number(val) })
                      }}
                      placeholder="0"
                      className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded text-xs text-right bg-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </td>
                <td className="py-1.5 px-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newEntry.actual || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        setNewEntry({ ...newEntry, actual: Number(val) })
                      }}
                      placeholder="0"
                      className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded text-xs text-right bg-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </td>
                <td className="py-1.5 px-1">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={handleAddEntry} className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setIsAdding(false); setNewEntry({ name: '', planned: 0, actual: 0 }) }}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Total row */}
            <tr>
              <td className="py-1.5 px-2 font-bold text-slate-700 uppercase text-[11px] tracking-wide">Total</td>
              <td className="py-1.5 px-2 text-right font-bold text-slate-800">{formatCurrency(summary.planned)}</td>
              <td className="py-1.5 px-2 text-right font-bold text-slate-800">{formatCurrency(summary.actual)}</td>
              <td className="py-1.5 px-2 text-right font-bold text-slate-800">{summary.percentage.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

