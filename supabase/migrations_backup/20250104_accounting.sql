-- =====================================================
-- CureCore ERP: Accounting & Bookkeeping Module
-- Migration: 20250104_accounting.sql
-- =====================================================

-- =====================================================
-- 1. CHART OF ACCOUNTS
-- =====================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype VARCHAR(100), -- e.g., 'current_asset', 'fixed_asset', 'accounts_receivable'
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false, -- System accounts can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- =====================================================
-- 2. JOURNAL ENTRIES (Double-Entry Bookkeeping)
-- =====================================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- e.g., 'batch', 'sales_order', 'manual', 'payroll', 'invoice'
  reference_id UUID, -- ID of the related record
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

CREATE TABLE journal_entry_lines (
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

CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);

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

CREATE TRIGGER trigger_check_journal_balance
  AFTER INSERT OR UPDATE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_entry_balance();

-- =====================================================
-- 3. INVOICES (AR and AP unified)
-- =====================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('receivable', 'payable')),

  -- Customer (for AR) or Vendor (for AP)
  customer_id UUID REFERENCES crm_accounts(id),
  vendor_id UUID, -- Will reference vendors table when created

  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,

  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled')),

  -- Optional reference to sales order or purchase order
  sales_order_id UUID REFERENCES sales_orders(id),
  purchase_order_id UUID, -- For future PO implementation

  notes TEXT,
  terms TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_sales_order ON invoices(sales_order_id);

CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  account_id UUID REFERENCES accounts(id), -- GL account for this line
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- =====================================================
-- 4. PAYMENTS
-- =====================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50), -- e.g., 'check', 'ach', 'wire', 'credit_card', 'cash'
  reference_number VARCHAR(100), -- Check number, transaction ID, etc.
  bank_account_id UUID, -- Will reference bank_accounts
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- =====================================================
-- 5. BANK ACCOUNTS & TRANSACTIONS
-- =====================================================
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(255),
  routing_number VARCHAR(20),
  account_type VARCHAR(50), -- e.g., 'checking', 'savings', 'credit_card'
  gl_account_id UUID REFERENCES accounts(id), -- Link to Chart of Accounts
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  transaction_type VARCHAR(20), -- 'debit' or 'credit'

  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  matched_journal_entry_id UUID REFERENCES journal_entries(id),

  -- Import tracking
  imported_from VARCHAR(100),
  imported_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);

-- =====================================================
-- 6. TAX MANAGEMENT
-- =====================================================
CREATE TABLE tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rate DECIMAL(5,4) NOT NULL, -- e.g., 0.0825 for 8.25%
  jurisdiction VARCHAR(100), -- State, county, city
  gl_account_id UUID REFERENCES accounts(id), -- Tax liability account
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tax_code_id UUID NOT NULL REFERENCES tax_codes(id),
  taxable_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_taxes_invoice ON invoice_taxes(invoice_id);
CREATE INDEX idx_invoice_taxes_code ON invoice_taxes(tax_code_id);

-- =====================================================
-- 7. GENERAL LEDGER VIEW
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
-- 8. ACCOUNT BALANCES VIEW
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
-- 9. AR AGING REPORT VIEW
-- =====================================================
CREATE OR REPLACE VIEW ar_aging AS
SELECT
  i.id as invoice_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  ca.name as customer_name,
  i.total_amount,
  i.amount_paid,
  (i.total_amount - i.amount_paid) as balance,
  CURRENT_DATE - i.due_date as days_overdue,
  CASE
    WHEN i.status = 'paid' THEN 'Paid'
    WHEN CURRENT_DATE <= i.due_date THEN 'Current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30 Days'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60 Days'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90 Days'
    ELSE '90+ Days'
  END as aging_bucket
FROM invoices i
LEFT JOIN crm_accounts ca ON i.customer_id = ca.id
WHERE i.invoice_type = 'receivable'
  AND i.status NOT IN ('cancelled')
ORDER BY i.due_date;

-- =====================================================
-- 10. AP AGING REPORT VIEW
-- =====================================================
CREATE OR REPLACE VIEW ap_aging AS
SELECT
  i.id as invoice_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.vendor_id,
  i.total_amount,
  i.amount_paid,
  (i.total_amount - i.amount_paid) as balance,
  CURRENT_DATE - i.due_date as days_overdue,
  CASE
    WHEN i.status = 'paid' THEN 'Paid'
    WHEN CURRENT_DATE <= i.due_date THEN 'Current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30 Days'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60 Days'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90 Days'
    ELSE '90+ Days'
  END as aging_bucket
FROM invoices i
WHERE i.invoice_type = 'payable'
  AND i.status NOT IN ('cancelled')
ORDER BY i.due_date;

-- =====================================================
-- 11. TRIAL BALANCE VIEW
-- =====================================================
CREATE OR REPLACE VIEW trial_balance AS
SELECT
  a.code,
  a.name,
  a.account_type,
  CASE
    WHEN a.account_type IN ('asset', 'expense')
    THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
    ELSE 0
  END as debit_balance,
  CASE
    WHEN a.account_type IN ('liability', 'equity', 'revenue')
    THEN COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
    ELSE 0
  END as credit_balance
