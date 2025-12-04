-- =====================================================
-- SUPPLIERS MANAGEMENT SYSTEM
-- =====================================================
-- Creates tables for managing suppliers and their relationships
-- with ingredients and packaging items

-- =====================================================
-- 1. SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- =====================================================
-- 2. INGREDIENT_SUPPLIERS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ingredient_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  lead_time_days INTEGER,
  minimum_order_quantity NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ingredient_id, supplier_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ingredient_suppliers_ingredient ON ingredient_suppliers(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_suppliers_supplier ON ingredient_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_suppliers_primary ON ingredient_suppliers(is_primary);

-- =====================================================
-- 3. PACKAGING_SUPPLIERS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS packaging_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  packaging_id UUID NOT NULL REFERENCES packaging(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  lead_time_days INTEGER,
  minimum_order_quantity NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(packaging_id, supplier_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_packaging_suppliers_packaging ON packaging_suppliers(packaging_id);
CREATE INDEX IF NOT EXISTS idx_packaging_suppliers_supplier ON packaging_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_packaging_suppliers_primary ON packaging_suppliers(is_primary);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_suppliers ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Allow authenticated users to view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);

-- Ingredient_suppliers policies
CREATE POLICY "Allow authenticated users to view ingredient_suppliers"
  ON ingredient_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert ingredient_suppliers"
  ON ingredient_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ingredient_suppliers"
  ON ingredient_suppliers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete ingredient_suppliers"
  ON ingredient_suppliers FOR DELETE
  TO authenticated
  USING (true);

-- Packaging_suppliers policies
CREATE POLICY "Allow authenticated users to view packaging_suppliers"
  ON packaging_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert packaging_suppliers"
  ON packaging_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update packaging_suppliers"
  ON packaging_suppliers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete packaging_suppliers"
  ON packaging_suppliers FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 5. UPDATED_AT TRIGGERS
-- =====================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredient_suppliers_updated_at
  BEFORE UPDATE ON ingredient_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packaging_suppliers_updated_at
  BEFORE UPDATE ON packaging_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
