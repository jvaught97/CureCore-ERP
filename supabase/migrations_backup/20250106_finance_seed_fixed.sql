-- =====================================================
-- Finance Module Seed Data (FIXED)
-- =====================================================
-- This seed script uses auth.uid() as the tenant_id
-- Run this while logged in as the user you want to seed data for

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_cash_account_id UUID;
  v_ar_account_id UUID;
  v_revenue_account_id UUID;
  v_cogs_account_id UUID;
  v_bank_fee_account_id UUID;
  v_interest_income_account_id UUID;
  v_customer1_id UUID;
  v_customer2_id UUID;
  v_invoice1_id UUID;
  v_invoice2_id UUID;
  v_invoice3_id UUID;
  v_je0_id UUID;
  v_je1_id UUID;
  v_je2_id UUID;
  v_je3_id UUID;
  v_je4_id UUID;
  v_je5_id UUID;
  v_je6_id UUID;
  v_bank_account_id UUID;
  v_statement_id UUID;
BEGIN
  -- Get current user as both tenant and user
  v_tenant_id := auth.uid();
  v_user_id := auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No authenticated user found, skipping finance seed';
    RETURN;
  END IF;

  -- Journal Entry 4: Posted bank interest income
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-004',
    CURRENT_DATE - INTERVAL '8 days',
    'Monthly bank interest',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '8 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je4_id;

  SELECT id INTO v_je4_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-004';

  IF v_je4_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je4_id, v_cash_account_id, 'Bank interest credited', 75.00, 0, 0, v_user_id),
      (v_tenant_id, v_je4_id, v_interest_income_account_id, 'Interest income', 0, 75.00, 1, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Seeding finance data for tenant: %', v_tenant_id;

  -- ===== CHART OF ACCOUNTS =====

  -- Assets
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
  VALUES
    (v_tenant_id, '1000', 'Assets', 'asset', true, v_user_id),
    (v_tenant_id, '1010', 'Cash - Operating', 'asset', true, v_user_id),
    (v_tenant_id, '1020', 'Cash - Payroll', 'asset', true, v_user_id),
    (v_tenant_id, '1200', 'Accounts Receivable', 'asset', true, v_user_id),
    (v_tenant_id, '1300', 'Inventory - Raw Materials', 'asset', true, v_user_id),
    (v_tenant_id, '1310', 'Inventory - Finished Goods', 'asset', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Get IDs for later use
  SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '1010';
  SELECT id INTO v_ar_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '1200';

  -- Liabilities
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
  VALUES
    (v_tenant_id, '2000', 'Liabilities', 'liability', true, v_user_id),
    (v_tenant_id, '2010', 'Accounts Payable', 'liability', true, v_user_id),
    (v_tenant_id, '2020', 'Payroll Liabilities', 'liability', true, v_user_id),
    (v_tenant_id, '2100', 'Sales Tax Payable', 'liability', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Equity
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
  VALUES
    (v_tenant_id, '3000', 'Equity', 'equity', true, v_user_id),
    (v_tenant_id, '3010', 'Owner''s Equity', 'equity', true, v_user_id),
    (v_tenant_id, '3020', 'Retained Earnings', 'equity', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Revenue
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
  VALUES
    (v_tenant_id, '4000', 'Revenue', 'revenue', true, v_user_id),
    (v_tenant_id, '4010', 'Product Sales', 'revenue', true, v_user_id),
    (v_tenant_id, '4020', 'Shipping Revenue', 'revenue', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  SELECT id INTO v_revenue_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '4010';

  -- Expenses
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
  VALUES
    (v_tenant_id, '5000', 'Cost of Goods Sold', 'expense', true, v_user_id),
    (v_tenant_id, '5010', 'Direct Materials', 'expense', true, v_user_id),
    (v_tenant_id, '5020', 'Direct Labor', 'expense', true, v_user_id),
    (v_tenant_id, '6000', 'Operating Expenses', 'expense', true, v_user_id),
    (v_tenant_id, '6010', 'Rent Expense', 'expense', true, v_user_id),
    (v_tenant_id, '6020', 'Utilities', 'expense', true, v_user_id),
    (v_tenant_id, '6030', 'Marketing', 'expense', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  SELECT id INTO v_cogs_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '5000';

  -- Additional accounts for finance workflows
  INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
  VALUES
    (v_tenant_id, '4100', 'Interest Income', 'revenue', true, v_user_id),
    (v_tenant_id, '6100', 'Bank Service Charges', 'expense', true, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  SELECT id INTO v_interest_income_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '4100';
  SELECT id INTO v_bank_fee_account_id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '6100';

  -- ===== CUSTOMERS =====

  INSERT INTO customers (tenant_id, name, email, phone, payment_terms, credit_limit, is_active, created_by)
  VALUES
    (v_tenant_id, 'Whole Foods Market', 'ap@wholefoods.com', '555-0100', 'NET_30', 50000.00, true, v_user_id),
    (v_tenant_id, 'Natural Grocers', 'billing@naturalgrocers.com', '555-0200', 'NET_45', 30000.00, true, v_user_id),
    (v_tenant_id, 'Local Health Store', 'orders@localhealthstore.com', '555-0300', 'NET_15', 10000.00, true, v_user_id)
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

  SELECT id INTO v_invoice2_id FROM ar_invoices WHERE tenant_id = v_tenant_id AND invoice_number = 'INV-2024-248';

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
  ON CONFLICT (tenant_id, invoice_number) DO NOTHING
  RETURNING id INTO v_invoice3_id;

  SELECT id INTO v_invoice3_id FROM ar_invoices WHERE tenant_id = v_tenant_id AND invoice_number = 'INV-2024-250';

  IF v_invoice3_id IS NOT NULL THEN
    INSERT INTO ar_payments (
      tenant_id, invoice_id, customer_id, payment_date, amount, method, reference, created_by
    )
    VALUES (
      v_tenant_id,
      v_invoice3_id,
      v_customer1_id,
      CURRENT_DATE - INTERVAL '10 days',
      1200.00,
      'ach',
      'ACH-20250105-002',
      v_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===== JOURNAL ENTRIES =====

  -- Journal Entry 0: Opening cash balance
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-000',
    (CURRENT_DATE - INTERVAL '31 days')::date,
    'Opening balance for operating cash',
    'posted',
    v_user_id,
    (CURRENT_DATE - INTERVAL '31 days')::date
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je0_id;

  SELECT id INTO v_je0_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-000';

  IF v_je0_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je0_id, v_cash_account_id, 'Opening balance true-up', 12500.00, 0, 0, v_user_id),
      (v_tenant_id, v_je0_id, (SELECT id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '3020'), 'Offset to retained earnings', 0, 12500.00, 1, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Journal Entry 1: Posted (inventory purchase)
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-001',
    CURRENT_DATE - INTERVAL '18 days',
    'Raw materials purchase - Hemp extract',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '17 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je1_id;

  SELECT id INTO v_je1_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-001';

  IF v_je1_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je1_id, (SELECT id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '1300'), 'Hemp extract - 10kg', 1500.00, 0, 0, v_user_id),
      (v_tenant_id, v_je1_id, v_cash_account_id, 'Payment to supplier', 0, 1500.00, 1, v_user_id)
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
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je2_id, v_ar_account_id, 'December product sales', 15000.00, 0, 0, v_user_id),
      (v_tenant_id, v_je2_id, v_revenue_account_id, 'Revenue recognition', 0, 12000.00, 1, v_user_id),
      (v_tenant_id, v_je2_id, (SELECT id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '2100'), 'Sales tax collected', 0, 3000.00, 2, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Journal Entry 3: Posted operating expense payment
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-003',
    CURRENT_DATE - INTERVAL '12 days',
    'Office rent payment',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '12 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je3_id;

  SELECT id INTO v_je3_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-003';

  IF v_je3_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je3_id, (SELECT id FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND code = '6010'), 'Monthly office rent', 2200.00, 0, 0, v_user_id),
      (v_tenant_id, v_je3_id, v_cash_account_id, 'Rent cash disbursement', 0, 2200.00, 1, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Journal Entry 4: Posted bank interest income
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-004',
    CURRENT_DATE - INTERVAL '8 days',
    'Monthly bank interest',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '8 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je4_id;

  SELECT id INTO v_je4_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-004';

  IF v_je4_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je4_id, v_cash_account_id, 'Bank interest credited', 75.00, 0, 0, v_user_id),
      (v_tenant_id, v_je4_id, v_interest_income_account_id, 'Interest income', 0, 75.00, 1, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Journal Entry 5: Posted customer payment (Whole Foods)
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-005',
    CURRENT_DATE - INTERVAL '5 days',
    'Customer payment - Whole Foods',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '5 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je5_id;

  SELECT id INTO v_je5_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-005';

  IF v_je5_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je5_id, v_cash_account_id, 'Whole Foods payment receipt', 2000.00, 0, 0, v_user_id),
      (v_tenant_id, v_je5_id, v_ar_account_id, 'Apply to invoice INV-2025-001', 0, 2000.00, 1, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Journal Entry 6: Posted customer payment (Local Health Store)
  INSERT INTO journal_entries (
    tenant_id, journal_number, date, memo, status, created_by, posted_at
  )
  VALUES (
    v_tenant_id,
    'JE-2025-006',
    CURRENT_DATE - INTERVAL '10 days',
    'Customer payment - Local Health Store',
    'posted',
    v_user_id,
    CURRENT_DATE - INTERVAL '10 days'
  )
  ON CONFLICT (tenant_id, journal_number) DO NOTHING
  RETURNING id INTO v_je6_id;

  SELECT id INTO v_je6_id FROM journal_entries WHERE tenant_id = v_tenant_id AND journal_number = 'JE-2025-006';

  IF v_je6_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (tenant_id, journal_id, account_id, description, debit, credit, sort_order, created_by)
    VALUES
      (v_tenant_id, v_je6_id, v_cash_account_id, 'Local Health Store payment receipt', 1200.00, 0, 0, v_user_id),
      (v_tenant_id, v_je6_id, v_ar_account_id, 'Apply to invoice INV-2024-250', 0, 1200.00, 1, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===== BANK ACCOUNTS & STATEMENTS =====

  INSERT INTO bank_accounts (
    tenant_id, name, bank_name, account_number, gl_account_id, is_active, created_by
  )
  VALUES (
    v_tenant_id,
    'Chase Operating',
    'Chase Bank',
    '****4321',
    v_cash_account_id,
    true,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_bank_account_id;

  SELECT id INTO v_bank_account_id FROM bank_accounts WHERE tenant_id = v_tenant_id AND name = 'Chase Operating';

  IF v_bank_account_id IS NOT NULL THEN
    INSERT INTO bank_statements (
      tenant_id, bank_account_id, start_date, end_date,
      starting_balance, ending_balance, imported_by
    )
    VALUES (
      v_tenant_id,
      v_bank_account_id,
      (CURRENT_DATE - INTERVAL '30 days')::date,
      (CURRENT_DATE - INTERVAL '1 day')::date,
      12500.00,
      15440.00,
      v_user_id
    )
    ON CONFLICT (tenant_id, bank_account_id, start_date, end_date) DO NOTHING
    RETURNING id INTO v_statement_id;

    SELECT id INTO v_statement_id FROM bank_statements
    WHERE tenant_id = v_tenant_id
      AND bank_account_id = v_bank_account_id
      AND start_date = (CURRENT_DATE - INTERVAL '30 days')::date
      AND end_date = (CURRENT_DATE - INTERVAL '1 day')::date;
  END IF;

  IF v_statement_id IS NOT NULL THEN
    INSERT INTO bank_statement_lines (
      tenant_id, statement_id, date, description, amount, type, reference, cleared, created_at, updated_at
    ) VALUES
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '17 days')::date, 'Payment - Raw materials supplier', -1500.00, 'debit', 'WIRE-RAW-1500', true, now(), now()),
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '12 days')::date, 'ACH - Office rent', -2200.00, 'debit', 'ACH-RENT-2200', true, now(), now()),
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '10 days')::date, 'Deposit - Local Health Store', 1200.00, 'credit', 'DEP-LHS-1200', true, now(), now()),
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '8 days')::date, 'Interest credit', 75.00, 'credit', 'INT-75', true, now(), now()),
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '5 days')::date, 'Deposit - Whole Foods partial', 2000.00, 'credit', 'DEP-WF-2000', true, now(), now()),
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '4 days')::date, 'Bank service fee', -35.00, 'debit', 'FEE-35', false, now(), now()),
      (v_tenant_id, v_statement_id, (CURRENT_DATE - INTERVAL '3 days')::date, 'Deposit - Amazon Marketplace', 3400.00, 'credit', 'DEP-AMZ-3400', false, now(), now())
    ON CONFLICT DO NOTHING;
  END IF;


  RAISE NOTICE 'Finance seed data created successfully for tenant: %', v_tenant_id;

END $$;
