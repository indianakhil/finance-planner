# FinancePlanner

A beautiful, full-featured personal finance dashboard built with React, TypeScript, and Supabase. Inspired by Wallet by BudgetBakers.

## Features

### Core Dashboard
- **Income Tracking**: Track all income sources with quick entry
- **Expense Tracking**: Log expenses with categories and payment methods
- **Upcoming Payments**: View scheduled transactions for the next 30 days
- **Interactive Charts**: Spending by category, allocation breakdown, cash flow
- **Summary Cards**: At-a-glance view of income, expenses, and balance

### Accounts System
- **Multiple Account Types**: General, Cash, Current Account, Credit Card, Savings, Bonus, Insurance, Investment, Loan, Mortgage, Overdraft
- **Automatic Balance Updates**: Account balances update in real-time as transactions are added
- **Credit Card/Overdraft Support**: Track available credit and credit balance with special display modes
- **Dashboard Balance Row**: Quick view of all account balances on the main dashboard

### Transactions
- **Three Transaction Types**: Income, Expense, Transfer
- **Payment Methods**: Cash, Debit Card, Credit Card, Bank Transfer, Mobile Payment (UPI), Web Payment, Voucher
- **Status Tracking**: Reconciled, Cleared, Uncleared with smart defaults based on account type
- **Comprehensive Filters**: Filter by type, account, category, status, date range, and search text

### Hierarchical Categories
- **User-Defined Categories**: Create custom categories with icons and colors
- **Subcategories**: Organize with parent-child category relationships
- **Category Manager**: Visual tree editor for organizing your category hierarchy

### Budget Tracker
- **Category-wise Budgets**: Set monthly budgets for each category
- **Drill-Down Charts**: Click on chart segments to view subcategory breakdown
- **Spending vs Budget**: Visual progress bars showing budget consumption
- **Monthly Navigation**: Browse budgets and spending across months

### Planned Payments (Scheduled Transactions)
- **One-Time Payments**: Schedule payments for a specific future date
- **Recurring Payments**: Set up daily, weekly, monthly, or yearly recurring transactions
  - Weekly: Select specific weekdays
  - Monthly: Every N months
- **Auto-Execution**: Scheduled payments automatically create transactions when due
- **Payment Methods**: All standard payment methods supported

### Additional Features
- **Net Worth Tracker**: Track assets and liabilities over time with historical charts
- **Financial Calendar**: View bills and due dates in calendar format
- **Annual Dashboard**: Year-over-year insights from your actual data
- **Debt Payoff Calculator**: Avalanche and Snowball strategies with timeline projections
- **Budget Templates**: Pre-built allocation templates (50/30/20, Aggressive Saver, etc.)
- **AI Insights**: OpenAI-powered financial recommendations (optional)
- **Data Export**: Download as CSV or PDF

### Authentication
- Email/password signup and login
- Google OAuth integration (optional)
- Secure session management

---

## Quick Start (Demo Mode)

Want to try the app without any setup? Just run:

```bash
npm install
npm run dev
```

Open http://localhost:5173/FinancePlanner/ - the app runs in **demo mode** with sample data!

---

## Full Setup Guide

### Prerequisites

Before starting, make sure you have:

1. **Node.js 18+** installed
   ```bash
   # Check your version
   node --version
   # Should show v18.x.x or higher
   
   # If not installed, use Homebrew (Mac):
   brew install node
   ```

2. **A code editor** (VS Code, Cursor, etc.)

3. **A web browser** (Chrome recommended for DevTools)

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/FinancePlanner.git

# Navigate to the project
cd FinancePlanner

# Install dependencies
npm install
```

---

## Step 2: Supabase Setup (Database + Authentication)

Supabase is a free, open-source Firebase alternative. It provides our database and user authentication.

### 2.1 Create a Supabase Account

1. Go to **https://supabase.com**
2. Click **"Start your project"** (green button)
3. Sign up with GitHub (recommended) or email

### 2.2 Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the details:
   - **Name**: `finance-planner` (or any name you like)
   - **Database Password**: Create a strong password (save this somewhere!)
   - **Region**: Choose the closest to you (e.g., `South Asia (Mumbai)` for India)
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be created

### 2.3 Get Your API Keys

Once the project is ready:

1. In the left sidebar, click **"Project Settings"** (gear icon at bottom)
2. Click **"API"** in the settings menu
3. You'll see two important values:

   ```
   Project URL:     https://xyzabc123.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Copy both values** - you'll need them in Step 3

