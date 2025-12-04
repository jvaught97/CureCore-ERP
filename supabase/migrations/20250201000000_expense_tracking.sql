-- =====================================================
-- CureCore ERP: Expense Tracking System
-- Migration: 20250201000000_expense_tracking.sql
-- =====================================================
-- This migration includes:
-- 1. Core accounting schema (from backup)
-- 2. Expense categories (user-friendly categorization)
-- 3. Expenses table (user-facing expense recording)
-- 4. Recurring expenses (automated expense templates)
-- =====================================================

-- =====================================================
-- 1. CHART OF ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype VARCHAR(100), -- e.g., 'current_asset', 'fixed_asset', 'cogs', 'operating'
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false, -- System accounts can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);

-- =====================================================
-- 2. JOURNAL ENTRIES (Double-Entry Bookkeeping)
-- =====================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- e.g., 'batch', 'sales_order', 'manual', 'expense', 'payroll', 'invoice'
  reference_id UUID, -- ID of the related record
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) DEFAULT 0 CHECK (credit >= 0),
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- Trigger to ensure journal entries balance (debits = credits)
CREATE OR REPLACE FUNCTION check_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debits DECIMAL(15,2);
  total_credits DECIMAL(15,2);
BEGIN
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO total_debits, total_credits
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF total_debits != total_credits THEN
    RAISE EXCEPTION 'Journal entry does not balance: Debits = %, Credits = %', total_debits, total_credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_journal_balance ON journal_entry_lines;
CREATE TRIGGER trigger_check_journal_balance
  AFTER INSERT OR UPDATE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_entry_balance();

-- =====================================================
-- 3. EXPENSE CATEGORIES
-- Maps user-friendly category names to GL accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  icon_name VARCHAR(50), -- Lucide icon name for UI
  color VARCHAR(20), -- Badge color for UI
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_sort ON expense_categories(sort_order);

