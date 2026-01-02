export type Category = 'income' | 'expenses' | 'bills' | 'savings' | 'debt';

export interface Entry {
  id: string;
  budget_id: string;
  category: Category;
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
  category: Category;
  percentage: number;
  name: string;
}

export interface CategorySummary {
  category: Category;
  planned: number;
  actual: number;
  percentage: number;
}

export interface MonthlyOverview {
  income: CategorySummary;
  expenses: CategorySummary;
  bills: CategorySummary;
  savings: CategorySummary;
  debt: CategorySummary;
  remaining: {
    planned: number;
    actual: number;
  };
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
  category?: Category;
  impact?: 'low' | 'medium' | 'high';
}

