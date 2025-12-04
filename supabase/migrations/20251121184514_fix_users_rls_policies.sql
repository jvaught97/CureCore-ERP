-- Fix users table RLS policies to avoid infinite recursion
-- Drop all existing policies
DROP POLICY IF EXISTS users_admin_all ON public.users CASCADE;
DROP POLICY IF EXISTS users_select_admin ON public.users CASCADE;
DROP POLICY IF EXISTS users_select_own ON public.users CASCADE;
DROP POLICY IF EXISTS users_update_own ON public.users CASCADE;
DROP POLICY IF EXISTS users_all_authenticated ON public.users CASCADE;
DROP POLICY IF EXISTS users_all_anon ON public.users CASCADE;

-- Create simple non-recursive policies
CREATE POLICY users_all_authenticated ON public.users 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY users_all_anon ON public.users 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);
