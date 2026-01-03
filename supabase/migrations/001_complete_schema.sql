-- ============================================
-- FINANCE PLANNER - COMPLETE DATABASE SCHEMA
-- ============================================
-- This is the consolidated migration file containing all database setup
-- Run this single file in Supabase SQL Editor to set up the entire database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    settings JSONB DEFAULT '{"currency": "₹"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. BUDGETS TABLE (Legacy - one per user per month)
-- ============================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    rollover_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- ============================================
-- 3. ENTRIES TABLE (Legacy - budget line items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('income', 'expenses', 'bills', 'savings', 'debt')),
    name TEXT NOT NULL,
    planned DECIMAL(12,2) DEFAULT 0,
    actual DECIMAL(12,2) DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. NET WORTH RECORDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.net_worth_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    record_date DATE NOT NULL,
    assets DECIMAL(14,2) DEFAULT 0,
    liabilities DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, record_date)
);

-- ============================================
-- 5. RECURRING BILLS (Legacy - for Bills Tracker & Calendar)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recurring_bills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    category TEXT DEFAULT 'Other',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. DEBT ACCOUNTS (for Debt Payoff Calculator)
-- ============================================
CREATE TABLE IF NOT EXISTS public.debt_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    principal DECIMAL(14,2) NOT NULL,
    current_balance DECIMAL(14,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    account_number TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'general', 'cash', 'current', 'credit_card', 
        'savings', 'bonus', 'insurance', 'investment', 
        'loan', 'mortgage', 'overdraft'
    )),
    initial_balance DECIMAL(14,2) DEFAULT 0,
    current_balance DECIMAL(14,2) DEFAULT 0,
    -- Credit Card / Overdraft specific fields
    credit_limit DECIMAL(14,2),
    balance_display TEXT CHECK (balance_display IN ('available_credit', 'credit_balance')),
    payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. USER CATEGORIES TABLE (Legacy - for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    main_category TEXT NOT NULL CHECK (main_category IN ('income', 'expenses', 'bills', 'savings', 'debt')),
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#6366F1',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ============================================
-- 9. CATEGORIES TABLE (Hierarchical - replaces user_categories)
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#6366F1',
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name, parent_id)
);

-- ============================================
-- 10. CATEGORY BUDGETS TABLE (Monthly budgets per category)
-- ============================================
CREATE TABLE IF NOT EXISTS public.category_budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    budget_amount DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id, month, year)
);

