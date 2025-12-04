-- =====================================================
-- Finance Module Seed Data
-- =====================================================

-- Get demo tenant ID (assuming it exists from previous seeds)
DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_cash_account_id UUID;
  v_ar_account_id UUID;
  v_revenue_account_id UUID;
  v_cogs_account_id UUID;
  v_customer1_id UUID;
  v_customer2_id UUID;
  v_invoice1_id UUID;
  v_invoice2_id UUID;
  v_je1_id UUID;
  v_je2_id UUID;
BEGIN
  -- Get demo tenant
  SELECT id INTO v_tenant_id FROM auth.users WHERE email = 'admin@curecbd.com' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Demo tenant not found, skipping finance seed';
    RETURN;
  END IF;

  v_user_id := v_tenant_id; -- Same as tenant for simplicity

  -- ===== CHART OF ACCOUNTS =====

  -- Assets
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active)
  VALUES
    (v_tenant_id, '1000', 'Assets', 'asset', true),
    (v_tenant_id, '1010', 'Cash - Operating', 'asset', true),
    (v_tenant_id, '1020', 'Cash - Payroll', 'asset', true),
    (v_tenant_id, '1200', 'Accounts Receivable', 'asset', true),
    (v_tenant_id, '1300', 'Inventory - Raw Materials', 'asset', true),
    (v_tenant_id, '1310', 'Inventory - Finished Goods', 'asset', true)
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_cash_account_id;

  -- Get IDs for later use
  SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '1010';
  SELECT id INTO v_ar_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '1200';

  -- Liabilities
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active)
  VALUES
    (v_tenant_id, '2000', 'Liabilities', 'liability', true),
    (v_tenant_id, '2010', 'Accounts Payable', 'liability', true),
    (v_tenant_id, '2020', 'Payroll Liabilities', 'liability', true),
    (v_tenant_id, '2100', 'Sales Tax Payable', 'liability', true)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Equity
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active)
  VALUES
    (v_tenant_id, '3000', 'Equity', 'equity', true),
    (v_tenant_id, '3010', 'Owner''s Equity', 'equity', true),
    (v_tenant_id, '3020', 'Retained Earnings', 'equity', true)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Revenue
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active)
  VALUES
    (v_tenant_id, '4000', 'Revenue', 'revenue', true),
    (v_tenant_id, '4010', 'Product Sales', 'revenue', true),
    (v_tenant_id, '4020', 'Shipping Revenue', 'revenue', true)
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_revenue_account_id;

  SELECT id INTO v_revenue_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '4010';

  -- Expenses
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active)
  VALUES
    (v_tenant_id, '5000', 'Cost of Goods Sold', 'expense', true),
    (v_tenant_id, '5010', 'Direct Materials', 'expense', true),
    (v_tenant_id, '5020', 'Direct Labor', 'expense', true),
    (v_tenant_id, '6000', 'Operating Expenses', 'expense', true),
    (v_tenant_id, '6010', 'Rent Expense', 'expense', true),
    (v_tenant_id, '6020', 'Utilities', 'expense', true),
    (v_tenant_id, '6030', 'Marketing', 'expense', true)
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_cogs_account_id;

  SELECT id INTO v_cogs_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '5000';

  -- ===== CUSTOMERS =====

  INSERT INTO customers (tenant_id, name, email, phone, payment_terms, credit_limit, is_active)
  VALUES
    (v_tenant_id, 'Whole Foods Market', 'ap@wholefoods.com', '555-0100', 'NET_30', 50000.00, true),
    (v_tenant_id, 'Natural Grocers', 'billing@naturalgrocers.com', '555-0200', 'NET_45', 30000.00, true),
    (v_tenant_id, 'Local Health Store', 'orders@localhealthstore.com', '555-0300', 'NET_15', 10000.00, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_customer1_id;

  SELECT id INTO v_customer1_id FROM customers WHERE tenant_id = v_tenant_id AND email = 'ap@wholefoods.com';
  SELECT id INTO v_customer2_id FROM customers WHERE tenant_id = v_tenant_id AND email = 'billing@naturalgrocers.com';

  -- ===== AR INVOICES =====

  -- Invoice 1: Open with partial payment
  INSERT INTO ar_invoices (
    tenant_id, invoice_number, customer_id, date_issued, due_date,
    amount_total, amount_paid, status, memo, created_by
  )
  VALUES (
    v_tenant_id,
    'INV-2025-001',
    v_customer1_id,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days',
    5250.00,
    2000.00,
    'partial',
    'Monthly product order',
    v_user_id
  )
  ON CONFLICT (tenant_id, invoice_number) DO NOTHING
  RETURNING id INTO v_invoice1_id;

  SELECT id INTO v_invoice1_id FROM ar_invoices WHERE tenant_id = v_tenant_id AND invoice_number = 'INV-2025-001';

  -- Partial payment for invoice 1
  IF v_invoice1_id IS NOT NULL THEN
    INSERT INTO ar_payments (
      tenant_id, invoice_id, customer_id, payment_date, amount, method, reference, created_by
    )
    VALUES (
      v_tenant_id,
      v_invoice1_id,
      v_customer1_id,
      CURRENT_DATE - INTERVAL '5 days',
      2000.00,
      'wire',
      'WIRE-20250105-001',
      v_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Invoice 2: Overdue
  INSERT INTO ar_invoices (
    tenant_id, invoice_number, customer_id, date_issued, due_date,
    amount_total, amount_paid, status, memo, created_by
  )
  VALUES (
    v_tenant_id,
    'INV-2024-248',
    v_customer2_id,
    CURRENT_DATE - INTERVAL '45 days',
    CURRENT_DATE - INTERVAL '15 days',
    3850.00,
    0.00,
    'open',
    'Q4 bulk order',
    v_user_id
  )
  ON CONFLICT (tenant_id, invoice_number) DO NOTHING
  RETURNING id INTO v_invoice2_id;

  -- Invoice 3: Paid
  INSERT INTO ar_invoices (
    tenant_id, invoice_number, customer_id, date_issued, due_date,
    amount_total, amount_paid, status, memo, created_by
  )
  VALUES (
    v_tenant_id,
    'INV-2024-250',
    v_customer1_id,
    CURRENT_DATE - INTERVAL '35 days',
    CURRENT_DATE - INTERVAL '5 days',
    1200.00,
    1200.00,
    'paid',
    'Sample products',
    v_user_id
  )
  ON CONFLICT (tenant_id, invoice_number) DO NOTHING;

  -- ===== JOURNAL ENTRIES =====

  -- Journal Entry 1: Draft (inventory purchase)
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by
  )
  VALUES (
    v_tenant_id,
    'JE-2025-001',
    CURRENT_DATE,
    'Raw materials purchase - Hemp extract',
    'draft',
    v_user_id
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je1_id;

  SELECT id INTO v_je1_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-001';

  IF v_je1_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order)
    VALUES
      (v_tenant_id, v_je1_id, (SELECT id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '1300'), 'Hemp extract - 10kg', 1500.00, 0, 0),
      (v_tenant_id, v_je1_id, v_cash_account_id, 'Payment to supplier', 0, 1500.00, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Journal Entry 2: Posted (revenue recognition)
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-002',
    CURRENT_DATE - INTERVAL '7 days',
    'Revenue recognition for December sales',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '7 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je2_id;

  SELECT id INTO v_je2_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-002';

  IF v_je2_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order)
    VALUES
      (v_tenant_id, v_je2_id, v_ar_account_id, 'December product sales', 15000.00, 0, 0),
      (v_tenant_id, v_je2_id, v_revenue_account_id, 'Revenue recognition', 0, 12000.00, 1),
      (v_tenant_id, v_je2_id, (SELECT id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '2100'), 'Sales tax collected', 0, 3000.00, 2)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Finance seed data created successfully';

END $$;
