-- =====================================================
-- Finance Module: Accounts Payable
-- Migration: 20250107_accounts_payable.sql
-- =====================================================

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  payment_terms TEXT DEFAULT 'NET_30',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(tenant_id, is_active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select"
  ON vendors FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "vendors_insert"
  ON vendors FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "vendors_update"
  ON vendors FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "vendors_delete"
  ON vendors FOR DELETE
  USING (created_by = auth.uid());

-- AP Bills
CREATE TABLE IF NOT EXISTS ap_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bill_number TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'scheduled', 'paid', 'void')),
  amount_total NUMERIC(15,2) NOT NULL CHECK (amount_total >= 0),
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due NUMERIC(15,2) GENERATED ALWAYS AS (amount_total - amount_paid) STORED,
  purchase_order_id UUID NULL,
  scheduled_payment_date DATE NULL,
  memo TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_ap_bills_tenant ON ap_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_vendor ON ap_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_status ON ap_bills(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ap_bills_due_date ON ap_bills(tenant_id, due_date);

ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_bills_select"
  ON ap_bills FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "ap_bills_insert"
  ON ap_bills FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "ap_bills_update"
  ON ap_bills FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "ap_bills_delete"
  ON ap_bills FOR DELETE
  USING (created_by = auth.uid());

-- AP Bill Lines
CREATE TABLE IF NOT EXISTS ap_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bill_id UUID NOT NULL REFERENCES ap_bills(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_id UUID NULL REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ap_bill_lines_bill ON ap_bill_lines(bill_id);
CREATE INDEX IF NOT EXISTS idx_ap_bill_lines_account ON ap_bill_lines(account_id);

ALTER TABLE ap_bill_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_bill_lines_select"
  ON ap_bill_lines FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "ap_bill_lines_insert"
  ON ap_bill_lines FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "ap_bill_lines_update"
  ON ap_bill_lines FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "ap_bill_lines_delete"
  ON ap_bill_lines FOR DELETE
  USING (created_by = auth.uid());

-- AP Payments
CREATE TABLE IF NOT EXISTS ap_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bill_id UUID NOT NULL REFERENCES ap_bills(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('ach', 'wire', 'check', 'cash', 'credit_card', 'other')),
  reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ap_payments_tenant ON ap_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_bill ON ap_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_vendor ON ap_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_date ON ap_payments(tenant_id, payment_date);

ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_payments_select"
  ON ap_payments FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "ap_payments_insert"
  ON ap_payments FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "ap_payments_update"
  ON ap_payments FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "ap_payments_delete"
  ON ap_payments FOR DELETE
  USING (created_by = auth.uid());

-- AP Aging View
CREATE OR REPLACE VIEW ap_invoice_aging AS
SELECT
  b.id,
  b.tenant_id,
  b.bill_number,
  b.vendor_id,
  v.name AS vendor_name,
  b.bill_date,
  b.due_date,
  b.balance_due,
  b.status,
  CURRENT_DATE - b.due_date AS days_overdue,
  CASE
    WHEN b.status IN ('paid', 'void') THEN 'paid'
    WHEN CURRENT_DATE <= b.due_date THEN 'current'
    WHEN CURRENT_DATE - b.due_date BETWEEN 1 AND 30 THEN '1-30'
    WHEN CURRENT_DATE - b.due_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - b.due_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM ap_bills b
JOIN vendors v ON v.id = b.vendor_id
WHERE b.status IN ('open', 'scheduled');

-- Updated_at triggers
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ap_bills_updated_at
  BEFORE UPDATE ON ap_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

*** End Patch
