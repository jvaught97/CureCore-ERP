-- Add missing columns to ingredients table for R&D compatibility
-- The RdFormulaForm component expects 'unit' and 'cost_per_gram' columns

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'g',
  ADD COLUMN IF NOT EXISTS cost_per_gram NUMERIC DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS ingredients_name_idx ON public.ingredients(name);

-- Update any existing rows to have default unit
UPDATE public.ingredients SET unit = 'g' WHERE unit IS NULL;
UPDATE public.ingredients SET cost_per_gram = 0 WHERE cost_per_gram IS NULL;
