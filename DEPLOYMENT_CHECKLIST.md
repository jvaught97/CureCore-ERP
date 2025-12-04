# Admin Settings - Deployment Checklist

## Pre-Deployment

### 1. Database Migrations

- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Run migration: `20250105_admin_settings.sql`
  ```bash
  psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings.sql
  ```
- [ ] Verify all tables created successfully
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%_prefs' OR tablename LIKE '%_settings';
  ```
- [ ] Verify RLS policies are active
  ```sql
  SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
  ```

### 2. Seed Data (Optional - for new installations)

- [ ] Run seed migration: `20250105_admin_settings_seed.sql`
  ```bash
  psql $DATABASE_URL -f supabase/migrations/20250105_admin_settings_seed.sql
  ```
- [ ] Verify demo tenant created
  ```sql
  SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';
  ```

### 3. Supabase Configuration

- [ ] Create storage bucket for branding assets
  ```sql
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('branding', 'branding', true)
  ON CONFLICT (id) DO NOTHING;
  ```
- [ ] Add RLS policy for storage bucket
  ```sql
  CREATE POLICY "Admins can manage branding assets"
    ON storage.objects FOR ALL
    USING (bucket_id = 'branding' AND (
      current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
    ));
  ```

### 4. JWT Configuration

- [ ] Update Supabase Auth JWT template to include:
  ```json
  {
    "tenant_id": "{{ .UserMetadata.tenant_id }}",
    "role": "{{ .UserMetadata.role }}"
  }
  ```
- [ ] Test JWT claims are present
  ```javascript
  const { data: { user } } = await supabase.auth.getUser()
  console.log(user?.app_metadata) // Should include tenant_id and role
  ```

### 5. User Setup

- [ ] Ensure at least one admin user exists per tenant
  ```sql
  UPDATE users SET role = 'admin', tenant_id = '<tenant-uuid>' WHERE email = 'admin@example.com';
  ```
- [ ] Verify admin user can access `/settings/organization`

---

## Deployment Steps

### 1. Code Deployment

- [ ] Merge feature branch to main
- [ ] Run build locally to check for errors
  ```bash
  npm run build
  ```
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging

### 2. Staging Verification

- [ ] Login as admin user
- [ ] Navigate to `/settings/organization`
- [ ] Save organization settings
- [ ] Verify activity log entry created
  ```sql
  SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10;
  ```
- [ ] Test Manufacturing settings (create/update/reorder phases)
- [ ] Test Users & Roles actions (if page completed)
- [ ] Verify RLS: Login as non-admin, attempt to access `/settings/*`
  - Should see "Admins Only" screen

### 3. Production Deployment

- [ ] Deploy code to production
- [ ] Apply migrations to production database
- [ ] Smoke test critical paths
- [ ] Monitor error logs for 30 minutes

---

## Post-Deployment

### 1. Data Migration (if migrating from old settings)

- [ ] Export existing settings from old system
- [ ] Map to new schema
- [ ] Import via SQL or admin UI
- [ ] Verify all data migrated correctly

### 2. User Communication

- [ ] Notify admins of new settings location
- [ ] Provide link to documentation
- [ ] Offer training session if needed

### 3. Monitoring

- [ ] Set up alerts for RLS policy violations (if logging enabled)
- [ ] Monitor activity_log table growth
- [ ] Check for any error spikes in application logs

---

## Rollback Plan

If issues arise:

### 1. Immediate Rollback

- [ ] Revert code deployment
- [ ] Old `/account/settings` page still exists as fallback
- [ ] Database tables can remain (no data loss)

### 2. Database Rollback (if needed)

- [ ] Drop new tables
  ```sql
  DROP TABLE IF EXISTS activity_log, org_settings, role_permissions,
                       ingredient_categories, inventory_prefs, formula_phases, mfg_prefs,
                       crm_lead_sources, crm_pipeline_stages, crm_prefs,
                       finance_prefs, notification_prefs, notification_triggers,
                       integration_prefs, data_admin_prefs, feature_flags CASCADE;
  ```
- [ ] Restore from backup if data was modified

---

## Testing Checklist

### Unit Tests

- [ ] Run all tests: `npm test`
- [ ] All server action tests pass
- [ ] No TypeScript errors: `npm run type-check`

### Integration Tests

- [ ] Admin can create org settings
- [ ] Admin can update org settings
- [ ] Activity log records all changes
- [ ] Non-admin cannot access settings
- [ ] Non-admin cannot write to settings tables (RLS test)
- [ ] Cross-tenant access blocked (RLS test)

### Manual Testing

- [ ] Organization settings form validates correctly
- [ ] Numbering scheme preview updates live
- [ ] Manufacturing phases can be reordered via drag-drop
- [ ] Phase modal saves/updates correctly
- [ ] Toast notifications appear on success/error
- [ ] Loading states work correctly
- [ ] Old `/account/settings` redirects admins to new location

---

## Performance Checks

- [ ] Page load time < 2s for settings pages
- [ ] No N+1 queries (check with Supabase logs)
- [ ] Activity log inserts don't block main queries
- [ ] Indexes exist on all foreign keys and sort columns
  ```sql
  SELECT * FROM pg_indexes WHERE tablename LIKE '%_prefs' OR tablename LIKE '%_settings';
  ```

---

## Security Validation

### RLS Tests

Run these queries as different users to verify RLS:

```sql
-- Test 1: Non-admin cannot update org_settings
SET request.jwt.claims = '{"tenant_id": "tenant-A", "role": "ops"}';
UPDATE org_settings SET company_name = 'Hacked' WHERE tenant_id = 'tenant-A';
-- Expected: 0 rows updated

-- Test 2: Admin from tenant-A cannot read tenant-B data
SET request.jwt.claims = '{"tenant_id": "tenant-A", "role": "admin"}';
SELECT * FROM org_settings WHERE tenant_id = 'tenant-B';
-- Expected: 0 rows

-- Test 3: Admin can update own tenant
SET request.jwt.claims = '{"tenant_id": "tenant-A", "role": "admin"}';
UPDATE org_settings SET company_name = 'Valid' WHERE tenant_id = 'tenant-A';
-- Expected: 1 row updated
```

---

## Documentation

- [x] Implementation guide created ([SETTINGS_IMPLEMENTATION_GUIDE.md](SETTINGS_IMPLEMENTATION_GUIDE.md))
- [x] Quick start guide created ([ADMIN_SETTINGS_README.md](ADMIN_SETTINGS_README.md))
- [ ] API documentation for server actions (if needed)
- [ ] User-facing help docs
- [ ] Video walkthrough (optional)

---

## Known Limitations

1. **User Invites**: Currently creates pending users in database but doesn't send actual email. Need to integrate with Supabase Auth Admin API.
2. **Branding Uploads**: Logo upload UI not yet implemented. Need to add Supabase storage integration.
3. **Remaining Pages**: 7 settings pages have templates but need implementation (Inventory, CRM, Finance, etc.)
4. **Tests**: Sample test provided but full test coverage needed.
5. **Import/Export**: Data Admin page has stubs for CSV import/export but handlers not implemented.

---

## Next Steps After Deployment

1. **Complete remaining pages** (use Organization/Manufacturing as templates)
2. **Implement logo upload** with Supabase storage
3. **Add comprehensive test coverage** (aim for 80%+)
4. **Set up CI/CD** to run tests on every PR
5. **Add user impersonation** for support/debugging (dev only)
6. **Implement audit log viewer** with filters and export
7. **Add CSV import/export** handlers for bulk data operations
8. **Integrate external services** (PostHog, Sentry, Slack webhooks)

---

## Support Contacts

- **Technical Issues**: See [SETTINGS_IMPLEMENTATION_GUIDE.md](SETTINGS_IMPLEMENTATION_GUIDE.md)
- **Database Questions**: Check RLS policies and JWT claims
- **Feature Requests**: Document in backlog

---

## Sign-off

- [ ] Development Team Lead reviewed
- [ ] QA verified on staging
- [ ] Database Admin reviewed migrations
- [ ] Security team reviewed RLS policies
- [ ] Product Owner approved for deployment

**Deployment Date**: _________________

**Deployed By**: _________________

**Verified By**: _________________
