-- =====================================================
-- Tax Management & Financial Support Modules
-- =====================================================
-- Multi-tenant tax compliance and support ticketing

-- =====================================================
-- TAX MANAGEMENT
-- =====================================================

-- Jurisdictions where tax is collected (state/province/country)
CREATE TABLE IF NOT EXISTS tax_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  nexus_start DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_tenant ON tax_jurisdictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_active ON tax_jurisdictions(tenant_id, active);

-- Tax categories for products/services
CREATE TABLE IF NOT EXISTS tax_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tax_categories_tenant ON tax_categories(tenant_id);

-- Rates by jurisdiction & category
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES tax_jurisdictions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tax_categories(id) ON DELETE RESTRICT,
  rate NUMERIC(6,4) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, jurisdiction_id, category_id, start_date),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant ON tax_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_jurisdiction ON tax_rates(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_dates ON tax_rates(start_date, end_date);

-- Product/SKU → Tax category mapping
CREATE TABLE IF NOT EXISTS tax_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES tax_categories(id) ON DELETE RESTRICT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_product_mappings_tenant ON tax_product_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_product_mappings_product ON tax_product_mappings(product_id);

-- Customer exemption certificates
CREATE TABLE IF NOT EXISTS tax_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  certificate_number TEXT NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  file_url TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_tax_exemptions_tenant ON tax_exemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_customer ON tax_exemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_tax_exemptions_expiring ON tax_exemptions(tenant_id, valid_to) WHERE active = true;

-- Transactions captured for tax reporting
CREATE TABLE IF NOT EXISTS tax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  date DATE NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  customer_id UUID NOT NULL,
  taxable_amount NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  exemption_applied BOOLEAN DEFAULT false,
  category_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_transactions_tenant ON tax_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_date ON tax_transactions(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_jurisdiction ON tax_transactions(tenant_id, jurisdiction_code, date);

-- Filing calendar & returns
CREATE TABLE IF NOT EXISTS tax_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES tax_jurisdictions(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','prepared','filed','paid','amended')),
  total_tax_due NUMERIC(14,2) DEFAULT 0,
  total_tax_paid NUMERIC(14,2) DEFAULT 0,
  filed_at TIMESTAMPTZ,
  payment_date DATE,
  reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, jurisdiction_id, period_start, period_end),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_tax_filings_tenant ON tax_filings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_status ON tax_filings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tax_filings_due ON tax_filings(tenant_id, due_date);

-- =====================================================
-- FINANCIAL SUPPORT
-- =====================================================

-- Help center articles
CREATE TABLE IF NOT EXISTS support_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_support_articles_tenant ON support_articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_articles_published ON support_articles(tenant_id, is_published);
CREATE INDEX IF NOT EXISTS idx_support_articles_tags ON support_articles USING GIN(tags);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_by UUID NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('AR','AP','Tax','Reconciliation','Reporting','Other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  description TEXT,
  attachments TEXT[],
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON support_tickets(created_by);

-- Support comments
CREATE TABLE IF NOT EXISTS support_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_comments_ticket ON support_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_comments_tenant ON support_comments(tenant_id);

-- Support preferences (SLA config)
CREATE TABLE IF NOT EXISTS support_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  default_assignee UUID,
  email_from TEXT,
  notify_on_new BOOLEAN DEFAULT true,
  sla_hours_low INT DEFAULT 72,
  sla_hours_normal INT DEFAULT 48,
  sla_hours_high INT DEFAULT 24,
  sla_hours_urgent INT DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Tax Jurisdictions
ALTER TABLE tax_jurisdictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_jurisdictions_select ON tax_jurisdictions;
CREATE POLICY tax_jurisdictions_select ON tax_jurisdictions
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_jurisdictions_write ON tax_jurisdictions;
CREATE POLICY tax_jurisdictions_write ON tax_jurisdictions
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Tax Categories
ALTER TABLE tax_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_categories_select ON tax_categories;
CREATE POLICY tax_categories_select ON tax_categories
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_categories_write ON tax_categories;
CREATE POLICY tax_categories_write ON tax_categories
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Tax Rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_rates_select ON tax_rates;
CREATE POLICY tax_rates_select ON tax_rates
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_rates_write ON tax_rates;
CREATE POLICY tax_rates_write ON tax_rates
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Tax Product Mappings
ALTER TABLE tax_product_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_product_mappings_select ON tax_product_mappings;
CREATE POLICY tax_product_mappings_select ON tax_product_mappings
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_product_mappings_write ON tax_product_mappings;
CREATE POLICY tax_product_mappings_write ON tax_product_mappings
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Tax Exemptions
ALTER TABLE tax_exemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_exemptions_select ON tax_exemptions;
CREATE POLICY tax_exemptions_select ON tax_exemptions
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_exemptions_write ON tax_exemptions;
CREATE POLICY tax_exemptions_write ON tax_exemptions
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Tax Transactions
ALTER TABLE tax_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_transactions_select ON tax_transactions;
CREATE POLICY tax_transactions_select ON tax_transactions
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_transactions_write ON tax_transactions;
CREATE POLICY tax_transactions_write ON tax_transactions
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Tax Filings
ALTER TABLE tax_filings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_filings_select ON tax_filings;
CREATE POLICY tax_filings_select ON tax_filings
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS tax_filings_write ON tax_filings;
CREATE POLICY tax_filings_write ON tax_filings
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Support Articles
ALTER TABLE support_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_articles_select ON support_articles;
CREATE POLICY support_articles_select ON support_articles
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS support_articles_write ON support_articles;
CREATE POLICY support_articles_write ON support_articles
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- Support Tickets (anyone can create; admin/finance can manage)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select ON support_tickets;
CREATE POLICY support_tickets_select ON support_tickets
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS support_tickets_insert ON support_tickets;
CREATE POLICY support_tickets_insert ON support_tickets
  FOR INSERT WITH CHECK (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS support_tickets_update ON support_tickets;
CREATE POLICY support_tickets_update ON support_tickets
  FOR UPDATE USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (
      created_by::text = auth.uid()::text
      OR (auth.jwt()->>'role') IN ('admin', 'finance')
    )
  );

-- Support Comments
ALTER TABLE support_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_comments_select ON support_comments;
CREATE POLICY support_comments_select ON support_comments
  FOR SELECT USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (
      is_internal = false
      OR (auth.jwt()->>'role') IN ('admin', 'finance')
    )
  );

DROP POLICY IF EXISTS support_comments_insert ON support_comments;
CREATE POLICY support_comments_insert ON support_comments
  FOR INSERT WITH CHECK (tenant_id::text = auth.jwt()->>'tenant_id');

-- Support Prefs
ALTER TABLE support_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_prefs_select ON support_prefs;
CREATE POLICY support_prefs_select ON support_prefs
  FOR SELECT USING (tenant_id::text = auth.jwt()->>'tenant_id');

DROP POLICY IF EXISTS support_prefs_write ON support_prefs;
CREATE POLICY support_prefs_write ON support_prefs
  FOR ALL USING (
    tenant_id::text = auth.jwt()->>'tenant_id'
    AND (auth.jwt()->>'role') IN ('admin', 'finance')
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_jurisdictions_updated_at ON tax_jurisdictions;
CREATE TRIGGER tax_jurisdictions_updated_at
  BEFORE UPDATE ON tax_jurisdictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tax_categories_updated_at ON tax_categories;
CREATE TRIGGER tax_categories_updated_at
  BEFORE UPDATE ON tax_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tax_rates_updated_at ON tax_rates;
CREATE TRIGGER tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tax_product_mappings_updated_at ON tax_product_mappings;
CREATE TRIGGER tax_product_mappings_updated_at
  BEFORE UPDATE ON tax_product_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tax_exemptions_updated_at ON tax_exemptions;
CREATE TRIGGER tax_exemptions_updated_at
  BEFORE UPDATE ON tax_exemptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tax_filings_updated_at ON tax_filings;
CREATE TRIGGER tax_filings_updated_at
  BEFORE UPDATE ON tax_filings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS support_articles_updated_at ON support_articles;
CREATE TRIGGER support_articles_updated_at
  BEFORE UPDATE ON support_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS support_prefs_updated_at ON support_prefs;
CREATE TRIGGER support_prefs_updated_at
  BEFORE UPDATE ON support_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
