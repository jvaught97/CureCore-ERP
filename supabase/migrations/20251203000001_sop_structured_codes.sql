-- ===================================================================
-- SOP Structured Code Enhancement
-- ===================================================================
-- This migration adds department and process type fields to support
-- structured 3-part SOP codes: {DEPT_ABBREV}-{PROCESS_ABBREV}-{NUMBER}
-- Example: QA-QC-001, MFG-PWD-001, ENG-EQP-003
-- ===================================================================

-- ============================================================================
-- STEP 1: Add new columns to sop_documents table
-- ============================================================================

-- Add department metadata fields
ALTER TABLE public.sop_documents
  ADD COLUMN IF NOT EXISTS department_name TEXT,
  ADD COLUMN IF NOT EXISTS department_abbrev TEXT;

-- Add process type metadata fields
ALTER TABLE public.sop_documents
  ADD COLUMN IF NOT EXISTS process_type_name TEXT,
  ADD COLUMN IF NOT EXISTS process_type_abbrev TEXT;

-- Add SOP sequence number (the numeric part)
ALTER TABLE public.sop_documents
  ADD COLUMN IF NOT EXISTS sop_sequence_number TEXT;

-- ============================================================================
-- STEP 2: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.sop_documents.department_name IS 'Full department name (e.g., "Quality Assurance")';
COMMENT ON COLUMN public.sop_documents.department_abbrev IS 'Department abbreviation used in SOP code (e.g., "QA")';
COMMENT ON COLUMN public.sop_documents.process_type_name IS 'Full process type name (e.g., "Quality Control")';
COMMENT ON COLUMN public.sop_documents.process_type_abbrev IS 'Process type abbreviation used in SOP code (e.g., "QC")';
COMMENT ON COLUMN public.sop_documents.sop_sequence_number IS 'Numeric sequence portion of SOP code (e.g., "001")';

-- Update comment for code column
COMMENT ON COLUMN public.sop_documents.code IS 'Full SOP code composed from dept-process-number (e.g., "QA-QC-001")';

-- ============================================================================
-- STEP 3: Create indexes for new fields
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sop_documents_department_abbrev ON public.sop_documents(department_abbrev);
CREATE INDEX IF NOT EXISTS idx_sop_documents_process_type_abbrev ON public.sop_documents(process_type_abbrev);

-- ============================================================================
-- STEP 4: Data migration helper function
-- ============================================================================

-- This function attempts to parse existing SOP codes into structured parts
-- For codes like "MFG-PWD-001", it will extract:
-- - department_abbrev = "MFG"
-- - process_type_abbrev = "PWD"
-- - sop_sequence_number = "001"

CREATE OR REPLACE FUNCTION parse_legacy_sop_code()
RETURNS void AS $$
DECLARE
  sop_record RECORD;
  code_parts TEXT[];
BEGIN
  FOR sop_record IN
    SELECT id, code
    FROM public.sop_documents
    WHERE department_abbrev IS NULL
      AND code LIKE '%-%-%'
  LOOP
    -- Split code by hyphen
    code_parts := string_to_array(sop_record.code, '-');

    -- If we have exactly 3 parts, parse them
    IF array_length(code_parts, 1) = 3 THEN
      UPDATE public.sop_documents
      SET
        department_abbrev = code_parts[1],
        process_type_abbrev = code_parts[2],
        sop_sequence_number = code_parts[3]
      WHERE id = sop_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration for existing records
SELECT parse_legacy_sop_code();

-- Drop the helper function (no longer needed)
DROP FUNCTION IF EXISTS parse_legacy_sop_code();

-- ============================================================================
-- STEP 5: Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- Migration complete!
-- ===================================================================
