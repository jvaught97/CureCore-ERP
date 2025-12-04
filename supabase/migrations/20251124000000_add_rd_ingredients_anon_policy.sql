-- Add explicit anon policy for rd_ingredients to support bypass auth mode
-- This ensures that when NEXT_PUBLIC_SUPABASE_BYPASS_AUTH=true, the anon role can still access rd_ingredients

CREATE POLICY rd_ingredients_all_anon
  ON public.rd_ingredients
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
