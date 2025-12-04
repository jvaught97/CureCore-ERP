-- Simplified inventory containers for compatibility with existing schema
-- This version works without organizations, item_master, and item_lots dependencies

CREATE TABLE IF NOT EXISTS inventory_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item reference (using existing ingredients table)
  item_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  lot_number TEXT, -- Simple lot tracking without FK

  -- Container identification
  container_code VARCHAR(255) NOT NULL,
  label VARCHAR(255),

  -- Weight tracking
  initial_gross_weight DECIMAL(15,4),
  intended_net_weight DECIMAL(15,4),
  calculated_tare_weight DECIMAL(15,4),
  refined_tare_weight DECIMAL(15,4),
  current_gross_weight DECIMAL(15,4),
  current_net_weight DECIMAL(15,4),
  weight_unit VARCHAR(50) NOT NULL DEFAULT 'g',

  -- Container metadata
  container_type VARCHAR(100),
  location VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'backstock'
    CHECK (status IN ('backstock', 'active', 'quarantine', 'empty', 'archived')),

  -- Tracking
  last_weighed_at TIMESTAMPTZ,
  last_weighed_by UUID,

  -- Audit trail
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_container_code UNIQUE(container_code),
  CONSTRAINT positive_weights CHECK (
    (initial_gross_weight IS NULL OR initial_gross_weight >= 0) AND
    (intended_net_weight IS NULL OR intended_net_weight >= 0) AND
    (calculated_tare_weight IS NULL OR calculated_tare_weight >= 0) AND
    (current_gross_weight IS NULL OR current_gross_weight >= 0) AND
    (current_net_weight IS NULL OR current_net_weight >= 0)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_containers_item_id ON inventory_containers(item_id);
CREATE INDEX IF NOT EXISTS idx_containers_status ON inventory_containers(status);
CREATE INDEX IF NOT EXISTS idx_containers_location ON inventory_containers(location);
CREATE INDEX IF NOT EXISTS idx_containers_code ON inventory_containers(container_code);

-- Row Level Security
ALTER TABLE inventory_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS containers_select ON inventory_containers;
CREATE POLICY containers_select ON inventory_containers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS containers_insert ON inventory_containers;
CREATE POLICY containers_insert ON inventory_containers
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS containers_update ON inventory_containers;
CREATE POLICY containers_update ON inventory_containers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS containers_delete ON inventory_containers;
CREATE POLICY containers_delete ON inventory_containers
  FOR DELETE TO authenticated USING (true);

-- Create a simple view for backward compatibility with item_lots reference
CREATE OR REPLACE VIEW inventory_containers_with_lots AS
SELECT c.*
FROM inventory_containers c;
