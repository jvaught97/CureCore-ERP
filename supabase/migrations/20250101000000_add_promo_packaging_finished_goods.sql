-- Migration: Add Promo/Kitting, Packaging Supplies, and Finished Goods Tracking
-- Created: 2025-01-01
-- Description: Implements three new inventory systems with sales order integration

-- ========================================
-- 1. PROMO/KITTING ITEMS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS promo_kitting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'promo', 'kitting', 'insert'
  on_hand DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'unit',
  cost_per_unit DECIMAL(10,4),
  reorder_point INTEGER,
  sku VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for promo_kitting_items
ALTER TABLE promo_kitting_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read promo_kitting_items" ON promo_kitting_items;
CREATE POLICY "Allow all authenticated users to read promo_kitting_items"
  ON promo_kitting_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to insert promo_kitting_items" ON promo_kitting_items;
CREATE POLICY "Allow all authenticated users to insert promo_kitting_items"
  ON promo_kitting_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated users to update promo_kitting_items" ON promo_kitting_items;
CREATE POLICY "Allow all authenticated users to update promo_kitting_items"
  ON promo_kitting_items FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to delete promo_kitting_items" ON promo_kitting_items;
CREATE POLICY "Allow all authenticated users to delete promo_kitting_items"
  ON promo_kitting_items FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- 2. PACKAGING SUPPLIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS packaging_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'box', 'filler', 'cushioning', 'tape', 'label'
  on_hand DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'unit', -- 'unit', 'sheet', 'roll', 'feet'
  cost_per_unit DECIMAL(10,4),
  reorder_point INTEGER,
  sku VARCHAR(100) UNIQUE,
  size_spec VARCHAR(100), -- '12x12x12', 'Small', 'Large'
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for packaging_supplies
ALTER TABLE packaging_supplies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read packaging_supplies" ON packaging_supplies;
CREATE POLICY "Allow all authenticated users to read packaging_supplies"
  ON packaging_supplies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to insert packaging_supplies" ON packaging_supplies;
CREATE POLICY "Allow all authenticated users to insert packaging_supplies"
  ON packaging_supplies FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated users to update packaging_supplies" ON packaging_supplies;
CREATE POLICY "Allow all authenticated users to update packaging_supplies"
  ON packaging_supplies FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to delete packaging_supplies" ON packaging_supplies;
CREATE POLICY "Allow all authenticated users to delete packaging_supplies"
  ON packaging_supplies FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- 3. FINISHED GOODS INVENTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS finished_goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID, -- Link to product/formulation (formulas table)
  batch_id UUID, -- Source batch (batches table)
  batch_code VARCHAR(100),
  sku VARCHAR(100),
  product_name VARCHAR(255),
  quantity_available DECIMAL(10,2) DEFAULT 0,
  quantity_allocated DECIMAL(10,2) DEFAULT 0, -- Reserved for orders
  unit VARCHAR(50) DEFAULT 'unit',
  manufactured_date DATE,
  expiry_date DATE,
  lot_number VARCHAR(100),
  production_cost DECIMAL(10,4), -- Cost from manufacturing
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'allocated', 'shipped', 'quarantine'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'formulas'
  ) THEN
    ALTER TABLE finished_goods
    ADD CONSTRAINT finished_goods_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES formulas(id)
    ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'batches'
  ) THEN
    ALTER TABLE finished_goods
    ADD CONSTRAINT finished_goods_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add RLS policies for finished_goods
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read finished_goods" ON finished_goods;
CREATE POLICY "Allow all authenticated users to read finished_goods"
  ON finished_goods FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to insert finished_goods" ON finished_goods;
CREATE POLICY "Allow all authenticated users to insert finished_goods"
  ON finished_goods FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated users to update finished_goods" ON finished_goods;
CREATE POLICY "Allow all authenticated users to update finished_goods"
  ON finished_goods FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to delete finished_goods" ON finished_goods;
CREATE POLICY "Allow all authenticated users to delete finished_goods"
  ON finished_goods FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- 4. ORDER FULFILLMENT DETAILS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS order_fulfillment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID, -- Will be linked when sales_orders table exists
  line_item_id UUID, -- Will be linked when sales_order_line_items table exists

  -- Promo/Kitting items used
  promo_items JSONB DEFAULT '[]'::jsonb,
  -- [{item_id: uuid, name: string, quantity: number, cost: number}]

  -- Packaging supplies used
  packaging_supplies JSONB DEFAULT '[]'::jsonb,
  -- [{supply_id: uuid, name: string, quantity: number, unit: string, cost: number}]

  -- Finished goods used
  finished_good_id UUID, -- Will be linked to finished_goods(id)
  batch_code VARCHAR(100),
  lot_number VARCHAR(100),
  manufactured_date DATE,

  -- Cost tracking
  promo_items_cost DECIMAL(10,4) DEFAULT 0,
  packaging_cost DECIMAL(10,4) DEFAULT 0,
  base_product_cost DECIMAL(10,4) DEFAULT 0,
  total_cogs DECIMAL(10,4) GENERATED ALWAYS AS (
    promo_items_cost + packaging_cost + base_product_cost
  ) STORED,

  fulfilled_by UUID,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finished_goods'
  ) THEN
    ALTER TABLE order_fulfillment_details
    ADD CONSTRAINT order_fulfillment_details_finished_good_id_fkey
    FOREIGN KEY (finished_good_id) REFERENCES finished_goods(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add RLS policies for order_fulfillment_details
ALTER TABLE order_fulfillment_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read order_fulfillment_details" ON order_fulfillment_details;
CREATE POLICY "Allow all authenticated users to read order_fulfillment_details"
  ON order_fulfillment_details FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to insert order_fulfillment_det" ON order_fulfillment_details;
CREATE POLICY "Allow all authenticated users to insert order_fulfillment_det"
  ON order_fulfillment_details FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated users to update order_fulfillment_det" ON order_fulfillment_details;
CREATE POLICY "Allow all authenticated users to update order_fulfillment_det"
  ON order_fulfillment_details FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to delete order_fulfillment_det" ON order_fulfillment_details;
CREATE POLICY "Allow all authenticated users to delete order_fulfillment_det"
  ON order_fulfillment_details FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- 5. UPDATE EXISTING TABLES
-- ========================================

-- Add columns to sales_order_line_items if table exists and columns don't exist
DO $$
BEGIN
  -- Check if sales_order_line_items table exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sales_order_line_items'
  ) THEN
    -- Add finished_good_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sales_order_line_items' AND column_name = 'finished_good_id'
    ) THEN
      ALTER TABLE sales_order_line_items ADD COLUMN finished_good_id UUID;

      -- Add foreign key constraint
      ALTER TABLE sales_order_line_items
      ADD CONSTRAINT sales_order_line_items_finished_good_id_fkey
      FOREIGN KEY (finished_good_id) REFERENCES finished_goods(id)
      ON DELETE SET NULL;
    END IF;

    -- Add allocated_quantity column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sales_order_line_items' AND column_name = 'allocated_quantity'
    ) THEN
      ALTER TABLE sales_order_line_items ADD COLUMN allocated_quantity DECIMAL(10,2);
    END IF;
  END IF;
