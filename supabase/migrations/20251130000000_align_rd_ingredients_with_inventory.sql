-- Align rd_ingredients table with inventory ingredients table structure
-- This migration adds all fields from the ingredients table to rd_ingredients
-- to ensure both systems can store the same comprehensive information

-- Add inventory management columns
ALTER TABLE public.rd_ingredients
  ADD COLUMN IF NOT EXISTS on_hand NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'g',
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_per_gram NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add organic certification columns
ALTER TABLE public.rd_ingredients
  ADD COLUMN IF NOT EXISTS organic_cert BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coa_url TEXT,
  ADD COLUMN IF NOT EXISTS coa_expiration_date DATE;

-- Add pricing and purchase history columns
ALTER TABLE public.rd_ingredients
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

-- Migrate est_unit_cost to cost_per_gram if cost_per_gram is null
UPDATE public.rd_ingredients
SET cost_per_gram = est_unit_cost
WHERE cost_per_gram IS NULL AND est_unit_cost IS NOT NULL;

-- Migrate default_unit to unit if different
UPDATE public.rd_ingredients
SET unit = default_unit
WHERE default_unit IS NOT NULL AND (unit IS NULL OR unit = 'g');

-- Migrate quantity to unit_size (quantity represented package size)
UPDATE public.rd_ingredients
SET unit_size = quantity
WHERE quantity IS NOT NULL AND quantity > 0 AND unit_size IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS rd_ingredients_category_idx ON public.rd_ingredients(category);
CREATE INDEX IF NOT EXISTS rd_ingredients_status_idx ON public.rd_ingredients(status);
CREATE INDEX IF NOT EXISTS rd_ingredients_organic_cert_idx ON public.rd_ingredients(organic_cert);
CREATE INDEX IF NOT EXISTS rd_ingredients_supplier_id_idx ON public.rd_ingredients(supplier_id);

-- Add comments to document the columns
COMMENT ON COLUMN public.rd_ingredients.on_hand IS 'Current inventory stock in the specified unit (typically grams)';
COMMENT ON COLUMN public.rd_ingredients.unit IS 'Unit of measurement for inventory (g, kg, ml, L, oz, lb, units)';
COMMENT ON COLUMN public.rd_ingredients.reorder_point IS 'Minimum stock level that triggers reorder alert';
COMMENT ON COLUMN public.rd_ingredients.cost_per_gram IS 'Cost per gram for accurate formula costing';
COMMENT ON COLUMN public.rd_ingredients.status IS 'Ingredient status (active, discontinued, pending)';
COMMENT ON COLUMN public.rd_ingredients.organic_cert IS 'Whether the ingredient has organic certification';
COMMENT ON COLUMN public.rd_ingredients.coa_url IS 'URL to the Certificate of Analysis document';
COMMENT ON COLUMN public.rd_ingredients.coa_expiration_date IS 'Expiration date of the COA for renewal tracking';
COMMENT ON COLUMN public.rd_ingredients.unit_size IS 'Package size (e.g., 1000 for 1kg bag)';
COMMENT ON COLUMN public.rd_ingredients.unit_measure IS 'Package unit (g, kg, ml, L, oz, lb)';
COMMENT ON COLUMN public.rd_ingredients.price_per_unit IS 'Price per package/unit for cost calculation';
COMMENT ON COLUMN public.rd_ingredients.last_purchase_price IS 'Most recent purchase price for tracking';
COMMENT ON COLUMN public.rd_ingredients.last_purchase_date IS 'Date of last purchase order';
