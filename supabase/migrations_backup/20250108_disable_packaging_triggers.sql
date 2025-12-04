-- Disable problematic activity logging triggers for packaging_files

-- Drop the triggers completely
DROP TRIGGER IF EXISTS packaging_file_upload_log ON packaging_files;
DROP TRIGGER IF EXISTS packaging_file_delete_log ON packaging_files;

-- Drop the functions
DROP FUNCTION IF EXISTS log_packaging_file_upload();
DROP FUNCTION IF EXISTS log_packaging_file_delete();
