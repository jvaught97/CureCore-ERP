# Expense Tracking System - Implementation Summary

## Overview
A comprehensive expense tracking system has been implemented for the CureCore ERP accounting module. This system allows users to record business expenses (cash, card, check payments) with automatic double-entry bookkeeping and P&L integration.

## What's Been Implemented

### ✅ Database Schema
**Location**: `supabase/migrations/20250201000000_expense_tracking.sql`

**Tables Created**:
1. **accounts** - Chart of Accounts (21 GL accounts seeded)
2. **journal_entries** - Journal entry headers
3. **journal_entry_lines** - Journal entry line items (debits/credits)
4. **expense_categories** - User-friendly expense categories (12 categories)
5. **expenses** - Main expense tracking table
6. **recurring_expenses** - Recurring expense templates

**Views Created**:
- `general_ledger` - All posted journal entries
- `account_balances` - Current balances by account

**Expense Categories Seeded**:
- Ingredients
- Packaging Materials
- Marketing & Advertising
- Website & Hosting
- Software & Tools
- Payment Processing
- Office Supplies
- Professional Services
- Utilities
- Rent & Facilities
- Insurance
- Other Expenses

### ✅ Server Actions
**Location**: `app/accounting/_actions/expenses.ts`

**Functions Available**:
- `getExpenseCategories()` - Fetch all active expense categories
- `createExpense(input)` - Create new expense with automatic journal entry
- `getExpenses(filters?)` - Fetch expenses with optional filters
- `getExpenseById(id)` - Get single expense details
- `updateExpense(id, input)` - Update expense details
- `voidExpense(id)` - Void an expense and its journal entry
- `getRecurringExpenses()` - Fetch recurring expense templates
- `toggleRecurringExpense(id, isActive)` - Enable/disable recurring expense
- `deleteRecurringExpense(id)` - Delete recurring expense template

**Automatic Journal Entries**:
When you create an expense, the system automatically creates a journal entry with:
- **Debit**: Expense category's GL account (e.g., 6100 Marketing)
- **Credit**: Cash account (1010)

### ✅ Expense Entry Form
**Location**: `app/accounting/expenses/new/page.tsx`
**Route**: `/accounting/expenses/new`

**Form Fields**:
1. **Expense Date** - Date of the expense
2. **Amount** - Dollar amount
3. **Category** - Select from 12 categories (with icons and descriptions)
4. **Vendor Name** - Optional vendor/merchant name
5. **Description** - Required description
6. **Payment Method** - Cash, Check, Credit Card, Debit Card, or Bank Transfer
7. **Check Number** - Required if payment method is check
8. **Receipt URL** - Optional link to receipt/invoice
9. **Notes** - Optional additional notes
10. **Recurring Expense Checkbox** - Mark as recurring
11. **Recurring Configuration** (if checked):
    - Name of recurring expense
    - Frequency (weekly, biweekly, monthly, quarterly, annually)
    - Start date
    - End date (optional)

**Features**:
- Real-time validation
- Premium UI design with gradients
- Toast notifications for success/errors
- Automatic expense number generation
- Redirects to accounting dashboard after save

### ✅ Accounting Dashboard Integration
**Location**: `app/accounting/page.tsx`
**Route**: `/accounting`

**Changes Made**:
- Fixed 404 issue on line 198
- Changed "New Journal Entry" button to "Record Expense"
- Updated route from `/accounting/journal-entries/new` to `/accounting/expenses/new`
- Button now says "Record Expense" with subtitle "Cash, card, or check"

## How to Use the System

### Recording an Expense

1. Navigate to `/accounting`
2. Click the "Record Expense" button
3. Fill in the expense details:
   - Date of expense
   - Amount
   - Select category (e.g., Marketing & Advertising)
   - Enter vendor name (optional)
   - Add description
   - Select payment method
   - Add check number if paying by check
4. Optionally mark as recurring
5. Click "Save Expense"

The system will:
- Generate an expense number (e.g., `EXP-1733101234-456`)
- Create a journal entry with balanced debits/credits
- Post the journal entry to the general ledger
- Return you to the accounting dashboard

### Viewing Expenses

Expenses can be queried via the server actions:

```typescript
import { getExpenses } from '@/app/accounting/_actions/expenses'

// Get all expenses
const result = await getExpenses()

// Get expenses for a specific month
const result = await getExpenses({
  start_date: '2025-12-01',
  end_date: '2025-12-31'
})

// Get expenses by category
const result = await getExpenses({
  category_id: 'category-uuid-here'
})

// Get expenses by status
const result = await getExpenses({
  status: 'posted'
})
```

### Managing Recurring Expenses

Recurring expenses are templates that can be used to auto-generate expenses on a schedule:

```typescript
import { getRecurringExpenses, toggleRecurringExpense } from '@/app/accounting/_actions/expenses'

// Get all recurring expenses
const result = await getRecurringExpenses()

// Disable a recurring expense
await toggleRecurringExpense('expense-id', false)

// Re-enable a recurring expense
await toggleRecurringExpense('expense-id', true)
```

## Database Queries

### Get Expenses by Month
```sql
SELECT
  e.expense_number,
  e.expense_date,
  e.amount,
  e.vendor_name,
  e.description,
  e.payment_method,
  ec.name as category_name,
  ec.color as category_color
FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
WHERE e.expense_date >= '2025-12-01'
  AND e.expense_date < '2026-01-01'
  AND e.status = 'posted'
ORDER BY e.expense_date DESC;
```

