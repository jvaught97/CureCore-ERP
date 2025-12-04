-- =====================================================
-- Inventory Count Sessions Table
-- Tracks physical inventory counts performed by employees
-- =====================================================

CREATE TABLE inventory_count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_type VARCHAR(20) NOT NULL CHECK (count_type IN ('ingredients', 'packaging')),
  counted_by UUID REFERENCES users(id),
  counted_by_email VARCHAR(255),
  items_counted INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_count_sessions_type ON inventory_count_sessions(count_type);
CREATE INDEX idx_inventory_count_sessions_user ON inventory_count_sessions(counted_by);
CREATE INDEX idx_inventory_count_sessions_date ON inventory_count_sessions(completed_at);

-- Enable RLS
ALTER TABLE inventory_count_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy - allow all authenticated users to read and write
CREATE POLICY "Allow all for authenticated users"
  ON inventory_count_sessions
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE inventory_count_sessions IS 'Tracks physical inventory count sessions including who performed the count and when';