END $$;

-- Add item_category column to inventory_history if table exists and column doesn't exist
DO $$
BEGIN
  -- Check if inventory_history table exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory_history'
  ) THEN
    -- Add item_category column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'inventory_history' AND column_name = 'item_category'
    ) THEN
      ALTER TABLE inventory_history ADD COLUMN item_category VARCHAR(50);
      -- 'ingredient', 'packaging', 'promo', 'supply', 'finished_good'
    END IF;
  END IF;
END $$;

-- ========================================
-- 6. TRIGGERS FOR FINISHED GOODS
-- ========================================

-- Function to create finished good from completed batch
CREATE OR REPLACE FUNCTION create_finished_good_from_batch()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create finished good when batch is marked as packaging_completed
  IF NEW.manufacturing_status = 'packaging_completed'
     AND (OLD.manufacturing_status IS NULL OR OLD.manufacturing_status != 'packaging_completed') THEN

    INSERT INTO finished_goods (
      product_id,
      batch_id,
      batch_code,
      sku,
      product_name,
      quantity_available,
      unit,
      manufactured_date,
      lot_number,
      production_cost,
      status
    )
    VALUES (
      NEW.formula_id,
      NEW.id,
      NEW.batch_code,
      NEW.sku,
      (SELECT name FROM formulas WHERE id = NEW.formula_id),
      COALESCE(NEW.units_produced, NEW.actual_yield, 0), -- from packaging completion
      'unit',
      NEW.created_at::date,
      NEW.lot_number,
      COALESCE(NEW.total_cost, 0), -- calculated during manufacturing
      'available'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS batch_to_finished_goods ON batches;
CREATE TRIGGER batch_to_finished_goods
AFTER UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION create_finished_good_from_batch();

-- ========================================
-- 7. UPDATED_AT TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_promo_kitting_items_updated_at ON promo_kitting_items;
CREATE TRIGGER update_promo_kitting_items_updated_at
BEFORE UPDATE ON promo_kitting_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packaging_supplies_updated_at ON packaging_supplies;
CREATE TRIGGER update_packaging_supplies_updated_at
BEFORE UPDATE ON packaging_supplies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finished_goods_updated_at ON finished_goods;
CREATE TRIGGER update_finished_goods_updated_at
BEFORE UPDATE ON finished_goods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 8. INDEXES FOR PERFORMANCE
-- ========================================

-- Promo/Kitting Items indexes
CREATE INDEX IF NOT EXISTS idx_promo_kitting_items_status ON promo_kitting_items(status);
CREATE INDEX IF NOT EXISTS idx_promo_kitting_items_category ON promo_kitting_items(category);
CREATE INDEX IF NOT EXISTS idx_promo_kitting_items_sku ON promo_kitting_items(sku);

-- Packaging Supplies indexes
CREATE INDEX IF NOT EXISTS idx_packaging_supplies_status ON packaging_supplies(status);
CREATE INDEX IF NOT EXISTS idx_packaging_supplies_category ON packaging_supplies(category);
CREATE INDEX IF NOT EXISTS idx_packaging_supplies_sku ON packaging_supplies(sku);

-- Finished Goods indexes
CREATE INDEX IF NOT EXISTS idx_finished_goods_batch_id ON finished_goods(batch_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_product_id ON finished_goods(product_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_status ON finished_goods(status);
CREATE INDEX IF NOT EXISTS idx_finished_goods_sku ON finished_goods(sku);
CREATE INDEX IF NOT EXISTS idx_finished_goods_lot_number ON finished_goods(lot_number);

-- Order Fulfillment indexes
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_sales_order_id ON order_fulfillment_details(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_line_item_id ON order_fulfillment_details(line_item_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_finished_good_id ON order_fulfillment_details(finished_good_id);

-- Inventory History index for category (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory_history'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_history_item_category ON inventory_history(item_category);
  END IF;
END $$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Tables created: promo_kitting_items, packaging_supplies, finished_goods, order_fulfillment_details
-- Triggers created: batch_to_finished_goods, updated_at triggers
-- Existing tables updated: sales_order_line_items, inventory_history
-- RLS policies: Enabled for all new tables
-- Indexes: Created for optimal query performance
