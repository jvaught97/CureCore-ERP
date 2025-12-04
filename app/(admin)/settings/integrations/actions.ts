'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'
import {
  integrationPrefsSchema,
  type IntegrationPrefsInput,
} from '@/lib/validation/settings'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── INTEGRATION PREFERENCES ─────────────────────────────────────────────────

export async function getIntegrationPrefs(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('integration_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || {
        posthog_api_key: '',
        google_analytics_id: '',
        sentry_dsn: '',
        enable_fedex: false,
        enable_ups: false,
        enable_usps: false,
        enable_avalara_tax: false,
        enable_taxjar: false,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch integration preferences' }
  }
}

export async function saveIntegrationPrefs(input: IntegrationPrefsInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = integrationPrefsSchema.parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('integration_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('integration_prefs')
      .upsert(
        {
          tenant_id,
          ...validated,
        },
        {
          onConflict: 'tenant_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'integration_prefs',
      entity_id: tenant_id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save integration preferences' }
  }
}

// ─── STORAGE BUCKETS (READ-ONLY) ─────────────────────────────────────────────

export async function getStorageBuckets(): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage.listBuckets()

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch storage buckets' }
  }
}
