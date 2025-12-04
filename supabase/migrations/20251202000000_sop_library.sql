-- ===================================================================
-- SOP Library Schema
-- ===================================================================
-- This migration creates tables for managing Standard Operating Procedures (SOPs)
-- with version control and PDF file storage integration.
-- ===================================================================

-- ============================================================================
-- STEP 1: Create sop_documents table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('manufacturing', 'cleaning', 'maintenance', 'safety', 'quality', 'warehouse', 'admin', 'other')),
  department TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  current_version_id UUID,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.sop_documents IS 'Master table for SOP documents with metadata and current version tracking';
COMMENT ON COLUMN public.sop_documents.code IS 'Unique identifier code for the SOP (e.g., SOP-001)';
COMMENT ON COLUMN public.sop_documents.title IS 'Human-readable title of the SOP';
COMMENT ON COLUMN public.sop_documents.category IS 'Category classification for organizing SOPs';
COMMENT ON COLUMN public.sop_documents.department IS 'Department responsible for this SOP';
COMMENT ON COLUMN public.sop_documents.status IS 'Current status: draft, active, or inactive';
COMMENT ON COLUMN public.sop_documents.current_version_id IS 'References the currently active version';
COMMENT ON COLUMN public.sop_documents.owner_user_id IS 'User responsible for maintaining this SOP';
COMMENT ON COLUMN public.sop_documents.org_id IS 'Organization this SOP belongs to';

-- ============================================================================
-- STEP 2: Create sop_versions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sop_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_document_id UUID NOT NULL REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  revision_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'superseded')),
  effective_date DATE,
  expiry_date DATE,
  file_url TEXT,
  file_size_bytes BIGINT,
  change_summary TEXT,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (sop_document_id, version_number)
);

COMMENT ON TABLE public.sop_versions IS 'Version history for SOP documents with approval tracking';
COMMENT ON COLUMN public.sop_versions.sop_document_id IS 'References parent SOP document';
COMMENT ON COLUMN public.sop_versions.version_number IS 'Incremental version number (1, 2, 3, etc.)';
COMMENT ON COLUMN public.sop_versions.revision_code IS 'Optional revision identifier (e.g., Rev A, Rev B)';
COMMENT ON COLUMN public.sop_versions.status IS 'Version status: draft, review, approved, or superseded';
COMMENT ON COLUMN public.sop_versions.effective_date IS 'Date this version becomes effective';
COMMENT ON COLUMN public.sop_versions.expiry_date IS 'Optional expiration date for periodic review';
COMMENT ON COLUMN public.sop_versions.file_url IS 'Supabase Storage path to the PDF file';
COMMENT ON COLUMN public.sop_versions.file_size_bytes IS 'File size in bytes';
COMMENT ON COLUMN public.sop_versions.change_summary IS 'Summary of changes in this version';
COMMENT ON COLUMN public.sop_versions.approved_by_user_id IS 'User who approved this version';
COMMENT ON COLUMN public.sop_versions.approved_at IS 'Timestamp when version was approved';
COMMENT ON COLUMN public.sop_versions.created_by_user_id IS 'User who created this version';
COMMENT ON COLUMN public.sop_versions.org_id IS 'Organization this version belongs to';

-- ============================================================================
-- STEP 3: Add foreign key from sop_documents to current version
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_sop_documents_current_version'
    ) THEN
        ALTER TABLE public.sop_documents
          ADD CONSTRAINT fk_sop_documents_current_version
          FOREIGN KEY (current_version_id)
          REFERENCES public.sop_versions(id)
          ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Create indexes for efficient queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sop_documents_org_id ON public.sop_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_sop_documents_code ON public.sop_documents(code);
CREATE INDEX IF NOT EXISTS idx_sop_documents_status ON public.sop_documents(status);
CREATE INDEX IF NOT EXISTS idx_sop_documents_category ON public.sop_documents(category);
CREATE INDEX IF NOT EXISTS idx_sop_documents_owner ON public.sop_documents(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_sop_versions_org_id ON public.sop_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_sop_versions_sop_document_id ON public.sop_versions(sop_document_id);
CREATE INDEX IF NOT EXISTS idx_sop_versions_status ON public.sop_versions(status);
CREATE INDEX IF NOT EXISTS idx_sop_versions_created_by ON public.sop_versions(created_by_user_id);

-- ============================================================================
-- STEP 5: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create RLS Policies (Simple auth-based access)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS sop_documents_select ON public.sop_documents;
DROP POLICY IF EXISTS sop_documents_insert ON public.sop_documents;
DROP POLICY IF EXISTS sop_documents_update ON public.sop_documents;
DROP POLICY IF EXISTS sop_documents_delete ON public.sop_documents;
DROP POLICY IF EXISTS sop_versions_select ON public.sop_versions;
DROP POLICY IF EXISTS sop_versions_insert ON public.sop_versions;
DROP POLICY IF EXISTS sop_versions_update ON public.sop_versions;
DROP POLICY IF EXISTS sop_versions_delete ON public.sop_versions;

-- SOP Documents Policies - Allow all authenticated users
CREATE POLICY sop_documents_select ON public.sop_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY sop_documents_insert ON public.sop_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY sop_documents_update ON public.sop_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY sop_documents_delete ON public.sop_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- SOP Versions Policies - Allow all authenticated users
CREATE POLICY sop_versions_select ON public.sop_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY sop_versions_insert ON public.sop_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY sop_versions_update ON public.sop_versions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY sop_versions_delete ON public.sop_versions
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 7: Create storage bucket for SOP files
-- ============================================================================

-- Insert storage bucket (idempotent - will only insert if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sops', 'sops', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 8: Create storage policies for SOP files
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS sops_select ON storage.objects;
DROP POLICY IF EXISTS sops_insert ON storage.objects;
DROP POLICY IF EXISTS sops_update ON storage.objects;
DROP POLICY IF EXISTS sops_delete ON storage.objects;

-- Allow all authenticated users to manage SOP files
CREATE POLICY sops_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'sops');

CREATE POLICY sops_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sops');

CREATE POLICY sops_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'sops');

CREATE POLICY sops_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'sops');

-- ============================================================================
-- STEP 9: Create function to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_sop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: Create triggers for updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_sop_documents_updated_at ON public.sop_documents;
CREATE TRIGGER update_sop_documents_updated_at
  BEFORE UPDATE ON public.sop_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sop_updated_at();

DROP TRIGGER IF EXISTS update_sop_versions_updated_at ON public.sop_versions;
CREATE TRIGGER update_sop_versions_updated_at
  BEFORE UPDATE ON public.sop_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sop_updated_at();

-- ============================================================================
-- STEP 11: Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- Migration complete!
-- ===================================================================
