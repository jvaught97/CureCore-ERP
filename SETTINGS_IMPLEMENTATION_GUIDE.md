# Admin Settings Implementation Guide

## Overview

This guide documents the comprehensive Admin Settings system for CureCore ERP. The implementation provides a multi-tenant, role-based settings management system with full audit logging, RLS security, and a modern UI.

## What's Been Implemented

### ✅ Complete Components

1. **Database Schema & Migrations** ([supabase/migrations/20250105_admin_settings.sql](supabase/migrations/20250105_admin_settings.sql))
   - All settings tables with proper indexes
   - Row-Level Security (RLS) policies for all tables
   - Audit log (activity_log) for tracking changes
   - Triggers for automatic `updated_at` timestamp updates
   - Helper functions for auth (`auth.tenant_id()`, `auth.is_admin()`)

2. **Seed Data** ([supabase/migrations/20250105_admin_settings_seed.sql](supabase/migrations/20250105_admin_settings_seed.sql))
   - Demo tenant with ID `00000000-0000-0000-0000-000000000001`
   - Default organization settings for CureCBD
   - Formula phases (Water, Oil, Actives, Cool-down)
   - Ingredient categories (Extracts, Emulsifiers, etc.)
   - CRM pipeline stages and lead sources
   - All preference tables seeded with sensible defaults

3. **Validation Schemas** ([lib/validation/settings.ts](lib/validation/settings.ts))
   - Zod schemas for all settings inputs
   - Type-safe validation for forms and server actions
   - Input/output TypeScript types exported

4. **Reusable UI Components**
   - `SettingsCard` - Consistent card layout with icon
   - `SettingsFormField` - Form field with label, hint, error states
   - `SettingsSubmitButton` - Loading state button
   - `DraggableList` - Drag-and-drop reorderable lists
   - `Toast` & `ToastContainer` - Success/error notifications
   - `useToast` hook for toast management

5. **Settings Layout** ([app/(admin)/settings/layout.tsx](app/(admin)/settings/layout.tsx))
   - Left navigation with 10 settings sections
   - Active state highlighting
   - Admin-only access guard (shows "Admins Only" screen for non-admins)
   - Integrated with existing `AppNav` component

6. **Activity Logging Utilities** ([lib/server/activity-log.ts](lib/server/activity-log.ts))
   - `logActivity()` - Logs all create/update/delete actions with before/after diffs
   - `getAuthContext()` - Validates admin role and returns tenant_id, user_id

7. **Organization Settings** (COMPLETE)
   - Page: [app/(admin)/settings/organization/page.tsx](app/(admin)/settings/organization/page.tsx)
   - Actions: [app/(admin)/settings/organization/actions.ts](app/(admin)/settings/organization/actions.ts)
   - Features:
     - Company details (name, DBA, EIN, address)
     - Localization (fiscal year, currency, timezone)
     - Numbering schemes with live preview (batches, COAs, invoices, POs)
     - Server-side validation and activity logging

8. **Users & Roles** (Actions Complete, Page Template Needed)
   - Actions: [app/(admin)/settings/users/actions.ts](app/(admin)/settings/users/actions.ts)
   - Implemented actions:
     - `getUsers()` - List all users for tenant
     - `inviteUser()` - Create pending user (magic link placeholder)
     - `updateUserRole()` - Change user role
     - `updateUserStatus()` - Activate/deactivate users
     - `updateUserPermissions()` - Set granular module permissions
     - `getUserPermissions()` - Fetch user permissions
     - `deleteUser()` - Soft delete with confirmation

---

## Remaining Implementation

### Pages to Build (Following the Pattern)

Each settings page follows this structure:

```
app/(admin)/settings/{section}/
├── actions.ts        (Server actions with Zod validation)
└── page.tsx          (Client component with forms)
```

Use the Organization page as the template. All pages should:
1. Use `useToast()` for notifications
2. Call server actions for data mutations
3. Use `SettingsCard`, `SettingsFormField`, `SettingsSubmitButton` components
4. Show loading states while fetching/saving
5. Log all changes via `logActivity()` in server actions

