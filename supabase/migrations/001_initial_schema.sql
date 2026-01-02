-- Finance Planner Database Schema
-- Run this in Supabase SQL Editor or via migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    settings JSONB DEFAULT '{"currency": "₹"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table (one per user per month)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    rollover_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- Entries table (budget line items)
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

-- Net worth records
CREATE TABLE IF NOT EXISTS public.net_worth_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    record_date DATE NOT NULL,
    assets DECIMAL(14,2) DEFAULT 0,
    liabilities DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, record_date)
);

-- Recurring bills
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

-- Debt accounts
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

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for budgets
CREATE POLICY "Users can view own budgets"
    ON public.budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
    ON public.budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
    ON public.budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
    ON public.budgets FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for entries
CREATE POLICY "Users can view own entries"
    ON public.entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own entries"
    ON public.entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own entries"
    ON public.entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own entries"
    ON public.entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- RLS Policies for net_worth_records
CREATE POLICY "Users can manage own net worth records"
    ON public.net_worth_records FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for recurring_bills
CREATE POLICY "Users can manage own recurring bills"
    ON public.recurring_bills FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for debt_accounts
CREATE POLICY "Users can manage own debt accounts"
    ON public.debt_accounts FOR ALL
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON public.budgets(year, month);
CREATE INDEX IF NOT EXISTS idx_entries_budget_id ON public.entries(budget_id);
CREATE INDEX IF NOT EXISTS idx_entries_category ON public.entries(category);
CREATE INDEX IF NOT EXISTS idx_net_worth_user_date ON public.net_worth_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON public.recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_accounts_user_id ON public.debt_accounts(user_id);

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

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

