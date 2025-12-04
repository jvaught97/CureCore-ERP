/**
 * TypeScript type definitions for SOP Library
 *
 * These types match the database schema defined in:
 * supabase/migrations/20251202000000_sop_library.sql
 */

/**
 * SOP Document categories for classification
 */
export type SOPCategory =
  | 'manufacturing'
  | 'cleaning'
  | 'maintenance'
  | 'safety'
  | 'quality'
  | 'warehouse'
  | 'admin'
  | 'other';

/**
 * SOP Document status
 */
export type SOPDocumentStatus = 'active' | 'inactive' | 'draft';

/**
 * SOP Version status
 * Updated for GMP approval workflow
 */
export type SOPVersionStatus = 'draft' | 'under_review' | 'approved' | 'obsolete';

/**
 * GMP Structured Content for SOP
 * Contains the detailed procedure and documentation fields
 */
export interface SOPStructuredContent {
  id: string;
  sop_version_id: string;

  // Core GMP Fields
  purpose: string | null;
  scope: string | null;
  responsibilities: string | null;
  definitions: string | null;
  required_materials_equipment: string | null;
  safety_precautions: string | null;
  procedure: string; // Required field
  quality_control_checkpoints: string | null;
  documentation_requirements: string | null;
  deviations_and_corrective_actions: string | null;
  references: string | null;

  // Metadata
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Main SOP Document interface
 * Represents the master record for an SOP with metadata and current version tracking
 */
export interface SOPDocument {
  id: string;
  code: string;
  title: string;
  category: SOPCategory;
  department: string | null;
  status: SOPDocumentStatus;
  current_version_id: string | null;
  owner_user_id: string | null;
  org_id: string;

  // GMP Enhancement: Product and BPR linking
  linked_product_ids: string[] | null;
  linked_bpr_template_ids: string[] | null;

  // Structured SOP Code Enhancement
  department_name: string | null;
  department_abbrev: string | null;
  process_type_name: string | null;
  process_type_abbrev: string | null;
  sop_sequence_number: string | null;

  // GMP Metadata Enhancement
  prepared_by: string | null;
  review_date: string | null;

  created_at: string;
  updated_at: string;

  // Joined relations (when querying with Supabase)
  current_version?: SOPVersion;
  owner?: {
    id: string;
    email: string;
    full_name?: string;
  };
  versions?: SOPVersion[];
}

/**
 * SOP Version interface
 * Represents a specific version of an SOP document with approval tracking
 */
export interface SOPVersion {
  id: string;
  sop_document_id: string;
  version_number: number;
  revision_code: string | null;
  status: SOPVersionStatus;
  effective_date: string | null;
  expiry_date: string | null;

  // GMP Enhancement: Three PDF capabilities
  file_url: string | null; // Backwards compatibility - migrated to uploaded_pdf_url
  uploaded_pdf_url: string | null; // Legacy PDF upload
  auto_generated_pdf_url: string | null; // Auto-generated from structured content
  auto_generated_pdf_last_generated_at: string | null;

  file_size_bytes: number | null;
  change_summary: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  created_by_user_id: string;
  updated_by_user_id: string | null; // GMP Enhancement: Track last updater
  org_id: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  sop_document?: SOPDocument;
  structured_content?: SOPStructuredContent; // GMP Enhancement
  approved_by?: {
    id: string;
    email: string;
    full_name?: string;
  };
  created_by?: {
    id: string;
    email: string;
    full_name?: string;
  };
  updated_by?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

/**
 * Form data for creating a new SOP document
 */
export interface CreateSOPData {
  code: string;
  title: string;
  category: SOPCategory;
  department?: string;
  status?: SOPDocumentStatus;
  owner_user_id?: string;

  // Structured SOP Code fields
  department_name?: string;
  department_abbrev?: string;
  process_type_name?: string;
  process_type_abbrev?: string;
  sop_sequence_number?: string;

  // Initial version data
  revision_code?: string;
  effective_date?: string;
  expiry_date?: string;
  change_summary?: string;
}

/**
 * Form data for updating an existing SOP document
 */
export interface UpdateSOPData {
  code?: string;
  title?: string;
  category?: SOPCategory;
  department?: string;
  status?: SOPDocumentStatus;
  owner_user_id?: string;
  prepared_by?: string;
  review_date?: string;
}

/**
 * Form data for creating a new version of an existing SOP
 */
export interface CreateSOPVersionData {
  sop_document_id: string;
  revision_code?: string;
  effective_date?: string;
  expiry_date?: string;
  change_summary: string;
}

/**
 * Filter options for querying SOPs
 */
export interface SOPFilters {
  category?: SOPCategory;
  status?: SOPDocumentStatus;
  department?: string;
  owner_user_id?: string;
  search?: string; // Search in code or title
}

/**
 * Helper type for SOP list items (minimal data for list view)
 */
export interface SOPListItem {
  id: string;
  code: string;
  title: string;
  category: SOPCategory;
  status: SOPDocumentStatus;
  department: string | null;
  current_version?: {
    id: string;
    version_number: number;
    revision_code: string | null;
    status: SOPVersionStatus;
    effective_date: string | null;
  };
  owner?: {
    full_name?: string;
    email: string;
  };
  updated_at: string;
}

/**
 * Structured content input for creating/updating SOPs
 */
export interface SOPStructuredContentInput {
  purpose?: string;
  scope?: string;
  responsibilities?: string;
  definitions?: string;
  required_materials_equipment?: string;
  safety_precautions?: string;
  procedure: string; // Required
  quality_control_checkpoints?: string;
  documentation_requirements?: string;
  deviations_and_corrective_actions?: string;
  references?: string;
}

/**
 * Extended form data for creating a new SOP with structured content
 */
export interface CreateSOPStructuredData extends CreateSOPData {
  structured_content?: SOPStructuredContentInput;
  linked_product_ids?: string[];
  linked_bpr_template_ids?: string[];
}

/**
 * Extended form data for creating a new version with structured content
 */
export interface CreateSOPVersionStructuredData extends CreateSOPVersionData {
  structured_content?: SOPStructuredContentInput;
}

/**
 * Response type for server actions
 */
export interface SOPActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