### 2.4 Set Up the Database Tables

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** (or the + button)
3. Open the file `supabase/migrations/001_complete_schema.sql` from this project
4. **Copy the entire contents** of that file
5. **Paste it** into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see: `Success. No rows returned`

This single migration creates all the necessary tables:
- `users` - User profiles and settings
- `users` - User profiles and settings
- `accounts` - Financial accounts (bank, credit card, cash, etc.)
- `categories` - Hierarchical user-defined categories with subcategories
- `category_budgets` - Monthly budget amounts per category
- `planned_payments` - Scheduled one-time and recurring transactions
- `transactions` - All income, expense, and transfer records
- `custom_dashboard_tiles` - User-defined dashboard summary cards
- `net_worth_records` - Net worth history (for Net Worth Tracker)
- `recurring_bills` - Legacy recurring expenses (for Bills Tracker & Calendar)
- `debt_accounts` - Debt tracking (for Debt Payoff Calculator)
- `budgets` & `entries` - Legacy budget system (for backward compatibility)
- `user_categories` - Legacy categories (for backward compatibility)

**Important**: All features require these tables. Make sure the migration runs successfully.

### 2.5 Enable Email Authentication

1. In the left sidebar, click **"Authentication"**
2. Click **"Providers"** in the submenu
3. Find **"Email"** in the list
4. Make sure it's **enabled** (toggle should be ON)
5. Optionally, disable "Confirm email" for easier testing:
   - Click on "Email" to expand settings
   - Turn OFF "Confirm email"
   - Click "Save"

---

## Step 3: Configure Environment Variables

1. In the `planner` folder, create a new file called `.env`:

   ```bash
   # On Mac/Linux
   touch .env
   
   # Or just create it in your code editor
   ```

2. Add your Supabase credentials to the `.env` file:

   ```env
   # Supabase Configuration (Required)
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   
   # OpenAI API Key (Optional - for AI insights)
   VITE_OPENAI_API_KEY=sk-your-openai-key-here
   ```

   **Example with real values:**
   ```env
   VITE_SUPABASE_URL=https://xyzabc123.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE5NTU1NjAwMDB9.abcdefghijklmnopqrstuvwxyz
   ```

3. **Important**: Never commit `.env` to git! It's already in `.gitignore`.

---

## Step 4: Run the Application

```bash
npm run dev
```

Open your browser to: **http://localhost:5173/FinanceTracker/**

You should see the login page! Try:
1. Click "Sign up" to create an account
2. Enter your email and a password
3. You'll be redirected to the dashboard

---

## Step 5: (Optional) Set Up Google OAuth

Want users to sign in with their Google account? Follow these steps:

### 5.1 Create Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. Click the project dropdown (top left, next to "Google Cloud")
4. Click **"New Project"**
5. Name it `finance-planner` and click **"Create"**
6. Wait for it to be created, then select it

### 5.2 Configure OAuth Consent Screen

1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** and click **"Create"**
3. Fill in the required fields:
   - **App name**: Finance Planner
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **"Save and Continue"**
5. Skip Scopes (just click "Save and Continue")
6. Skip Test Users (just click "Save and Continue")
7. Click **"Back to Dashboard"**

### 5.3 Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Fill in:
   - **Name**: Finance Planner Web
   - **Authorized JavaScript origins**: Add these:
     ```
     http://localhost:5173
     https://yourusername.github.io
     ```
   - **Authorized redirect URIs**: Add this (get from Supabase):
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
     (Find this in Supabase → Authentication → URL Configuration)

5. Click **"Create"**
6. **Copy the Client ID and Client Secret**

### 5.4 Add Google Provider to Supabase

1. Go to your Supabase project
2. Go to **"Authentication"** → **"Providers"**
3. Find **"Google"** and click to expand
4. Toggle it **ON**
5. Paste your:
   - **Client ID**: from Google
   - **Client Secret**: from Google
6. Click **"Save"**

Now users can click "Continue with Google" to sign in!

---

## Step 6: (Optional) Set Up OpenAI for AI Insights

The AI Insights feature provides personalized financial recommendations.

### 6.1 Get an OpenAI API Key

