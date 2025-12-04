# Admin Settings - Quick Start Guide

## 🚀 Option 1: Apply Migrations via Script (Recommended)

### Step 1: Get Your Database Connection String

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`retcdlmdyvjetdjiwfgx`)
3. Navigate to: **Settings** → **Database** → **Connection String**
4. Copy the **"Direct connection"** string (should start with `postgresql://postgres:...`)
5. Replace `[YOUR-PASSWORD]` with your actual database password

### Step 2: Run the Migration Script

```bash
cd /Users/sloppyjoe/curecore-erp
./scripts/apply-settings-migrations.sh
```

When prompted:
- Paste your database connection string
- Choose `y` to apply seed data (demo tenant)

### Step 3: Access Settings

```bash
npm run dev
```

Navigate to: http://localhost:3000/settings/organization

**Note**: You must be logged in as an admin user to access settings.

---

## 🔧 Option 2: Apply Migrations Manually via Supabase Dashboard

### Step 1: Open SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Apply Schema Migration

1. Open the file: `supabase/migrations/20250105_admin_settings.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Wait for completion (should take 5-10 seconds)

### Step 3: Apply Seed Data (Optional)

1. Open the file: `supabase/migrations/20250105_admin_settings_seed.sql`
2. Copy the entire contents
3. Paste into a new SQL Editor query
4. Click **Run**

### Step 4: Verify Installation

Run this query in SQL Editor:

```sql
SELECT
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%_prefs' OR tablename = 'org_settings')
ORDER BY tablename;
```

You should see:
- `crm_prefs`
- `data_admin_prefs`
- `finance_prefs`
- `integration_prefs`
- `inventory_prefs`
- `mfg_prefs`
- `notification_prefs`
- `org_settings`

---

## 🔧 Option 3: Apply Migrations via psql CLI

If you have PostgreSQL client installed:

```bash
# Set your database URL (get from Supabase Dashboard → Settings → Database)
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.retcdlmdyvjetdjiwfgx.supabase.co:5432/postgres"

# Apply migrations
psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings.sql
psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings_seed.sql
```

---

## ✅ Post-Installation

### 1. Verify RLS Policies

Run in SQL Editor:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%_prefs'
ORDER BY tablename;
```

You should see policies like `read_own_tenant_*_prefs` and `write_own_tenant_*_prefs_admin`.

### 2. Create Admin User (if needed)

If you don't have an admin user yet:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Update to admin role (replace with your user ID)
UPDATE users
SET role = 'admin',
    tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'YOUR-USER-ID';
```

### 3. Test Access

1. Start your dev server: `npm run dev`
2. Login to your app
3. Navigate to: http://localhost:3000/settings/organization
4. You should see the Organization settings page

**If you see "Admins Only"**: Check that your user's `role` is set to `'admin'` (lowercase) in the `users` table.

---

## 🎯 What's Available Now

### ✅ Fully Functional Pages

1. **Organization Settings** (`/settings/organization`)
   - Company details (name, DBA, EIN, address)
   - Localization (fiscal year, currency, timezone)
   - Numbering schemes with live preview

2. **Manufacturing Settings** (`/settings/manufacturing`)
   - Formula phases (drag-and-drop to reorder)
   - Batch settings (yield %, scrap %, overhead)

### ⏳ Coming Soon (Templates Provided)

- Users & Roles (actions ready, UI template in guide)
- Branding & Templates
- Inventory
- CRM
- Finance
- Notifications
- Integrations
- Data Admin

---

## 📚 Next Steps

1. **Review Documentation**:
   - [ADMIN_SETTINGS_README.md](ADMIN_SETTINGS_README.md) - Architecture & features
   - [SETTINGS_IMPLEMENTATION_GUIDE.md](SETTINGS_IMPLEMENTATION_GUIDE.md) - Complete implementation guide
   - [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Production deployment

2. **Test the System**:
   - Save organization settings
   - Create/reorder manufacturing phases
   - Check activity log: `SELECT * FROM activity_log ORDER BY created_at DESC;`

3. **Implement Remaining Pages** (optional):
   - Each page takes ~1-2 hours
   - Follow Organization/Manufacturing patterns
   - All templates provided in implementation guide

---

## 🐛 Troubleshooting

### "Admins Only" screen appears

**Solution**: Check user role

```sql
-- Check your role
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';

-- Update to admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Migration fails with "relation already exists"

**Solution**: Migrations were already applied or partially applied.

Check existing tables:
```sql
SELECT tablename FROM pg_tables WHERE tablename = 'org_settings';
```

If it exists, you can skip the migration.

### "tenant_id cannot be null" errors

**Solution**: Add tenant_id to your user

```sql
UPDATE users
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'your-email@example.com';
```

### Can't find /settings route

**Solution**: Make sure the app is running and you're using the new settings path:
- Old: `/account/settings` (now redirects admins)
- New: `/settings/organization`

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review [ADMIN_SETTINGS_README.md](ADMIN_SETTINGS_README.md)
3. Check browser console and network tab for errors
4. Verify database connection and migrations applied correctly

---

## 🎉 You're All Set!

Your admin settings system is now ready to use. Start by configuring your organization settings at:

**http://localhost:3000/settings/organization**

Enjoy! 🚀