-- =====================================================
-- 4. EXPENSES (User-Friendly Expense Recording)
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  expense_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  vendor_name VARCHAR(255),
  description TEXT NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer')),
  check_number VARCHAR(50),
  receipt_url TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_expense_id UUID, -- Will reference recurring_expenses
  journal_entry_id UUID REFERENCES journal_entries(id),
  status VARCHAR(20) DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_journal ON expenses(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(recurring_expense_id);

-- =====================================================
-- 5. RECURRING EXPENSES
-- Templates for automated expense generation
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  vendor_name VARCHAR(255),
  description TEXT NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer')),
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_generated_expense_id UUID REFERENCES expenses(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_run ON recurring_expenses(next_run_date) WHERE is_active = true;

-- Add foreign key constraint for recurring_expense_id after recurring_expenses table is created
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS fk_expenses_recurring;
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_recurring FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id);

-- =====================================================
-- 6. GENERAL LEDGER VIEW
-- =====================================================
CREATE OR REPLACE VIEW general_ledger AS
SELECT
  jel.id,
  je.entry_number,
  je.entry_date,
  je.description as entry_description,
  je.reference_type,
  je.reference_id,
  je.status as entry_status,
  a.code as account_code,
  a.name as account_name,
  a.account_type,
  jel.debit,
  jel.credit,
  jel.memo,
  je.created_at
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE je.status = 'posted'
ORDER BY je.entry_date DESC, je.entry_number, jel.line_number;

-- =====================================================
-- 7. ACCOUNT BALANCES VIEW
-- =====================================================
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id as account_id,
  a.code,
  a.name,
  a.account_type,
  a.account_subtype,
  COALESCE(SUM(jel.debit), 0) as total_debits,
  COALESCE(SUM(jel.credit), 0) as total_credits,
  CASE
    WHEN a.account_type IN ('asset', 'expense')
    THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
    ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
  END as balance
FROM accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
WHERE a.is_active = true
GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Accounts: All authenticated users can view
CREATE POLICY "Users can view accounts" ON accounts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Journal Entries: All authenticated users can view
CREATE POLICY "Users can view journal entries" ON journal_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create journal entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Journal Entry Lines: All authenticated users can view
CREATE POLICY "Users can view journal entry lines" ON journal_entry_lines
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create journal entry lines" ON journal_entry_lines
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Expense Categories: All authenticated users can view
CREATE POLICY "Users can view expense categories" ON expense_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expenses: All authenticated users can view and create
CREATE POLICY "Users can view expenses" ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create expenses" ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Recurring Expenses: All authenticated users can manage
CREATE POLICY "Users can view recurring expenses" ON recurring_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create recurring expenses" ON recurring_expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can update own recurring expenses" ON recurring_expenses
  FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can delete own recurring expenses" ON recurring_expenses
  FOR DELETE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- =====================================================
-- 9. SEED DEFAULT CHART OF ACCOUNTS
-- =====================================================
-- Insert default GL accounts if they don't exist

INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
  ('1010', 'Cash - Operating Account', 'asset', 'current_asset', true),
  ('1020', 'Accounts Receivable', 'asset', 'current_asset', true),
  ('1100', 'Inventory - Raw Materials', 'asset', 'current_asset', true),
  ('1200', 'Inventory - Finished Goods', 'asset', 'current_asset', true),
  ('1500', 'Equipment', 'asset', 'fixed_asset', true),
  ('2010', 'Accounts Payable', 'liability', 'current_liability', true),
  ('2100', 'Sales Tax Payable', 'liability', 'current_liability', true),
  ('3000', 'Owner Equity', 'equity', 'owner_equity', true),
  ('4000', 'Sales Revenue', 'revenue', 'sales', true),
  ('5100', 'Cost of Goods Sold - Ingredients', 'expense', 'cogs', true),
  ('5200', 'Cost of Goods Sold - Packaging', 'expense', 'cogs', true),
  ('5300', 'Cost of Goods Sold - Labor', 'expense', 'cogs', true),
  ('6100', 'Marketing & Advertising', 'expense', 'operating', true),
  ('6200', 'Technology & Software', 'expense', 'operating', true),
  ('6300', 'Payment Processing Fees', 'expense', 'operating', true),
  ('6400', 'Office Supplies', 'expense', 'operating', true),
  ('6500', 'Professional Services', 'expense', 'operating', true),
  ('6600', 'Utilities', 'expense', 'operating', true),
  ('6700', 'Rent & Facilities', 'expense', 'operating', true),
  ('6800', 'Insurance', 'expense', 'operating', true),
  ('6900', 'Other Operating Expenses', 'expense', 'operating', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 10. SEED DEFAULT EXPENSE CATEGORIES
-- Maps user-friendly categories to GL accounts
-- =====================================================
INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Ingredients' as name,
  'Raw materials and ingredients for production' as description,
  id as gl_account_id,
  'Package' as icon_name,
  'amber' as color,
  1 as sort_order
FROM accounts WHERE code = '5100'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Packaging Materials' as name,
  'Boxes, bottles, labels, and packaging supplies' as description,
  id as gl_account_id,
  'Box' as icon_name,
  'orange' as color,
  2 as sort_order
FROM accounts WHERE code = '5200'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Marketing & Advertising' as name,
  'Marketing campaigns, ads, promotions, social media' as description,
  id as gl_account_id,
  'Megaphone' as icon_name,
  'pink' as color,
  3 as sort_order
FROM accounts WHERE code = '6100'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Website & Hosting' as name,
  'Website hosting, domain registration, CDN services' as description,
  id as gl_account_id,
  'Globe' as icon_name,
  'cyan' as color,
  4 as sort_order
FROM accounts WHERE code = '6200'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Software & Tools' as name,
  'SaaS subscriptions, software licenses, productivity tools' as description,
  id as gl_account_id,
  'Laptop' as icon_name,
  'indigo' as color,
  5 as sort_order
FROM accounts WHERE code = '6200'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Payment Processing' as name,
  'Stripe fees, PayPal fees, merchant processing fees' as description,
  id as gl_account_id,
  'CreditCard' as icon_name,
  'green' as color,
  6 as sort_order
FROM accounts WHERE code = '6300'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Office Supplies' as name,
  'Paper, pens, printer ink, office equipment' as description,
  id as gl_account_id,
  'FileText' as icon_name,
  'orange' as color,
  7 as sort_order
FROM accounts WHERE code = '6400'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Professional Services' as name,
  'Legal fees, accounting services, consulting' as description,
  id as gl_account_id,
  'Briefcase' as icon_name,
  'purple' as color,
  8 as sort_order
FROM accounts WHERE code = '6500'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Utilities' as name,
  'Electric, water, internet, phone services' as description,
  id as gl_account_id,
  'Zap' as icon_name,
  'yellow' as color,
  9 as sort_order
FROM accounts WHERE code = '6600'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Rent & Facilities' as name,
  'Rent, storage units, facility maintenance' as description,
  id as gl_account_id,
  'Building' as icon_name,
  'red' as color,
  10 as sort_order
FROM accounts WHERE code = '6700'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Insurance' as name,
  'Business insurance, liability coverage, workers comp' as description,
  id as gl_account_id,
  'Shield' as icon_name,
  'blue' as color,
  11 as sort_order
FROM accounts WHERE code = '6800'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, gl_account_id, icon_name, color, sort_order)
SELECT
  'Other Expenses' as name,
  'Miscellaneous operating expenses' as description,
  id as gl_account_id,
  'MoreHorizontal' as icon_name,
  'gray' as color,
  99 as sort_order
FROM accounts WHERE code = '6900'
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
