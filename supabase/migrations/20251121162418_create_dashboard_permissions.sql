-- Create dashboard_permissions table to control which dashboards users can access
CREATE TABLE IF NOT EXISTS public.dashboard_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('overview', 'operations', 'commercial', 'financial')),
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  
  -- Ensure one row per user per dashboard type
  UNIQUE(user_id, dashboard_type)
);

-- Add RLS policies
ALTER TABLE public.dashboard_permissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own permissions
CREATE POLICY dashboard_permissions_select_own 
  ON public.dashboard_permissions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow admins to manage all permissions
CREATE POLICY dashboard_permissions_admin_all 
  ON public.dashboard_permissions 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND LOWER(users.role) = 'admin'
    )
  );

-- Allow anon access for now (for local dev with bypass auth)
CREATE POLICY dashboard_permissions_anon_all 
  ON public.dashboard_permissions 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_dashboard_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_permissions_updated_at
  BEFORE UPDATE ON public.dashboard_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_permissions_updated_at();

-- Add helpful comment
COMMENT ON TABLE public.dashboard_permissions IS 'Controls which dashboard views (overview, operations, commercial, financial) each user can access. Admins can configure this per user.';
