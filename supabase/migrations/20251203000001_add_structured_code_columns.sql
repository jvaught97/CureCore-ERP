-- Migration: Add Structured Code Columns to sop_documents
-- Created: 2025-12-03
-- Purpose: Add department_name, department_abbrev, process_type_name, process_type_abbrev, sop_sequence_number

-- Add structured code columns to sop_documents table
ALTER TABLE public.sop_documents
  ADD COLUMN IF NOT EXISTS department_name TEXT,
  ADD COLUMN IF NOT EXISTS department_abbrev TEXT,
  ADD COLUMN IF NOT EXISTS process_type_name TEXT,
  ADD COLUMN IF NOT EXISTS process_type_abbrev TEXT,
  ADD COLUMN IF NOT EXISTS sop_sequence_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.sop_documents.department_name IS 'Full department name (e.g., Manufacturing)';
COMMENT ON COLUMN public.sop_documents.department_abbrev IS 'Department abbreviation for code (e.g., MFG)';
COMMENT ON COLUMN public.sop_documents.process_type_name IS 'Full process type name (e.g., Raw Material Handling)';
COMMENT ON COLUMN public.sop_documents.process_type_abbrev IS 'Process type abbreviation for code (e.g., RMH)';
COMMENT ON COLUMN public.sop_documents.sop_sequence_number IS 'Sequence number within department-process combination (e.g., 001)';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS sop_documents_department_abbrev_idx ON public.sop_documents(department_abbrev);
CREATE INDEX IF NOT EXISTS sop_documents_process_type_abbrev_idx ON public.sop_documents(process_type_abbrev);
CREATE INDEX IF NOT EXISTS sop_documents_structured_code_idx ON public.sop_documents(department_abbrev, process_type_abbrev, sop_sequence_number);
