-- =====================================================
-- Tax & Support Seed Data
-- =====================================================
-- Run this while logged in as the user you want to seed data for

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_jurisdiction_ok UUID;
  v_jurisdiction_tx UUID;
  v_category_topical UUID;
  v_category_food UUID;
BEGIN
  -- Get current user as both tenant and user
  v_tenant_id := auth.uid();
  v_user_id := auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No authenticated user found, skipping tax/support seed';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding tax & support data for tenant: %', v_tenant_id;

  -- ===== TAX JURISDICTIONS =====

  INSERT INTO tax_jurisdictions (tenant_id, code, name, country, nexus_start, active, created_by)
  VALUES
    (v_tenant_id, 'US-OK', 'Oklahoma', 'US', '2024-01-01', true, v_user_id),
    (v_tenant_id, 'US-TX', 'Texas', 'US', '2024-06-01', true, v_user_id),
    (v_tenant_id, 'US-CA', 'California', 'US', NULL, false, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_jurisdiction_ok;

  SELECT id INTO v_jurisdiction_ok FROM tax_jurisdictions WHERE tenant_id = v_tenant_id AND code = 'US-OK';
  SELECT id INTO v_jurisdiction_tx FROM tax_jurisdictions WHERE tenant_id = v_tenant_id AND code = 'US-TX';

  -- ===== TAX CATEGORIES =====

  INSERT INTO tax_categories (tenant_id, code, name, description, active, created_by)
  VALUES
    (v_tenant_id, 'TOPICAL_NONRX', 'Topical Non-Prescription', 'Topical CBD products sold without prescription', true, v_user_id),
    (v_tenant_id, 'FOOD_BEVERAGE', 'Food & Beverage', 'Edible CBD products', true, v_user_id),
    (v_tenant_id, 'SERVICES', 'Services', 'Consulting and services', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_category_topical;

  SELECT id INTO v_category_topical FROM tax_categories WHERE tenant_id = v_tenant_id AND code = 'TOPICAL_NONRX';
  SELECT id INTO v_category_food FROM tax_categories WHERE tenant_id = v_tenant_id AND code = 'FOOD_BEVERAGE';

  -- ===== TAX RATES =====

  INSERT INTO tax_rates (tenant_id, jurisdiction_id, category_id, rate, start_date, end_date, active, created_by)
  VALUES
    (v_tenant_id, v_jurisdiction_ok, v_category_topical, 0.0875, '2024-01-01', NULL, true, v_user_id),
    (v_tenant_id, v_jurisdiction_ok, v_category_food, 0.0450, '2024-01-01', NULL, true, v_user_id),
    (v_tenant_id, v_jurisdiction_tx, v_category_topical, 0.0825, '2024-06-01', NULL, true, v_user_id)
  ON CONFLICT (tenant_id, jurisdiction_id, category_id, start_date) DO NOTHING;

  -- ===== TAX EXEMPTIONS =====

  -- Insert sample exemption (assumes customer exists)
  INSERT INTO tax_exemptions (
    tenant_id, customer_id, certificate_number, jurisdiction_code,
    valid_from, valid_to, active, created_by
  )
  SELECT
    v_tenant_id,
    c.id,
    'EXEMPT-2024-001',
    'US-OK',
    '2024-01-01',
    '2025-12-31',
    true,
    v_user_id
  FROM customers c
  WHERE c.tenant_id = v_tenant_id
    AND c.email = 'ap@wholefoods.com'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- ===== TAX TRANSACTIONS =====

  -- Sample transactions (assumes invoices exist)
  INSERT INTO tax_transactions (
    tenant_id, source_type, source_id, date, jurisdiction_code,
    customer_id, taxable_amount, tax_amount, exemption_applied, category_code
  )
  SELECT
    v_tenant_id,
    'invoice',
    inv.id,
    inv.date_issued,
    'US-OK',
    inv.customer_id,
    inv.amount_total,
    inv.amount_total * 0.0875,
    false,
    'TOPICAL_NONRX'
  FROM ar_invoices inv
  WHERE inv.tenant_id = v_tenant_id
    AND inv.date_issued >= CURRENT_DATE - INTERVAL '90 days'
  LIMIT 5
  ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING;

  -- ===== TAX FILINGS =====

  -- Sample filing for last month
  INSERT INTO tax_filings (
    tenant_id, jurisdiction_id, period_start, period_end,
    frequency, due_date, status, total_tax_due, created_by
  )
  VALUES
    (
      v_tenant_id,
      v_jurisdiction_ok,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date,
      (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::date,
      'monthly',
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '19 days')::date,
      'prepared',
      450.00,
      v_user_id
    )
  ON CONFLICT (tenant_id, jurisdiction_id, period_start, period_end) DO NOTHING;

  -- ===== SUPPORT ARTICLES =====

  INSERT INTO support_articles (tenant_id, slug, title, body, tags, is_published, created_by)
  VALUES
    (
      v_tenant_id,
      'how-to-apply-payment',
      'How to Apply a Customer Payment',
      E'# Applying Customer Payments\n\n1. Navigate to AR → Invoices\n2. Find the open invoice\n3. Click "Record Payment"\n4. Enter payment details (amount, date, method, reference)\n5. Submit to apply payment and update invoice status\n\nPayments are automatically matched to invoices. Partial payments are supported.',
      ARRAY['AR', 'Payments', 'Invoices'],
      true,
      v_user_id
    ),
    (
      v_tenant_id,
      'tax-exemption-setup',
      'Setting Up Tax Exemptions',
      E'# Tax Exemption Certificates\n\nFor customers with valid exemption certificates:\n\n1. Go to Tax Management → Exemptions tab\n2. Click "Add Exemption"\n3. Select customer and jurisdiction\n4. Enter certificate number and validity dates\n5. Upload certificate file (PDF/image)\n6. Save\n\nExemptions are automatically applied to future invoices for that customer in the specified jurisdiction.',
      ARRAY['Tax', 'Exemptions', 'Setup'],
      true,
      v_user_id
    ),
    (
      v_tenant_id,
      'bank-reconciliation-workflow',
      'Monthly Bank Reconciliation Process',
      E'# Bank Reconciliation Workflow\n\n## Monthly Process\n\n1. **Import Statement**: Upload CSV from your bank\n2. **Smart Match**: Auto-match transactions (80% typically)\n3. **Manual Review**: Match remaining items\n4. **Adjustments**: Create JEs for bank fees/interest\n5. **Verify**: Check that difference = $0\n6. **Finalize**: Lock the reconciliation\n7. **Export**: Download PDF for records\n\n## Tips\n- Run reconciliation within 5 days of month-end\n- Review unmatched items carefully\n- Keep copies of bank statements',
      ARRAY['Reconciliation', 'Process', 'Banking'],
      true,
      v_user_id
    ),
    (
      v_tenant_id,
      'financial-reports-overview',
      'Understanding Financial Reports',
      E'# Financial Reports Overview\n\n## Available Reports\n\n**P&L Statement**: Revenue and expenses by period\n**Balance Sheet**: Assets, liabilities, equity snapshot\n**Cash Flow**: Cash movements by category\n**AR Aging**: Outstanding invoices by age\n**AP Aging**: Unpaid bills by age\n\n## Generating Reports\n\n1. Navigate to Reports section\n2. Select report type\n3. Choose date range or period\n4. Apply filters (department, account, etc.)\n5. Export to PDF or Excel\n\nReports refresh daily at midnight.',
      ARRAY['Reports', 'P&L', 'Balance Sheet'],
      true,
      v_user_id
    ),
    (
      v_tenant_id,
      'support-sla-guide',
      'Support SLA and Response Times',
      E'# Support Service Levels\n\n## Response Times\n\n- **Urgent**: 8 hours\n- **High**: 24 hours\n- **Normal**: 48 hours\n- **Low**: 72 hours\n\n## Ticket Categories\n\n- **AR/AP**: Receivables and payables issues\n- **Tax**: Tax compliance and filing questions\n- **Reconciliation**: Bank and account reconciliation\n- **Reporting**: Report generation and analysis\n- **Other**: General finance questions\n\n## Creating Effective Tickets\n\n- Use descriptive subject lines\n- Include relevant dates, amounts, references\n- Attach screenshots if helpful\n- Select appropriate priority',
      ARRAY['Support', 'SLA', 'Tickets'],
      true,
      v_user_id
    )
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  -- ===== SUPPORT TICKETS =====

  INSERT INTO support_tickets (
    tenant_id, created_by, subject, category, priority, status, description
  )
  VALUES
    (
      v_tenant_id,
      v_user_id,
      'Question about AR aging report',
      'Reporting',
      'normal',
      'open',
      'I need help understanding the AR aging buckets. Are they based on invoice date or due date?'
    ),
    (
      v_tenant_id,
      v_user_id,
      'Tax filing deadline approaching',
      'Tax',
      'high',
      'in_progress',
      'Oklahoma sales tax filing is due in 5 days. Need to review transactions before filing.'
    ),
    (
      v_tenant_id,
      v_user_id,
      'Bank reconciliation difference',
      'Reconciliation',
      'normal',
      'resolved',
      'Found a $50 discrepancy in last month reconciliation. Turned out to be a duplicate transaction.'
    )
  ON CONFLICT DO NOTHING;

  -- ===== SUPPORT PREFERENCES =====

  INSERT INTO support_prefs (
    tenant_id, notify_on_new, sla_hours_low, sla_hours_normal, sla_hours_high, sla_hours_urgent
  )
  VALUES
    (v_tenant_id, true, 72, 48, 24, 8)
  ON CONFLICT (tenant_id) DO UPDATE
    SET notify_on_new = EXCLUDED.notify_on_new,
        sla_hours_low = EXCLUDED.sla_hours_low,
        sla_hours_normal = EXCLUDED.sla_hours_normal,
        sla_hours_high = EXCLUDED.sla_hours_high,
        sla_hours_urgent = EXCLUDED.sla_hours_urgent;

  RAISE NOTICE 'Tax & support seed data created successfully for tenant: %', v_tenant_id;

END $$;