### 1. Branding & Templates

**File**: `app/(admin)/settings/branding/page.tsx` & `actions.ts`

**Actions**:
- `uploadBrandAsset(kind, file)` - Upload to Supabase storage `branding` bucket, return public URL
- `updateBrandingSettings(input)` - Save primary_color, secondary_color, dark_mode, logo URLs

**UI**:
- Color pickers for primary/secondary colors
- Dark mode toggle
- File upload zones for 4 logo types (navbar, invoice, packing, analytics)
- Document template dropdowns (stub with placeholder options)

**Database**: Updates `org_settings` table (logos + colors)

---

### 2. Users & Roles (Page Only - Actions Done)

**File**: `app/(admin)/settings/users/page.tsx`

**UI**:
- Table with columns: Name, Email, Role, Status, Last Login, Actions
- Search bar (filter by name/email)
- Role filter dropdown
- "Invite User" button → modal with name, email, role, message fields
- Row actions:
  - **Edit** → Drawer/Modal with:
    - Role dropdown
    - Permissions matrix (7 modules × 5 permissions = 35 checkboxes grid)
  - **Deactivate/Reactivate** → Toggle status
  - **Delete** → Confirmation dialog requiring typed company name
- Activity log tab per user (last 20 entries from `activity_log`)

**Sample Permissions Matrix**:
```
Module         | View | Create | Edit | Delete | Export
---------------|------|--------|------|--------|-------
Inventory      |  ✓   |   ✓    |  ✓   |   ✗    |   ✓
Formulations   |  ✓   |   ✗    |  ✗   |   ✗    |   ✗
Manufacturing  |  ✓   |   ✓    |  ✓   |   ✗    |   ✓
...
```

---

### 3. Inventory Settings

**File**: `app/(admin)/settings/inventory/page.tsx` & `actions.ts`

**Actions**:
- `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`
- `reorderCategories(categories[])` - Bulk update sort_order
- `saveInventoryPrefs(input)` - FEFO toggle, default_expiry_days

**UI**:
- `DraggableList` for ingredient categories (name, code, active toggle)
- "Add Category" button → modal
- Inline edit for category names
- Preferences card:
  - FEFO toggle
  - Default expiry days (number input)
  - UoM config (stub JSON editor or simple inputs)

**Database**: `ingredient_categories`, `inventory_prefs`

---

### 4. Manufacturing Settings

**File**: `app/(admin)/settings/manufacturing/page.tsx` & `actions.ts`

**Actions**:
- `getPhases()`, `createPhase()`, `updatePhase()`, `deletePhase()`
- `reorderPhases(phases[])` - Bulk update sort_order
- `saveMfgPrefs(input)` - default_yield_pct, include_scrap_pct, include_overhead

**UI**:
- `DraggableList` for formula phases (name, code, defaults: temp, shear time, pH)
- Expandable rows to show/edit default values
- Preferences card:
  - Default yield % (0-100)
  - Include scrap % (0-100)
  - Include overhead checkbox

**Database**: `formula_phases`, `mfg_prefs`

---

### 5. CRM Settings

**File**: `app/(admin)/settings/crm/page.tsx` & `actions.ts`

**Actions**:
- `getLeadSources()`, `createLeadSource()`, `updateLeadSource()`, `deleteLeadSource()`
- `getPipelineStages()`, `savePipelineStages(stages[])` - Bulk upsert with probabilities
- `saveCrmPrefs(input)` - auto_convert_lead toggle

**UI**:
- Lead sources list (CRUD + drag reorder)
- Pipeline stages editor:
  - Table: Stage Name, Probability (0-100), SLA Hours, Active
  - Editable inline or via modal
  - Drag to reorder
- Auto-convert lead checkbox (converts Lead → Opportunity when status = "Interested" or "Demo Scheduled")

**Database**: `crm_lead_sources`, `crm_pipeline_stages`, `crm_prefs`

---

### 6. Finance Settings

