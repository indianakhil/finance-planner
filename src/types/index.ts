// Legacy type - kept for backward compatibility during transition
export type LegacyCategory = 'income' | 'expenses' | 'bills' | 'savings' | 'debt';

// ============================================
// HIERARCHICAL CATEGORIES
// ============================================
export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  // Computed/joined fields
  children?: Category[];
  parent?: Category;
}

// ============================================
// CATEGORY BUDGETS (Monthly)
// ============================================
export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  month: number;
  year: number;
  budget_amount: number;
  created_at: string;
  // Joined fields
  category?: Category;
}

// ============================================
// PLANNED PAYMENTS
// ============================================
export type PaymentMethod = 
  | 'cash' 
  | 'debit_card' 
  | 'credit_card' 
  | 'bank_transfer' 
  | 'voucher' 
  | 'mobile_payment' 
  | 'web_payment';

export type PaymentFrequency = 'one_time' | 'recurrent';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PlannedPayment {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  type: TransactionType;
  payment_method: PaymentMethod | null;
  payee: string | null;
  frequency: PaymentFrequency;
  // One-time fields
  scheduled_date: string | null;
  // Recurrent fields
  start_date: string | null;
  recurrence_type: RecurrenceType | null;
  weekly_days: number[] | null; // 0=Sun, 1=Mon, ..., 6=Sat
  monthly_interval: number;
  note: string | null;
  is_active: boolean;
  last_executed_at: string | null;
  next_execution_date: string | null;
  created_at: string;
  // Joined fields
  category?: Category;
  account?: Account;
  destination_account?: Account;
}

export interface CustomDashboardTile {
  id: string;
  user_id: string;
  name: string; // e.g., "Online Delivery Tracker"
  icon: string; // Emoji icon
  color: string; // Hex color for header
  transaction_types: TransactionType[]; // Array of types to include
  category_ids: string[]; // Array of category IDs to include
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  debit_card: 'Debit Card',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  voucher: 'Voucher',
  mobile_payment: 'Mobile Payment',
  web_payment: 'Web Payment',
};

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================
// ACCOUNT TYPES
// ============================================
export type AccountType = 
  | 'general' 
  | 'cash' 
  | 'current' 
  | 'credit_card' 
  | 'savings' 
  | 'bonus' 
  | 'insurance' 
  | 'investment' 
  | 'loan' 
  | 'mortgage' 
  | 'overdraft';

export type BalanceDisplay = 'available_credit' | 'credit_balance';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'reconciled' | 'cleared' | 'uncleared';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_number: string | null;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  credit_limit: number | null;
  balance_display: BalanceDisplay | null;
  payment_due_day: number | null;
  is_active: boolean;
  created_at: string;
}

// Legacy UserCategory - kept for backward compatibility
export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  main_category: LegacyCategory;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null; // Legacy - references user_categories
  new_category_id: string | null; // New - references categories
  type: TransactionType;
  name: string | null; // Transaction name/title (e.g., "AK Salary", "Zomato Order")
  amount: number;
  transaction_date: string;
  transaction_time: string | null;
  note: string | null;
  payee: string | null;
  payment_type: string | null;
  payment_method: PaymentMethod | null;
  warranty_until: string | null;
  status: TransactionStatus;
  place: string | null;
  planned_payment_id: string | null;
  created_at: string;
  // Joined fields
  category?: Category;
  source_account?: Account;
  destination_account?: Account;
}

// Helper type for account type labels
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  general: 'General',
  cash: 'Cash',
  current: 'Current Account',
  credit_card: 'Credit Card',
  savings: 'Savings Account',
  bonus: 'Bonus',
  insurance: 'Insurance',
  investment: 'Investment',
  loan: 'Loan',
  mortgage: 'Mortgage',
  overdraft: 'Account with Overdraft',
};

// Check if account type requires credit fields
export const isCreditTypeAccount = (type: AccountType): boolean => {
  return type === 'credit_card' || type === 'overdraft';
};

export interface Entry {
  id: string;
  budget_id: string;
  category: LegacyCategory;
  name: string;
  planned: number;
  actual: number;
  is_locked: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  year: number;
  month: number;
  rollover_data: RolloverData | null;
  created_at: string;
}

export interface RolloverData {
  enabled: boolean;
  amount: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  settings: UserSettings;
  created_at: string;
}

export interface UserSettings {
  currency: string;
  openai_api_key?: string;
  rollover_enabled?: boolean;
  ai_insights_enabled?: boolean;
  hidden_default_tiles?: string[]; // Array of default tile labels to hide (e.g., ['Transfers', 'Budget Left'])
}

export interface NetWorthRecord {
  id: string;
  user_id: string;
  record_date: string;
  assets: number;
  liabilities: number;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  category: string;
  is_active: boolean;
}

export interface DebtAccount {
  id: string;
  user_id: string;
  name: string;
  principal: number;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
  start_date: string;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  allocations: TemplateAllocation[];
}

export interface TemplateAllocation {
  category: LegacyCategory;
  percentage: number;
  name: string;
}

// Legacy CategorySummary - for old budget system
export interface LegacyCategorySummary {
  category: LegacyCategory;
  planned: number;
  actual: number;
  percentage: number;
}

// Alias for backward compatibility
export type CategorySummary = LegacyCategorySummary;

// Legacy MonthlyOverview - for old budget system
export interface LegacyMonthlyOverview {
  income: LegacyCategorySummary;
  expenses: LegacyCategorySummary;
  bills: LegacyCategorySummary;
  savings: LegacyCategorySummary;
  debt: LegacyCategorySummary;
  remaining: {
    planned: number;
    actual: number;
  };
}

// Alias for backward compatibility
export type MonthlyOverview = LegacyMonthlyOverview;

// New Budget Tracking Types
export interface CategoryBudgetSummary {
  category: Category;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  subcategories?: CategoryBudgetSummary[];
}

export interface MonthlyBudgetOverview {
  month: number;
  year: number;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  categories: CategoryBudgetSummary[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'undo';
  message: string;
  undoAction?: () => void;
  duration?: number;
}

export interface AIInsight {
  id: string;
  type: 'tip' | 'warning' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  category?: LegacyCategory;
  impact?: 'low' | 'medium' | 'high';
}

