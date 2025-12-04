-- =====================================================
-- Packaging Files & Product-Specific Fields Enhancement
-- =====================================================
-- Adds file storage capabilities and category-specific fields
-- for packaging items

-- Step 1: Add new category-specific columns to packaging table
ALTER TABLE packaging
  ADD COLUMN IF NOT EXISTS label_size VARCHAR(100),
  ADD COLUMN IF NOT EXISTS finish VARCHAR(50),
  ADD COLUMN IF NOT EXISTS capacity VARCHAR(50),
  ADD COLUMN IF NOT EXISTS neck_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS color VARCHAR(50),
  ADD COLUMN IF NOT EXISTS closure_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS liner_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100),
  ADD COLUMN IF NOT EXISTS weight_capacity VARCHAR(50);

-- Step 2: Create packaging_files table
CREATE TABLE IF NOT EXISTS packaging_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  packaging_id UUID NOT NULL REFERENCES packaging(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_category VARCHAR(50) NOT NULL CHECK (file_category IN ('label', 'artwork', 'spec_sheet', 'proof', 'coa', 'other')),
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_packaging_files_tenant ON packaging_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packaging_files_packaging ON packaging_files(packaging_id);
CREATE INDEX IF NOT EXISTS idx_packaging_files_category ON packaging_files(file_category);
CREATE INDEX IF NOT EXISTS idx_packaging_files_created ON packaging_files(created_at DESC);

-- Step 4: Enable RLS on packaging_files
ALTER TABLE packaging_files ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for packaging_files
-- Allow users to view their own tenant's files
CREATE POLICY packaging_files_tenant_isolation ON packaging_files
  FOR ALL
  USING (tenant_id = auth.uid());

-- Step 6: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_packaging_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
DROP TRIGGER IF EXISTS packaging_files_updated_at_trigger ON packaging_files;
CREATE TRIGGER packaging_files_updated_at_trigger
  BEFORE UPDATE ON packaging_files
  FOR EACH ROW
  EXECUTE FUNCTION update_packaging_files_updated_at();

-- Step 8: Add activity logging for file operations
-- Log file uploads
CREATE OR REPLACE FUNCTION log_packaging_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_packaging_name TEXT;
  v_employee_name TEXT;
BEGIN
  -- Get packaging name
  SELECT name INTO v_packaging_name FROM packaging WHERE id = NEW.packaging_id;

  -- Get employee name (if available)
  SELECT raw_user_meta_data->>'full_name' INTO v_employee_name
  FROM auth.users WHERE id = NEW.uploaded_by;

  -- Log the activity
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
END;
$$ LANGUAGE plpgsql;

-- Log file deletions
CREATE OR REPLACE FUNCTION log_packaging_file_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_packaging_name TEXT;
  v_employee_name TEXT;
BEGIN
  -- Get packaging name
  SELECT name INTO v_packaging_name FROM packaging WHERE id = OLD.packaging_id;

  -- Get employee name (if available)
  SELECT raw_user_meta_data->>'full_name' INTO v_employee_name
  FROM auth.users WHERE id = auth.uid();

  -- Log the activity
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
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
DROP TRIGGER IF EXISTS packaging_file_upload_log ON packaging_files;
CREATE TRIGGER packaging_file_upload_log
  AFTER INSERT ON packaging_files
  FOR EACH ROW
  EXECUTE FUNCTION log_packaging_file_upload();

DROP TRIGGER IF EXISTS packaging_file_delete_log ON packaging_files;
CREATE TRIGGER packaging_file_delete_log
  BEFORE DELETE ON packaging_files
  FOR EACH ROW
  EXECUTE FUNCTION log_packaging_file_delete();

-- Step 9: Grant permissions
GRANT ALL ON packaging_files TO authenticated;
GRANT ALL ON packaging_files TO service_role;

-- Step 10: Add helpful comments
COMMENT ON TABLE packaging_files IS 'Stores file references for packaging items (labels, artwork, specs, etc.)';
COMMENT ON COLUMN packaging_files.file_category IS 'Category of file: label, artwork, spec_sheet, proof, coa, other';
COMMENT ON COLUMN packaging_files.file_url IS 'Supabase storage URL for the file';
COMMENT ON COLUMN packaging.label_size IS 'For Labels: standard size (e.g., 2x3 inches, 3x5 inches)';
COMMENT ON COLUMN packaging.finish IS 'For Labels: finish type (Glossy, Matte, Semi-Gloss)';
COMMENT ON COLUMN packaging.capacity IS 'For Bottles: volume/capacity (e.g., 30ml, 60ml, 100ml)';
COMMENT ON COLUMN packaging.neck_size IS 'For Bottles: neck opening size (e.g., 18mm, 20mm, 24mm)';
COMMENT ON COLUMN packaging.closure_type IS 'For Caps: type of closure (Screw Cap, Flip Top, Pump, Dropper)';
COMMENT ON COLUMN packaging.liner_type IS 'For Caps: liner/seal type';
COMMENT ON COLUMN packaging.dimensions IS 'For Boxes: L x W x H dimensions';
COMMENT ON COLUMN packaging.weight_capacity IS 'For Boxes: maximum weight capacity';

-- Step 11: Create storage bucket (note: this must be done via Supabase Dashboard or API)
-- Manual step required:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create bucket named 'packaging-files'
-- 3. Set as private (not public)
-- 4. Add RLS policy: bucket_id = 'packaging-files' AND auth.uid() IS NOT NULL

RAISE NOTICE 'Packaging files migration completed. Remember to create the "packaging-files" storage bucket in Supabase Dashboard.';
