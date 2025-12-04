'use server'

import { createClient } from '@/app/utils/supabase/server'
import { z } from 'zod'
import type {
  SOPDocument,
  SOPVersion,
  SOPListItem,
  SOPFilters,
  CreateSOPData,
  UpdateSOPData,
  CreateSOPVersionData,
  SOPActionResponse,
  SOPStructuredContent,
  SOPStructuredContentInput,
  CreateSOPStructuredData,
  CreateSOPVersionStructuredData
} from '../_types/sop'

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')

  // Get user's org_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) throw new Error('User organization not found')

  return { user_id: user.id, org_id: userData.org_id, supabase }
}

function generateSOPCode(orgId: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `SOP-${timestamp}${random}`
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const createSOPSchema = z.object({
  code: z.string().min(1, 'SOP code is required'),
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['manufacturing', 'cleaning', 'maintenance', 'safety', 'quality', 'warehouse', 'admin', 'other']),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  owner_user_id: z.string().uuid().optional(),

  // Structured SOP Code fields
  department_name: z.string().optional(),
  department_abbrev: z.string().optional(),
  process_type_name: z.string().optional(),
  process_type_abbrev: z.string().optional(),
  sop_sequence_number: z.string().optional(),

  // Initial version data
  revision_code: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  change_summary: z.string().optional()
})

const updateSOPSchema = z.object({
  code: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  category: z.enum(['manufacturing', 'cleaning', 'maintenance', 'safety', 'quality', 'warehouse', 'admin', 'other']).optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  owner_user_id: z.string().uuid().optional()
})

const createVersionSchema = z.object({
  sop_document_id: z.string().uuid(),
  revision_code: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  change_summary: z.string().min(1, 'Change summary is required')
})

// GMP Enhancement: Structured content validation
const structuredContentSchema = z.object({
  purpose: z.string().optional(),
  scope: z.string().optional(),
  responsibilities: z.string().optional(),
  definitions: z.string().optional(),
  required_materials_equipment: z.string().optional(),
  safety_precautions: z.string().optional(),
  procedure: z.string().min(1, 'Procedure is required'),
  quality_control_checkpoints: z.string().optional(),
  documentation_requirements: z.string().optional(),
  deviations_and_corrective_actions: z.string().optional(),
  references: z.string().optional()
})

const createSOPStructuredSchema = createSOPSchema.extend({
  structured_content: structuredContentSchema.optional(),
  linked_product_ids: z.array(z.string().uuid()).optional(),
  linked_bpr_template_ids: z.array(z.string().uuid()).optional()
})

const createVersionStructuredSchema = createVersionSchema.extend({
  structured_content: structuredContentSchema.optional()
})

// =====================================================
// STORAGE FUNCTIONS
// =====================================================

export async function uploadSOPFile(
  formData: FormData
): Promise<SOPActionResponse<{ file_url: string; file_size: number }>> {
  try {
    const { user_id, org_id, supabase } = await getAuth()

    const file = formData.get('file') as File
    const sopDocumentId = formData.get('sop_document_id') as string
    const versionNumber = formData.get('version_number') as string

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    if (!file.type.includes('pdf')) {
      return { success: false, error: 'Only PDF files are allowed' }
    }

    // File path: {org_id}/{sop_document_id}/{version_number}.pdf
    const filePath = `${org_id}/${sopDocumentId}/${versionNumber}.pdf`

    const { data, error } = await supabase.storage
      .from('sops')
      .upload(filePath, file, {
        upsert: true,
        contentType: 'application/pdf'
      })

    if (error) throw error

    return {
      success: true,
      data: {
        file_url: data.path,
        file_size: file.size
      }
    }
  } catch (err: any) {
    console.error('uploadSOPFile error:', err)
    return { success: false, error: err.message || 'Failed to upload file' }
  }
}

export async function getSOPFileUrl(filePath: string): Promise<SOPActionResponse<{ url: string }>> {
  try {
    const { supabase } = await getAuth()

    const { data } = supabase.storage
      .from('sops')
      .getPublicUrl(filePath)

    return {
      success: true,
      data: { url: data.publicUrl }
    }
  } catch (err: any) {
    console.error('getSOPFileUrl error:', err)
    return { success: false, error: err.message || 'Failed to get file URL' }
  }
}

// =====================================================
// SOP DOCUMENT CRUD
// =====================================================

