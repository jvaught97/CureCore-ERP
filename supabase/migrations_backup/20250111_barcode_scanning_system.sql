-- Barcode Scanning System Migration
-- Creates tables for item master data, lot tracking, and barcode registry

-- Item master data
CREATE TABLE IF NOT EXISTS item_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, sku)
);

CREATE INDEX idx_item_master_org ON item_master(org_id);
CREATE INDEX idx_item_master_sku ON item_master(org_id, sku);

-- Enable RLS
ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "org_isolation" ON item_master
  FOR ALL USING (org_id IN (SELECT unnest(current_setting('app.current_user_orgs', true)::uuid[])));

-- Lot/batch tracking
CREATE TABLE IF NOT EXISTS item_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
  lot_number VARCHAR(100) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  expiry_date DATE,
  manufacture_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, item_id, lot_number)
);

CREATE INDEX idx_item_lots_org ON item_lots(org_id);
CREATE INDEX idx_item_lots_item ON item_lots(item_id);
CREATE INDEX idx_item_lots_lot ON item_lots(org_id, lot_number);
CREATE INDEX idx_item_lots_status ON item_lots(status);

-- Enable RLS
ALTER TABLE item_lots ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "org_isolation" ON item_lots
  FOR ALL USING (org_id IN (SELECT unnest(current_setting('app.current_user_orgs', true)::uuid[])));

-- Barcode registry
CREATE TABLE IF NOT EXISTS barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  barcode_value VARCHAR(255) NOT NULL,
  barcode_type VARCHAR(50) NOT NULL, -- 'GS1-128', 'QR', 'EAN', 'CODE128', etc.
  item_id UUID REFERENCES item_master(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES item_lots(id) ON DELETE SET NULL,
  metadata JSONB, -- Store parsed GS1 AIs or custom fields
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, barcode_value)
);

CREATE INDEX idx_barcodes_org ON barcodes(org_id);
CREATE INDEX idx_barcodes_value ON barcodes(org_id, barcode_value);
CREATE INDEX idx_barcodes_item ON barcodes(item_id);
CREATE INDEX idx_barcodes_lot ON barcodes(lot_id);
CREATE INDEX idx_barcodes_type ON barcodes(barcode_type);

-- Enable RLS
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "org_isolation" ON barcodes
  FOR ALL USING (org_id IN (SELECT unnest(current_setting('app.current_user_orgs', true)::uuid[])));

-- Audit log for scan events
CREATE TABLE IF NOT EXISTS barcode_scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode_value VARCHAR(255) NOT NULL,
  barcode_id UUID REFERENCES barcodes(id) ON DELETE SET NULL,
  scan_result JSONB, -- Store full scan result including parsed data
  action_taken VARCHAR(100), -- 'ADD_TO_BATCH', 'CREATE_ITEM', etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scan_log_org ON barcode_scan_log(org_id);
CREATE INDEX idx_scan_log_user ON barcode_scan_log(user_id);
CREATE INDEX idx_scan_log_barcode ON barcode_scan_log(barcode_id);
CREATE INDEX idx_scan_log_created ON barcode_scan_log(created_at DESC);

-- Enable RLS
ALTER TABLE barcode_scan_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "org_isolation" ON barcode_scan_log
  FOR ALL USING (org_id IN (SELECT unnest(current_setting('app.current_user_orgs', true)::uuid[])));

-- Update trigger for item_master
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_item_master_updated_at
  BEFORE UPDATE ON item_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_lots_updated_at
  BEFORE UPDATE ON item_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE item_master IS 'Master data for inventory items with SKU tracking';
COMMENT ON TABLE item_lots IS 'Lot/batch tracking for items with expiry and quantity management';
COMMENT ON TABLE barcodes IS 'Registry of barcodes linked to items and lots with support for GS1-128, QR, and other formats';
COMMENT ON TABLE barcode_scan_log IS 'Audit trail of all barcode scan events for security and traceability';
