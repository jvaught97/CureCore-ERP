-- Fix users table RLS recursion by replacing recursive policies
-- Safe to run repeatedly (drops with IF EXISTS)

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove old/recursive policies
DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_admin_all ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_all_authenticated ON public.users;
DROP POLICY IF EXISTS users_all_anon ON public.users;
DROP POLICY IF EXISTS users_service_role_all ON public.users;
DROP POLICY IF EXISTS users_select_self ON public.users;
DROP POLICY IF EXISTS users_update_self ON public.users;

-- Allow authenticated users to read/update their own profile row
CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role full access (server-side operations)
CREATE POLICY users_service_role_all ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