1. Go to **https://platform.openai.com**
2. Sign up or log in
3. Go to **"API Keys"** (in the left sidebar or user menu)
4. Click **"+ Create new secret key"**
5. Name it `finance-planner`
6. **Copy the key immediately** (you can't see it again!)

### 6.2 Add to Environment

Add to your `.env` file:

```env
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
```

Or, users can add their own key in the app's Settings page.

**Note**: OpenAI charges per API call. The app uses GPT-3.5-Turbo which is very affordable (~$0.002 per insight generation).

---

## Step 7: Deploy to GitHub Pages

### 7.1 Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/FinanceTracker.git
git push -u origin main
```

### 7.2 Configure GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Click **"Pages"** in the left sidebar
4. Under "Build and deployment":
   - **Source**: GitHub Actions
5. The workflow will run automatically on push

### 7.3 Add Secrets for Deployment

1. In your repo, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add these secrets:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. Push any change to trigger deployment:
   ```bash
   git commit --allow-empty -m "Trigger deploy"
   git push
   ```

5. Your app will be live at: `https://yourusername.github.io/FinancePlanner/`

---

## Troubleshooting

### Blank Screen

1. Open browser DevTools (Cmd+Option+I on Mac)
2. Check the Console tab for errors
3. Try clearing localStorage:
   - Go to Application tab → Local Storage
   - Right-click and "Clear"
4. Hard refresh: Cmd+Shift+R

### "Invalid API Key" Error

- Double-check your `.env` file
- Make sure there are no extra spaces
- Restart the dev server after changing `.env`:
  ```bash
  # Stop server (Ctrl+C), then:
  npm run dev
  ```

### Google Sign-In Not Working

- Verify redirect URI matches exactly in Google Console
- Make sure Google provider is enabled in Supabase
- Check browser console for specific errors

### Database Errors

- Make sure you ran the SQL migration
- Check Supabase → Table Editor to verify tables exist
- Look at Supabase → Logs for detailed errors

---

## Project Structure

```
FinancePlanner/
├── src/
│   ├── components/     # React components
│   │   ├── auth/       # Login, Register, Google button
│   │   ├── dashboard/  # Charts and tables
│   │   ├── features/   # Net Worth, Calendar, Accounts, Transactions, etc.
│   │   ├── layout/     # Header, Layout
│   │   └── ui/         # Button, Input, Modal, etc.
│   ├── hooks/          # useAuth, useBudget, useToast
│   ├── lib/            # supabase.ts, openai.ts, utils.ts
│   ├── pages/          # Dashboard, Login, Settings, etc.
│   ├── store/          # Zustand state management
│   │   ├── authStore.ts
│   │   ├── budgetStore.ts
│   │   ├── accountStore.ts    # NEW: Account management
│   │   ├── categoryStore.ts   # NEW: Custom categories
│   │   ├── transactionStore.ts # NEW: Transaction management
│   │   └── toastStore.ts
│   └── types/          # TypeScript interfaces
├── supabase/
│   └── migrations/
│       └── 001_complete_schema.sql  # Complete database schema (run this single file)
├── public/             # Static assets
├── .env                # Your environment variables (don't commit!)
└── package.json        # Dependencies
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | For auth & data | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For auth & data | Your Supabase anonymous key |
| `VITE_OPENAI_API_KEY` | No | OpenAI API key for AI insights |

**Without Supabase credentials**, the app runs in demo mode with sample data.

---

## Database Tables Used by Features

| Feature | Database Table | What it stores |
|---------|---------------|----------------|
| Main Budget | `budgets`, `entries` | Monthly budget data and line items |
| Accounts | `accounts` | Bank accounts, credit cards, cash, investments, loans, etc. |
| Transactions | `transactions` | Income, expenses, and transfers with full details |
| Categories | `user_categories` | Custom categories mapped to 5 main budget categories |
| Net Worth Tracker | `net_worth_records` | Assets, liabilities, and record dates |
| Bills Tracker | `recurring_bills` | Recurring bills with due dates and frequencies |
| Financial Calendar | `recurring_bills` | Uses Bills Tracker data to show due dates |
| Debt Payoff Calculator | `debt_accounts` | Debt accounts with balances and interest rates |
| Annual Dashboard | `budgets`, `entries` | Aggregates all monthly budget data for the year |
| Budget Templates | - | Templates are applied to create entries (no separate table) |
| User Settings | `users` | Currency, rollover settings, API keys |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS |
| Charts | Recharts |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Auth) |
| AI | OpenAI API (optional) |
| PDF | jsPDF + jspdf-autotable |

---

## License

MIT License - free for personal and commercial use.

---

## Need Help?

1. Check the [Troubleshooting](#troubleshooting) section above
2. Open an issue on GitHub
3. Check Supabase docs: https://supabase.com/docs
4. Check Vite docs: https://vitejs.dev/guide/
