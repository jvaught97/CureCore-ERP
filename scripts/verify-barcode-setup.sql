-- Verification Script for Barcode Scanning System
-- Run this after applying the migration to verify everything is set up correctly

-- Check if all tables exist
DO $$
BEGIN
  RAISE NOTICE 'Checking barcode scanning tables...';

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_master') THEN
    RAISE WARNING 'Table item_master does not exist!';
  ELSE
    RAISE NOTICE '✓ item_master exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_lots') THEN
    RAISE WARNING 'Table item_lots does not exist!';
  ELSE
    RAISE NOTICE '✓ item_lots exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'barcodes') THEN
    RAISE WARNING 'Table barcodes does not exist!';
  ELSE
    RAISE NOTICE '✓ barcodes exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'barcode_scan_log') THEN
    RAISE WARNING 'Table barcode_scan_log does not exist!';
  ELSE
    RAISE NOTICE '✓ barcode_scan_log exists';
  END IF;
END $$;

-- Check indexes
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Checking indexes...';

  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_item_master_org') THEN
    RAISE WARNING 'Index idx_item_master_org missing!';
  ELSE
    RAISE NOTICE '✓ idx_item_master_org exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_barcodes_value') THEN
    RAISE WARNING 'Index idx_barcodes_value missing!';
  ELSE
    RAISE NOTICE '✓ idx_barcodes_value exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_item_lots_lot') THEN
    RAISE WARNING 'Index idx_item_lots_lot missing!';
  ELSE
    RAISE NOTICE '✓ idx_item_lots_lot exists';
  END IF;
END $$;

-- Check RLS policies
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Checking RLS policies...';

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'org_isolation' AND polrelid = 'item_master'::regclass
  ) THEN
    RAISE WARNING 'RLS policy on item_master missing!';
  ELSE
    RAISE NOTICE '✓ item_master RLS policy exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'org_isolation' AND polrelid = 'item_lots'::regclass
  ) THEN
    RAISE WARNING 'RLS policy on item_lots missing!';
  ELSE
    RAISE NOTICE '✓ item_lots RLS policy exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'org_isolation' AND polrelid = 'barcodes'::regclass
  ) THEN
    RAISE WARNING 'RLS policy on barcodes missing!';
  ELSE
    RAISE NOTICE '✓ barcodes RLS policy exists';
  END IF;
END $$;

-- Show table statistics
RAISE NOTICE '';
RAISE NOTICE 'Table Statistics:';

SELECT
  'item_master' as table_name,
  COUNT(*) as row_count
FROM item_master
UNION ALL
SELECT
  'item_lots' as table_name,
  COUNT(*) as row_count
FROM item_lots
UNION ALL
SELECT
  'barcodes' as table_name,
  COUNT(*) as row_count
FROM barcodes
UNION ALL
SELECT
  'barcode_scan_log' as table_name,
  COUNT(*) as row_count
FROM barcode_scan_log;

-- Insert sample data for testing (optional - comment out if not needed)
-- Uncomment the section below to insert test data

/*
DO $$
DECLARE
  test_org_id UUID := '00000000-0000-0000-0000-000000000001'; -- Replace with actual org ID
  test_item_id UUID;
  test_lot_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Inserting sample test data...';

  -- Insert test item
  INSERT INTO item_master (id, org_id, sku, name, description, unit_of_measure)
  VALUES (
    gen_random_uuid(),
    test_org_id,
    'TEST-ITEM-001',
    'Test Product',
    'Sample product for barcode testing',
    'units'
  )
  RETURNING id INTO test_item_id;

  RAISE NOTICE '✓ Created test item: %', test_item_id;

  -- Insert test lot
  INSERT INTO item_lots (id, org_id, item_id, lot_number, quantity, expiry_date, manufacture_date, status)
  VALUES (
    gen_random_uuid(),
    test_org_id,
    test_item_id,
    'LOT-2024-001',
    100,
    CURRENT_DATE + INTERVAL '1 year',
    CURRENT_DATE,
    'active'
  )
  RETURNING id INTO test_lot_id;

  RAISE NOTICE '✓ Created test lot: %', test_lot_id;

  -- Insert test barcode (GS1-128 format)
  INSERT INTO barcodes (org_id, barcode_value, barcode_type, item_id, lot_id, metadata)
  VALUES (
    test_org_id,
    '01095011010209991710240630',
    'GS1-128',
    test_item_id,
    test_lot_id,
    '{"gtin": "09501101020999", "lot": "LOT-2024-001", "expiryDate": "2024-06-30"}'::jsonb
  );

  RAISE NOTICE '✓ Created test barcode';

  -- Insert test QR barcode
  INSERT INTO barcodes (org_id, barcode_value, barcode_type, item_id, lot_id, metadata)
  VALUES (
    test_org_id,
    '{"type":"lot","org":"' || test_org_id || '","item":"TEST-ITEM-001","lot":"LOT-2024-001"}',
    'QR',
    test_item_id,
    test_lot_id,
    '{"type": "lot"}'::jsonb
  );

  RAISE NOTICE '✓ Created test QR code';

  RAISE NOTICE '';
  RAISE NOTICE 'Sample data inserted successfully!';
  RAISE NOTICE 'Test Barcode (GS1-128): 01095011010209991710240630';
  RAISE NOTICE 'Test Item SKU: TEST-ITEM-001';
  RAISE NOTICE 'Test Lot Number: LOT-2024-001';
END $$;
*/

-- Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Barcode Scanning System Verification Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Navigate to /scan to test the scanner';
  RAISE NOTICE '2. Create items and lots in the database';
  RAISE NOTICE '3. Generate barcodes for your inventory';
  RAISE NOTICE '4. Integrate ScanModal into your UI';
  RAISE NOTICE '';
  RAISE NOTICE 'Documentation:';
  RAISE NOTICE '- Full Guide: BARCODE_SCANNING_README.md';
  RAISE NOTICE '- Quick Reference: BARCODE_QUICK_REFERENCE.md';
  RAISE NOTICE '- Implementation: BARCODE_IMPLEMENTATION_SUMMARY.md';
  RAISE NOTICE '';
END $$;
