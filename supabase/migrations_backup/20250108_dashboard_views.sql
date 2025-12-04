-- =====================================================
-- Dashboard Support Views (20250108_dashboard_views.sql)
-- =====================================================

-- Drop and recreate to ensure idempotency

CREATE OR REPLACE VIEW v_batches_daily AS
WITH src AS (
  SELECT
    COALESCE(b.tenant_id, u.tenant_id) AS tenant_id,
    date_trunc('day', b.created_at)::date AS day,
    b.manufacturing_status,
    CASE
      WHEN b.expected_yield IS NOT NULL
        AND b.expected_yield > 0
        AND b.actual_yield IS NOT NULL
      THEN (b.actual_yield / b.expected_yield) * 100
      ELSE NULL
    END AS yield_pct,
    COALESCE(b.scrap_pct, NULL) AS scrap_pct
  FROM batches b
  LEFT JOIN users u ON u.id = b.created_by
)
SELECT
  tenant_id,
  day,
  COUNT(*) FILTER (WHERE manufacturing_status IN ('in_process','completed')) AS batches,
  COUNT(*) FILTER (WHERE manufacturing_status = 'completed') AS completed,
  AVG(yield_pct) AS avg_yield_pct,
  AVG(scrap_pct) AS avg_scrap_pct
FROM src
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, day;

CREATE OR REPLACE VIEW v_inventory_low AS
WITH src AS (
  SELECT
    COALESCE(i.tenant_id, u.tenant_id) AS tenant_id,
    i.id AS ingredient_id,
    i.name,
    COALESCE(i.current_stock, i.on_hand, 0) AS on_hand_qty,
    COALESCE(i.par_level, i.reorder_point) AS par_level
  FROM ingredients i
  LEFT JOIN users u ON u.id = i.created_by
)
SELECT *
FROM src
WHERE tenant_id IS NOT NULL
  AND par_level IS NOT NULL
  AND on_hand_qty < par_level;

CREATE OR REPLACE VIEW v_opportunity_pipeline AS
WITH src AS (
  SELECT
    COALESCE(o.tenant_id, u.tenant_id) AS tenant_id,
    o.stage,
    COALESCE(o.value_amount, 0) AS value_sum,
    COALESCE(o.probability_pct, 0) AS probability_pct
  FROM crm_opportunities o
  LEFT JOIN users u ON u.id = o.created_by
  WHERE o.stage IS NOT NULL
)
SELECT
  tenant_id,
  stage,
  SUM(value_sum) AS value_sum,
  SUM(value_sum * (probability_pct / 100.0)) AS weighted_sum
FROM src
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, stage;

CREATE OR REPLACE VIEW v_ar_aging AS
SELECT
  i.tenant_id,
  i.id AS invoice_id,
  i.customer_id,
  i.invoice_number,
  i.due_date,
  GREATEST((CURRENT_DATE - i.due_date), 0) AS days_outstanding,
  i.amount_total,
  i.amount_paid,
  i.balance_due,
  CASE
    WHEN CURRENT_DATE <= i.due_date THEN 'current'
    WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30'
    WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END AS bucket
FROM ar_invoices i
WHERE i.status IN ('open','partial')
  AND i.balance_due > 0;

-- P&L rollup derived from posted journal entry lines
CREATE OR REPLACE VIEW v_pnl_rollup AS
WITH line_amounts AS (
  SELECT
    COALESCE(jel.tenant_id, je.tenant_id, coa.tenant_id) AS tenant_id,
    date_trunc('month', je.date)::date AS month,
    coa.code,
    coa.type,
    (COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0)) AS amount
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_id
  JOIN chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.status = 'posted'
)
SELECT
  tenant_id,
  month,
  SUM(CASE WHEN type = 'revenue' THEN -amount ELSE 0 END) AS revenue,
  SUM(CASE
        WHEN type = 'expense' AND (code >= '5000' AND code < '6000') THEN amount
        ELSE 0
      END) AS cogs,
  SUM(CASE
        WHEN type = 'expense' AND (code < '5000' OR code >= '6000') THEN amount
        ELSE 0
      END) AS opex
FROM line_amounts
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, month;

-- Bank balances derived from journal entry lines for linked bank accounts
CREATE OR REPLACE VIEW v_bank_balances AS
WITH totals AS (
  SELECT
    ba.tenant_id,
    ba.id AS bank_account_id,
    ba.gl_account_id,
    CURRENT_DATE AS as_of_date,
    SUM(CASE WHEN je.status = 'posted' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) ELSE 0 END) AS balance
  FROM bank_accounts ba
  LEFT JOIN journal_entry_lines jel
    ON jel.account_id = ba.gl_account_id
  LEFT JOIN journal_entries je
    ON je.id = jel.journal_id
  GROUP BY ba.tenant_id, ba.id, ba.gl_account_id
)
SELECT
  tenant_id,
  bank_account_id,
  gl_account_id,
  as_of_date,
  COALESCE(balance, 0) AS ending_balance
FROM totals;
