-- Add category field to rd_ingredients to categorize ingredients
-- This allows organizing ingredients by type (e.g., sweeteners, proteins, fats, etc.)

ALTER TABLE public.rd_ingredients
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.rd_ingredients.category IS 'Category/type of the ingredient (e.g., Sweetener, Protein, Fat, Preservative, etc.)';
