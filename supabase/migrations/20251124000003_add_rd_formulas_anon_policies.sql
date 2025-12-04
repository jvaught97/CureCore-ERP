-- Add explicit anon policies for rd_formulas and rd_formula_ingredients to support bypass auth mode
-- This ensures that when SUPABASE_BYPASS_AUTH=true, the anon role can access these tables

-- Add anon policy for rd_formulas
DROP POLICY IF EXISTS rd_formulas_all_anon ON public.rd_formulas;

CREATE POLICY rd_formulas_all_anon
  ON public.rd_formulas
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Add anon policy for rd_formula_ingredients
DROP POLICY IF EXISTS rd_formula_ingredients_all_anon ON public.rd_formula_ingredients;

CREATE POLICY rd_formula_ingredients_all_anon
  ON public.rd_formula_ingredients
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
