-- =====================================================
-- CureCore ERP: Admin Settings Seed Data
-- Seed: 20250105_admin_settings_seed.sql
-- =====================================================

-- This seed creates a demo tenant with default settings

-- =====================================================
-- 1. DEMO TENANT
-- =====================================================
INSERT INTO tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'CureCBD Demo')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ORG SETTINGS (Default for demo tenant)
-- =====================================================
INSERT INTO org_settings (
  tenant_id,
  company_name,
  dba,
  legal_entity,
  ein,
  website,
  phone,
  address,
  fiscal_year_start,
  default_currency,
  default_timezone,
  batches_prefix,
  coas_prefix,
  invoices_prefix,
  pos_prefix,
  primary_color,
  secondary_color,
  dark_mode
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CureCBD LLC',
  'CureCBD',
  'CureCBD LLC',
  '12-3456789',
  'https://curecbd.com',
  '+1 (555) 123-4567',
  '{"line1": "123 Hemp Street", "line2": "Suite 100", "city": "Denver", "state": "CO", "postal": "80202", "country": "USA"}',
  '2025-01-01',
  'USD',
  'America/Denver',
  'CURE-{YYYY}{MM}-###',
  'COA-{BATCH}-{SEQ}',
  'INV-{FY}-####',
  'PO-{YYYY}-####',
  '#174940',
  '#2d7a67',
  false
)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 3. FORMULA PHASES (Default phases for manufacturing)
-- =====================================================
INSERT INTO formula_phases (tenant_id, name, code, description, sort_order, is_active, default_mix_temp_c, default_shear_time_min, default_target_ph)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Water Phase', 'WATER', 'Aqueous ingredients and water-soluble actives', 1, true, 75.0, 10.0, 7.0),
  ('00000000-0000-0000-0000-000000000001', 'Oil Phase', 'OIL', 'Lipophilic ingredients, oils, and fat-soluble actives', 2, true, 75.0, 15.0, NULL),
  ('00000000-0000-0000-0000-000000000001', 'Actives', 'ACTIVES', 'CBD, CBG, and other cannabinoid actives', 3, true, 45.0, 5.0, NULL),
  ('00000000-0000-0000-0000-000000000001', 'Cool-down', 'COOLDOWN', 'Heat-sensitive ingredients added below 45°C', 4, true, 40.0, 5.0, 5.5)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. INGREDIENT CATEGORIES (Default categories)
-- =====================================================
INSERT INTO ingredient_categories (tenant_id, name, code, description, sort_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Extracts', 'EXT', 'CBD, CBG, and botanical extracts', 1, true),
  ('00000000-0000-0000-0000-000000000001', 'Emulsifiers', 'EMUL', 'Surfactants and emulsifying agents', 2, true),
  ('00000000-0000-0000-0000-000000000001', 'Functional Additives', 'FUNC', 'Preservatives, antioxidants, chelating agents', 3, true),
  ('00000000-0000-0000-0000-000000000001', 'Carrier Oils', 'OILS', 'MCT, coconut, olive, and other carrier oils', 4, true),
  ('00000000-0000-0000-0000-000000000001', 'Thickeners', 'THICK', 'Gums, polymers, and viscosity modifiers', 5, true),
  ('00000000-0000-0000-0000-000000000001', 'Flavors & Fragrances', 'FRAG', 'Essential oils and flavor compounds', 6, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. CRM PIPELINE STAGES (Default sales pipeline)
-- =====================================================
INSERT INTO crm_pipeline_stages (tenant_id, name, probability, sla_hours, sort_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Contacted', 10, 48, 1, true),
  ('00000000-0000-0000-0000-000000000001', 'Demo Scheduled', 30, 72, 2, true),
  ('00000000-0000-0000-0000-000000000001', 'Proposal Sent', 60, 120, 3, true),
  ('00000000-0000-0000-0000-000000000001', 'Negotiation', 80, 168, 4, true),
  ('00000000-0000-0000-0000-000000000001', 'Closed Won', 100, NULL, 5, true),
  ('00000000-0000-0000-0000-000000000001', 'Closed Lost', 0, NULL, 6, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CRM LEAD SOURCES (Default lead sources)
-- =====================================================
INSERT INTO crm_lead_sources (tenant_id, name, description, sort_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Website', 'Organic web traffic and contact form', 1, true),
  ('00000000-0000-0000-0000-000000000001', 'Referral', 'Customer or partner referrals', 2, true),
  ('00000000-0000-0000-0000-000000000001', 'Trade Show', 'Industry events and conferences', 3, true),
  ('00000000-0000-0000-0000-000000000001', 'LinkedIn', 'Social media outreach', 4, true),
  ('00000000-0000-0000-0000-000000000001', 'Cold Outreach', 'Direct email or phone campaigns', 5, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. MANUFACTURING PREFERENCES
-- =====================================================
INSERT INTO mfg_prefs (tenant_id, default_yield_pct, include_scrap_pct, include_overhead)
VALUES ('00000000-0000-0000-0000-000000000001', 98.00, 2.00, true)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 8. INVENTORY PREFERENCES
-- =====================================================
INSERT INTO inventory_prefs (tenant_id, fefo_enabled, default_expiry_days)
VALUES ('00000000-0000-0000-0000-000000000001', true, 730)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 9. CRM PREFERENCES
-- =====================================================
INSERT INTO crm_prefs (tenant_id, auto_convert_lead)
VALUES ('00000000-0000-0000-0000-000000000001', false)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 10. FINANCE PREFERENCES
-- =====================================================
INSERT INTO finance_prefs (tenant_id, costing_method, overhead_pct, include_scrap, payment_terms, enabled_currencies)
VALUES ('00000000-0000-0000-0000-000000000001', 'WEIGHTED_AVG', 15.00, true, 'NET_30', ARRAY['USD', 'CAD'])
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 11. NOTIFICATION PREFERENCES
-- =====================================================
INSERT INTO notification_prefs (tenant_id, email_from, quiet_hours)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'notifications@curecbd.com',
  '{"start": "22:00", "end": "07:00", "timezone": "America/Denver"}'
)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 12. NOTIFICATION TRIGGERS (Default disabled)
-- =====================================================
INSERT INTO notification_triggers (tenant_id, key, enabled)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'low_stock', false),
  ('00000000-0000-0000-0000-000000000001', 'batch_complete', true),
  ('00000000-0000-0000-0000-000000000001', 'coa_ready', true),
  ('00000000-0000-0000-0000-000000000001', 'lead_qualified', false),
  ('00000000-0000-0000-0000-000000000001', 'opp_stage_change', false)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- =====================================================
-- 13. INTEGRATION PREFERENCES
-- =====================================================
INSERT INTO integration_prefs (tenant_id, analytics)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{"posthog_key": "", "ga_id": ""}'
)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 14. DATA ADMIN PREFERENCES
-- =====================================================
INSERT INTO data_admin_prefs (tenant_id, env_banner)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sandbox')
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 15. FEATURE FLAGS (Default flags)
-- =====================================================
INSERT INTO feature_flags (tenant_id, key, enabled)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'advanced_analytics', false),
  ('00000000-0000-0000-0000-000000000001', 'batch_automation', false),
  ('00000000-0000-0000-0000-000000000001', 'api_access', false),
  ('00000000-0000-0000-0000-000000000001', 'custom_reports', true)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- =====================================================
-- END OF SEED DATA
-- =====================================================
