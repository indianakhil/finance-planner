import { Category } from '../types'

export const formatCurrency = (amount: number, currency = '₹'): string => {
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  
  if (absAmount >= 100000) {
    // Lakhs (1L = 100,000)
    const lakhs = absAmount / 100000
    const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}${currency}${formatted}L`
  } else if (absAmount >= 1000) {
    // Thousands (1K = 1,000)
    const thousands = absAmount / 1000
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}${currency}${formatted}K`
  }
  
  // Below 1000, show full number with up to 2 decimal places
  const formatted = absAmount % 1 === 0 ? absAmount.toFixed(0) : absAmount.toFixed(2).replace(/\.?0+$/, '')
  return `${sign}${currency}${formatted}`
}

export const formatFullCurrency = (amount: number, currency = '₹'): string => {
  return `${currency}${amount.toLocaleString('en-IN')}`
}

export const calculatePercentage = (actual: number, planned: number): number => {
  if (planned === 0) return 0
  return Math.round((actual / planned) * 100)
}

export const getPercentageClass = (percentage: number): string => {
  if (percentage >= 100) return 'percentage-success'
  if (percentage >= 75) return 'percentage-warning'
  return 'percentage-danger'
}

export const getCategoryColor = (category: Category): string => {
  const colors: Record<Category, string> = {
    income: '#22C55E',
    expenses: '#3B82F6',
    bills: '#6366F1',
    savings: '#10B981',
    debt: '#EC4899',
  }
  return colors[category]
}

export const getCategoryGradient = (category: Category): string => {
  const gradients: Record<Category, string> = {
    income: 'bg-income',
    expenses: 'bg-expenses',
    bills: 'bg-bills',
    savings: 'bg-savings',
    debt: 'bg-debt',
  }
  return gradients[category]
}

export const getCategoryLabel = (category: Category): string => {
  const labels: Record<Category, string> = {
    income: 'Income',
    expenses: 'Expenses',
    bills: 'Bills',
    savings: 'Savings',
    debt: 'Debt',
  }
  return labels[category]
}

export const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || ''
}

export const getCurrentMonthYear = (): { month: number; year: number } => {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export const generateId = (): string => {
  // Generate a proper UUID v4 for Supabase compatibility
  return crypto.randomUUID()
}

export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const downloadCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

