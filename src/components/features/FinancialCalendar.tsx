import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Bell, DollarSign, Loader2, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { formatCurrency } from '../../lib/utils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { RecurringBill } from '../../types'

export const FinancialCalendar: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load bills from Supabase (reuse the recurring_bills table)
  useEffect(() => {
    const loadBills = async () => {
      if (!user) return
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        setBills([])
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('recurring_bills')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('due_day', { ascending: true })

        if (error) throw error
        setBills(data || [])
      } catch (error) {
        console.error('Error loading bills:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBills()
  }, [user?.id])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getBillsForDay = (day: number) => {
    return bills.filter(bill => bill.due_day === day)
  }

  // Calculate total due based on frequency
  const totalDue = bills.reduce((sum, bill) => {
    if (bill.frequency === 'monthly') return sum + bill.amount
    if (bill.frequency === 'weekly') return sum + bill.amount * 4
    if (bill.frequency === 'biweekly') return sum + bill.amount * 2
    if (bill.frequency === 'quarterly') return sum + bill.amount / 3
    if (bill.frequency === 'yearly') return sum + bill.amount / 12
    return sum
  }, 0)

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Financial Calendar</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <button
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24" />
                  ))}

                  {days.map(day => {
                    const dayOfMonth = day.getDate()
                    const dayBills = getBillsForDay(dayOfMonth)
                    const hasBills = dayBills.length > 0

                    return (
                      <div
                        key={day.toISOString()}
                        className={`h-24 p-2 rounded-lg border ${
                          isToday(day)
                            ? 'border-primary-500 bg-primary-50'
                            : hasBills
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          isToday(day) ? 'text-primary-600' : 'text-gray-700'
                        }`}>
                          {dayOfMonth}
                        </div>
                        {dayBills.slice(0, 2).map(bill => (
                          <div
                            key={bill.id}
                            className="mt-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 truncate"
                          >
                            {bill.name}
                          </div>
                        ))}
                        {dayBills.length > 2 && (
                          <div className="mt-1 text-xs text-gray-500">
                            +{dayBills.length - 2} more
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Monthly Summary */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-800 mb-4">Monthly Bills Summary</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-amber-100">
                    <DollarSign className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Due This Month</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(totalDue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Bills */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-800 mb-4">Upcoming Bills</h3>
                {bills.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No bills tracked yet</p>
                    <button
                      onClick={() => navigate('/recurring-bills')}
                      className="mt-2 text-primary-500 text-sm hover:underline"
                    >
                      Add bills in Bills Tracker
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bills.map(bill => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <Bell className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{bill.name}</p>
                            <p className="text-xs text-gray-500">Due: {bill.due_day}th • {bill.frequency}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(bill.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
