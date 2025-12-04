-- ===================================================================
-- Add Metadata Fields to SOP Documents
-- ===================================================================
-- This migration adds prepared_by and review_date fields to sop_documents
-- for better GMP compliance tracking
-- ===================================================================

-- Add prepared_by and review_date to sop_documents table
ALTER TABLE public.sop_documents
  ADD COLUMN IF NOT EXISTS prepared_by TEXT,
  ADD COLUMN IF NOT EXISTS review_date DATE;

COMMENT ON COLUMN public.sop_documents.prepared_by IS 'Name of person who prepared this SOP';
COMMENT ON COLUMN public.sop_documents.review_date IS 'Next scheduled review date for this SOP';

-- Create index for review_date for efficient querying of SOPs due for review
CREATE INDEX IF NOT EXISTS idx_sop_documents_review_date ON public.sop_documents(review_date);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
