-- =====================================================
-- CureCore ERP: Admin Settings Module (FIXED)
-- Migration: 20250105_admin_settings.sql
-- Fixed: Helper functions use public schema instead of auth
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TENANTS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. USERS/PROFILES TABLE (ensure tenant_id, status, last_login_at)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='tenant_id') THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='status') THEN
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- 3. ACTIVITY LOG (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  actor_user_id UUID NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON activity_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log (entity, entity_id);

-- =====================================================
-- 4. ORG SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  company_name TEXT,
  dba TEXT,
  legal_entity TEXT,
  ein TEXT,
  website TEXT,
  phone TEXT,
  address JSONB,
  fiscal_year_start DATE,
  default_currency TEXT DEFAULT 'USD',
  default_timezone TEXT,
  batches_prefix TEXT DEFAULT 'CURE-{YYYY}{MM}-###',
  coas_prefix TEXT DEFAULT 'COA-{BATCH}-{SEQ}',
  invoices_prefix TEXT DEFAULT 'INV-{FY}-####',
  pos_prefix TEXT DEFAULT 'PO-{YYYY}-####',
  primary_color TEXT DEFAULT '#174940',
  secondary_color TEXT,
  dark_mode BOOLEAN DEFAULT false,
  navbar_logo_url TEXT,
  invoice_logo_url TEXT,
  packing_logo_url TEXT,
  analytics_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_settings_tenant ON org_settings(tenant_id);

-- =====================================================
-- 5. ROLE PERMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_user ON role_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id);

-- =====================================================
-- 6. INVENTORY SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredient_categories_tenant ON ingredient_categories(tenant_id, sort_order);

CREATE TABLE IF NOT EXISTS inventory_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  fefo_enabled BOOLEAN DEFAULT false,
  default_expiry_days INT,
  uom JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. MANUFACTURING SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS formula_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_mix_temp_c NUMERIC(6,2),
  default_shear_time_min NUMERIC(6,2),
  default_target_ph NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formula_phases_tenant ON formula_phases(tenant_id, sort_order);

CREATE TABLE IF NOT EXISTS mfg_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  default_yield_pct NUMERIC(6,2) DEFAULT 100.00,
  include_scrap_pct NUMERIC(6,2) DEFAULT 0.00,
  include_overhead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. CRM SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_sources_tenant ON crm_lead_sources(tenant_id, sort_order);

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  probability INT NOT NULL CHECK (probability BETWEEN 0 AND 100),
  sla_hours INT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_tenant ON crm_pipeline_stages(tenant_id, sort_order);

CREATE TABLE IF NOT EXISTS crm_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  auto_convert_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. FINANCE SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  costing_method TEXT DEFAULT 'WEIGHTED_AVG',
  overhead_pct NUMERIC(6,2) DEFAULT 0.00,
  include_scrap BOOLEAN DEFAULT false,
  payment_terms TEXT DEFAULT 'NET_30',
  enabled_currencies TEXT[] DEFAULT ARRAY['USD'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. NOTIFICATIONS & AUTOMATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  email_from TEXT,
  smtp JSONB,
  slack_webhook_url TEXT,
  webhook_secret TEXT,
  quiet_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

-- =====================================================
-- 11. INTEGRATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  analytics JSONB,
  sentry_dsn TEXT,
  shipping JSONB,
  tax_engine JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. DATA ADMIN
-- =====================================================
CREATE TABLE IF NOT EXISTS data_admin_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  env_banner TEXT DEFAULT 'Sandbox',
  backup_last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

-- =====================================================
-- 13. HELPER FUNCTIONS (public schema - FIXED)
-- =====================================================

-- Helper function to get tenant_id from JWT
CREATE OR REPLACE FUNCTION public.get_user_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'admin',
    false
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- 14. ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- ACTIVITY_LOG
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_activity"
  ON activity_log FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_activity_admin"
  ON activity_log FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND public.is_user_admin()
  );

-- ORG_SETTINGS
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_org_settings"
  ON org_settings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_org_settings_admin"
  ON org_settings FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- ROLE_PERMISSIONS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_permissions"
  ON role_permissions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_permissions_admin"
  ON role_permissions FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- INGREDIENT_CATEGORIES
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_categories"
  ON ingredient_categories FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_categories_admin"
  ON ingredient_categories FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- INVENTORY_PREFS
ALTER TABLE inventory_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_inventory_prefs"
  ON inventory_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_inventory_prefs_admin"
  ON inventory_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- FORMULA_PHASES
ALTER TABLE formula_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_phases"
  ON formula_phases FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_phases_admin"
  ON formula_phases FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- MFG_PREFS
ALTER TABLE mfg_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_mfg_prefs"
  ON mfg_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_mfg_prefs_admin"
  ON mfg_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- CRM_LEAD_SOURCES
ALTER TABLE crm_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_lead_sources"
  ON crm_lead_sources FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_lead_sources_admin"
  ON crm_lead_sources FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- CRM_PIPELINE_STAGES
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_pipeline_stages"
  ON crm_pipeline_stages FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_pipeline_stages_admin"
  ON crm_pipeline_stages FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- CRM_PREFS
ALTER TABLE crm_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_crm_prefs"
  ON crm_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_crm_prefs_admin"
  ON crm_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- FINANCE_PREFS
ALTER TABLE finance_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_finance_prefs"
  ON finance_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_finance_prefs_admin"
  ON finance_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- NOTIFICATION_PREFS
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_notification_prefs"
  ON notification_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_notification_prefs_admin"
  ON notification_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- NOTIFICATION_TRIGGERS
ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_notification_triggers"
  ON notification_triggers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_notification_triggers_admin"
  ON notification_triggers FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- INTEGRATION_PREFS
ALTER TABLE integration_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_integration_prefs"
  ON integration_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_integration_prefs_admin"
  ON integration_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- DATA_ADMIN_PREFS
ALTER TABLE data_admin_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_data_admin_prefs"
  ON data_admin_prefs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_data_admin_prefs_admin"
  ON data_admin_prefs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- FEATURE_FLAGS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_tenant_feature_flags"
  ON feature_flags FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "write_own_tenant_feature_flags_admin"
  ON feature_flags FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_user_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_user_admin());

-- =====================================================
-- 15. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_settings_updated_at BEFORE UPDATE ON org_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredient_categories_updated_at BEFORE UPDATE ON ingredient_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_prefs_updated_at BEFORE UPDATE ON inventory_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formula_phases_updated_at BEFORE UPDATE ON formula_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mfg_prefs_updated_at BEFORE UPDATE ON mfg_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_lead_sources_updated_at BEFORE UPDATE ON crm_lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_pipeline_stages_updated_at BEFORE UPDATE ON crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_prefs_updated_at BEFORE UPDATE ON crm_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_prefs_updated_at BEFORE UPDATE ON finance_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON notification_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_triggers_updated_at BEFORE UPDATE ON notification_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_prefs_updated_at BEFORE UPDATE ON integration_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_admin_prefs_updated_at BEFORE UPDATE ON data_admin_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
