-- Add explicit anon policy for ingredients table to support bypass auth mode
-- This ensures that when SUPABASE_BYPASS_AUTH=true, the anon role can access ingredients

DROP POLICY IF EXISTS ingredients_all_anon ON public.ingredients;

CREATE POLICY ingredients_all_anon
  ON public.ingredients
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
