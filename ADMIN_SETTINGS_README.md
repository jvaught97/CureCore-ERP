# Admin Settings System - Quick Start

## What's Been Built

A complete, production-ready admin settings foundation with:

### ✅ Fully Implemented

1. **Database Layer**
   - Complete schema with 15+ settings tables
   - Row-Level Security (RLS) on all tables
   - Activity logging for full audit trail
   - Multi-tenant support with tenant_id isolation
   - Auto-updating timestamps via triggers

2. **Backend (Server Actions)**
   - Organization settings (CRUD + validation)
   - Users & Roles (invite, CRUD, permissions)
   - Manufacturing settings (phases + preferences)
   - Activity logging with before/after diffs
   - Zod validation on all inputs
   - Type-safe TypeScript throughout

3. **Frontend Components**
   - Settings layout with left navigation (10 sections)
   - Reusable UI components (cards, forms, buttons)
   - Drag-and-drop list for reordering
   - Toast notifications (success/error/info)
   - Admin-only access guard
   - Loading and error states

4. **Complete Pages**
   - ✅ Organization (company details, localization, numbering schemes)
   - ✅ Manufacturing (formula phases, batch settings)
   - ⚠️ Users & Roles (actions done, page template in guide)

5. **Documentation & Testing**
   - Comprehensive implementation guide
   - Sample test file with mocking patterns
   - RLS test queries
   - Code patterns and best practices

### ⏳ Ready to Implement (Templates Provided)

- Branding & Templates (logo upload to Supabase storage)
- Inventory (categories, FEFO, UoM)
- CRM (lead sources, pipeline stages)
- Finance (costing method, currencies)
- Notifications (SMTP, webhooks, triggers)
- Integrations (analytics, Sentry, shipping)
- Data Admin (import/export, backups, feature flags)

All have schemas, validation, and database tables ready. Just follow the Organization/Manufacturing page pattern.

---

## Quick Start

### 1. Run Migrations

```bash
# Apply schema + RLS policies
supabase migration up

# Or manually:
psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings.sql
psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings_seed.sql
```

### 2. Set Up Supabase Storage

Create a `branding` bucket for logo uploads:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);
```

### 3. Configure JWT Claims

In Supabase Dashboard → Authentication → Settings, ensure JWT includes:

```json
{
  "tenant_id": "{{ .UserMetadata.tenant_id }}",
  "role": "{{ .UserMetadata.role }}"
}
```

### 4. Access the Settings

Navigate to: [http://localhost:3000/settings/organization](http://localhost:3000/settings/organization)

Must be logged in as an admin user.

---

## File Structure

```
app/(admin)/settings/
├── layout.tsx                     ✅ Settings shell with left nav
├── organization/
│   ├── actions.ts                 ✅ Server actions
│   └── page.tsx                   ✅ UI page
├── manufacturing/
│   ├── actions.ts                 ✅ Server actions
│   └── page.tsx                   ✅ Drag-drop phases
├── users/
│   ├── actions.ts                 ✅ Server actions
│   └── page.tsx                   ⏳ TODO (template in guide)
└── {other sections}/              ⏳ TODO (follow pattern)

components/settings/
├── SettingsCard.tsx               ✅ Reusable card
├── SettingsFormField.tsx          ✅ Form field with label/hint
├── SettingsSubmitButton.tsx       ✅ Loading button
└── DraggableList.tsx              ✅ Drag-and-drop list

lib/
├── validation/settings.ts         ✅ All Zod schemas
├── hooks/useToast.ts              ✅ Toast hook
└── server/activity-log.ts         ✅ Logging utils

supabase/migrations/
├── 20250105_admin_settings.sql    ✅ Full schema + RLS
└── 20250105_admin_settings_seed.sql ✅ Demo data
```

---

## Key Features

### Security

- **RLS Policies**: All tables enforce tenant_id and admin role checks
- **Auth Guard**: Non-admins see "Admins Only" screen
- **Server-Side Validation**: Zod schemas validate all inputs
- **Activity Logging**: Every create/update/delete is logged with actor + diff

### Multi-Tenancy

- All tables have `tenant_id` column
- RLS ensures users only see their tenant's data
- JWT claims include `tenant_id` for automatic filtering

### Audit Trail

Every action is logged to `activity_log`:

```sql
SELECT * FROM activity_log
WHERE entity = 'org_settings'
ORDER BY created_at DESC;
```

Shows who changed what, when, and the before/after values.

### Type Safety

- Zod schemas provide runtime validation
- TypeScript types auto-generated from schemas
- Server actions return typed `{ success, data?, error? }`

---

## Next Steps

1. **Complete remaining pages** (see [SETTINGS_IMPLEMENTATION_GUIDE.md](SETTINGS_IMPLEMENTATION_GUIDE.md))
2. **Add logo upload** to Branding page (Supabase storage example in guide)
3. **Build Users & Roles page** (actions already done, just need UI)
4. **Write tests** for all actions (sample test provided)
5. **Deploy migrations** to production database

---

## Common Tasks

### Add a New Settings Section

1. Create `app/(admin)/settings/{section}/actions.ts`
2. Create `app/(admin)/settings/{section}/page.tsx`
3. Add route to `layout.tsx` SETTINGS_SECTIONS array
4. Follow Organization/Manufacturing page pattern

### Add a New Field to Existing Settings

1. Update Zod schema in `lib/validation/settings.ts`
2. Add column to database table (migration)
3. Update form in page.tsx
4. Server action automatically validates with updated schema

### Query Activity Log

```typescript
const { data } = await supabase
  .from('activity_log')
  .select('*')
  .eq('tenant_id', tenant_id)
  .eq('entity', 'user')
  .order('created_at', { ascending: false })
```

---

## Troubleshooting

### "Admins Only" screen shows even though I'm admin

Check:
1. User's role in `users` table is lowercase 'admin'
2. JWT claims include `role: 'admin'`
3. Browser has fresh session (logout/login)

### RLS blocking queries

Check:
1. JWT claims include `tenant_id`
2. User's `tenant_id` matches row's `tenant_id`
3. User's role is 'admin' for write operations

### Migrations fail

Check:
1. `uuid-ossp` extension is enabled
2. `users` table exists (from auth setup)
3. No conflicting table names
4. PostgreSQL version >= 12

---

## Architecture Decisions

### Why Server Actions?

- Type-safe communication between client and server
- Built-in form handling
- No need for separate API routes
- Automatic serialization/deserialization

### Why Zod?

- Runtime validation (can't trust client input)
- Type inference (DRY - schemas define TS types)
- Great error messages for debugging

### Why RLS?

- Defense in depth (even if app logic has bugs, DB enforces rules)
- Multi-tenant security at database level
- Automatic filtering (no `WHERE tenant_id = ?` everywhere)

### Why Activity Log?

- Compliance (HIPAA, SOC2, GDPR often require audit trails)
- Debugging (who changed what when)
- User accountability

---

## Performance Notes

- All tables have indexes on `tenant_id` and `sort_order`
- RLS policies use JWT claims (no extra DB queries)
- `updated_at` triggers are efficient (only run on UPDATE)
- Activity log is append-only (no updates/deletes)

Consider partitioning `activity_log` by date if it grows large (>1M rows).

---

## Support

See [SETTINGS_IMPLEMENTATION_GUIDE.md](SETTINGS_IMPLEMENTATION_GUIDE.md) for:
- Detailed implementation templates for each page
- Code patterns and examples
- Testing strategies
- Deployment checklist

---

Built with ❤️ for CureCore ERP
