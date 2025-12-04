-- Run this in Supabase Studio SQL Editor at http://127.0.0.1:54323
-- To fix the infinite recursion in users table RLS policies

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_admin_all ON public.users;

-- Create a simple policy that allows all authenticated users to read profiles
CREATE POLICY users_select_all ON public.users
  FOR SELECT
  TO authenticated
  USING (true);
