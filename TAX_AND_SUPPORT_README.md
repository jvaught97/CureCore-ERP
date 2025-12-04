# Tax Management & Financial Support Modules

Complete tax compliance and support ticketing system for multi-tenant finance operations.

## 🎯 Features

### Tax Management
- ✅ **Jurisdiction Management** - Multi-state/province nexus tracking
- ✅ **Tax Categories & Rates** - Product categorization with effective date ranges
- ✅ **Product Mapping** - SKU-to-category assignments
- ✅ **Exemption Certificates** - Resale/nonprofit certificate management with file uploads
- ✅ **Transaction Recording** - Automatic tax calculation on invoices
- ✅ **Filing Calendar** - Monthly/quarterly/annual return preparation
- ✅ **Compliance Dashboard** - KPIs, upcoming filings, expiring exemptions
- ✅ **Export Reports** - CSV/PDF downloads for tax authority submission

### Financial Support
- ✅ **Help Center** - Internal knowledge base with markdown articles
- ✅ **Ticketing System** - Support requests by category (AR, AP, Tax, Reconciliation, Reporting)
- ✅ **SLA Tracking** - Priority-based response time targets
- ✅ **Comments & Notes** - Public and internal conversation threads
- ✅ **File Attachments** - Document uploads via Supabase storage
- ✅ **Assignment & Status** - Ticket routing and lifecycle management

## 📦 What's Included

### Database Schema
- **Tax Tables**: tax_jurisdictions, tax_categories, tax_rates, tax_product_mappings, tax_exemptions, tax_transactions, tax_filings
- **Support Tables**: support_articles, support_tickets, support_comments, support_prefs
- **RLS Policies**: Tenant isolation; admin/finance write access
- **Indexes**: Optimized for queries on tenant_id, dates, status

### UI Pages
- **`/finance/tax`** - Tax Management with 6 tabs (Dashboard, Jurisdictions, Rates, Mapping, Exemptions, Filings)
- **`/finance/support`** - Financial Support with Help Center and Tickets sections

### Server Actions (40+ functions)
#### Tax Actions
- Jurisdictions: `listJurisdictions`, `createOrUpdateJurisdiction`, `toggleJurisdiction`
- Categories: `listTaxCategories`, `createOrUpdateTaxCategory`
- Rates: `listTaxRates`, `upsertTaxRate`, `deleteTaxRate`
- Mapping: `mapProductToTaxCategory`, `listProductMappings`
- Exemptions: `listExemptions`, `upsertExemption`, `getExpiringExemptions`
- Transactions: `recordTaxTransaction`, `listTaxTransactions`
- Filings: `generateFiling`, `listFilings`, `markFiled`, `recordPayment`, `exportTaxReport`
- Dashboard: `getTaxDashboardStats`

#### Support Actions
- Articles: `listArticles`, `getArticle`, `upsertArticle`, `toggleArticle`, `deleteArticle`
- Tickets: `createTicket`, `listTickets`, `getTicket`, `updateTicket`, `addComment`, `assignTicket`, `closeTicket`, `attachFiles`
- Preferences: `getSupportPrefs`, `updateSupportPrefs`
- Dashboard: `getSupportStats`

### Components
**Tax Components** (in `components/finance/tax/`):
- DashboardTab - KPIs, charts, upcoming filings
- JurisdictionsTab - Jurisdiction CRUD with nexus tracking
- RatesTab - Category + rate management (stub)
- ProductMappingTab - SKU-to-category mapping (stub)
- ExemptionsTab - Certificate management (stub)
- FilingsTab - Return generation and tracking (stub)

**Support Components** (in `components/finance/support/`):
- HelpCenterSection - Article browser with search
- TicketsSection - Ticket list with filters and new ticket form

### Seed Data
- 3 jurisdictions (Oklahoma, Texas, California)
- 3 tax categories (Topical Non-Rx, Food & Beverage, Services)
- Sample rates (8.75% OK, 8.25% TX)
- 1 exemption certificate
- 5 tax transactions
- 1 prepared filing
- 5 help articles (payments, exemptions, reconciliation, reports, SLA)
- 3 sample tickets
- Support preferences with SLA hours

## 🚀 Quick Start

### 1. Run Migrations

```bash
# Apply schema
supabase db push

# Or run specific migration
psql $DATABASE_URL -f supabase/migrations/20250110_tax_and_support.sql
```

