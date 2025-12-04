-- =====================================================
-- Finance Module: Journal Entries & Accounts Receivable
-- =====================================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID NULL REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(tenant_id, type) WHERE is_active = true;

-- Enable RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chart_of_accounts
CREATE POLICY "coa_select"
  ON chart_of_accounts FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "coa_insert"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "coa_update"
  ON chart_of_accounts FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "coa_delete"
  ON chart_of_accounts FOR DELETE
  USING (created_by = auth.uid());

-- Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  journal_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  reversed_from UUID NULL REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  posted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, journal_number)
);

CREATE INDEX IF NOT EXISTS idx_je_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(tenant_id, date);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entries
CREATE POLICY "je_select"
  ON journal_entries FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "je_insert"
  ON journal_entries FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "je_update"
  ON journal_entries FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "je_delete"
  ON journal_entries FOR DELETE
  USING (created_by = auth.uid());

-- Journal Entry Lines (details)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  journal_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  department_id UUID NULL,
  reference_type TEXT NULL,
  reference_id UUID NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT debit_or_credit_not_both CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_jel_journal ON journal_entry_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_tenant ON journal_entry_lines(tenant_id);

-- Enable RLS
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entry_lines
CREATE POLICY "jel_select"
  ON journal_entry_lines FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "jel_insert"
  ON journal_entry_lines FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "jel_update"
  ON journal_entry_lines FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "jel_delete"
  ON journal_entry_lines FOR DELETE
  USING (created_by = auth.uid());

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  payment_terms TEXT DEFAULT 'NET_30' CHECK (payment_terms IN ('NET_15', 'NET_30', 'NET_45', 'NET_60', 'DUE_ON_RECEIPT', 'COD')),
  credit_limit NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(tenant_id, name) WHERE is_active = true;

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "customers_select"
  ON customers FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "customers_insert"
  ON customers FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "customers_delete"
  ON customers FOR DELETE
  USING (created_by = auth.uid());

-- AR Invoices
CREATE TABLE IF NOT EXISTS ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount_total NUMERIC(15,2) NOT NULL CHECK (amount_total >= 0),
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due NUMERIC(15,2) GENERATED ALWAYS AS (amount_total - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'void', 'overdue')),
  memo TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_ar_invoices_tenant ON ar_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_customer ON ar_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON ar_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_due_date ON ar_invoices(tenant_id, due_date);

-- Enable RLS
ALTER TABLE ar_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ar_invoices
CREATE POLICY "ar_invoices_select"
  ON ar_invoices FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "ar_invoices_insert"
  ON ar_invoices FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "ar_invoices_update"
  ON ar_invoices FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "ar_invoices_delete"
  ON ar_invoices FOR DELETE
  USING (created_by = auth.uid());

-- AR Payments
CREATE TABLE IF NOT EXISTS ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES ar_invoices(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cash', 'check', 'wire', 'ach', 'credit_card', 'other')),
  reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_payments_tenant ON ar_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_invoice ON ar_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_customer ON ar_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_date ON ar_payments(tenant_id, payment_date);

-- Enable RLS
ALTER TABLE ar_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ar_payments
CREATE POLICY "ar_payments_select"
  ON ar_payments FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "ar_payments_insert"
  ON ar_payments FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "ar_payments_update"
  ON ar_payments FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "ar_payments_delete"
  ON ar_payments FOR DELETE
  USING (created_by = auth.uid());

-- AR Invoice Aging View
CREATE OR REPLACE VIEW ar_invoice_aging AS
SELECT
  i.id,
  i.tenant_id,
  i.invoice_number,
  i.customer_id,
  c.name AS customer_name,
  i.date_issued,
  i.due_date,
  i.balance_due,
  i.status,
  CURRENT_DATE - i.due_date AS days_overdue,
  CASE
    WHEN i.status IN ('paid', 'void') THEN 'paid'
    WHEN CURRENT_DATE <= i.due_date THEN 'current'
    WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30'
    WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM ar_invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.status IN ('open', 'partial', 'overdue');
