import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Lock, LogOut, Settings, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBudgetStore } from '../../store/budgetStore'
import { getMonthName, getCurrentMonthYear } from '../../lib/utils'

export const Header: React.FC = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { selectedMonth, selectedYear, setMonthYear } = useBudgetStore()
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()

  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear

  const goToPreviousMonth = () => {
    let newMonth = selectedMonth - 1
    let newYear = selectedYear
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    setMonthYear(newMonth, newYear)
  }

  const goToNextMonth = () => {
    let newMonth = selectedMonth + 1
    let newYear = selectedYear
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    setMonthYear(newMonth, newYear)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: App info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-xl">💰</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Personal Finance Planner</p>
            <p className="text-xs text-gray-400">Track your money wisely</p>
          </div>
        </div>

        {/* Center: Month navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center min-w-[160px]">
            <h2 className="text-xl font-semibold text-gray-800">
              {getMonthName(selectedMonth)} {selectedYear}
            </h2>
            {isCurrentMonth && (
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                <span>Current month only</span>
              </div>
            )}
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Right: User menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-800">
                {user?.display_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