**File**: `app/(admin)/settings/finance/page.tsx` & `actions.ts`

**Actions**:
- `getFinancePrefs()`, `saveFinancePrefs(input)`

**UI**:
- Costing method dropdown (Weighted Avg, FIFO, LIFO)
- Overhead % (0-100)
- Include scrap checkbox
- Payment terms dropdown (Net 15, Net 30, Net 45, Net 60)
- Enabled currencies multi-select (USD, EUR, GBP, CAD, AUD)
- Export profiles section (stub with placeholder for QuickBooks/Xero CSV mapping)

**Database**: `finance_prefs`

---

### 7. Notifications & Automations

**File**: `app/(admin)/settings/notifications/page.tsx` & `actions.ts`

**Actions**:
- `getNotificationPrefs()`, `saveNotificationPrefs(input)`
- `getNotificationTriggers()`, `saveNotificationTriggers(triggers[])`

**UI**:
- **Channels** card:
  - Email from address
  - SMTP config (host, port, user, password, secure checkbox)
  - Slack webhook URL
  - Generic webhook secret
- **Triggers** card:
  - Checkboxes for: low_stock, batch_complete, coa_ready, lead_qualified, opp_stage_change
- **Quiet Hours** card:
  - Start/end time pickers (HH:MM)
  - Timezone dropdown

**Database**: `notification_prefs`, `notification_triggers`

---

### 8. Integrations

**File**: `app/(admin)/settings/integrations/page.tsx` & `actions.ts`

**Actions**:
- `getIntegrationPrefs()`, `saveIntegrationPrefs(input)`

**UI**:
- **Analytics** card:
  - PostHog API key
  - Google Analytics ID
- **Monitoring** card:
  - Sentry DSN
- **Shipping** card (stub):
  - Carrier toggles (UPS, FedEx, USPS)
  - API key placeholders
- **Tax Engine** card (stub):
  - Provider dropdown (Avalara, TaxJar)
  - API key placeholder
- **Supabase Storage** card (read-only):
  - Show bucket names and usage stats (fetch via supabase.storage.listBuckets())

**Database**: `integration_prefs`

---

### 9. Data Admin

**File**: `app/(admin)/settings/data/page.tsx` & `actions.ts`

**Actions**:
- `getDataAdminPrefs()`, `saveDataAdminPrefs(input)`
- `getFeatureFlags()`, `saveFeatureFlags(flags[])`
- `createBackupSnapshot()` - Stub RPC (placeholder, returns success message)
- `downloadImportTemplate(type)` - Generate CSV template for entities
- `uploadImportFile(type, file)` - Stub handler

**UI**:
- **Import/Export** card:
  - Dropdown to select entity (Users, Ingredients, Formulas, etc.)
  - "Download Template" button
  - File upload zone for CSV/JSON
  - "Import" button (stub, show success toast)
- **Backups** card:
  - Last backup timestamp (from `data_admin_prefs.backup_last_run`)
  - "Create Snapshot" button (stub RPC)
- **Environment** card:
  - Banner dropdown (Production, Sandbox, Development)
  - Visual banner color preview
- **Feature Flags** card:
  - Table: Flag Key, Enabled (checkbox)
  - Flags: `advanced_analytics`, `batch_automation`, `api_access`, `custom_reports`

**Database**: `data_admin_prefs`, `feature_flags`

---

## Testing

### Unit Tests (Server Actions)

Create test files: `app/(admin)/settings/*/actions.test.ts`

**Sample test structure** (using Jest or Vitest):

```typescript
import { saveOrgSettings } from './actions'

describe('Organization Settings Actions', () => {
  it('should save org settings for admin user', async () => {
    // Mock getAuthContext to return admin user
    const result = await saveOrgSettings({
      company_name: 'Test Corp',
      default_currency: 'USD',
      // ... other fields
    })
    expect(result.success).toBe(true)
    expect(result.data.company_name).toBe('Test Corp')
  })

  it('should reject non-admin user', async () => {
    // Mock getAuthContext to throw error
    const result = await saveOrgSettings({ company_name: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Admin access required')
  })

  it('should validate input with Zod', async () => {
    const result = await saveOrgSettings({ company_name: '' }) // Invalid
    expect(result.success).toBe(false)
  })
})
```