-- ============================================
-- 11. PLANNED PAYMENTS TABLE (Scheduled transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.planned_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount DECIMAL(14,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    payment_method TEXT CHECK (payment_method IN (
        'cash', 'debit_card', 'credit_card', 'bank_transfer', 
        'voucher', 'mobile_payment', 'web_payment'
    )),
    payee TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('one_time', 'recurrent')),
    -- One-time fields
    scheduled_date DATE,
    -- Recurrent fields
    start_date DATE,
    recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    weekly_days INTEGER[], -- 0=Sun, 1=Mon, ..., 6=Sat
    monthly_interval INTEGER DEFAULT 1, -- every N months
    note TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT, -- Transaction name/title (e.g., "AK Salary", "Zomato Order")
    source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.user_categories(id) ON DELETE SET NULL, -- Legacy
    new_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL, -- New hierarchical
    planned_payment_id UUID REFERENCES public.planned_payments(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount DECIMAL(14,2) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME,
    note TEXT,
    payee TEXT,
    payment_type TEXT,
    payment_method TEXT CHECK (payment_method IN (
        'cash', 'debit_card', 'credit_card', 'bank_transfer', 
        'voucher', 'mobile_payment', 'web_payment'
    )),
    warranty_until DATE,
    status TEXT DEFAULT 'uncleared' CHECK (status IN ('reconciled', 'cleared', 'uncleared')),
    place TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 13. CUSTOM DASHBOARD TILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_dashboard_tiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Online Delivery Tracker"
    icon TEXT DEFAULT '📊', -- Emoji icon for the tile
    color TEXT DEFAULT '#6366F1', -- Hex color for the tile header
    transaction_types TEXT[] NOT NULL DEFAULT ARRAY['expense']::TEXT[], -- Array of types: income, expense, transfer
    category_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of category IDs to include
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_dashboard_tiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Budgets policies
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets"
    ON public.budgets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
CREATE POLICY "Users can insert own budgets"
    ON public.budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
    ON public.budgets FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
CREATE POLICY "Users can delete own budgets"
    ON public.budgets FOR DELETE
    USING (auth.uid() = user_id);

-- Entries policies
DROP POLICY IF EXISTS "Users can view own entries" ON public.entries;
CREATE POLICY "Users can view own entries"
    ON public.entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own entries" ON public.entries;
CREATE POLICY "Users can insert own entries"
    ON public.entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own entries" ON public.entries;
CREATE POLICY "Users can update own entries"
    ON public.entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own entries" ON public.entries;
CREATE POLICY "Users can delete own entries"
    ON public.entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- Net worth records policies
DROP POLICY IF EXISTS "Users can manage own net worth records" ON public.net_worth_records;
CREATE POLICY "Users can manage own net worth records"
    ON public.net_worth_records FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Recurring bills policies
DROP POLICY IF EXISTS "Users can manage own recurring bills" ON public.recurring_bills;
CREATE POLICY "Users can manage own recurring bills"
    ON public.recurring_bills FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Debt accounts policies
DROP POLICY IF EXISTS "Users can manage own debt accounts" ON public.debt_accounts;
CREATE POLICY "Users can manage own debt accounts"
    ON public.debt_accounts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Accounts policies
DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
CREATE POLICY "Users can manage own accounts"
    ON public.accounts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User categories policies (legacy)
DROP POLICY IF EXISTS "Users can manage own categories" ON public.user_categories;
CREATE POLICY "Users can manage own categories"
    ON public.user_categories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Categories policies (new hierarchical)
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories"
    ON public.categories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Category budgets policies
DROP POLICY IF EXISTS "Users can manage own category budgets" ON public.category_budgets;
CREATE POLICY "Users can manage own category budgets"
    ON public.category_budgets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Planned payments policies
DROP POLICY IF EXISTS "Users can manage own planned payments" ON public.planned_payments;
CREATE POLICY "Users can manage own planned payments"
    ON public.planned_payments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions"
    ON public.transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Custom dashboard tiles policies
DROP POLICY IF EXISTS "Users can manage own custom tiles" ON public.custom_dashboard_tiles;
CREATE POLICY "Users can manage own custom tiles"
    ON public.custom_dashboard_tiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON public.budgets(year, month);
CREATE INDEX IF NOT EXISTS idx_entries_budget_id ON public.entries(budget_id);
CREATE INDEX IF NOT EXISTS idx_entries_category ON public.entries(category);
CREATE INDEX IF NOT EXISTS idx_net_worth_user_date ON public.net_worth_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON public.recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_accounts_user_id ON public.debt_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON public.user_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_categories_main ON public.user_categories(main_category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_new_category ON public.transactions(new_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dest ON public.transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_planned_payment ON public.transactions(planned_payment_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_user_id ON public.category_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_category ON public.category_budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_month_year ON public.category_budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_planned_payments_user_id ON public.planned_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_payments_next_date ON public.planned_payments(next_execution_date);
CREATE INDEX IF NOT EXISTS idx_planned_payments_active ON public.planned_payments(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_tiles_user_id ON public.custom_dashboard_tiles(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_tiles_active ON public.custom_dashboard_tiles(user_id, is_active);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, settings)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        '{"currency": "₹"}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to seed default categories for new users (legacy)
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Income categories
    INSERT INTO public.user_categories (user_id, name, main_category, icon, color, is_default) VALUES
        (NEW.id, 'Salary', 'income', '💰', '#22C55E', TRUE),
        (NEW.id, 'Freelance', 'income', '💼', '#16A34A', TRUE),
        (NEW.id, 'Investments', 'income', '📈', '#15803D', TRUE),
        (NEW.id, 'Other Income', 'income', '💵', '#14532D', TRUE);
    
    -- Expense categories
    INSERT INTO public.user_categories (user_id, name, main_category, icon, color, is_default) VALUES
        (NEW.id, 'Groceries', 'expenses', '🛒', '#3B82F6', TRUE),
        (NEW.id, 'Dining', 'expenses', '🍽️', '#2563EB', TRUE),
        (NEW.id, 'Shopping', 'expenses', '🛍️', '#1D4ED8', TRUE),
        (NEW.id, 'Entertainment', 'expenses', '🎬', '#1E40AF', TRUE),
        (NEW.id, 'Transport', 'expenses', '🚗', '#1E3A8A', TRUE),
        (NEW.id, 'Healthcare', 'expenses', '🏥', '#172554', TRUE);
    
    -- Bills categories
    INSERT INTO public.user_categories (user_id, name, main_category, icon, color, is_default) VALUES
        (NEW.id, 'Rent', 'bills', '🏠', '#6366F1', TRUE),
        (NEW.id, 'Utilities', 'bills', '💡', '#4F46E5', TRUE),
        (NEW.id, 'Phone', 'bills', '📱', '#4338CA', TRUE),
        (NEW.id, 'Internet', 'bills', '🌐', '#3730A3', TRUE),
        (NEW.id, 'Subscriptions', 'bills', '📺', '#312E81', TRUE);
    
    -- Savings categories
    INSERT INTO public.user_categories (user_id, name, main_category, icon, color, is_default) VALUES
        (NEW.id, 'Emergency Fund', 'savings', '🆘', '#10B981', TRUE),
        (NEW.id, 'Retirement', 'savings', '👴', '#059669', TRUE),
        (NEW.id, 'Vacation', 'savings', '✈️', '#047857', TRUE),
        (NEW.id, 'Goals', 'savings', '🎯', '#065F46', TRUE);
    
    -- Debt categories
    INSERT INTO public.user_categories (user_id, name, main_category, icon, color, is_default) VALUES
        (NEW.id, 'Credit Card Payment', 'debt', '💳', '#EC4899', TRUE),
        (NEW.id, 'Loan EMI', 'debt', '🏦', '#DB2777', TRUE),
        (NEW.id, 'Mortgage', 'debt', '🏘️', '#BE185D', TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to seed default hierarchical categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories_v2()
RETURNS TRIGGER AS $$
DECLARE
    food_id UUID;
    shopping_id UUID;
    transport_id UUID;
    entertainment_id UUID;
    bills_id UUID;
    health_id UUID;
BEGIN
    -- Create parent categories
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Salary', '💰', '#22C55E', 0);
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Freelance', '💼', '#16A34A', 1);
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Food & Dining', '🍽️', '#F97316', 2) RETURNING id INTO food_id;
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Shopping', '🛍️', '#3B82F6', 3) RETURNING id INTO shopping_id;
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Transport', '🚗', '#8B5CF6', 4) RETURNING id INTO transport_id;
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Entertainment', '🎬', '#EC4899', 5) RETURNING id INTO entertainment_id;
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Bills & Utilities', '💡', '#6366F1', 6) RETURNING id INTO bills_id;
    
    INSERT INTO public.categories (user_id, name, icon, color, sort_order)
    VALUES (NEW.id, 'Health', '🏥', '#10B981', 7) RETURNING id INTO health_id;
    
    -- Create subcategories for Food & Dining
    INSERT INTO public.categories (user_id, name, icon, color, parent_id, sort_order) VALUES
        (NEW.id, 'Groceries', '🛒', '#FB923C', food_id, 0),
        (NEW.id, 'Restaurants', '🍴', '#F97316', food_id, 1),
        (NEW.id, 'Delivery Apps', '📱', '#EA580C', food_id, 2),
        (NEW.id, 'Coffee & Snacks', '☕', '#C2410C', food_id, 3);
    
    -- Create subcategories for Shopping
    INSERT INTO public.categories (user_id, name, icon, color, parent_id, sort_order) VALUES
        (NEW.id, 'Clothing', '👕', '#60A5FA', shopping_id, 0),
        (NEW.id, 'Electronics', '📱', '#3B82F6', shopping_id, 1),
        (NEW.id, 'Home & Garden', '🏡', '#2563EB', shopping_id, 2);
    
    -- Create subcategories for Transport
    INSERT INTO public.categories (user_id, name, icon, color, parent_id, sort_order) VALUES
        (NEW.id, 'Fuel', '⛽', '#A78BFA', transport_id, 0),
        (NEW.id, 'Public Transport', '🚌', '#8B5CF6', transport_id, 1),
        (NEW.id, 'Cab/Taxi', '🚕', '#7C3AED', transport_id, 2);
    
    -- Create subcategories for Bills
    INSERT INTO public.categories (user_id, name, icon, color, parent_id, sort_order) VALUES
        (NEW.id, 'Electricity', '⚡', '#818CF8', bills_id, 0),
        (NEW.id, 'Internet', '🌐', '#6366F1', bills_id, 1),
        (NEW.id, 'Phone', '📞', '#4F46E5', bills_id, 2),
        (NEW.id, 'Subscriptions', '📺', '#4338CA', bills_id, 3),
        (NEW.id, 'Rent', '🏠', '#3730A3', bills_id, 4);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update account balance on transaction
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- For income: add to destination account
        IF NEW.type = 'income' AND NEW.destination_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.destination_account_id;
        END IF;
        
        -- For expense: subtract from source account
        IF NEW.type = 'expense' AND NEW.source_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.source_account_id;
        END IF;
        
        -- For transfer: subtract from source, add to destination
        IF NEW.type = 'transfer' THEN
            IF NEW.source_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.source_account_id;
            END IF;
            IF NEW.destination_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.destination_account_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction effect
        IF OLD.type = 'income' AND OLD.destination_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.destination_account_id;
        END IF;
        
        IF OLD.type = 'expense' AND OLD.source_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.source_account_id;
        END IF;
        
        IF OLD.type = 'transfer' THEN
            IF OLD.source_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.source_account_id;
            END IF;
            IF OLD.destination_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.destination_account_id;
            END IF;
        END IF;
        
        -- Apply new transaction effect
        IF NEW.type = 'income' AND NEW.destination_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.destination_account_id;
        END IF;
        
        IF NEW.type = 'expense' AND NEW.source_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.source_account_id;
        END IF;
        
        IF NEW.type = 'transfer' THEN
            IF NEW.source_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.source_account_id;
            END IF;
            IF NEW.destination_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.destination_account_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Reverse the transaction effect
        IF OLD.type = 'income' AND OLD.destination_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.destination_account_id;
        END IF;
        
        IF OLD.type = 'expense' AND OLD.source_account_id IS NOT NULL THEN
            UPDATE public.accounts 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.source_account_id;
        END IF;
        
        IF OLD.type = 'transfer' THEN
            IF OLD.source_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.source_account_id;
            END IF;
            IF OLD.destination_account_id IS NOT NULL THEN
                UPDATE public.accounts 
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.destination_account_id;
            END IF;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next execution date for planned payments
CREATE OR REPLACE FUNCTION public.calculate_next_execution_date(
    p_frequency TEXT,
    p_recurrence_type TEXT,
    p_start_date DATE,
    p_scheduled_date DATE,
    p_weekly_days INTEGER[],
    p_monthly_interval INTEGER,
    p_last_executed_at TIMESTAMP WITH TIME ZONE
) RETURNS DATE AS $$
DECLARE
    next_date DATE;
    base_date DATE;
BEGIN
    -- For one-time payments
    IF p_frequency = 'one_time' THEN
        IF p_last_executed_at IS NOT NULL THEN
            RETURN NULL; -- Already executed
        END IF;
        RETURN p_scheduled_date;
    END IF;
    
    -- For recurrent payments
    base_date := COALESCE(p_last_executed_at::DATE, p_start_date - INTERVAL '1 day');
    
    CASE p_recurrence_type
        WHEN 'daily' THEN
            next_date := base_date + INTERVAL '1 day';
        WHEN 'weekly' THEN
            -- Find next occurrence based on weekly_days
            next_date := base_date + INTERVAL '1 day';
            WHILE NOT (EXTRACT(DOW FROM next_date)::INTEGER = ANY(p_weekly_days)) LOOP
                next_date := next_date + INTERVAL '1 day';
                IF next_date > base_date + INTERVAL '14 days' THEN
                    EXIT; -- Safety limit
                END IF;
            END LOOP;
        WHEN 'monthly' THEN
            next_date := base_date + (p_monthly_interval || ' months')::INTERVAL;
        WHEN 'yearly' THEN
            next_date := base_date + INTERVAL '1 year';
        ELSE
            next_date := NULL;
    END CASE;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to update next_execution_date on planned_payment changes
CREATE OR REPLACE FUNCTION public.update_planned_payment_next_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.next_execution_date := public.calculate_next_execution_date(
        NEW.frequency,
        NEW.recurrence_type,
        NEW.start_date,
        NEW.scheduled_date,
        NEW.weekly_days,
        NEW.monthly_interval,
        NEW.last_executed_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update custom tiles updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_tiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to seed legacy categories when a new user is created
DROP TRIGGER IF EXISTS on_user_created_seed_categories ON public.users;
CREATE TRIGGER on_user_created_seed_categories
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

-- Trigger to seed hierarchical categories when a new user is created
DROP TRIGGER IF EXISTS on_user_created_seed_categories_v2 ON public.users;
CREATE TRIGGER on_user_created_seed_categories_v2
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories_v2();

-- Trigger to auto-update account balances
DROP TRIGGER IF EXISTS on_transaction_change ON public.transactions;
CREATE TRIGGER on_transaction_change
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- Trigger to update next_execution_date on planned_payment changes
DROP TRIGGER IF EXISTS on_planned_payment_update_next_date ON public.planned_payments;
CREATE TRIGGER on_planned_payment_update_next_date
    BEFORE INSERT OR UPDATE ON public.planned_payments
    FOR EACH ROW EXECUTE FUNCTION public.update_planned_payment_next_date();

-- Trigger to update custom tiles updated_at timestamp
DROP TRIGGER IF EXISTS update_custom_tiles_updated_at ON public.custom_dashboard_tiles;
CREATE TRIGGER update_custom_tiles_updated_at
    BEFORE UPDATE ON public.custom_dashboard_tiles
    FOR EACH ROW EXECUTE FUNCTION update_custom_tiles_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN public.transactions.name IS 'Transaction name/title (e.g., "AK Salary", "Zomato Order")';
COMMENT ON TABLE public.custom_dashboard_tiles IS 'User-defined dashboard summary cards that aggregate transactions by category and type';

