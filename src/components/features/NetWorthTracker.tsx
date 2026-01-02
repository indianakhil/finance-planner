import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Layout } from '../layout/Layout'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { formatCurrency, formatFullCurrency, generateId } from '../../lib/utils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

interface NetWorthRecord {
  id: string
  user_id: string
  record_date: string
  assets: number
  liabilities: number
}

export const NetWorthTracker: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [records, setRecords] = useState<NetWorthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRecord, setNewRecord] = useState({ assets: 0, liabilities: 0 })
  const [isSaving, setIsSaving] = useState(false)

  // Load records from Supabase
  useEffect(() => {
    const loadRecords = async () => {
      if (!user) return
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        setRecords([])
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('net_worth_records')
          .select('*')
          .eq('user_id', user.id)
          .order('record_date', { ascending: true })

        if (error) throw error
        setRecords(data || [])
      } catch (error) {
        console.error('Error loading net worth records:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecords()
  }, [user?.id])

  // Transform records for chart
  const chartData = records.map(r => {
    const date = new Date(r.record_date)
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      assets: r.assets,
      liabilities: r.liabilities,
      netWorth: r.assets - r.liabilities,
    }
  })

  const latestRecord = records[records.length - 1]
  const previousRecord = records[records.length - 2]

  const latestAssets = latestRecord?.assets || 0
  const latestLiabilities = latestRecord?.liabilities || 0
  const latestNetWorth = latestAssets - latestLiabilities

  const previousNetWorth = previousRecord ? previousRecord.assets - previousRecord.liabilities : 0
  const monthlyChange = previousRecord ? latestNetWorth - previousNetWorth : 0
  const percentChange = previousNetWorth !== 0 ? ((monthlyChange / previousNetWorth) * 100).toFixed(1) : '0'

  const handleAddRecord = async () => {
    if (!user || newRecord.assets === 0) return
    setIsSaving(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const record: NetWorthRecord = {
        id: generateId(),
        user_id: user.id,
        record_date: today,
        assets: newRecord.assets,
        liabilities: newRecord.liabilities,
      }

      if (isSupabaseConfigured()) {
        // Check if record exists for today (upsert)
        const { data: existing } = await supabase
          .from('net_worth_records')
          .select('id')
          .eq('user_id', user.id)
          .eq('record_date', today)
          .single()

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('net_worth_records')
            .update({ assets: newRecord.assets, liabilities: newRecord.liabilities })
            .eq('id', existing.id)

          if (error) throw error
          setRecords(records.map(r => r.id === existing.id ? { ...r, assets: newRecord.assets, liabilities: newRecord.liabilities } : r))
        } else {
          // Insert new record
          const { data, error } = await supabase
            .from('net_worth_records')
            .insert(record)
            .select()
            .single()

          if (error) throw error
          setRecords([...records, data])
        }
      } else {
        setRecords([...records, record])
      }

      setIsModalOpen(false)
      setNewRecord({ assets: 0, liabilities: 0 })
    } catch (error) {
      console.error('Error saving net worth record:', error)
    } finally {
      setIsSaving(false)
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
            <h1 className="text-2xl font-bold text-gray-800">Net Worth Tracker</h1>
          </div>
          <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Record
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-100">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-xl font-bold text-gray-800">
                    {formatFullCurrency(latestAssets)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-100">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Liabilities</p>
                  <p className="text-xl font-bold text-gray-800">
                    {formatFullCurrency(latestLiabilities)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Worth</p>
                  <p className="text-xl font-bold text-primary-600">
                    {formatFullCurrency(latestNetWorth)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${monthlyChange >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {monthlyChange >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monthly Change</p>
                  <p className={`text-xl font-bold ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyChange >= 0 ? '+' : ''}{formatFullCurrency(monthlyChange)}
                    {previousRecord && <span className="text-sm ml-1">({percentChange}%)</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart or Empty State */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Net Worth Over Time</h3>
            {records.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">No records yet</h3>
                <p className="text-gray-500 mb-4">Start tracking your net worth by adding your first record</p>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Add First Record
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
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
                    dataKey="assets"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ fill: '#22C55E' }}
                    name="Assets"
                  />
                  <Line
                    type="monotone"
                    dataKey="liabilities"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444' }}
                    name="Liabilities"
                  />
                  <Line
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#4F7CFF"
                    strokeWidth={3}
                    dot={{ fill: '#4F7CFF' }}
                    name="Net Worth"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Add Record Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Net Worth Record"
        >
          <div className="space-y-4">
            <Input
              label="Total Assets"
              type="number"
              value={newRecord.assets || ''}
              onChange={(e) => setNewRecord({ ...newRecord, assets: Number(e.target.value) })}
              placeholder="Enter total assets"
            />
            <Input
              label="Total Liabilities"
              type="number"
              value={newRecord.liabilities || ''}
              onChange={(e) => setNewRecord({ ...newRecord, liabilities: Number(e.target.value) })}
              placeholder="Enter total liabilities"
            />
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Net Worth</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatFullCurrency(newRecord.assets - newRecord.liabilities)}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRecord} isLoading={isSaving}>
                Save Record
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
