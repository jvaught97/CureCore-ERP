-- Migration: Add Organizations and org_id to users
-- Created: 2025-12-03
-- Purpose: Add multi-tenant organization support

-- 1. Create organizations table first
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Create a default organization BEFORE adding the column
INSERT INTO public.organizations (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Default Organization',
  'default'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Add org_id column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 4. Assign all existing users to the default organization
UPDATE public.users
SET org_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE org_id IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_org_id_idx ON public.users(org_id);

-- 5. Drop the policy if it exists, then create it
DROP POLICY IF EXISTS organizations_select_own ON public.organizations;
CREATE POLICY organizations_select_own ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 6. Add trigger to auto-assign new users to default org
CREATE OR REPLACE FUNCTION public.assign_default_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS users_assign_default_org ON public.users;
CREATE TRIGGER users_assign_default_org
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_org();
