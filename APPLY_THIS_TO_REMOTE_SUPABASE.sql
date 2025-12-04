-- ===================================================================
-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- Project: retcdlmdyvjetdjiwfgx
-- URL: https://supabase.com/dashboard/project/retcdlmdyvjetdjiwfgx/sql
-- ===================================================================

-- Add all missing columns to rd_ingredients table
ALTER TABLE public.rd_ingredients
  ADD COLUMN IF NOT EXISTS on_hand NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'g',
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_per_gram NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS organic_cert BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coa_url TEXT,
  ADD COLUMN IF NOT EXISTS coa_expiration_date DATE,
  ADD COLUMN IF NOT EXISTS unit_size NUMERIC,
  ADD COLUMN IF NOT EXISTS unit_measure TEXT,
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS last_purchase_price NUMERIC,
  ADD COLUMN IF NOT EXISTS last_purchase_date DATE;

-- Update existing rows to have default values
UPDATE public.rd_ingredients
SET
  on_hand = COALESCE(on_hand, 0),
  unit = COALESCE(unit, 'g'),
  status = COALESCE(status, 'active'),
  organic_cert = COALESCE(organic_cert, false);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS rd_ingredients_category_idx ON public.rd_ingredients(category);
CREATE INDEX IF NOT EXISTS rd_ingredients_status_idx ON public.rd_ingredients(status);
CREATE INDEX IF NOT EXISTS rd_ingredients_organic_cert_idx ON public.rd_ingredients(organic_cert);
CREATE INDEX IF NOT EXISTS rd_ingredients_supplier_id_idx ON public.rd_ingredients(supplier_id);

-- ===================================================================
-- After running this, try creating an R&D ingredient again!
-- ===================================================================
