import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Settings, User, Banknote } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBudgetStore } from '../../store/budgetStore'
import { getMonthName } from '../../lib/utils'

export const Header: React.FC = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { selectedMonth, selectedYear, setMonthYear } = useBudgetStore()

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
    <header className="bg-white border-b border-gray-100 px-3 md:px-6 py-3 md:py-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        {/* Left: App info */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center border border-sky-200/50">
            <Banknote className="w-4 h-4 md:w-5 md:h-5 text-sky-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">Finance Planner</p>
          </div>
        </div>

        {/* Center: Month navigation */}
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-center md:justify-center">
          <button
            onClick={goToPreviousMonth}
            className="p-2 md:p-2 rounded-lg active:bg-gray-100 hover:bg-gray-100 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center min-w-[140px] md:min-w-[160px]">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              {getMonthName(selectedMonth)} {selectedYear}
            </h2>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 md:p-2 rounded-lg active:bg-gray-100 hover:bg-gray-100 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Right: User menu */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-auto md:ml-0">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg active:bg-gray-100 hover:bg-gray-100 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-800">
                {user?.display_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg active:bg-red-50 hover:bg-red-50 text-gray-600 active:text-red-600 hover:text-red-600 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

