-- =====================================================
-- Finance Module: Bank Reconciliation Workspace
-- Migration: 20250108_bank_reconciliation.sql
-- =====================================================

-- Helper to allow finance role in addition to admin
CREATE OR REPLACE FUNCTION auth.has_finance_access() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'finance'),
    false
  );
$$ LANGUAGE SQL STABLE;

-- Update activity log policy to allow finance role inserts
DROP POLICY IF EXISTS "write_own_tenant_activity_admin" ON activity_log;

CREATE POLICY "write_own_tenant_activity_finance"
  ON activity_log FOR INSERT
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  );

-- =====================================================
-- 1. BANK ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_gl ON bank_accounts(gl_account_id);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select"
  ON bank_accounts FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "bank_accounts_write"
  ON bank_accounts FOR ALL
  USING (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  )
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  );

-- =====================================================
-- 2. BANK STATEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  starting_balance NUMERIC(14,2) NOT NULL,
  ending_balance NUMERIC(14,2) NOT NULL,
  imported_by UUID NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, bank_account_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant ON bank_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_statements_select"
  ON bank_statements FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "bank_statements_write"
  ON bank_statements FOR ALL
  USING (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  )
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  );

-- =====================================================
-- 3. BANK STATEMENT LINES
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  type TEXT,
  reference TEXT,
  matched_ledger_id UUID,
  cleared BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_statement ON bank_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_tenant ON bank_statement_lines(tenant_id);

ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_statement_lines_select"
  ON bank_statement_lines FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "bank_statement_lines_write"
  ON bank_statement_lines FOR ALL
  USING (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  )
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  );

-- =====================================================
-- 4. BANK RECONCILIATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE RESTRICT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  ending_balance_per_bank NUMERIC(14,2) NOT NULL,
  ending_balance_per_books NUMERIC(14,2) NOT NULL DEFAULT 0,
  difference NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, statement_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_tenant ON bank_reconciliations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_status ON bank_reconciliations(tenant_id, status);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_reconciliations_select"
  ON bank_reconciliations FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "bank_reconciliations_write"
  ON bank_reconciliations FOR ALL
  USING (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  )
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  );

-- =====================================================
-- 5. BANK RECONCILIATION LINES
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_reconciliation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reconciliation_id UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  statement_line_id UUID REFERENCES bank_statement_lines(id) ON DELETE SET NULL,
  ledger_entry_id UUID,
  ledger_entry_type TEXT,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_by UUID NOT NULL,
  auto_matched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_lines_recon ON bank_reconciliation_lines(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_lines_statement ON bank_reconciliation_lines(statement_line_id);

ALTER TABLE bank_reconciliation_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_recon_lines_select"
  ON bank_reconciliation_lines FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "bank_recon_lines_write"
  ON bank_reconciliation_lines FOR ALL
  USING (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  )
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_finance_access()
  );

-- =====================================================
-- 6. TRIGGERS
-- =====================================================
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_statement_lines_updated_at
  BEFORE UPDATE ON bank_statement_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_reconciliations_updated_at
  BEFORE UPDATE ON bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