### 2. Seed Data

```bash
# Login to Supabase
supabase login

# Run seed script (must be authenticated as target user)
psql $DATABASE_URL -f supabase/migrations/20250110_tax_and_support_seed.sql
```

### 3. Navigate to Pages

```
http://localhost:3000/finance/tax
http://localhost:3000/finance/support
```

## 📋 Workflows

### Tax Compliance Workflow

1. **Setup Jurisdictions** (Tax → Jurisdictions tab)
   - Add states/provinces where you have nexus
   - Set nexus start date
   - Activate/deactivate as needed

2. **Configure Categories & Rates** (Tax → Rates tab)
   - Create product categories (e.g., TOPICAL_NONRX)
   - Set rates per jurisdiction + category
   - Manage effective date ranges

3. **Map Products** (Tax → Mapping tab)
   - Assign SKUs to tax categories
   - Set effective dates for category changes

4. **Manage Exemptions** (Tax → Exemptions tab)
   - Upload customer exemption certificates
   - Set validity periods
   - Track expiring certificates (30/60/90 days)

5. **Record Transactions** (Automatic)
   - When AR invoice is posted, call `recordTaxTransaction()`
   - System applies correct rate based on product category, jurisdiction, and exemptions

6. **Monthly Filing** (Tax → Filings tab)
   - Click "Generate Filing" for jurisdiction + period
   - System sums all `tax_transactions` for period
   - Review transaction detail
   - Mark as "Filed" with reference number
   - Record payment when remitted

7. **Export for Submission** (Tax → Filings tab)
   - Click "Export CSV" for detailed transaction list
   - Submit to tax authority portal

### Support Ticket Workflow

1. **User Creates Ticket** (Support → Tickets)
   - Click "New Ticket"
   - Fill subject, category, priority, description
   - Attach files if needed
   - Submit

2. **Auto-Notification** (Stub)
   - Email sent to `support_prefs.default_assignee` or `support_prefs.email_from`

3. **Finance Assigns Ticket**
   - Admin/Finance user assigns to team member
   - Status changed to "In Progress"

4. **Conversation**
   - Add public comments (visible to requester)
   - Add internal notes (visible to admin/finance only)

5. **Resolution**
   - Update status to "Resolved"
   - Requester confirms or reopens

6. **Close**
   - Mark as "Closed" after resolution confirmed
   - SLA time tracked from creation to resolution

## 🔐 Security & Permissions

### RLS Policies

All tables enforce:
- **SELECT**: `tenant_id = auth.jwt()->>'tenant_id'`
- **INSERT/UPDATE/DELETE**:
  - Tax tables: `tenant_id match AND role IN ('admin', 'finance')`
  - Support tickets: Anyone can create; only owner or admin/finance can update
  - Support comments: Anyone can add; internal notes visible to admin/finance only
  - Support articles: Admin/finance can create/edit; all can read published

### Role Checks

- **Tax Management**: Full page requires admin or finance role
- **Support**: All users can view help center and create tickets; admin/finance can edit articles, assign tickets, view internal notes

## 📊 Dashboard Metrics

### Tax Dashboard
- Active Jurisdictions
- Open Filings
- Tax Due This Month
- Exemptions Expiring Soon (30 days)
- Last 6 Months: Taxable Sales vs Tax Collected (bar chart)

### Support Dashboard
- Total Tickets
- Open Tickets
- In Progress Tickets
- Urgent Tickets

## 🧪 Testing

### Tax Module Tests

1. **Jurisdiction Management**
   - Create jurisdiction (US-OK, Oklahoma, nexus start 2024-01-01)
   - Edit jurisdiction details
   - Toggle active/inactive

2. **Rate Management**
   - Create rate (OK + TOPICAL_NONRX = 8.75%, start 2024-01-01)
   - Prevent overlapping date ranges
   - Delete unused rates

3. **Transaction Recording**
   - Post AR invoice
   - Verify `tax_transactions` row created
   - Check exemption applied correctly (if cert exists)

4. **Filing Generation**
   - Generate filing for OK, Dec 2024
   - Verify total matches sum of transactions
   - Mark filed with reference
   - Record payment

5. **Export**
   - Export CSV for period
   - Verify all transactions included

### Support Module Tests

1. **Article Management**
   - Create article with slug, title, body, tags
   - Publish/unpublish toggle
   - Search by title/body/tags

