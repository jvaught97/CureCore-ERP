-- =====================================================
-- Inventory Containers System Migration
-- =====================================================
-- Creates tables for tracking physical containers of ingredients
-- with a weight model that matches real manufacturing workflows:
-- - Track gross weight (bottle + ingredient)
-- - Track intended net weight (supplier's stated amount)
-- - Auto-calculate container (tare) weight
-- - No need to empty containers for initial weighing
-- =====================================================

-- =====================================================
-- 1. INVENTORY CONTAINERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Item and lot references
  item_id UUID NOT NULL REFERENCES item_master(id) ON DELETE RESTRICT,
  lot_id UUID NOT NULL REFERENCES item_lots(id) ON DELETE RESTRICT,

  -- Container identification
  container_code VARCHAR(255) NOT NULL, -- e.g., "CNT-2025-001"
  label VARCHAR(255), -- Optional nickname/label for easy identification

  -- NEW WEIGHT MODEL
  -- Instead of asking for empty weight, we track:
  -- 1. Gross weight: what the scale shows (bottle + ingredient)
  -- 2. Intended net weight: what supplier says is inside
  -- 3. Calculated tare: auto-calculated (gross - intended_net)
  -- 4. Refined tare: improved over time with actual measurements
  initial_gross_weight DECIMAL(15,4), -- Bottle + ingredient weight at receipt
  intended_net_weight DECIMAL(15,4), -- Supplier's stated ingredient amount
  calculated_tare_weight DECIMAL(15,4), -- Auto: gross - intended_net
  refined_tare_weight DECIMAL(15,4), -- Improved over time (nullable)

  -- Current state
  current_gross_weight DECIMAL(15,4), -- Latest gross weight
  current_net_weight DECIMAL(15,4), -- Latest net (gross - tare)
  weight_unit VARCHAR(50) NOT NULL DEFAULT 'g', -- g, kg, lb, oz

  -- Container metadata
  container_type VARCHAR(100), -- bottle, drum, bag, tote, etc.
  location VARCHAR(255), -- Warehouse, Production Floor, etc.
  status VARCHAR(50) NOT NULL DEFAULT 'backstock'
    CHECK (status IN ('backstock', 'active', 'quarantine', 'empty', 'archived')),

  -- Tracking
  last_weighed_at TIMESTAMPTZ,
  last_weighed_by UUID REFERENCES auth.users(id),

  -- Audit trail
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_container_code_per_org UNIQUE(org_id, container_code),
  CONSTRAINT positive_weights CHECK (
    (initial_gross_weight IS NULL OR initial_gross_weight >= 0) AND
    (intended_net_weight IS NULL OR intended_net_weight >= 0) AND
    (calculated_tare_weight IS NULL OR calculated_tare_weight >= 0) AND
    (current_gross_weight IS NULL OR current_gross_weight >= 0) AND
    (current_net_weight IS NULL OR current_net_weight >= 0)
  )
);

-- Indexes for performance
CREATE INDEX idx_containers_org_id ON inventory_containers(org_id);
CREATE INDEX idx_containers_item_id ON inventory_containers(item_id);
CREATE INDEX idx_containers_lot_id ON inventory_containers(lot_id);
CREATE INDEX idx_containers_status ON inventory_containers(status);
CREATE INDEX idx_containers_location ON inventory_containers(location);
CREATE INDEX idx_containers_code ON inventory_containers(container_code);
CREATE INDEX idx_containers_last_weighed ON inventory_containers(last_weighed_at);

-- Auto-update timestamp
CREATE TRIGGER update_inventory_containers_updated_at
  BEFORE UPDATE ON inventory_containers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. WEIGHT MEASUREMENTS TABLE
-- =====================================================
-- Audit trail of all weight measurements for containers
-- Tracks who, when, and why weights were recorded
CREATE TABLE IF NOT EXISTS weight_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  container_id UUID NOT NULL REFERENCES inventory_containers(id) ON DELETE CASCADE,

  -- Weight data snapshot
  gross_weight DECIMAL(15,4) NOT NULL, -- Total weight at measurement time
  tare_weight DECIMAL(15,4) NOT NULL, -- Container weight used for calculation
  net_weight DECIMAL(15,4) NOT NULL, -- Ingredient weight (gross - tare)
  unit VARCHAR(50) NOT NULL, -- g, kg, lb, oz

  -- Context about the measurement
  measurement_type VARCHAR(100) NOT NULL DEFAULT 'manual'
    CHECK (measurement_type IN (
      'initial_setup',     -- First weight when container created
      'inventory_count',   -- Regular inventory cycle count
      'production_use',    -- After using some ingredient in production
      'adjustment',        -- Manual correction
      'refill',           -- When adding more ingredient
      'transfer',         -- When transferring between containers
      'verification'      -- QC verification measurement
    )),

  source VARCHAR(50) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'scale', 'barcode_scan', 'api')),

  -- Optional context
  batch_id UUID, -- If used in a batch
  production_order_id UUID, -- If related to production
  notes TEXT,

  -- Employee tracking
  measured_by UUID NOT NULL REFERENCES auth.users(id),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_measurement_weights CHECK (
    gross_weight >= 0 AND
    tare_weight >= 0 AND
    net_weight >= 0
  )
);

