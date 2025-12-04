'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'

export async function getBrandingSettings() {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('org_settings')
      .select('primary_color, secondary_color, dark_mode, navbar_logo_url, invoice_logo_url, packing_logo_url, analytics_logo_url, invoice_template, po_template, coa_template, batch_record_template')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: data || null }
  } catch (error: any) {
    console.error('getBrandingSettings error:', error)
    return { success: false, error: error.message || 'Failed to fetch branding settings' }
  }
}

export async function updateThemeSettings(input: {
  primary_color: string
  secondary_color?: string
  dark_mode: boolean
}) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    // Fetch existing for diff
    const { data: before } = await supabase
      .from('org_settings')
      .select('primary_color, secondary_color, dark_mode')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('org_settings')
      .upsert(
        {
          tenant_id,
          primary_color: input.primary_color,
          secondary_color: input.secondary_color || null,
          dark_mode: input.dark_mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'org_settings',
      entity_id: data.id,
      action: 'update',
      diff: {
        before: before || undefined,
        after: { primary_color: data.primary_color, secondary_color: data.secondary_color, dark_mode: data.dark_mode },
      },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('updateThemeSettings error:', error)
    return { success: false, error: error.message || 'Failed to update theme settings' }
  }
}

export async function uploadLogo(kind: 'navbar' | 'invoice' | 'packing' | 'analytics', file: File) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    // Validate file type
    if (!file.type.match(/^image\/(png|svg\+xml|jpeg)$/)) {
      throw new Error('Only PNG, SVG, or JPEG images are allowed')
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${tenant_id}/${kind}-${Date.now()}.${fileExt}`

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('branding')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName)

    // Update org_settings with logo URL
    const columnName = `${kind}_logo_url`
    const { data, error } = await supabase
      .from('org_settings')
      .upsert(
        {
          tenant_id,
          [columnName]: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'org_settings',
      entity_id: data.id,
      action: 'update',
      diff: {
        after: { [columnName]: publicUrl },
      },
    })

    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('uploadLogo error:', error)
    return { success: false, error: error.message || 'Failed to upload logo' }
  }
}

export async function deleteLogo(kind: 'navbar' | 'invoice' | 'packing' | 'analytics') {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    // Get current logo URL
    const { data: current } = await supabase
      .from('org_settings')
      .select(`${kind}_logo_url`)
      .eq('tenant_id', tenant_id)
      .single()

    const columnName = `${kind}_logo_url` as keyof typeof current
    const currentUrl = current?.[columnName] as string | null | undefined

    if (!currentUrl) {
      return { success: true }
    }

    // Extract file path from URL
    const urlParts = currentUrl.split('/branding/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      // Delete from storage
      await supabase.storage.from('branding').remove([filePath])
    }

    // Update org_settings to remove logo URL
    const { data, error } = await supabase
      .from('org_settings')
      .update({
        [columnName]: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'org_settings',
      entity_id: data.id,
      action: 'update',
      diff: {
        before: { [columnName]: currentUrl },
        after: { [columnName]: null },
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('deleteLogo error:', error)
    return { success: false, error: error.message || 'Failed to delete logo' }
  }
}

export async function updateDocumentTemplates(input: {
  invoice_template: string
  po_template: string
  coa_template: string
  batch_record_template: string
}) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('org_settings')
      .upsert(
        {
          tenant_id,
          invoice_template: input.invoice_template,
          po_template: input.po_template,
          coa_template: input.coa_template,
          batch_record_template: input.batch_record_template,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'org_settings',
      entity_id: data.id,
      action: 'update',
      diff: {
        after: {
          invoice_template: input.invoice_template,
          po_template: input.po_template,
          coa_template: input.coa_template,
          batch_record_template: input.batch_record_template,
        },
      },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('updateDocumentTemplates error:', error)
    return { success: false, error: error.message || 'Failed to update document templates' }
  }
}