### RLS Tests (SQL)

Add comments in migration file with test queries:

```sql
-- Test: Non-admin cannot update org_settings
-- SET request.jwt.claims = '{"tenant_id": "...", "role": "ops"}';
-- UPDATE org_settings SET company_name = 'Hack' WHERE tenant_id = '...';
-- Expected: 0 rows updated (blocked by RLS)

-- Test: Admin can update org_settings
-- SET request.jwt.claims = '{"tenant_id": "...", "role": "admin"}';
-- UPDATE org_settings SET company_name = 'Valid' WHERE tenant_id = '...';
-- Expected: 1 row updated

-- Test: Cross-tenant access blocked
-- SET request.jwt.claims = '{"tenant_id": "tenant-A", "role": "admin"}';
-- SELECT * FROM org_settings WHERE tenant_id = 'tenant-B';
-- Expected: 0 rows
```

### Integration Tests

Test full flow from UI → server action → database:

1. Admin invites user → user appears in list with status=pending
2. Admin updates role → role_permissions updated + activity_log entry created
3. Admin deletes user → user removed + activity_log entry created

---

## Migration & Deployment

### 1. Run Migrations

```bash
# Apply schema
psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings.sql

# Apply seed data
psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings_seed.sql
```

Or use Supabase CLI:

```bash
supabase db reset  # Applies all migrations
```

### 2. Create Supabase Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Add RLS policy for branding bucket
CREATE POLICY "Admins can upload branding assets"
  ON storage.objects FOR ALL
  USING (bucket_id = 'branding' AND auth.is_admin())
  WITH CHECK (bucket_id = 'branding' AND auth.is_admin());
```

### 3. Update JWT Claims

Ensure Supabase Auth JWT includes `tenant_id` and `role`:

In Supabase Dashboard → Authentication → Settings → JWT Template, add:

```json
{
  "tenant_id": "{{ .UserMetadata.tenant_id }}",
  "role": "{{ .UserMetadata.role }}"
}
```

When creating users, set metadata:

```typescript
supabase.auth.admin.createUser({
  email: 'user@example.com',
  user_metadata: {
    tenant_id: 'uuid-here',
    role: 'admin'
  }
})
```

---

## Code Patterns & Best Practices

### Server Action Pattern

```typescript
'use server'

import { createClient } from '@/app/utils/supabase/server'
import { someSchema, type SomeInput } from '@/lib/validation/settings'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'

export async function someAction(input: SomeInput) {
  try {
    // 1. Auth & validation
    const { tenant_id, user_id } = await getAuthContext()
    const validated = someSchema.parse(input)

    const supabase = await createClient()

    // 2. Fetch existing data for diff (optional)
    const { data: before } = await supabase
      .from('table')
      .select('*')
      .eq('id', validated.id)
      .single()

    // 3. Perform mutation
    const { data, error } = await supabase
      .from('table')
      .upsert({ tenant_id, ...validated })
      .select()
      .single()

    if (error) throw error

    // 4. Log activity
    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'table_name',
      entity_id: data.id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('someAction error:', error)
    return { success: false, error: error.message || 'Failed' }
  }
}
```

### Client Page Pattern

```typescript
'use client'

import { useEffect, useState } from 'react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { getData, saveData } from './actions'