-- Indexes for performance
CREATE INDEX idx_measurements_org_id ON weight_measurements(org_id);
CREATE INDEX idx_measurements_container_id ON weight_measurements(container_id);
CREATE INDEX idx_measurements_measured_at ON weight_measurements(measured_at);
CREATE INDEX idx_measurements_measured_by ON weight_measurements(measured_by);
CREATE INDEX idx_measurements_type ON weight_measurements(measurement_type);
CREATE INDEX idx_measurements_batch_id ON weight_measurements(batch_id) WHERE batch_id IS NOT NULL;

-- =====================================================
-- 3. UPDATE BARCODES TABLE
-- =====================================================
-- Ensure container_id foreign key exists (may already exist from barcode system migration)
DO $$
BEGIN
  -- Check if container_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barcodes' AND column_name = 'container_id'
  ) THEN
    ALTER TABLE barcodes ADD COLUMN container_id UUID REFERENCES inventory_containers(id) ON DELETE SET NULL;
  END IF;

  -- Add index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'barcodes' AND indexname = 'idx_barcodes_container_id'
  ) THEN
    CREATE INDEX idx_barcodes_container_id ON barcodes(container_id) WHERE container_id IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE inventory_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_measurements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view containers in their org" ON inventory_containers;
DROP POLICY IF EXISTS "Users can insert containers in their org" ON inventory_containers;
DROP POLICY IF EXISTS "Users can update containers in their org" ON inventory_containers;
DROP POLICY IF EXISTS "Users can delete containers in their org" ON inventory_containers;

DROP POLICY IF EXISTS "Users can view measurements in their org" ON weight_measurements;
DROP POLICY IF EXISTS "Users can insert measurements in their org" ON weight_measurements;
DROP POLICY IF EXISTS "Users can update measurements in their org" ON weight_measurements;
DROP POLICY IF EXISTS "Users can delete measurements in their org" ON weight_measurements;

-- Inventory Containers Policies
CREATE POLICY "Users can view containers in their org"
  ON inventory_containers FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert containers in their org"
  ON inventory_containers FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update containers in their org"
  ON inventory_containers FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete containers in their org"
  ON inventory_containers FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Weight Measurements Policies
CREATE POLICY "Users can view measurements in their org"
  ON weight_measurements FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert measurements in their org"
  ON weight_measurements FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update measurements in their org"
  ON weight_measurements FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete measurements in their org"
  ON weight_measurements FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to automatically calculate tare weight when gross and intended net are provided
CREATE OR REPLACE FUNCTION calculate_container_tare()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate tare if gross and intended net are provided
  IF NEW.initial_gross_weight IS NOT NULL AND NEW.intended_net_weight IS NOT NULL THEN
    NEW.calculated_tare_weight := NEW.initial_gross_weight - NEW.intended_net_weight;
  END IF;

  -- Set current weights from initial if not provided
  IF NEW.current_gross_weight IS NULL THEN
    NEW.current_gross_weight := NEW.initial_gross_weight;
  END IF;

  IF NEW.current_net_weight IS NULL AND NEW.intended_net_weight IS NOT NULL THEN
    NEW.current_net_weight := NEW.intended_net_weight;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_tare
  BEFORE INSERT OR UPDATE ON inventory_containers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_container_tare();

-- Function to get the tare weight to use (refined if available, else calculated)
CREATE OR REPLACE FUNCTION get_effective_tare_weight(container_row inventory_containers)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(container_row.refined_tare_weight, container_row.calculated_tare_weight, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE inventory_containers IS 'Physical containers holding ingredients. Tracks container weights using gross + intended net model instead of requiring empty weight.';
COMMENT ON COLUMN inventory_containers.initial_gross_weight IS 'Total weight (bottle + ingredient) when first received';
COMMENT ON COLUMN inventory_containers.intended_net_weight IS 'Supplier stated ingredient amount (from label)';
COMMENT ON COLUMN inventory_containers.calculated_tare_weight IS 'Auto-calculated container weight: gross - intended_net';
COMMENT ON COLUMN inventory_containers.refined_tare_weight IS 'Improved tare weight based on actual measurements over time';
COMMENT ON COLUMN inventory_containers.current_gross_weight IS 'Most recent total weight measurement';
COMMENT ON COLUMN inventory_containers.current_net_weight IS 'Most recent ingredient weight (gross - tare)';

COMMENT ON TABLE weight_measurements IS 'Audit trail of all container weight measurements with employee tracking';
COMMENT ON COLUMN weight_measurements.measurement_type IS 'Context: initial_setup, inventory_count, production_use, adjustment, refill, transfer, verification';
COMMENT ON COLUMN weight_measurements.source IS 'How measurement was captured: manual, scale, barcode_scan, api';
COMMENT ON COLUMN weight_measurements.measured_by IS 'Employee who performed the measurement';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Next steps:
-- 1. Update createContainer action to use new weight model
-- 2. Update container creation UI to 2-step workflow
-- 3. Create container label printing API
-- 4. Update weight capture workflows
-- =====================================================
