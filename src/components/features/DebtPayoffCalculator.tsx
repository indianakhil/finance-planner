import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, TrendingDown, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { formatCurrency, formatFullCurrency, generateId } from '../../lib/utils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

interface DebtAccount {
  id: string
  user_id: string
  name: string
  principal: number
  current_balance: number
  interest_rate: number
  monthly_payment: number
  start_date: string | null
}

type Strategy = 'avalanche' | 'snowball'

export const DebtPayoffCalculator: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [debts, setDebts] = useState<DebtAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [extraPayment, setExtraPayment] = useState(5000)
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newDebt, setNewDebt] = useState<Partial<DebtAccount>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Load debts from Supabase
  useEffect(() => {
    const loadDebts = async () => {
      if (!user) return
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        setDebts([])
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('debt_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('current_balance', { ascending: false })

        if (error) throw error
        setDebts(data || [])
      } catch (error) {
        console.error('Error loading debts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDebts()
  }, [user?.id])

  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0)

  // Calculate payoff timeline
  const payoffData = useMemo(() => {
    if (debts.length === 0) {
      return { data: [], months: 0 }
    }

    const sortedDebts = [...debts].sort((a, b) => 
      strategy === 'avalanche' 
        ? b.interest_rate - a.interest_rate 
        : a.current_balance - b.current_balance
    )

    const data: Array<{ month: string; balance: number }> = []
    let currentDebts = sortedDebts.map(d => ({ ...d }))
    let month = 0
    const maxMonths = 120 // 10 years max

    while (currentDebts.some(d => d.current_balance > 0) && month < maxMonths) {
      const totalBalance = currentDebts.reduce((sum, d) => sum + Math.max(0, d.current_balance), 0)
      
      if (month % 3 === 0) { // Record every 3 months for chart
        data.push({
          month: `M${month}`,
          balance: totalBalance,
        })
      }

      // Apply payments
      let availableExtra = extraPayment
      currentDebts = currentDebts.map((debt, index) => {
        if (debt.current_balance <= 0) return debt

        // Add monthly interest
        const monthlyInterest = (debt.current_balance * debt.interest_rate / 100) / 12
        let newBalance = debt.current_balance + monthlyInterest

        // Apply minimum payment
        newBalance -= debt.monthly_payment

        // Apply extra payment to highest priority debt
        if (index === currentDebts.findIndex(d => d.current_balance > 0) && availableExtra > 0) {
          newBalance -= availableExtra
          availableExtra = 0
        }

        return { ...debt, current_balance: Math.max(0, newBalance) }
      })

      month++
    }

    // Add final point
    if (data.length > 0) {
      data.push({ month: `M${month}`, balance: 0 })
    }

    return { data, months: month }
  }, [debts, extraPayment, strategy])

  const handleAddDebt = async () => {
    if (!newDebt.name || !newDebt.current_balance || !user) return
    setIsSaving(true)

    try {
      const debtAccount: DebtAccount = {
        id: generateId(),
        user_id: user.id,
        name: newDebt.name,
        principal: newDebt.current_balance,
        current_balance: newDebt.current_balance,
        interest_rate: newDebt.interest_rate || 10,
        monthly_payment: newDebt.monthly_payment || 1000,
        start_date: new Date().toISOString().split('T')[0],
      }

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('debt_accounts')
          .insert(debtAccount)
          .select()
          .single()

        if (error) throw error
        setDebts([...debts, data])
      } else {
        setDebts([...debts, debtAccount])
      }

      setNewDebt({})
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error adding debt:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDebt = async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('debt_accounts')
          .delete()
          .eq('id', id)

        if (error) throw error
      }
      setDebts(debts.filter(d => d.id !== id))
    } catch (error) {
      console.error('Error deleting debt:', error)
    }
  }

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Debt Payoff Calculator</h1>
          </div>
          <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Debt
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Debts List */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Debts</h3>
                {debts.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No debts tracked yet</p>
                    <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                      Add Your First Debt
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {debts.map((debt) => (
                      <div
                        key={debt.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{debt.name}</p>
                          <p className="text-sm text-gray-500">
                            {debt.interest_rate}% APR • Min: {formatFullCurrency(debt.monthly_payment)}/mo
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-bold text-gray-800">
                            {formatFullCurrency(debt.current_balance)}
                          </span>
                          <button
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payoff Chart */}
            {debts.length > 0 && (
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Payoff Timeline</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={payoffData.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip
                        formatter={(value: number) => formatFullCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#EC4899"
                        strokeWidth={2}
                        dot={false}
                        name="Remaining Debt"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-pink-100">
                    <TrendingDown className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Debt</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatFullCurrency(totalDebt)}
                    </p>
                  </div>
                </div>
                {debts.length > 0 && (
                  <div className="p-4 rounded-xl bg-green-50 mb-4">
                    <p className="text-sm text-green-600 mb-1">Debt-Free In</p>
                    <p className="text-3xl font-bold text-green-700">
                      {Math.floor(payoffData.months / 12)} years {payoffData.months % 12} months
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strategy Selection */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-800 mb-4">Payoff Strategy</h3>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    strategy === 'avalanche' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'avalanche'}
                      onChange={() => setStrategy('avalanche')}
                      className="hidden"
                    />
                    <div>
                      <p className="font-medium text-gray-800">Avalanche Method</p>
                      <p className="text-sm text-gray-500">Pay highest interest first</p>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    strategy === 'snowball' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'snowball'}
                      onChange={() => setStrategy('snowball')}
                      className="hidden"
                    />
                    <div>
                      <p className="font-medium text-gray-800">Snowball Method</p>
                      <p className="text-sm text-gray-500">Pay smallest balance first</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Extra Payment */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-800 mb-4">Extra Monthly Payment</h3>
                <Input
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value))}
                  leftIcon={<span className="text-gray-500">₹</span>}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Extra amount above minimum payments
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Debt Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add New Debt"
        >
          <div className="space-y-4">
            <Input
              label="Debt Name"
              value={newDebt.name || ''}
              onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
              placeholder="e.g., Credit Card"
            />
            <Input
              label="Current Balance"
              type="number"
              value={newDebt.current_balance || ''}
              onChange={(e) => setNewDebt({ ...newDebt, current_balance: Number(e.target.value) })}
              placeholder="0"
            />
            <Input
              label="Interest Rate (%)"
              type="number"
              value={newDebt.interest_rate || ''}
              onChange={(e) => setNewDebt({ ...newDebt, interest_rate: Number(e.target.value) })}
              placeholder="10"
            />
            <Input
              label="Minimum Monthly Payment"
              type="number"
              value={newDebt.monthly_payment || ''}
              onChange={(e) => setNewDebt({ ...newDebt, monthly_payment: Number(e.target.value) })}
              placeholder="1000"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDebt} isLoading={isSaving}>
                Add Debt
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
