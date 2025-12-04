# Bank Reconciliation Quick Start Guide

## Prerequisites

- Supabase project linked
- Admin or Finance role user
- Chart of Accounts with codes: `1010` (Cash), `6100` (Bank Fees), `4100` (Interest Income)

## 1. Run Migrations

Choose one option:

### Option A: Remote (Production/Staging)

```bash
# Make sure you're linked to the correct project
supabase link --project-ref your-project-ref

# Run the bank reconciliation migration
supabase db push
```

### Option B: Local Development

```bash
# Start local Supabase
supabase start

# Run migration
supabase db reset

# Or apply specific migration
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20250108_bank_reconciliation.sql
```

## 2. Seed Test Data

The finance seed (`20250106_finance_seed_fixed.sql`) includes:
- Bank account "Chase Operating" linked to GL 1010
- Sample statement with 7 transactions
- Matching journal entries

Run while authenticated as your test user:

```bash
# Login to Supabase
supabase login

# Run seed script
psql $DATABASE_URL -f supabase/migrations/20250106_finance_seed_fixed.sql
```

Or use the SQL editor in Supabase Dashboard.

## 3. Start Development Server

```bash
npm run dev
```

Navigate to: `http://localhost:3000/finance/reconciliation`

## 4. Test Workflow

### A. Import Statement

1. Click **"Import Statement"**
2. Fill in form:
   - Bank Account: `Chase Operating`
   - Start Date: `2024-12-01`
   - End Date: `2024-12-31`
   - Starting Balance: `12500.00`
   - Ending Balance: `15440.00`
   - File: Upload [`dev/fixtures/bank_statement_sample.csv`](../dev/fixtures/bank_statement_sample.csv)
3. Click **"Import"**
4. Should navigate to reconciliation workspace

### B. Smart Match

1. Click **"Smart Match"** button in workspace
2. Should see toast: "Matched X transactions"
3. Statement table should show cleared items (✅)

### C. Manual Match

1. Find an unmatched statement line (❌)
2. Click **"Match"** button
3. Drawer opens with candidate ledger entries
4. Click a candidate → Match created

### D. Create Bank Adjustment

1. Scroll to footer summary panel
2. Find unmatched bank fee (-$35.00)
3. Click **"Create Bank Fee JE"**
4. Fill in:
   - Amount: `35.00`
   - Memo: `Bank service charge`
   - Date: `2024-12-31`
5. Submit → JE created and auto-matched

### E. Finalize

1. Click **"Recalc Balances"** to update difference
2. Verify difference = $0.00
3. Click **"Finalize & Lock"**
4. Status changes to "Finalized"
5. All action buttons disabled

### F. Export PDF

1. Click **"Export PDF"**
2. PDF opens in new tab with summary

## 5. Verify in Database

Check the data was created correctly:

```sql
-- Bank accounts
SELECT * FROM bank_accounts;

-- Statements
SELECT * FROM bank_statements;

-- Statement lines
SELECT * FROM bank_statement_lines ORDER BY date;

-- Reconciliations
SELECT * FROM bank_reconciliations;

-- Matches
SELECT * FROM bank_reconciliation_lines;

-- Activity log
SELECT * FROM activity_log
WHERE entity IN ('bank_statement', 'bank_reconciliation', 'journal_entry')
ORDER BY created_at DESC
LIMIT 20;
```

## 6. Common Issues

### "Admins Only" Error

**Problem**: User doesn't have admin/finance role