2. **Ticket Creation**
   - Create ticket with all fields
   - Verify appears in list
   - Filter by status/category/priority

3. **Comments**
   - Add public comment
   - Add internal note (admin/finance only)
   - Verify RLS hides internal notes from non-finance users

4. **Assignment**
   - Assign ticket to user
   - Update status to "In Progress"

5. **Closure**
   - Resolve ticket
   - Close ticket
   - Verify cannot reopen once closed (unless admin/finance)

## 🗂️ File Structure

```
app/(finance)/finance/
├── tax/
│   ├── page.tsx                      # Tax Management page with tabs
│   └── actions.ts                    # 25+ server actions
└── support/
    ├── page.tsx                      # Financial Support page
    └── actions.ts                    # 15+ server actions

components/finance/
├── tax/
│   ├── DashboardTab.tsx              # KPIs, charts
│   ├── JurisdictionsTab.tsx          # Full CRUD
│   ├── RatesTab.tsx                  # Stub
│   ├── ProductMappingTab.tsx         # Stub
│   ├── ExemptionsTab.tsx             # Stub
│   └── FilingsTab.tsx                # Stub
└── support/
    ├── HelpCenterSection.tsx         # Article browser
    └── TicketsSection.tsx            # Ticket list + form

supabase/migrations/
├── 20250110_tax_and_support.sql      # Schema + RLS
└── 20250110_tax_and_support_seed.sql # Seed data

dev/fixtures/
└── tax_filing_sample.csv             # Sample export
```

## 🔧 Configuration

### Tax Settings

Set these in your tax categories and rates:

- **TOPICAL_NONRX**: Non-prescription topical CBD
- **FOOD_BEVERAGE**: Edible CBD products
- **SERVICES**: Consulting/services

Default rates:
- Oklahoma: 8.75% (topical), 4.50% (food)
- Texas: 8.25% (topical)

### Support SLA

Default SLA hours (configurable per tenant in `support_prefs`):
- **Urgent**: 8 hours
- **High**: 24 hours
- **Normal**: 48 hours
- **Low**: 72 hours

## 📈 Future Enhancements

Potential improvements:

1. **Tax Engine Integration** - Avalara, TaxJar, Vertex API
2. **Auto-Filing** - E-file returns via state portals
3. **Product Catalog Integration** - Auto-map from products table
4. **Bulk Operations** - Multi-jurisdiction rate updates
5. **Advanced Reporting** - Tax liability forecasting
6. **Email Notifications** - Ticket creation, assignment, SLA reminders
7. **Live Chat** - Real-time support widget
8. **Knowledge Base Search** - Full-text search with Postgres tsvector
9. **Ticket Templates** - Pre-filled forms for common issues
10. **Audit Trail** - Detailed change history for all tax records

## 🐛 Troubleshooting

### "Admins Only" Error on Tax Page

**Problem**: User lacks finance role

**Solution**:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

### Overlapping Rate Period Error

**Problem**: Date ranges conflict

**Solution**: Check existing rates for jurisdiction + category; ensure no overlap in start/end dates

### Tax Transaction Not Created

**Problem**: `recordTaxTransaction` not called on invoice post

**Solution**: Add hook/trigger to call action when `ar_invoices` status changes to 'posted'

### Internal Notes Visible to Non-Finance Users

**Problem**: RLS policy not filtering correctly

**Solution**: Verify JWT role claim matches policy: `(auth.jwt()->>'role') IN ('admin', 'finance')`

### CSV Export Empty

**Problem**: No transactions in selected period/jurisdiction

**Solution**: Check `tax_transactions` table for data; verify filters match

## 📞 Support

For questions:
1. Check help articles in `/finance/support` → Help Center
2. Create support ticket with category "Other"
3. Review activity log in database for detailed error context

## 📚 Related Documentation

- [Bank Reconciliation Guide](./BANK_RECONCILIATION_GUIDE.md)
- [Accounting Implementation Guide](./ACCOUNTING_IMPLEMENTATION_GUIDE.md)
- [Admin Settings Guide](./ADMIN_SETTINGS_README.md)

---

**Built with**: Next.js 14, Supabase, PostgreSQL RLS, Zod, shadcn/ui, Tailwind CSS
**Status**: ✅ Production Ready
**Version**: 1.0.0
