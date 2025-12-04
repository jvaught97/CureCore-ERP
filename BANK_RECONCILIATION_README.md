# Bank Reconciliation Module

A complete bank reconciliation workspace for multi-tenant ERP systems with automated matching, manual override capabilities, and full audit trails.

## 🎯 Features

- ✅ **CSV/OFX Statement Import** - Upload bank statements with automatic deduplication
- ✅ **Smart Auto-Matching** - Match transactions by amount (±$0.01) and date (±3 days)
- ✅ **Manual Matching UI** - Drag-and-drop interface with candidate suggestions
- ✅ **Bank Adjustments** - Create JEs for fees, interest, corrections
- ✅ **Reconciliation Summary** - Real-time calculation with deposits in transit & outstanding checks
- ✅ **Finalize & Lock** - Prevent changes once reconciliation is complete
- ✅ **PDF Export** - Generate reconciliation reports
- ✅ **Full Audit Log** - Track all changes with before/after diffs
- ✅ **Multi-Tenant RLS** - Secure tenant isolation with PostgreSQL RLS
- ✅ **Role-Based Access** - Admin and Finance roles only

## 📦 What's Included

### Database Schema
- **5 new tables**: bank_accounts, bank_statements, bank_statement_lines, bank_reconciliations, bank_reconciliation_lines
- **RLS policies** for all tables (tenant + role checks)
- **Helper functions** for balance calculations
- **Indexes** for performance

### UI Components
- **List Page** (`/finance/reconciliation`) - View all reconciliations
- **Workspace** (`/finance/reconciliation/[id]`) - Two-column matching interface
- **Import Modal** - Statement upload wizard
- **Match Drawer** - Manual matching with candidates
- **Adjustment Dialog** - Create bank fee/interest JEs
- **Summary Panel** - Sticky footer with calculations

### Server Actions
20+ Zod-validated server actions for:
- Statement import & parsing
- Smart matching algorithm
- Manual match/unmatch
- Bank adjustment JE creation
- Reconciliation finalization
- PDF export

### Seed Data
- Sample bank account ("Chase Operating")
- Statement with 7 transactions
- Matching journal entries for testing
- Sample CSV file for import testing

## 🚀 Quick Start

1. **Run Migrations**
   ```bash
   supabase db push
   ```

2. **Seed Test Data**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/20250106_finance_seed_fixed.sql
   ```

3. **Start Dev Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   ```
   http://localhost:3000/finance/reconciliation
   ```

**Detailed setup**: See [`BANK_RECONCILIATION_QUICKSTART.md`](./BANK_RECONCILIATION_QUICKSTART.md)

## 📖 Documentation

- **[Quick Start Guide](./BANK_RECONCILIATION_QUICKSTART.md)** - Step-by-step setup & testing
- **[Implementation Guide](./BANK_RECONCILIATION_GUIDE.md)** - Complete technical reference

## 🗂️ File Structure

```
app/(finance)/finance/reconciliation/
├── actions.ts                          # Server actions (20+)
├── page.tsx                            # List page
└── [id]/
    └── page.tsx                        # Workspace

components/finance/recon/
├── ImportStatementModal.tsx
├── StatementTable.tsx
├── LedgerTable.tsx
├── ManualMatchDrawer.tsx
├── AdjustmentDialog.tsx
└── ReconciliationSummary.tsx

supabase/migrations/
├── 20250108_bank_reconciliation.sql    # Schema + RLS
└── 20250106_finance_seed_fixed.sql     # Test data

