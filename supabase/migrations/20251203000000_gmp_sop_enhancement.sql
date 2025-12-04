-- ===================================================================
-- GMP SOP Enhancement Migration
-- ===================================================================
-- This migration extends the existing SOP Library to support:
-- 1. Structured GMP-compliant content fields
-- 2. Multiple PDF capabilities (upload, auto-generate, future AI)
-- 3. Enhanced approval workflow
-- 4. Product/BPR linking
-- 5. Audit tracking with updated_by
-- ===================================================================

-- ============================================================================
-- STEP 1: Create sop_structured_content table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sop_structured_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_version_id UUID NOT NULL UNIQUE REFERENCES public.sop_versions(id) ON DELETE CASCADE,

  -- Core GMP Fields (TEXT allows rich content)
  purpose TEXT,
  scope TEXT,
  responsibilities TEXT,
  definitions TEXT,
  required_materials_equipment TEXT,
  safety_precautions TEXT,
  procedure TEXT NOT NULL,  -- Main content - required
  quality_control_checkpoints TEXT,
  documentation_requirements TEXT,
  deviations_and_corrective_actions TEXT,
  references TEXT,

  -- Metadata
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.sop_structured_content IS 'Structured GMP-compliant content for SOP versions';
COMMENT ON COLUMN public.sop_structured_content.sop_version_id IS 'Foreign key to sop_versions (one-to-one relationship)';
COMMENT ON COLUMN public.sop_structured_content.purpose IS 'Purpose/objective of the SOP';
COMMENT ON COLUMN public.sop_structured_content.scope IS 'Scope and applicability';
COMMENT ON COLUMN public.sop_structured_content.responsibilities IS 'Roles and responsibilities';
COMMENT ON COLUMN public.sop_structured_content.definitions IS 'Definitions and terminology';
COMMENT ON COLUMN public.sop_structured_content.required_materials_equipment IS 'Required materials and equipment';
COMMENT ON COLUMN public.sop_structured_content.safety_precautions IS 'Safety precautions and warnings';
COMMENT ON COLUMN public.sop_structured_content.procedure IS 'Step-by-step procedure (required)';
COMMENT ON COLUMN public.sop_structured_content.quality_control_checkpoints IS 'QC checkpoints and acceptance criteria';
COMMENT ON COLUMN public.sop_structured_content.documentation_requirements IS 'Required documentation and records';
COMMENT ON COLUMN public.sop_structured_content.deviations_and_corrective_actions IS 'Deviation handling and corrective actions';
COMMENT ON COLUMN public.sop_structured_content.references IS 'References to related documents';

-- ============================================================================
-- STEP 2: Extend sop_versions table
-- ============================================================================

-- Add new columns for PDF management
ALTER TABLE public.sop_versions
  ADD COLUMN IF NOT EXISTS uploaded_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS auto_generated_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS auto_generated_pdf_last_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sop_versions.uploaded_pdf_url IS 'Path to uploaded legacy PDF file';
COMMENT ON COLUMN public.sop_versions.auto_generated_pdf_url IS 'Path to auto-generated PDF from structured content';
COMMENT ON COLUMN public.sop_versions.auto_generated_pdf_last_generated_at IS 'Timestamp of last PDF generation';
COMMENT ON COLUMN public.sop_versions.updated_by_user_id IS 'User who last updated this version';

-- Migrate existing file_url to uploaded_pdf_url for backwards compatibility
UPDATE public.sop_versions
SET uploaded_pdf_url = file_url
WHERE file_url IS NOT NULL AND uploaded_pdf_url IS NULL;

-- ============================================================================
-- STEP 3: Extend sop_documents table
-- ============================================================================

-- Add optional linking to products and BPR templates
ALTER TABLE public.sop_documents
  ADD COLUMN IF NOT EXISTS linked_product_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_bpr_template_ids UUID[];

COMMENT ON COLUMN public.sop_documents.linked_product_ids IS 'Array of product IDs this SOP applies to';
COMMENT ON COLUMN public.sop_documents.linked_bpr_template_ids IS 'Array of BPR template IDs this SOP relates to';

-- ============================================================================
-- STEP 4: Update status constraints
-- ============================================================================

-- Update sop_versions status constraint to match new workflow
ALTER TABLE public.sop_versions DROP CONSTRAINT IF EXISTS sop_versions_status_check;
ALTER TABLE public.sop_versions ADD CONSTRAINT sop_versions_status_check
  CHECK (status IN ('draft', 'under_review', 'approved', 'obsolete'));

-- Keep existing sop_documents status as-is (active/inactive/draft)

-- ============================================================================
-- STEP 5: Create indexes
-- ============================================================================

-- Indexes for sop_structured_content
CREATE INDEX IF NOT EXISTS idx_sop_structured_content_version
  ON public.sop_structured_content(sop_version_id);
CREATE INDEX IF NOT EXISTS idx_sop_structured_content_tenant
  ON public.sop_structured_content(tenant_id);

-- Indexes for sop_versions new columns
CREATE INDEX IF NOT EXISTS idx_sop_versions_updated_by
  ON public.sop_versions(updated_by_user_id);

-- GIN indexes for array columns on sop_documents
CREATE INDEX IF NOT EXISTS idx_sop_documents_linked_products
  ON public.sop_documents USING GIN(linked_product_ids);
CREATE INDEX IF NOT EXISTS idx_sop_documents_linked_bpr_templates
  ON public.sop_documents USING GIN(linked_bpr_template_ids);

-- ============================================================================
-- STEP 6: Enable Row Level Security for new table
-- ============================================================================

ALTER TABLE public.sop_structured_content ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS Policies for sop_structured_content
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS sop_structured_content_select ON public.sop_structured_content;
DROP POLICY IF EXISTS sop_structured_content_insert ON public.sop_structured_content;
DROP POLICY IF EXISTS sop_structured_content_update ON public.sop_structured_content;
DROP POLICY IF EXISTS sop_structured_content_delete ON public.sop_structured_content;

-- Structured Content Policies - Allow all authenticated users
-- TODO: Tighten with role-based policies in future
CREATE POLICY sop_structured_content_select ON public.sop_structured_content
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY sop_structured_content_insert ON public.sop_structured_content
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY sop_structured_content_update ON public.sop_structured_content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY sop_structured_content_delete ON public.sop_structured_content
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 8: Create trigger for updated_at
-- ============================================================================

-- Reuse existing update_sop_updated_at function for sop_structured_content
DROP TRIGGER IF EXISTS update_sop_structured_content_updated_at ON public.sop_structured_content;
CREATE TRIGGER update_sop_structured_content_updated_at
  BEFORE UPDATE ON public.sop_structured_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sop_updated_at();

-- ============================================================================
-- STEP 9: Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- Migration complete!
-- ===================================================================
-- Summary of changes:
-- 1. Created sop_structured_content table with 11 GMP fields
-- 2. Extended sop_versions with PDF management columns
-- 3. Extended sop_documents with product/BPR linking
-- 4. Updated status enums for approval workflow
-- 5. Created appropriate indexes for performance
-- 6. Set up RLS policies for security
-- 7. Migrated existing file_url data
-- ===================================================================