FROM accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
WHERE a.is_active = true
GROUP BY a.id, a.code, a.name, a.account_type
HAVING (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) != 0
   OR (COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)) != 0
ORDER BY a.code;

-- =====================================================
-- 12. SEED DEFAULT CHART OF ACCOUNTS
-- =====================================================
-- Assets
INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
('1000', 'Assets', 'asset', 'header', true),
('1100', 'Current Assets', 'asset', 'header', true),
('1110', 'Cash', 'asset', 'current_asset', true),
('1120', 'Accounts Receivable', 'asset', 'accounts_receivable', true),
('1130', 'Inventory - Raw Materials', 'asset', 'inventory', true),
('1140', 'Inventory - Work in Progress', 'asset', 'inventory', true),
('1150', 'Inventory - Finished Goods', 'asset', 'inventory', true),
('1160', 'Prepaid Expenses', 'asset', 'current_asset', true),
('1200', 'Fixed Assets', 'asset', 'header', true),
('1210', 'Equipment', 'asset', 'fixed_asset', true),
('1220', 'Accumulated Depreciation - Equipment', 'asset', 'fixed_asset', true),
('1230', 'Vehicles', 'asset', 'fixed_asset', true),
('1240', 'Accumulated Depreciation - Vehicles', 'asset', 'fixed_asset', true);

-- Liabilities
INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
('2000', 'Liabilities', 'liability', 'header', true),
('2100', 'Current Liabilities', 'liability', 'header', true),
('2110', 'Accounts Payable', 'liability', 'accounts_payable', true),
('2120', 'Sales Tax Payable', 'liability', 'current_liability', true),
('2130', 'Payroll Liabilities', 'liability', 'current_liability', true),
('2140', 'Accrued Expenses', 'liability', 'current_liability', true),
('2200', 'Long-term Liabilities', 'liability', 'header', true),
('2210', 'Notes Payable', 'liability', 'long_term_liability', true),
('2220', 'Loans Payable', 'liability', 'long_term_liability', true);

-- Equity
INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
('3000', 'Equity', 'equity', 'header', true),
('3100', 'Owner''s Equity', 'equity', 'equity', true),
('3200', 'Retained Earnings', 'equity', 'retained_earnings', true),
('3300', 'Current Year Earnings', 'equity', 'current_earnings', true);

-- Revenue
INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
('4000', 'Revenue', 'revenue', 'header', true),
('4100', 'Product Sales', 'revenue', 'sales', true),
('4200', 'Service Revenue', 'revenue', 'sales', true),
('4300', 'Other Income', 'revenue', 'other_income', true);

-- Cost of Goods Sold
INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
('5000', 'Cost of Goods Sold', 'expense', 'header', true),
('5100', 'Cost of Goods Manufactured', 'expense', 'cogs', true),
('5110', 'Direct Materials', 'expense', 'cogs', true),
('5120', 'Direct Labor', 'expense', 'cogs', true),
('5130', 'Manufacturing Overhead', 'expense', 'cogs', true);

-- Operating Expenses
INSERT INTO accounts (code, name, account_type, account_subtype, is_system_account) VALUES
('6000', 'Operating Expenses', 'expense', 'header', true),
('6100', 'Payroll Expenses', 'expense', 'operating', true),
('6200', 'Marketing & Advertising', 'expense', 'operating', true),
('6300', 'R&D Expenses', 'expense', 'operating', true),
('6400', 'Rent', 'expense', 'operating', true),
('6500', 'Utilities', 'expense', 'operating', true),
('6600', 'Insurance', 'expense', 'operating', true),
('6700', 'Office Supplies', 'expense', 'operating', true),
('6800', 'Professional Fees', 'expense', 'operating', true),
('6900', 'Depreciation Expense', 'expense', 'operating', true),
('7000', 'Other Expenses', 'expense', 'other', true);

-- =====================================================
-- 13. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_taxes ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for authenticated users (finance/admin roles)
-- Note: In production, you'd want more granular role-based policies

CREATE POLICY "Allow all for authenticated users" ON accounts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON journal_entries FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON journal_entry_lines FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON invoices FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON invoice_lines FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON bank_accounts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON bank_transactions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON tax_codes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for authenticated users" ON invoice_taxes FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 14. SEQUENCES FOR AUTO-NUMBERING
-- =====================================================
CREATE SEQUENCE journal_entry_number_seq START 1000;
CREATE SEQUENCE invoice_number_seq START 10000;
CREATE SEQUENCE payment_number_seq START 1000;

-- Functions to generate numbers
CREATE OR REPLACE FUNCTION generate_journal_entry_number()
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('journal_entry_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_number(inv_type VARCHAR)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF inv_type = 'receivable' THEN
    RETURN 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
  ELSE
    RETURN 'BILL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN 'PMT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('payment_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration Complete
-- =====================================================