**Solution**:
```sql
-- Update user role in Supabase Auth
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

Or update via Supabase Dashboard → Authentication → Users → Edit User → User Metadata:
```json
{
  "role": "admin",
  "tenant_id": "your-tenant-uuid"
}
```

### "Account 6100 not found"

**Problem**: Bank fee account missing in Chart of Accounts

**Solution**:
```sql
INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
VALUES (
  'your-tenant-uuid',
  '6100',
  'Bank Service Charges',
  'expense',
  true,
  'your-user-uuid'
);
```

### "Account 4100 not found"

**Problem**: Interest income account missing

**Solution**:
```sql
INSERT INTO chart_of_accounts (tenant_id, code, name, type, is_active, created_by)
VALUES (
  'your-tenant-uuid',
  '4100',
  'Interest Income',
  'revenue',
  true,
  'your-user-uuid'
);
```

### CSV Import Fails

**Problem**: CSV format incorrect

**Solution**: Ensure headers match exactly:
```csv
date,description,amount,type,reference
2024-12-01,Sample transaction,1000.00,credit,REF-001
```

### Difference Won't Zero Out

**Problem**: Unmatched transactions or calculation error

**Solution**:
1. Click "Recalc Balances"
2. Check for unmatched statement lines
3. Check for unmatched ledger entries
4. Verify GL cash account balance

### RLS Permission Errors

**Problem**: Row-level security blocking access

**Solution**:
```sql
-- Check policies
SELECT * FROM pg_policies
WHERE tablename IN ('bank_accounts', 'bank_statements', 'bank_reconciliations');

-- Verify tenant_id matches
SELECT
  auth.uid() as user_id,
  (auth.jwt() ->> 'tenant_id') as jwt_tenant_id;
```

## 7. Manual Seed (Alternative)

If automatic seed doesn't work, manually create test data:

```sql
-- 1. Create bank account
INSERT INTO bank_accounts (tenant_id, name, bank_name, account_number, gl_account_id, created_by)
VALUES (
  auth.uid(), -- or your tenant_id
  'Chase Operating',
  'Chase Bank',
  '****4321',
  (SELECT id FROM chart_of_accounts WHERE code = '1010' AND tenant_id = auth.uid()),
  auth.uid()
) RETURNING id;
-- Save the returned id as bank_account_id

-- 2. Create statement
INSERT INTO bank_statements (
  tenant_id, bank_account_id, start_date, end_date,
  starting_balance, ending_balance, imported_by
)
VALUES (
  auth.uid(),
  'bank_account_id_from_above',
  '2024-12-01',
  '2024-12-31',
  12500.00,
  15440.00,
  auth.uid()
) RETURNING id;
-- Save the returned id as statement_id

-- 3. Insert statement lines (use CSV or manual inserts)
-- See bank_statement_sample.csv for data

-- 4. Create journal entries for matching
-- See finance seed script for examples
```

## 8. Testing Checklist

- [ ] Can import statement via UI
- [ ] Smart match auto-matches transactions
- [ ] Manual match drawer shows candidates
- [ ] Can create bank fee adjustment JE
- [ ] Can create interest income JE
- [ ] Recalc updates difference correctly
- [ ] Cannot finalize when difference ≠ 0
- [ ] Can finalize when difference = 0
- [ ] Finalized reconciliation blocks edits
- [ ] PDF export generates and downloads
- [ ] Activity log records all actions
- [ ] Non-admin users blocked
- [ ] Cross-tenant access denied

## 9. Next Steps

After basic testing works:

1. **Configure bank accounts** for your actual banks
2. **Import real statements** (CSV from bank website)
3. **Match historical transactions** to build baseline
4. **Set up monthly routine**:
   - Import statement on month close
   - Smart match
   - Create adjustments
   - Finalize
   - Export PDF for records

## 10. Production Deployment

Before deploying to production:

- [ ] Run migrations on production database
- [ ] Verify RLS policies are active
- [ ] Test with production user accounts
- [ ] Set up automated backups
- [ ] Document internal reconciliation procedures
- [ ] Train finance team on workflow

## Resources

- **Full Guide**: [`BANK_RECONCILIATION_GUIDE.md`](./BANK_RECONCILIATION_GUIDE.md)
- **Sample CSV**: [`dev/fixtures/bank_statement_sample.csv`](./dev/fixtures/bank_statement_sample.csv)
- **Migration**: [`supabase/migrations/20250108_bank_reconciliation.sql`](./supabase/migrations/20250108_bank_reconciliation.sql)
- **Seed Data**: [`supabase/migrations/20250106_finance_seed_fixed.sql`](./supabase/migrations/20250106_finance_seed_fixed.sql)

## Support

For issues:
1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Review activity log table
4. Verify RLS policies and user roles
