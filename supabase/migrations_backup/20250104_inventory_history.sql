-- =====================================================
-- Inventory History Table
-- Tracks all inventory movements for ingredients and packaging
-- =====================================================

CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('ingredient', 'packaging')),
  item_name VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  previous_quantity DECIMAL(10,2),
  new_quantity DECIMAL(10,2),
  employee_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_history_item ON inventory_history(item_type, item_name);
CREATE INDEX idx_inventory_history_date ON inventory_history(created_at);
CREATE INDEX idx_inventory_history_type ON inventory_history(transaction_type);

-- Enable RLS
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy - allow all authenticated users to read and write
CREATE POLICY "Allow all for authenticated users"
  ON inventory_history
  FOR ALL
  USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE inventory_history IS 'Tracks all inventory movements including stock adjustments, batch consumption, and shipments';