dev/fixtures/
└── bank_statement_sample.csv           # Sample import file
```

## 🔐 Security

- **Multi-tenant isolation** via RLS policies
- **Role-based access control** (Admin + Finance only)
- **Audit logging** for all mutations
- **Finalized lock** prevents post-close edits
- **SQL injection protection** via Zod validation

## 🎨 UI/UX

- **Two-column layout** - Statement vs Ledger side-by-side
- **Real-time filters** - All/Cleared/Uncleared/Unmatched
- **Sticky summary** - Always visible reconciliation status
- **Color coding** - Red for differences, green for matched
- **Loading states** - Spinners for all async actions
- **Toast notifications** - Success/error feedback

## 🧪 Testing

Sample workflow included in Quick Start:
1. Import statement (CSV)
2. Run smart match (auto-match 5/7)
3. Manual match remaining items
4. Create bank fee adjustment
5. Recalculate balances
6. Finalize (locks at difference = 0)
7. Export PDF

## 📊 Workflow Example

```
Month End Reconciliation
│
├─ Import Statement
│  ├─ Select bank account
│  ├─ Enter date range & balances
│  └─ Upload CSV
│
├─ Auto Match
│  └─ Smart match matches 80% of transactions
│
├─ Manual Review
│  ├─ Match remaining items
│  ├─ Create bank fee JE (-$35)
│  └─ Create interest income JE (+$75)
│
├─ Verify
│  ├─ Recalc balances
│  └─ Difference = $0.00 ✓
│
└─ Finalize
   ├─ Lock reconciliation
   └─ Export PDF for records
```

## 🛠️ Configuration

### Required Chart of Accounts

- **`1010`** - Cash - Operating (Asset) ← Bank account GL
- **`6100`** - Bank Service Charges (Expense)
- **`4100`** - Interest Income (Revenue)

### CSV Format

```csv
date,description,amount,type,reference
2024-12-01,Payment to supplier,-1500.00,debit,WIRE-001
2024-12-15,Customer deposit,2000.00,credit,DEP-001
2024-12-31,Bank fee,-35.00,debit,FEE-DEC
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Admins Only" | Set user role to `admin` or `finance` in user_metadata |
| "Account 6100 not found" | Add Bank Service Charges to COA |
| "Account 4100 not found" | Add Interest Income to COA |
| CSV import fails | Verify headers: date,description,amount,type,reference |
| Difference won't zero | Click "Recalc Balances", check unmatched items |
| RLS errors | Verify tenant_id in JWT matches data |

## 📈 Production Readiness

- ✅ **Database**: Schema, indexes, RLS policies complete
- ✅ **Backend**: 20+ server actions with validation
- ✅ **Frontend**: 6 reusable components, 2 pages
- ✅ **Security**: Multi-tenant RLS, role checks, audit logging
- ✅ **UX**: Loading states, error handling, toast notifications
- ✅ **Testing**: Seed data, sample CSV, test checklist
- ✅ **Documentation**: 3 guides with examples

## 🎓 Key Concepts

**Smart Matching**
- Exact amount match (±$0.01 tolerance)
- Date window (±3 days)
- Prioritizes closest date

**Ledger Candidates**
- Journal Entry lines (cash account)
- AR Payments (customer deposits)
- AP Payments (vendor withdrawals)

**Reconciliation Status**
- **Draft**: Editable, can match/unmatch
- **Finalized**: Locked, read-only

**Difference Calculation**
```
Adjusted Bank = Bank Ending + Deposits in Transit - Outstanding Checks
Difference = Adjusted Bank - Books Ending
```

## 🚦 Status

**Current Version**: 1.0.0
**Status**: ✅ Production Ready

All features implemented and tested:
- [x] Database schema with RLS
- [x] Server actions with validation
- [x] UI components (list, workspace, modals)
- [x] Smart matching algorithm
- [x] Manual matching interface
- [x] Bank adjustment JE creation
- [x] Finalization workflow
- [x] PDF export
- [x] Audit logging
- [x] Seed data & fixtures
- [x] Documentation

## 📝 License

Part of CureCore ERP system.

## 👥 Contributing

Follow existing patterns:
- Server actions in `actions.ts` with Zod schemas
- UI components in `components/finance/recon/`
- RLS policies for all tables
- Activity logging for mutations
- Role checks (admin/finance)

## 📞 Support

For questions:
1. Check [`BANK_RECONCILIATION_QUICKSTART.md`](./BANK_RECONCILIATION_QUICKSTART.md)
2. Review [`BANK_RECONCILIATION_GUIDE.md`](./BANK_RECONCILIATION_GUIDE.md)
3. Check activity log in database
4. Verify RLS policies and user roles

---

**Built with**: Next.js 14, Supabase, PostgreSQL RLS, Zod, shadcn/ui
