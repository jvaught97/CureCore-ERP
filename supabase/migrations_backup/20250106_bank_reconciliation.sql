-- =====================================================
-- Bank Reconciliation Module
-- =====================================================
-- Complete bank reconciliation system with import, matching, and finalization

-- =====================================================
-- TABLES
-- =====================================================

-- Bank accounts mapped to GL cash accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  gl_account_id UUID NOT NULL, -- FK to chart_of_accounts.id (cash account)
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Imported statement header
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, bank_account_id, start_date, end_date)
);

-- Imported statement lines (raw)
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL, -- positive=credit, negative=debit (bank perspective)
  type TEXT, -- optional: 'debit'|'credit'
  reference TEXT,
  matched_ledger_id UUID, -- optional reference to a ledger row id
  cleared BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reconciliation session (one per statement per period)
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, statement_id)
);

-- Matches (ledger ↔ statement). ledger_entry_type hints where to look up full source.
CREATE TABLE IF NOT EXISTS bank_reconciliation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reconciliation_id UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  statement_line_id UUID REFERENCES bank_statement_lines(id) ON DELETE SET NULL,
  ledger_entry_id UUID, -- id of JE line, AR payment, AP payment, etc.
  ledger_entry_type TEXT, -- 'je_line'|'ar_payment'|'ap_payment'|...
  matched_at TIMESTAMPTZ DEFAULT now(),
  matched_by UUID NOT NULL,
  auto_matched BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activity log (ensure it exists)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  actor_user_id UUID NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_gl ON bank_accounts(gl_account_id);

CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant ON bank_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);

CREATE INDEX IF NOT EXISTS idx_bsl_tenant ON bank_statement_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bsl_stmt ON bank_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_bsl_date ON bank_statement_lines(date);
CREATE INDEX IF NOT EXISTS idx_bsl_amount ON bank_statement_lines(amount);
CREATE INDEX IF NOT EXISTS idx_bsl_cleared ON bank_statement_lines(cleared);

CREATE INDEX IF NOT EXISTS idx_recon_tenant ON bank_reconciliations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recon_account ON bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_recon_statement ON bank_reconciliations(statement_id);
CREATE INDEX IF NOT EXISTS idx_recon_status ON bank_reconciliations(status);