export default function SomeSettingsPage() {
  const [form, setForm] = useState({...})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const result = await getData()
    if (result.success && result.data) {
      setForm(result.data)
    }
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await saveData(form)
    setSaving(false)
    if (result.success) {
      showToast('Saved successfully', 'success')
    } else {
      showToast(result.error || 'Failed', 'error')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-8">
      <header>...</header>
      <form onSubmit={handleSubmit} className="space-y-8">
        <SettingsCard title="...">
          {/* Form fields */}
        </SettingsCard>
        <SettingsSubmitButton loading={saving}>Save</SettingsSubmitButton>
      </form>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
```

---

## Acceptance Criteria Checklist

- [x] Admin can navigate to /settings with left nav
- [x] Organization saves legal, localization, numbering schemes with preview
- [ ] Branding uploads logos to Supabase storage and persists URLs
- [ ] Users & Roles: Admin sees all tenant users with role/status
- [ ] Users & Roles: Can invite, edit role, adjust permissions, deactivate, delete
- [ ] All user actions logged in activity_log
- [ ] Inventory: CRUD categories + drag reorder + active toggle
- [ ] Manufacturing: CRUD phases + drag reorder + optional defaults
- [ ] CRM: Pipeline stages editable with probabilities/SLA
- [ ] Finance/Notifications/Integrations/Data pages save prefs
- [ ] RLS blocks non-admin writes and cross-tenant access
- [ ] All forms have validation, loading, error handling, toasts
- [ ] Tests for server actions (happy path + auth failures)
- [ ] RLS tests via SQL comments

---

## Next Steps

1. **Complete remaining pages** using the templates above
2. **Implement Supabase storage upload** for branding assets
3. **Add comprehensive tests** for all actions
4. **Seed production tenant** data (remove demo tenant or add multi-tenant switcher)
5. **Add user impersonation** (dev only, guard in production)
6. **Enhance activity log UI** (filterable timeline in Users page)
7. **Add CSV import/export handlers** in Data Admin
8. **Integrate with external services** (PostHog, Sentry, Slack webhooks)

---

## File Structure Summary

```
app/(admin)/settings/
├── layout.tsx                    ✅ Settings layout with left nav
├── organization/
│   ├── actions.ts                ✅ Org settings server actions
│   └── page.tsx                  ✅ Org settings page
├── branding/
│   ├── actions.ts                ⏳ TODO: Upload to storage
│   └── page.tsx                  ⏳ TODO: Logo upload UI
├── users/
│   ├── actions.ts                ✅ User CRUD + permissions
│   └── page.tsx                  ⏳ TODO: Table + permission matrix
├── inventory/
│   ├── actions.ts                ⏳ TODO: Categories + prefs
│   └── page.tsx                  ⏳ TODO: Drag list + toggles
├── manufacturing/
│   ├── actions.ts                ⏳ TODO: Phases + prefs
│   └── page.tsx                  ⏳ TODO: Drag list + defaults
├── crm/
│   ├── actions.ts                ⏳ TODO: Stages + sources
│   └── page.tsx                  ⏳ TODO: Pipeline editor
├── finance/
│   ├── actions.ts                ⏳ TODO: Finance prefs
│   └── page.tsx                  ⏳ TODO: Costing + currencies
├── notifications/
│   ├── actions.ts                ⏳ TODO: Channels + triggers
│   └── page.tsx                  ⏳ TODO: SMTP + webhooks
├── integrations/
│   ├── actions.ts                ⏳ TODO: Analytics + Sentry
│   └── page.tsx                  ⏳ TODO: API keys + toggles
└── data/
    ├── actions.ts                ⏳ TODO: Import/export + flags
    └── page.tsx                  ⏳ TODO: CSV upload + backups

components/settings/
├── SettingsCard.tsx              ✅
├── SettingsFormField.tsx         ✅
├── SettingsSubmitButton.tsx      ✅
└── DraggableList.tsx             ✅

components/
└── Toast.tsx                     ✅

lib/
├── validation/settings.ts        ✅ All Zod schemas
├── hooks/useToast.ts             ✅
└── server/activity-log.ts        ✅

supabase/migrations/
├── 20250105_admin_settings.sql   ✅ Full schema + RLS
└── 20250105_admin_settings_seed.sql ✅ Demo data
```

---

## Support & Maintenance

For questions or issues:
1. Check this guide first
2. Review existing Organization settings implementation as reference
3. Ensure migrations have been applied
4. Verify RLS policies are active
5. Check browser console and server logs for errors

Happy building! 🚀
