-- =====================================================
-- FIX: Remove problematic triggers that cause permission errors
-- =====================================================
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This will fix the "permission denied for table users" error

-- Step 1: Drop the problematic triggers
DROP TRIGGER IF EXISTS packaging_file_upload_log ON packaging_files;
DROP TRIGGER IF EXISTS packaging_file_delete_log ON packaging_files;

-- Step 2: Drop the functions
DROP FUNCTION IF EXISTS log_packaging_file_upload();
DROP FUNCTION IF EXISTS log_packaging_file_delete();

-- Step 3: Verify triggers are gone
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgrelid = 'packaging_files'::regclass
  AND tgname LIKE '%packaging_file%';

-- If the query above returns no rows, the triggers have been successfully removed!
