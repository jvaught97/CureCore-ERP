-- =====================================================
-- Packaging Stock Adjustments Table
-- =====================================================

CREATE TABLE packaging_stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_id UUID NOT NULL REFERENCES packaging(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('add', 'remove', 'receive_shipment')),
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  reason TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_price DECIMAL(15,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packaging_stock_adj_packaging ON packaging_stock_adjustments(packaging_id);
CREATE INDEX idx_packaging_stock_adj_date ON packaging_stock_adjustments(created_at);

-- Enable RLS
ALTER TABLE packaging_stock_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Allow all for authenticated users"
  ON packaging_stock_adjustments
  FOR ALL
  USING (auth.uid() IS NOT NULL);
