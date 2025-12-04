'use server'

import { createClient } from '@/app/utils/supabase/server'
import { orgSettingsSchema, type OrgSettingsInput } from '@/lib/validation/settings'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'

export async function saveOrgSettings(input: OrgSettingsInput) {
  try {
    // Auth & validation
    const { tenant_id, user_id } = await getAuthContext()
    const validated = orgSettingsSchema.parse(input)

    const supabase = await createClient()

    // Fetch existing settings for diff
    const { data: existing } = await supabase
      .from('org_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    // Upsert org settings
    const { data, error } = await supabase
      .from('org_settings')
      .upsert(
        {
          tenant_id,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'org_settings',
      entity_id: data.id,
      action: existing ? 'update' : 'create',
      diff: {
        before: existing || undefined,
        after: data,
      },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('saveOrgSettings error:', error)
    return { success: false, error: error.message || 'Failed to save organization settings' }
  }
}

export async function getOrgSettings() {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('org_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

    return { success: true, data: data || null }
  } catch (error: any) {
    console.error('getOrgSettings error:', error)
    return { success: false, error: error.message || 'Failed to fetch organization settings' }
  }
}
