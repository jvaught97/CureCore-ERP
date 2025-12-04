-- Quick fix to create essential dashboard tables
-- This runs first (timestamp 00000000000000) to ensure tables exist

CREATE TABLE IF NOT EXISTS public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturing_status text DEFAULT 'draft',
  completed_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ingredients (
  id text PRIMARY KEY DEFAULT 'ing-' || substr(md5(random()::text), 1, 8),
  name text,
  on_hand numeric DEFAULT 0,
  reorder_point numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Insert default ingredient categories
INSERT INTO public.ingredient_categories (name, sort_order) VALUES
  ('Active Ingredients', 1),
  ('Emollients', 2),
  ('Emulsifiers', 3),
  ('Humectants', 4),
  ('Preservatives', 5),
  ('Thickeners', 6),
  ('Surfactants', 7),
  ('Botanicals', 8),
  ('Vitamins', 9),
  ('Oils & Butters', 10),
  ('Extracts', 11),
  ('Fragrances', 12),
  ('Other', 99)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.coas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  dark_mode BOOLEAN DEFAULT false,
  primary_color TEXT DEFAULT '#174940',
  secondary_color TEXT DEFAULT '#1a5c51',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Insert default org settings
INSERT INTO public.org_settings (dark_mode, primary_color, secondary_color)
VALUES (false, '#174940', '#1a5c51')
ON CONFLICT DO NOTHING;

-- Enable RLS (Row Level Security) but allow all for now
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and modify all data
DROP POLICY IF EXISTS batches_select ON public.batches;
CREATE POLICY batches_select ON public.batches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS batches_insert ON public.batches;
CREATE POLICY batches_insert ON public.batches FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS batches_update ON public.batches;
CREATE POLICY batches_update ON public.batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS batches_delete ON public.batches;
CREATE POLICY batches_delete ON public.batches FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS ingredients_select ON public.ingredients;
CREATE POLICY ingredients_select ON public.ingredients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ingredients_insert ON public.ingredients;
CREATE POLICY ingredients_insert ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS ingredients_update ON public.ingredients;
CREATE POLICY ingredients_update ON public.ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingredients_delete ON public.ingredients;
CREATE POLICY ingredients_delete ON public.ingredients FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS ingredient_categories_select ON public.ingredient_categories;
CREATE POLICY ingredient_categories_select ON public.ingredient_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ingredient_categories_insert ON public.ingredient_categories;
CREATE POLICY ingredient_categories_insert ON public.ingredient_categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS ingredient_categories_update ON public.ingredient_categories;
CREATE POLICY ingredient_categories_update ON public.ingredient_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingredient_categories_delete ON public.ingredient_categories;
CREATE POLICY ingredient_categories_delete ON public.ingredient_categories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS coas_select ON public.coas;
CREATE POLICY coas_select ON public.coas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS coas_insert ON public.coas;
CREATE POLICY coas_insert ON public.coas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS coas_update ON public.coas;
CREATE POLICY coas_update ON public.coas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS coas_delete ON public.coas;
CREATE POLICY coas_delete ON public.coas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS org_settings_select ON public.org_settings;
CREATE POLICY org_settings_select ON public.org_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS org_settings_insert ON public.org_settings;
CREATE POLICY org_settings_insert ON public.org_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS org_settings_update ON public.org_settings;
CREATE POLICY org_settings_update ON public.org_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS org_settings_delete ON public.org_settings;
CREATE POLICY org_settings_delete ON public.org_settings FOR DELETE TO authenticated USING (true);
