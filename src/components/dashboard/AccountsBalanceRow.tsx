import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, CreditCard, PiggyBank, TrendingUp, Building, Plus } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { formatCurrency } from '../../lib/utils'
import type { AccountType } from '../../types'
import { isCreditTypeAccount } from '../../types'

const ACCOUNT_ICONS: Record<AccountType, React.ReactNode> = {
  general: <Wallet className="w-4 h-4" />,
  cash: <Wallet className="w-4 h-4" />,
  current: <Building className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
  savings: <PiggyBank className="w-4 h-4" />,
  bonus: <TrendingUp className="w-4 h-4" />,
  insurance: <Building className="w-4 h-4" />,
  investment: <TrendingUp className="w-4 h-4" />,
  loan: <Building className="w-4 h-4" />,
  mortgage: <Building className="w-4 h-4" />,
  overdraft: <CreditCard className="w-4 h-4" />,
}

const ACCOUNT_COLORS: Record<AccountType, string> = {
  general: 'bg-slate-100 text-slate-600',
  cash: 'bg-green-100 text-green-600',
  current: 'bg-blue-100 text-blue-600',
  credit_card: 'bg-purple-100 text-purple-600',
  savings: 'bg-emerald-100 text-emerald-600',
  bonus: 'bg-amber-100 text-amber-600',
  insurance: 'bg-cyan-100 text-cyan-600',
  investment: 'bg-indigo-100 text-indigo-600',
  loan: 'bg-red-100 text-red-600',
  mortgage: 'bg-rose-100 text-rose-600',
  overdraft: 'bg-orange-100 text-orange-600',
}

export const AccountsBalanceRow: React.FC = () => {
  const navigate = useNavigate()
  const { accounts } = useAccountStore()

  // Accounts are loaded by Dashboard, no need to reload here

  const activeAccounts = accounts.filter(acc => acc.is_active)

  // Determine display balance for an account
  const getDisplayBalance = (account: typeof accounts[0]) => {
    // For credit cards and overdraft with credit_balance display
    // The balance represents what you owe (negative = debt)
    if (isCreditTypeAccount(account.type)) {
      if (account.balance_display === 'credit_balance') {
        // Show as negative (debt to repay)
        // If current_balance is negative, it means you owe money
        return account.current_balance
      } else if (account.balance_display === 'available_credit') {
        // Show available credit = limit + balance (if balance is negative, it reduces available)
        const available = (account.credit_limit || 0) + account.current_balance
        return available
      }
    }
    return account.current_balance
  }

  // Determine if balance should show as negative/red
  const isNegativeBalance = (account: typeof accounts[0]) => {
    if (isCreditTypeAccount(account.type) && account.balance_display === 'credit_balance') {
      // For credit_balance display, negative balance means debt (show in red)
      return account.current_balance < 0
    }
    // For other accounts, negative is just negative
    return account.current_balance < 0
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Accounts</h3>
          <button
            onClick={() => navigate('/accounts')}
            className="text-xs text-primary-600 active:text-primary-700 hover:text-primary-700 font-medium py-1 px-2 rounded touch-manipulation"
          >
            Manage
          </button>
        </div>
        <button
          onClick={() => navigate('/accounts')}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 active:border-primary-300 active:text-primary-500 hover:border-primary-300 hover:text-primary-500 transition-colors touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add your first account</span>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-3 md:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Account Balances</h3>
        <button
          onClick={() => navigate('/accounts')}
          className="text-xs text-primary-600 active:text-primary-700 hover:text-primary-700 font-medium py-1 px-2 rounded touch-manipulation"
        >
          View All
        </button>
      </div>

      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {activeAccounts.map((account) => {
          const displayBalance = getDisplayBalance(account)
          const isNegative = isNegativeBalance(account)

          return (
            <div
              key={account.id}
              onClick={() => navigate('/transactions')}
              className="flex-shrink-0 min-w-[130px] md:min-w-[140px] p-2.5 md:p-3 rounded-xl bg-gray-50 active:bg-gray-100 hover:bg-gray-100 cursor-pointer transition-colors touch-manipulation"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${ACCOUNT_COLORS[account.type]}`}>
                  {ACCOUNT_ICONS[account.type]}
                </div>
                <span className="text-xs font-medium text-gray-600 truncate">
                  {account.name}
                </span>
              </div>
              <p className={`text-lg font-bold ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                {formatCurrency(displayBalance)}
              </p>
              {isCreditTypeAccount(account.type) && account.balance_display === 'credit_balance' && isNegative && (
                <p className="text-[10px] text-red-500 mt-0.5">To repay</p>
              )}
              {isCreditTypeAccount(account.type) && account.balance_display === 'available_credit' && (
                <p className="text-[10px] text-gray-400 mt-0.5">Available</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

