-- =====================================================
-- BARCODE SCANNING & LABEL PRINTING SYSTEM
-- =====================================================
-- Run this SQL file to set up the complete barcode system
-- This matches your existing CureCore ERP schema patterns

-- =====================================================
-- 1. ITEM MASTER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS item_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_item_master_sku ON item_master(sku);

-- Enable RLS
ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matches your existing pattern)
CREATE POLICY "Allow authenticated users to view item_master"
  ON item_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert item_master"
  ON item_master FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update item_master"
  ON item_master FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete item_master"
  ON item_master FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 2. ITEM LOTS TABLE (Lot/Batch Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
  lot_number VARCHAR(100) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  expiry_date DATE,
  manufacture_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'quarantine', 'consumed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, lot_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_item_lots_item ON item_lots(item_id);
CREATE INDEX IF NOT EXISTS idx_item_lots_lot ON item_lots(lot_number);
CREATE INDEX IF NOT EXISTS idx_item_lots_status ON item_lots(status);

-- Enable RLS
ALTER TABLE item_lots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view item_lots"
  ON item_lots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert item_lots"
  ON item_lots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update item_lots"
  ON item_lots FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete item_lots"
  ON item_lots FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 3. BARCODES TABLE (Barcode Registry)
-- =====================================================
CREATE TABLE IF NOT EXISTS barcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode_value VARCHAR(255) NOT NULL UNIQUE,
  barcode_type VARCHAR(50) NOT NULL, -- 'GS1-128', 'QR', 'EAN', 'CODE128', etc.
  item_id UUID REFERENCES item_master(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES item_lots(id) ON DELETE SET NULL,
  metadata JSONB, -- Store parsed GS1 AIs or custom fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_barcodes_value ON barcodes(barcode_value);
CREATE INDEX IF NOT EXISTS idx_barcodes_item ON barcodes(item_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_lot ON barcodes(lot_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_type ON barcodes(barcode_type);

-- Enable RLS
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view barcodes"
  ON barcodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert barcodes"
  ON barcodes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update barcodes"
  ON barcodes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete barcodes"
  ON barcodes FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 4. BARCODE SCAN LOG TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS barcode_scan_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode_value VARCHAR(255) NOT NULL,
  barcode_id UUID REFERENCES barcodes(id) ON DELETE SET NULL,
  scan_result JSONB, -- Store full scan result including parsed data
  action_taken VARCHAR(100), -- 'ADD_TO_BATCH', 'CREATE_ITEM', etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_log_user ON barcode_scan_log(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_barcode ON barcode_scan_log(barcode_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_created ON barcode_scan_log(created_at DESC);

-- Enable RLS
ALTER TABLE barcode_scan_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view barcode_scan_log"
  ON barcode_scan_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert barcode_scan_log"
  ON barcode_scan_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 5. UPDATED_AT TRIGGERS
-- =====================================================

-- Trigger function already exists from your other migrations
-- Just add triggers for our new tables

CREATE TRIGGER update_item_master_updated_at
  BEFORE UPDATE ON item_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_lots_updated_at
  BEFORE UPDATE ON item_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE item_master IS 'Master data for inventory items with SKU tracking';
COMMENT ON TABLE item_lots IS 'Lot/batch tracking for items with expiry and quantity management';
COMMENT ON TABLE barcodes IS 'Registry of barcodes linked to items and lots with support for GS1-128, QR, and other formats';
COMMENT ON TABLE barcode_scan_log IS 'Audit trail of all barcode scan events for security and traceability';

-- =====================================================
-- 7. SAMPLE TEST DATA (OPTIONAL - UNCOMMENT TO USE)
-- =====================================================
/*
-- Insert sample item
INSERT INTO item_master (sku, name, description, unit_of_measure)
VALUES
  ('TEST-001', 'Test Product Alpha', 'Sample product for barcode testing', 'units'),
  ('TEST-002', 'Test Product Beta', 'Another sample product', 'kg')
ON CONFLICT DO NOTHING;

-- Insert sample lots
INSERT INTO item_lots (item_id, lot_number, quantity, expiry_date, manufacture_date, status)
SELECT
  id,
  'LOT-2024-001',
  100,
  CURRENT_DATE + INTERVAL '1 year',
  CURRENT_DATE,
  'active'
FROM item_master WHERE sku = 'TEST-001'
ON CONFLICT DO NOTHING;

INSERT INTO item_lots (item_id, lot_number, quantity, expiry_date, manufacture_date, status)
SELECT
  id,
  'LOT-2024-002',
  50,
  CURRENT_DATE + INTERVAL '6 months',
  CURRENT_DATE,
  'active'
FROM item_master WHERE sku = 'TEST-002'
ON CONFLICT DO NOTHING;

-- Insert sample barcodes
INSERT INTO barcodes (barcode_value, barcode_type, item_id, metadata)
SELECT
  '01095011010209991710240630',
  'GS1-128',
  id,
  '{"gtin": "09501101020999", "expiryDate": "2024-06-30"}'::jsonb
FROM item_master WHERE sku = 'TEST-001'
ON CONFLICT DO NOTHING;

INSERT INTO barcodes (barcode_value, barcode_type, item_id, metadata)
SELECT
  'TEST-QR-CODE-001',
  'QR',
  id,
  '{"type": "item", "sku": "TEST-001"}'::jsonb
FROM item_master WHERE sku = 'TEST-001'
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these queries to verify everything is set up correctly

SELECT 'item_master table exists' as status WHERE EXISTS (
  SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_master'
);

SELECT 'item_lots table exists' as status WHERE EXISTS (
  SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_lots'
);

SELECT 'barcodes table exists' as status WHERE EXISTS (
  SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'barcodes'
);

SELECT 'barcode_scan_log table exists' as status WHERE EXISTS (
  SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'barcode_scan_log'
);

-- Count rows in each table
SELECT 'item_master' as table_name, COUNT(*) as row_count FROM item_master
UNION ALL
SELECT 'item_lots' as table_name, COUNT(*) as row_count FROM item_lots
UNION ALL
SELECT 'barcodes' as table_name, COUNT(*) as row_count FROM barcodes
UNION ALL
SELECT 'barcode_scan_log' as table_name, COUNT(*) as row_count FROM barcode_scan_log;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Navigate to http://localhost:3000/scan to test the scanner
-- 2. Review documentation: BARCODE_SCANNING_README.md
-- 3. Integrate ScanModal into your UI components
-- =====================================================
