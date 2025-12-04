-- Add quantity field to rd_ingredients to track package size
-- This allows us to calculate exact cost per unit

ALTER TABLE public.rd_ingredients
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 1;

-- Update existing rows to have default quantity of 1
UPDATE public.rd_ingredients SET quantity = 1 WHERE quantity IS NULL;

COMMENT ON COLUMN public.rd_ingredients.quantity IS 'The quantity of the ingredient in the package (e.g., 1 for 1kg, 500 for 500ml)';