### Get Expense Totals by Category
```sql
SELECT
  ec.name as category,
  ec.color,
  COUNT(e.id) as expense_count,
  SUM(e.amount) as total_amount
FROM expense_categories ec
LEFT JOIN expenses e ON ec.id = e.category_id AND e.status = 'posted'
GROUP BY ec.id, ec.name, ec.color, ec.sort_order
ORDER BY ec.sort_order;
```

### Get Operating Expenses for P&L
```sql
SELECT
  ec.name as category,
  SUM(e.amount) as amount
FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
JOIN accounts a ON ec.gl_account_id = a.id
WHERE e.expense_date >= '2025-12-01'
  AND e.expense_date < '2026-01-01'
  AND e.status = 'posted'
  AND a.account_type = 'expense'
  AND a.account_subtype = 'operating'
GROUP BY ec.name;
```

## P&L Integration (Next Steps)

The expense system is ready for P&L integration. To integrate:

1. **Query expenses by month** instead of using manual inputs
2. **Group by category** to show detailed OpEx breakdown
3. **Update P&L page** to pull from `expenses` table

Example P&L query:
```typescript
const { data: opexData } = await supabase
  .from('expenses')
  .select(`
    amount,
    expense_categories(name, gl_account_id)
  `)
  .gte('expense_date', '2025-12-01')
  .lt('expense_date', '2026-01-01')
  .eq('status', 'posted')

// Group by category
const opexByCategory = opexData.reduce((acc, exp) => {
  const category = exp.expense_categories.name
  acc[category] = (acc[category] || 0) + exp.amount
  return acc
}, {})
```

## Security & Permissions

### Row-Level Security (RLS)
All tables have RLS enabled with the following policies:

**Accounts**:
- All authenticated users can view

**Journal Entries**:
- All authenticated users can view
- Users can create entries (owned by creator)

**Expense Categories**:
- All authenticated users can view

**Expenses**:
- All authenticated users can view
- Users can create expenses (owned by creator)
- Users can only update/void their own expenses

**Recurring Expenses**:
- All authenticated users can view
- Users can create recurring expenses (owned by creator)
- Users can only manage their own recurring expenses

### Validation
- All inputs validated with Zod schemas
- Amount must be positive
- Payment method must be valid enum
- Check number required for check payments
- Recurring expenses require name and frequency
- Journal entries must balance (debits = credits)

## Technical Details

### Double-Entry Bookkeeping
Every expense creates a balanced journal entry:

**Example**: $100 marketing expense paid by credit card

**Journal Entry**:
```
Debit:  6100 Marketing & Advertising  $100.00
Credit: 1010 Cash - Operating Account $100.00
```

This ensures the accounting equation stays balanced:
```
Assets = Liabilities + Equity
```

### Data Flow
1. User submits expense form
2. Server action validates input with Zod
3. Fetch expense category to get GL account ID
4. Create journal entry header
5. Create journal entry lines (debit expense, credit cash)
6. Create expense record linked to journal entry
7. If recurring, create recurring expense template
8. Return success with expense number

### Error Handling
- Database constraints prevent unbalanced entries
- Trigger validates journal entry balance
- Server actions return `ActionResult<T>` type
- Errors logged to console
- User-friendly error messages via toasts

## Files Created/Modified

### New Files
1. `supabase/migrations/20250201000000_expense_tracking.sql` - Database schema
2. `app/accounting/_actions/expenses.ts` - Server actions (633 lines)
3. `app/accounting/expenses/new/page.tsx` - Expense entry form (598 lines)

### Modified Files
1. `app/accounting/page.tsx` - Fixed 404 issue, updated button (line 198)

## Future Enhancements

### Planned Features
1. **Expense List View** - Table of all expenses with filters
2. **Expense Detail Page** - View/edit individual expenses
3. **Recurring Expense Automation** - Background job to auto-generate
4. **Receipt Upload** - Direct file upload instead of URL
5. **Expense Approval Workflow** - Multi-step approval for large expenses
6. **Budget Tracking** - Compare actual vs budgeted expenses
7. **Expense Reports** - Export to CSV/PDF
8. **Bank Feed Integration** - Auto-import from bank transactions
9. **OCR for Receipts** - Auto-extract expense details from images
10. **Mobile Receipt Capture** - Quick expense entry via phone

### P&L Enhancements
1. Replace manual OpEx inputs with actual expense queries
2. Add expense breakdown by category
3. Month-over-month comparison charts
4. Budget vs actual variance analysis
5. Drill-down into expense details from P&L

## Support

For issues or questions about the expense tracking system:
1. Check database migrations are applied: `docker exec -i supabase_db_curecore-erp psql -U postgres -d postgres -c "\dt expenses"`
2. Verify expense categories exist: `SELECT * FROM expense_categories`
3. Check server actions are imported correctly
4. Review browser console for client-side errors
5. Check server logs for API errors

## Summary

The expense tracking system is **fully functional** and ready to use. Users can now:
- Record expenses via a user-friendly form
- Categorize expenses for reporting
- Set up recurring expenses
- Automatic double-entry bookkeeping
- All data ready for P&L integration

Navigate to `/accounting` and click "Record Expense" to get started!