export async function getSOPs(
  filters?: SOPFilters
): Promise<SOPActionResponse<SOPListItem[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('sop_documents')
      .select('*')
      .order('code', { ascending: true })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.department) {
      query = query.eq('department', filters.department)
    }

    if (filters?.owner_user_id) {
      query = query.eq('owner_user_id', filters.owner_user_id)
    }

    if (filters?.search) {
      query = query.or(`code.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data as unknown as SOPListItem[] }
  } catch (err: any) {
    console.error('getSOPs error:', err)
    return { success: false, error: err.message || 'Failed to fetch SOPs' }
  }
}

export async function getSOPById(
  id: string
): Promise<SOPActionResponse<SOPDocument>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sop_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return { success: false, error: 'SOP not found' }

    return { success: true, data: data as unknown as SOPDocument }
  } catch (err: any) {
    console.error('getSOPById error:', err)
    return { success: false, error: err.message || 'Failed to fetch SOP' }
  }
}

export async function createSOP(
  input: CreateSOPData,
  file?: File
): Promise<SOPActionResponse<{ id: string; code: string }>> {
  try {
    const { user_id, org_id, supabase } = await getAuth()
    const validated = createSOPSchema.parse(input)

    // 1. Create the SOP document
    const { data: sopDocument, error: sopError } = await supabase
      .from('sop_documents')
      .insert({
        code: validated.code,
        title: validated.title,
        category: validated.category,
        department: validated.department || null,
        status: validated.status || 'draft',
        owner_user_id: validated.owner_user_id || user_id,
        org_id: org_id
      })
      .select()
      .single()

    if (sopError) throw sopError

    // 2. Create the first version
    const versionData: any = {
      sop_document_id: sopDocument.id,
      version_number: 1,
      revision_code: validated.revision_code || null,
      status: 'draft',
      effective_date: validated.effective_date || null,
      expiry_date: validated.expiry_date || null,
      change_summary: validated.change_summary || 'Initial version',
      created_by_user_id: user_id,
      org_id: org_id
    }

    // 3. Upload file if provided
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sop_document_id', sopDocument.id)
      formData.append('version_number', '1')

      const uploadResult = await uploadSOPFile(formData)
      if (uploadResult.success && uploadResult.data) {
        versionData.file_url = uploadResult.data.file_url
        versionData.file_size_bytes = uploadResult.data.file_size
      }
    }

    const { data: version, error: versionError } = await supabase
      .from('sop_versions')
      .insert(versionData)
      .select()
      .single()

    if (versionError) throw versionError

    // 4. Update SOP document with current_version_id
    const { error: updateError } = await supabase
      .from('sop_documents')
      .update({ current_version_id: version.id })
      .eq('id', sopDocument.id)

    if (updateError) throw updateError

    return {
      success: true,
      data: {
        id: sopDocument.id,
        code: sopDocument.code
      }
    }
  } catch (err: any) {
    console.error('createSOP error:', err)
    return { success: false, error: err.message || 'Failed to create SOP' }
  }
}

export async function updateSOP(
  id: string,
  input: UpdateSOPData
): Promise<SOPActionResponse> {
  try {
    const { supabase } = await getAuth()
    const validated = updateSOPSchema.parse(input)

    const { error } = await supabase
      .from('sop_documents')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('updateSOP error:', err)
    return { success: false, error: err.message || 'Failed to update SOP' }
  }
}

export async function deleteSOP(id: string): Promise<SOPActionResponse> {
  try {
    const { supabase } = await getAuth()

    // Get all versions to delete their files
    const { data: versions, error: versionsError } = await supabase
      .from('sop_versions')
      .select('file_url')
      .eq('sop_document_id', id)

    if (versionsError) throw versionsError

    // Delete files from storage
    if (versions && versions.length > 0) {
      const filePaths = versions
        .filter(v => v.file_url)
        .map(v => v.file_url as string)

      if (filePaths.length > 0) {
        await supabase.storage
          .from('sops')
          .remove(filePaths)
      }
    }

    // Delete SOP document (cascade will delete versions)
    const { error: deleteError } = await supabase
      .from('sop_documents')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return { success: true }
  } catch (err: any) {
    console.error('deleteSOP error:', err)
    return { success: false, error: err.message || 'Failed to delete SOP' }
  }
}

// =====================================================
// SOP VERSION CRUD
// =====================================================

export async function createSOPVersion(
  input: CreateSOPVersionData,
  file?: File
): Promise<SOPActionResponse<{ id: string; version_number: number }>> {
  try {
    const { user_id, org_id, supabase } = await getAuth()
    const validated = createVersionSchema.parse(input)

    // Get the latest version number
    const { data: versions, error: versionsError } = await supabase
      .from('sop_versions')
      .select('version_number')
      .eq('sop_document_id', validated.sop_document_id)
      .order('version_number', { ascending: false })
      .limit(1)

    if (versionsError) throw versionsError

    const newVersionNumber = versions && versions.length > 0
      ? versions[0].version_number + 1
      : 1

    // Mark previous version as superseded
    if (versions && versions.length > 0) {
      await supabase
        .from('sop_versions')
        .update({ status: 'superseded' })
        .eq('sop_document_id', validated.sop_document_id)
        .eq('status', 'approved')
    }

    const versionData: any = {
      sop_document_id: validated.sop_document_id,
      version_number: newVersionNumber,
      revision_code: validated.revision_code || null,
      status: 'draft',
      effective_date: validated.effective_date || null,
      expiry_date: validated.expiry_date || null,
      change_summary: validated.change_summary,
      created_by_user_id: user_id,
      org_id: org_id
    }

    // Upload file if provided
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sop_document_id', validated.sop_document_id)
      formData.append('version_number', newVersionNumber.toString())

      const uploadResult = await uploadSOPFile(formData)
      if (uploadResult.success && uploadResult.data) {
        versionData.file_url = uploadResult.data.file_url
        versionData.file_size_bytes = uploadResult.data.file_size
      }
    }

    const { data: newVersion, error: versionError } = await supabase
      .from('sop_versions')
      .insert(versionData)
      .select()
      .single()

    if (versionError) throw versionError

    // Update SOP document with new current_version_id
    const { error: updateError } = await supabase
      .from('sop_documents')
      .update({ current_version_id: newVersion.id })
      .eq('id', validated.sop_document_id)

    if (updateError) throw updateError

    // =====================================================
    // CRITICAL FIX: Copy structured content from previous version
    // =====================================================
    // When creating a new version, we need to copy the structured content
    // from the previous version so it appears in Structured Content tab
    // and Operator Mode. This ensures version continuity.

    if (versions && versions.length > 0) {
      // Get the previous version's ID
      const { data: prevVersion, error: prevVersionError } = await supabase
        .from('sop_versions')
        .select('id')
        .eq('sop_document_id', validated.sop_document_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .neq('id', newVersion.id) // Exclude the newly created version
        .single()

      if (!prevVersionError && prevVersion) {
        // Try to fetch structured content from previous version
        const { data: prevContent, error: prevContentError } = await supabase
          .from('sop_structured_content')
          .select('*')
          .eq('sop_version_id', prevVersion.id)
          .single()

        if (!prevContentError && prevContent) {
          // Copy all content fields to new version
          const newContentData = {
            sop_version_id: newVersion.id,
            purpose: prevContent.purpose,
            scope: prevContent.scope,
            responsibilities: prevContent.responsibilities,
            definitions: prevContent.definitions,
            required_materials_equipment: prevContent.required_materials_equipment,
            safety_precautions: prevContent.safety_precautions,
            procedure: prevContent.procedure,
            quality_control_checkpoints: prevContent.quality_control_checkpoints,
            documentation_requirements: prevContent.documentation_requirements,
            deviations_and_corrective_actions: prevContent.deviations_and_corrective_actions,
            references: prevContent.references,
            tenant_id: prevContent.tenant_id || org_id
          }

          const { error: insertContentError } = await supabase
            .from('sop_structured_content')
            .insert(newContentData)

          if (insertContentError) {
            console.error('Failed to copy structured content to new version:', insertContentError)
            // Don't throw - version was created successfully, just log the error
          }
        }
      }
    }

    return {
      success: true,
      data: {
        id: newVersion.id,
        version_number: newVersionNumber
      }
    }
  } catch (err: any) {
    console.error('createSOPVersion error:', err)
    return { success: false, error: err.message || 'Failed to create SOP version' }
  }
}

export async function approveSOPVersion(
  versionId: string
): Promise<SOPActionResponse> {
  try {
    const { user_id, supabase } = await getAuth()

    const { error } = await supabase
      .from('sop_versions')
      .update({
        status: 'approved',
        approved_by_user_id: user_id,
        approved_at: new Date().toISOString()
      })
      .eq('id', versionId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('approveSOPVersion error:', err)
    return { success: false, error: err.message || 'Failed to approve SOP version' }
  }
}

export async function getSOPVersions(
  sopDocumentId: string
): Promise<SOPActionResponse<SOPVersion[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sop_versions')
      .select('*')
      .eq('sop_document_id', sopDocumentId)
      .order('version_number', { ascending: false })

    if (error) throw error

    return { success: true, data: data as unknown as SOPVersion[] }
  } catch (err: any) {
    console.error('getSOPVersions error:', err)
    return { success: false, error: err.message || 'Failed to fetch SOP versions' }
  }
}

// =====================================================
// GMP ENHANCEMENT: STRUCTURED CONTENT CRUD
// =====================================================

export async function getSOPStructuredContent(
  versionId: string
): Promise<SOPActionResponse<SOPStructuredContent>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sop_structured_content')
      .select('*')
      .eq('sop_version_id', versionId)
      .single()

    if (error) throw error
    if (!data) return { success: false, error: 'Structured content not found' }

    return { success: true, data: data as unknown as SOPStructuredContent }
  } catch (err: any) {
    console.error('getSOPStructuredContent error:', err)
    return { success: false, error: err.message || 'Failed to fetch structured content' }
  }
}

export async function updateSOPStructuredContent(
  versionId: string,
  content: Partial<SOPStructuredContentInput>
): Promise<SOPActionResponse> {
  try {
    const { user_id, org_id, supabase } = await getAuth()

    // Check if version is locked (approved or obsolete)
    const { data: version } = await supabase
      .from('sop_versions')
      .select('status')
      .eq('id', versionId)
      .single()

    if (version?.status === 'approved' || version?.status === 'obsolete') {
      return {
        success: false,
        error: 'Cannot edit approved or obsolete SOP version. Create a new version instead.'
      }
    }

    const validated = structuredContentSchema.partial().parse(content)

    const { error } = await supabase
      .from('sop_structured_content')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('sop_version_id', versionId)

    if (error) throw error

    // Update version's updated_by
    await supabase
      .from('sop_versions')
      .update({ updated_by_user_id: user_id })
      .eq('id', versionId)

    return { success: true }
  } catch (err: any) {
    console.error('updateSOPStructuredContent error:', err)
    return { success: false, error: err.message || 'Failed to update structured content' }
  }
}

export async function updateSOPVersionStatus(
  versionId: string,
  newStatus: SOPVersionStatus
): Promise<SOPActionResponse> {
  try {
    const { user_id, supabase } = await getAuth()

    const updateData: any = {
      status: newStatus,
      updated_by_user_id: user_id
    }

    // If approving, set approval fields
    if (newStatus === 'approved') {
      updateData.approved_by_user_id = user_id
      updateData.approved_at = new Date().toISOString()
      // TODO: Add role-based permission check (only QA can approve)
    }

    const { error } = await supabase
      .from('sop_versions')
      .update(updateData)
      .eq('id', versionId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('updateSOPVersionStatus error:', err)
    return { success: false, error: err.message || 'Failed to update status' }
  }
}

// =====================================================
// GMP ENHANCEMENT: STRUCTURED SOP CREATION
// =====================================================

export async function createSOPStructured(
  input: CreateSOPStructuredData,
  file?: File
): Promise<SOPActionResponse<{ id: string; code: string }>> {
  try {
    const { user_id, org_id, supabase } = await getAuth()
    const validated = createSOPStructuredSchema.parse(input)

    // 1. Create the SOP document with optional linking and structured code
    const { data: sopDocument, error: sopError } = await supabase
      .from('sop_documents')
      .insert({
        code: validated.code,
        title: validated.title,
        category: validated.category,
        department: validated.department || null,
        status: validated.status || 'draft',
        owner_user_id: validated.owner_user_id || user_id,
        linked_product_ids: validated.linked_product_ids || null,
        linked_bpr_template_ids: validated.linked_bpr_template_ids || null,
        department_name: validated.department_name || null,
        department_abbrev: validated.department_abbrev || null,
        process_type_name: validated.process_type_name || null,
        process_type_abbrev: validated.process_type_abbrev || null,
        sop_sequence_number: validated.sop_sequence_number || null,
        org_id: org_id
      })
      .select()
      .single()

    if (sopError) throw sopError

    // 2. Create the first version
    const versionData: any = {
      sop_document_id: sopDocument.id,
      version_number: 1,
      revision_code: validated.revision_code || null,
      status: 'draft',
      effective_date: validated.effective_date || null,
      expiry_date: validated.expiry_date || null,
      change_summary: validated.change_summary || 'Initial version',
      created_by_user_id: user_id,
      org_id: org_id
    }

    // 3. Upload file if provided (stored as uploaded_pdf_url)
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sop_document_id', sopDocument.id)
      formData.append('version_number', '1')

      const uploadResult = await uploadSOPFile(formData)
      if (uploadResult.success && uploadResult.data) {
        versionData.uploaded_pdf_url = uploadResult.data.file_url
        versionData.file_url = uploadResult.data.file_url // Backwards compatibility
        versionData.file_size_bytes = uploadResult.data.file_size
      }
    }

    const { data: version, error: versionError } = await supabase
      .from('sop_versions')
      .insert(versionData)
      .select()
      .single()

    if (versionError) throw versionError

    // 4. Create structured content if provided
    if (validated.structured_content) {
      const { error: contentError } = await supabase
        .from('sop_structured_content')
        .insert({
          sop_version_id: version.id,
          ...validated.structured_content,
          tenant_id: org_id
        })

      if (contentError) throw contentError
    }

    // 5. Update SOP document with current_version_id
    const { error: updateError } = await supabase
      .from('sop_documents')
      .update({ current_version_id: version.id })
      .eq('id', sopDocument.id)

    if (updateError) throw updateError

    return {
      success: true,
      data: {
        id: sopDocument.id,
        code: sopDocument.code
      }
    }
  } catch (err: any) {
    console.error('createSOPStructured error:', err)
    return { success: false, error: err.message || 'Failed to create SOP' }
  }
}

export async function createSOPVersionStructured(
  input: CreateSOPVersionStructuredData,
  file?: File
): Promise<SOPActionResponse<{ id: string; version_number: number }>> {
  try {
    const { user_id, org_id, supabase } = await getAuth()
    const validated = createVersionStructuredSchema.parse(input)

    // Get the latest version number
    const { data: versions, error: versionsError } = await supabase
      .from('sop_versions')
      .select('version_number')
      .eq('sop_document_id', validated.sop_document_id)
      .order('version_number', { ascending: false })
      .limit(1)

    if (versionsError) throw versionsError

    const newVersionNumber = versions && versions.length > 0
      ? versions[0].version_number + 1
      : 1

    // Mark previous version as obsolete
    if (versions && versions.length > 0) {
      await supabase
        .from('sop_versions')
        .update({ status: 'obsolete' })
        .eq('sop_document_id', validated.sop_document_id)
        .eq('status', 'approved')
    }

    const versionData: any = {
      sop_document_id: validated.sop_document_id,
      version_number: newVersionNumber,
      revision_code: validated.revision_code || null,
      status: 'draft',
      effective_date: validated.effective_date || null,
      expiry_date: validated.expiry_date || null,
      change_summary: validated.change_summary,
      created_by_user_id: user_id,
      org_id: org_id
    }

    // Upload file if provided
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sop_document_id', validated.sop_document_id)
      formData.append('version_number', newVersionNumber.toString())

      const uploadResult = await uploadSOPFile(formData)
      if (uploadResult.success && uploadResult.data) {
        versionData.uploaded_pdf_url = uploadResult.data.file_url
        versionData.file_url = uploadResult.data.file_url // Backwards compatibility
        versionData.file_size_bytes = uploadResult.data.file_size
      }
    }

    const { data: newVersion, error: versionError } = await supabase
      .from('sop_versions')
      .insert(versionData)
      .select()
      .single()

    if (versionError) throw versionError

    // Create structured content if provided
    if (validated.structured_content) {
      const { error: contentError } = await supabase
        .from('sop_structured_content')
        .insert({
          sop_version_id: newVersion.id,
          ...validated.structured_content,
          tenant_id: org_id
        })

      if (contentError) throw contentError
    }

    // Update SOP document with new current_version_id
    const { error: updateError } = await supabase
      .from('sop_documents')
      .update({ current_version_id: newVersion.id })
      .eq('id', validated.sop_document_id)

    if (updateError) throw updateError

    return {
      success: true,
      data: {
        id: newVersion.id,
        version_number: newVersionNumber
      }
    }
  } catch (err: any) {
    console.error('createSOPVersionStructured error:', err)
    return { success: false, error: err.message || 'Failed to create SOP version' }
  }
}

// =====================================================
// GMP ENHANCEMENT: PDF GENERATION
// =====================================================

export async function generateSOPPDFAction(
  sopDocumentId: string,
  versionId: string
): Promise<SOPActionResponse<{ fileUrl: string }>> {
  try {
    const { org_id } = await getAuth()

    // Import the PDF generator dynamically
    const { generateSOPPDF } = await import('../_services/pdf-generator')

    const result = await generateSOPPDF({
      sopDocumentId,
      versionId,
      orgId: org_id
    })

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to generate PDF' }
    }

    return {
      success: true,
      data: { fileUrl: result.fileUrl || '' }
    }
  } catch (err: any) {
    console.error('generateSOPPDFAction error:', err)
    return { success: false, error: err.message || 'Failed to generate PDF' }
  }
}

// =====================================================
// DELETE SOP
// =====================================================

/**
 * Check if user has admin or manager role
 */
async function checkDeletePermission(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !userData) return false

    // Only admin and manager can delete SOPs
    return ['admin', 'manager'].includes(userData.role)
  } catch (err) {
    return false
  }
}

/**
 * Create audit log entry for SOP deletion
 */
async function createDeletionAuditLog(
  supabase: any,
  userId: string,
  orgId: string,
  sopCode: string,
  sopTitle: string
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      org_id: orgId,
      action: 'sop_deleted',
      entity_type: 'sop_document',
      entity_id: sopCode,
      details: {
        sop_code: sopCode,
        sop_title: sopTitle,
        deleted_at: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('Failed to create audit log:', err)
    // Don't throw - audit log failure shouldn't block deletion
  }
}

const deleteSOPSchema = z.object({
  sop_id: z.string().uuid('Invalid SOP ID'),
  confirmation_code: z.string().min(1, 'Confirmation code is required')
})

/**
 * Delete an SOP document and all its versions
 * Requires admin/manager role and SOP code confirmation
 */
export async function deleteSOPById(
  sopId: string,
  confirmationCode: string
): Promise<SOPActionResponse<{ deleted: boolean }>> {
  try {
    // Validate inputs
    const validation = deleteSOPSchema.safeParse({
      sop_id: sopId,
      confirmation_code: confirmationCode
    })

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input'
      }
    }

    // Authenticate user
    const { user_id, org_id, supabase } = await getAuth()

    // Check if user has permission to delete
    const hasPermission = await checkDeletePermission(supabase, user_id)
    if (!hasPermission) {
      return {
        success: false,
        error: 'Unauthorized: Only administrators and managers can delete SOPs'
      }
    }

    // Fetch the SOP to verify it exists and get its code
    const { data: sop, error: sopError } = await supabase
      .from('sop_documents')
      .select('id, code, title, org_id')
      .eq('id', sopId)
      .single()

    if (sopError || !sop) {
      return { success: false, error: 'SOP not found' }
    }

    // Verify org_id matches
    if (sop.org_id !== org_id) {
      return { success: false, error: 'Unauthorized: SOP belongs to different organization' }
    }

    // Verify confirmation code matches SOP code exactly
    if (sop.code !== confirmationCode) {
      return {
        success: false,
        error: 'Confirmation failed: SOP code does not match'
      }
    }

    // Create audit log before deletion
    await createDeletionAuditLog(supabase, user_id, org_id, sop.code, sop.title)

    // Delete all versions first (due to foreign key constraints)
    const { error: versionsError } = await supabase
      .from('sop_versions')
      .delete()
      .eq('sop_document_id', sopId)

    if (versionsError) {
      console.error('Failed to delete SOP versions:', versionsError)
      return { success: false, error: 'Failed to delete SOP versions' }
    }

    // Delete the SOP document
    const { error: deleteError } = await supabase
      .from('sop_documents')
      .delete()
      .eq('id', sopId)

    if (deleteError) {
      console.error('Failed to delete SOP document:', deleteError)
      return { success: false, error: 'Failed to delete SOP' }
    }

    return {
      success: true,
      data: { deleted: true }
    }
  } catch (err: any) {
    console.error('deleteSOPById error:', err)
    return { success: false, error: err.message || 'Failed to delete SOP' }
  }
}
