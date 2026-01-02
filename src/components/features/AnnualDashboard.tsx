import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { formatCurrency, formatFullCurrency } from '../../lib/utils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

interface MonthlyData {
  month: string
  monthNum: number
  income: number
  expenses: number
  bills: number
  savings: number
  debt: number
  net: number
}

export const AnnualDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load annual data from Supabase
  useEffect(() => {
    const loadAnnualData = async () => {
      if (!user) return
      setIsLoading(true)

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      if (!isSupabaseConfigured()) {
        // Demo mode - empty data
        setData(months.map((month, i) => ({
          month,
          monthNum: i + 1,
          income: 0,
          expenses: 0,
          bills: 0,
          savings: 0,
          debt: 0,
          net: 0,
        })))
        setIsLoading(false)
        return
      }

      try {
        // Get all budgets for the selected year
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select('id, month')
          .eq('user_id', user.id)
          .eq('year', year)

        if (budgetsError) throw budgetsError

        // If no budgets, return empty data
        if (!budgets || budgets.length === 0) {
          setData(months.map((month, i) => ({
            month,
            monthNum: i + 1,
            income: 0,
            expenses: 0,
            bills: 0,
            savings: 0,
            debt: 0,
            net: 0,
          })))
          setIsLoading(false)
          return
        }

        // Get all entries for these budgets
        const budgetIds = budgets.map(b => b.id)
        const { data: entries, error: entriesError } = await supabase
          .from('entries')
          .select('budget_id, category, actual')
          .in('budget_id', budgetIds)

        if (entriesError) throw entriesError

        // Create a map of budget_id to month
        const budgetMonthMap = new Map(budgets.map(b => [b.id, b.month]))

        // Aggregate entries by month and category
        const monthlyTotals = new Map<number, { income: number; expenses: number; bills: number; savings: number; debt: number }>()

        // Initialize all months
        for (let i = 1; i <= 12; i++) {
          monthlyTotals.set(i, { income: 0, expenses: 0, bills: 0, savings: 0, debt: 0 })
        }

        // Sum up entries
        entries?.forEach(entry => {
          const month = budgetMonthMap.get(entry.budget_id)
          if (month) {
            const totals = monthlyTotals.get(month)!
            const amount = Number(entry.actual) || 0
            switch (entry.category) {
              case 'income':
                totals.income += amount
                break
              case 'expenses':
                totals.expenses += amount
                break
              case 'bills':
                totals.bills += amount
                break
              case 'savings':
                totals.savings += amount
                break
              case 'debt':
                totals.debt += amount
                break
            }
          }
        })

        // Transform to chart data
        const chartData = months.map((month, i) => {
          const monthNum = i + 1
          const totals = monthlyTotals.get(monthNum)!
          const net = totals.income - totals.expenses - totals.bills - totals.savings - totals.debt
          return {
            month,
            monthNum,
            ...totals,
            net,
          }
        })

        setData(chartData)
      } catch (error) {
        console.error('Error loading annual data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnnualData()
  }, [user?.id, year])

  const totalIncome = data.reduce((sum, m) => sum + m.income, 0)
  const totalExpenses = data.reduce((sum, m) => sum + m.expenses, 0)
  const totalSavings = data.reduce((sum, m) => sum + m.savings, 0)
  const totalNet = data.reduce((sum, m) => sum + m.net, 0)
  const hasData = data.some(m => m.income > 0 || m.expenses > 0)

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Annual Dashboard</h1>
          </div>

          {/* Year Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setYear(y => y - 1)}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-xl font-semibold text-gray-800 min-w-[80px] text-center">
              {year}
            </span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatFullCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-blue-600">{formatFullCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Total Savings</p>
              <p className="text-2xl font-bold text-emerald-600">{formatFullCurrency(totalSavings)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Net Balance</p>
              <p className={`text-2xl font-bold ${totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatFullCurrency(totalNet)}
              </p>
            </CardContent>
          </Card>
        </div>

        {!hasData ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">No data for {year}</h3>
                <p className="text-gray-500 mb-4">Start adding budget entries in the main dashboard to see your annual overview</p>
                <button
                  onClick={() => navigate('/')}
                  className="text-primary-500 hover:underline"
                >
                  Go to Dashboard
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses */}
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Income vs Expenses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="income" fill="#22C55E" name="Income" />
                      <Bar dataKey="expenses" fill="#3B82F6" name="Expenses" />
                      <Bar dataKey="bills" fill="#6366F1" name="Bills" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Net Balance Trend */}
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Net Balance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#4F7CFF"
                        strokeWidth={2}
                        dot={{ fill: '#4F7CFF' }}
                        name="Net Balance"
                      />
                      <Line
                        type="monotone"
                        dataKey="savings"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981' }}
                        name="Savings"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown Table */}
            <Card className="mt-6">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Month</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Income</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Expenses</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Bills</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Savings</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{row.month}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(row.income)}</td>
                          <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(row.expenses)}</td>
                          <td className="py-3 px-4 text-right text-indigo-600">{formatCurrency(row.bills)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(row.savings)}</td>
                          <td className={`py-3 px-4 text-right font-medium ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(row.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  )
}
