-- ===================================================================
-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- Project: retcdlmdyvjetdjiwfgx
-- URL: https://supabase.com/dashboard/project/retcdlmdyvjetdjiwfgx/sql
-- ===================================================================
-- This script adds missing columns to R&D formula tables
-- Based on migrations: 20251129000000_formula_versioning_and_costing.sql
-- ===================================================================

-- ============================================================================
-- STEP 1: Add versioning columns to rd_formulas
-- ============================================================================

ALTER TABLE public.rd_formulas
  ADD COLUMN IF NOT EXISTS version_major INTEGER,
  ADD COLUMN IF NOT EXISTS version_minor INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES public.rd_formulas(id);

-- Add comments to explain the columns
COMMENT ON COLUMN public.rd_formulas.version_major IS 'Major version number (e.g., 1 in v1.2)';
COMMENT ON COLUMN public.rd_formulas.version_minor IS 'Minor version number (e.g., 2 in v1.2)';
COMMENT ON COLUMN public.rd_formulas.is_locked IS 'When true, this version cannot be edited (historical version)';
COMMENT ON COLUMN public.rd_formulas.parent_version_id IS 'References the previous version this was created from';

-- ============================================================================
-- STEP 2: Add category column to rd_ingredients (if missing)
-- ============================================================================

ALTER TABLE public.rd_ingredients
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.rd_ingredients.category IS 'Ingredient category for organization';

-- ============================================================================
-- STEP 3: Create indexes for efficient queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rd_formulas_name ON public.rd_formulas(name);
CREATE INDEX IF NOT EXISTS idx_rd_formulas_version_major_minor ON public.rd_formulas(version_major, version_minor);
CREATE INDEX IF NOT EXISTS idx_rd_formulas_parent_version ON public.rd_formulas(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_rd_formulas_is_locked ON public.rd_formulas(is_locked);

-- ============================================================================
-- STEP 4: Add unique constraint on formula name + version (if not exists)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rd_formulas_name_version_unique'
    ) THEN
        ALTER TABLE public.rd_formulas
            ADD CONSTRAINT rd_formulas_name_version_unique UNIQUE (name, version);
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Update RLS policies to handle locked formulas
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS rd_formulas_mod ON public.rd_formulas;
DROP POLICY IF EXISTS rd_formulas_select ON public.rd_formulas;
DROP POLICY IF EXISTS rd_formula_ingredients_mod ON public.rd_formula_ingredients;
DROP POLICY IF EXISTS rd_formula_ingredients_select ON public.rd_formula_ingredients;

-- Recreate SELECT policy (unchanged - all users can see their own formulas)
CREATE POLICY rd_formulas_select ON public.rd_formulas
  FOR SELECT
  USING (created_by = auth.uid());

-- Recreate INSERT/UPDATE/DELETE policy (only unlocked formulas can be modified)
CREATE POLICY rd_formulas_mod ON public.rd_formulas
  FOR ALL
  USING (created_by = auth.uid() AND is_locked = FALSE)
  WITH CHECK (created_by = auth.uid() AND is_locked = FALSE);

-- Recreate SELECT policy for formula ingredients
CREATE POLICY rd_formula_ingredients_select ON public.rd_formula_ingredients
  FOR SELECT
  USING (created_by = auth.uid());

-- Recreate modification policy for formula ingredients (only unlocked formulas)
CREATE POLICY rd_formula_ingredients_mod ON public.rd_formula_ingredients
  FOR ALL
  USING (created_by = auth.uid() AND is_locked = FALSE);

-- ============================================================================
-- STEP 6: Reload PostgREST schema cache
-- ============================================================================

-- Send NOTIFY to reload schema in PostgREST
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- After running this, refresh your browser and try loading the formula again!
-- ===================================================================