CREATE INDEX IF NOT EXISTS idx_recon_lines_tenant ON bank_reconciliation_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recon_lines_recon ON bank_reconciliation_lines(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_recon_lines_stmt ON bank_reconciliation_lines(statement_line_id);
CREATE INDEX IF NOT EXISTS idx_recon_lines_ledger ON bank_reconciliation_lines(ledger_entry_id, ledger_entry_type);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity, entity_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Bank Accounts Policies
DROP POLICY IF EXISTS bank_accounts_select ON bank_accounts;
CREATE POLICY bank_accounts_select ON bank_accounts
  FOR SELECT
  USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS bank_accounts_insert ON bank_accounts;
CREATE POLICY bank_accounts_insert ON bank_accounts
  FOR INSERT
  WITH CHECK (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_accounts_update ON bank_accounts;
CREATE POLICY bank_accounts_update ON bank_accounts
  FOR UPDATE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_accounts_delete ON bank_accounts;
CREATE POLICY bank_accounts_delete ON bank_accounts
  FOR DELETE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Bank Statements Policies
DROP POLICY IF EXISTS bank_statements_select ON bank_statements;
CREATE POLICY bank_statements_select ON bank_statements
  FOR SELECT
  USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS bank_statements_insert ON bank_statements;
CREATE POLICY bank_statements_insert ON bank_statements
  FOR INSERT
  WITH CHECK (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_statements_update ON bank_statements;
CREATE POLICY bank_statements_update ON bank_statements
  FOR UPDATE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_statements_delete ON bank_statements;
CREATE POLICY bank_statements_delete ON bank_statements
  FOR DELETE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Bank Statement Lines Policies
DROP POLICY IF EXISTS bank_statement_lines_select ON bank_statement_lines;
CREATE POLICY bank_statement_lines_select ON bank_statement_lines
  FOR SELECT
  USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS bank_statement_lines_insert ON bank_statement_lines;
CREATE POLICY bank_statement_lines_insert ON bank_statement_lines
  FOR INSERT
  WITH CHECK (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_statement_lines_update ON bank_statement_lines;
CREATE POLICY bank_statement_lines_update ON bank_statement_lines
  FOR UPDATE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_statement_lines_delete ON bank_statement_lines;
CREATE POLICY bank_statement_lines_delete ON bank_statement_lines
  FOR DELETE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Bank Reconciliations Policies
DROP POLICY IF EXISTS bank_reconciliations_select ON bank_reconciliations;
CREATE POLICY bank_reconciliations_select ON bank_reconciliations
  FOR SELECT
  USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS bank_reconciliations_insert ON bank_reconciliations;
CREATE POLICY bank_reconciliations_insert ON bank_reconciliations
  FOR INSERT
  WITH CHECK (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_reconciliations_update ON bank_reconciliations;
CREATE POLICY bank_reconciliations_update ON bank_reconciliations
  FOR UPDATE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_reconciliations_delete ON bank_reconciliations;
CREATE POLICY bank_reconciliations_delete ON bank_reconciliations
  FOR DELETE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Bank Reconciliation Lines Policies
DROP POLICY IF EXISTS bank_reconciliation_lines_select ON bank_reconciliation_lines;
CREATE POLICY bank_reconciliation_lines_select ON bank_reconciliation_lines
  FOR SELECT
  USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS bank_reconciliation_lines_insert ON bank_reconciliation_lines;
CREATE POLICY bank_reconciliation_lines_insert ON bank_reconciliation_lines
  FOR INSERT
  WITH CHECK (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_reconciliation_lines_update ON bank_reconciliation_lines;
CREATE POLICY bank_reconciliation_lines_update ON bank_reconciliation_lines
  FOR UPDATE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

DROP POLICY IF EXISTS bank_reconciliation_lines_delete ON bank_reconciliation_lines;
CREATE POLICY bank_reconciliation_lines_delete ON bank_reconciliation_lines
  FOR DELETE
  USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Activity Log Policies
DROP POLICY IF EXISTS activity_log_select ON activity_log;
CREATE POLICY activity_log_select ON activity_log
  FOR SELECT
  USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS activity_log_insert ON activity_log;
CREATE POLICY activity_log_insert ON activity_log
  FOR INSERT
  WITH CHECK (tenant_id::text = auth.jwt()->>'tenant_id');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate book balance for a cash account as of a date
CREATE OR REPLACE FUNCTION get_books_cash_balance(
  p_tenant_id UUID,
  p_gl_account_id UUID,
  p_as_of_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC := 0;
BEGIN
  -- Sum all posted journal entry lines for this GL account up to and including the date
  SELECT COALESCE(SUM(debit - credit), 0)
  INTO v_balance
  FROM journal_entry_lines jel
  INNER JOIN journal_entries je ON je.id = jel.journal_id
  WHERE jel.tenant_id = p_tenant_id
    AND jel.account_id = p_gl_account_id
    AND je.status = 'posted'
    AND je.date <= p_as_of_date;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-calculate reconciliation differences
CREATE OR REPLACE FUNCTION recalculate_reconciliation(p_reconciliation_id UUID)
RETURNS void AS $$
DECLARE
  v_recon RECORD;
  v_deposits_in_transit NUMERIC := 0;
  v_outstanding_checks NUMERIC := 0;
  v_books_balance NUMERIC := 0;
  v_difference NUMERIC := 0;
BEGIN
  -- Get reconciliation record
  SELECT * INTO v_recon
  FROM bank_reconciliations
  WHERE id = p_reconciliation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reconciliation not found';
  END IF;

  -- Calculate books balance from GL
  SELECT get_books_cash_balance(
    v_recon.tenant_id,
    (SELECT gl_account_id FROM bank_accounts WHERE id = v_recon.bank_account_id),
    (SELECT end_date FROM bank_statements WHERE id = v_recon.statement_id)
  ) INTO v_books_balance;

  -- Calculate deposits in transit (uncleared positive amounts on statement)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_deposits_in_transit
  FROM bank_statement_lines
  WHERE statement_id = v_recon.statement_id
    AND cleared = false
    AND amount > 0;

  -- Calculate outstanding checks (uncleared negative amounts on statement)
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_outstanding_checks
  FROM bank_statement_lines
  WHERE statement_id = v_recon.statement_id
    AND cleared = false
    AND amount < 0;

  -- Calculate difference: bank balance + deposits - checks - books balance
  v_difference := v_recon.ending_balance_per_bank + v_deposits_in_transit - v_outstanding_checks - v_books_balance;

  -- Update reconciliation
  UPDATE bank_reconciliations
  SET ending_balance_per_books = v_books_balance,
      difference = v_difference,
      updated_at = now()
  WHERE id = p_reconciliation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at on bank_accounts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bank_statements_updated_at ON bank_statements;
CREATE TRIGGER bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bank_statement_lines_updated_at ON bank_statement_lines;
CREATE TRIGGER bank_statement_lines_updated_at
  BEFORE UPDATE ON bank_statement_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bank_reconciliations_updated_at ON bank_reconciliations;
CREATE TRIGGER bank_reconciliations_updated_at
  BEFORE UPDATE ON bank_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
