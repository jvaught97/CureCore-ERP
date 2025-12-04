-- Fix for packaging files - remove problematic triggers

-- Drop the existing triggers that are causing permission issues
DROP TRIGGER IF EXISTS packaging_file_upload_log ON packaging_files;
DROP TRIGGER IF EXISTS packaging_file_delete_log ON packaging_files;

-- Drop the functions
DROP FUNCTION IF EXISTS log_packaging_file_upload();
DROP FUNCTION IF EXISTS log_packaging_file_delete();

-- Recreate simpler logging functions that don't access auth.users
CREATE OR REPLACE FUNCTION log_packaging_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_packaging_name TEXT;
BEGIN
  -- Get packaging name
  SELECT name INTO v_packaging_name FROM packaging WHERE id = NEW.packaging_id;

  -- Log the activity (without querying auth.users)
  INSERT INTO activity_log (
    tenant_id, user_id, action, description, metadata, created_at
  ) VALUES (
    NEW.tenant_id,
    NEW.uploaded_by,
    'packaging_file_upload',
    format('Uploaded %s file "%s" for packaging item: %s', NEW.file_category, NEW.file_name, v_packaging_name),
    jsonb_build_object(
      'packaging_id', NEW.packaging_id,
      'file_id', NEW.id,
      'file_name', NEW.file_name,
      'file_category', NEW.file_category,
      'file_size', NEW.file_size
    ),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If activity log fails, don't block the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_packaging_file_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_packaging_name TEXT;
BEGIN
  -- Get packaging name
  SELECT name INTO v_packaging_name FROM packaging WHERE id = OLD.packaging_id;

  -- Log the activity (without querying auth.users)
  INSERT INTO activity_log (
    tenant_id, user_id, action, description, metadata, created_at
  ) VALUES (
    OLD.tenant_id,
    auth.uid(),
    'packaging_file_delete',
    format('Deleted %s file "%s" from packaging item: %s', OLD.file_category, OLD.file_name, v_packaging_name),
    jsonb_build_object(
      'packaging_id', OLD.packaging_id,
      'file_id', OLD.id,
      'file_name', OLD.file_name,
      'file_category', OLD.file_category
    ),
    NOW()
  );

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- If activity log fails, don't block the delete
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers
CREATE TRIGGER packaging_file_upload_log
  AFTER INSERT ON packaging_files
  FOR EACH ROW
  EXECUTE FUNCTION log_packaging_file_upload();

CREATE TRIGGER packaging_file_delete_log
  BEFORE DELETE ON packaging_files
  FOR EACH ROW
  EXECUTE FUNCTION log_packaging_file_delete();
