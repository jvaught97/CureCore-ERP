'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'
import {
  dataAdminPrefsSchema,
  type DataAdminPrefsInput,
} from '@/lib/validation/settings'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── DATA ADMIN PREFERENCES ──────────────────────────────────────────────────

export async function getDataAdminPrefs(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('data_admin_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || {
        environment: 'production',
        show_environment_banner: true,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch data admin preferences' }
  }
}

export async function saveDataAdminPrefs(input: DataAdminPrefsInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = dataAdminPrefsSchema.parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('data_admin_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('data_admin_prefs')
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
      entity: 'data_admin_prefs',
      entity_id: tenant_id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save data admin preferences' }
  }
}

// ─── FEATURE FLAGS ───────────────────────────────────────────────────────────

export async function getFeatureFlags(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('tenant_id', tenant_id)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch feature flags' }
  }
}

export async function saveFeatureFlags(
  flags: Array<{ flag_key: string; enabled: boolean; description?: string }>
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    // Delete all existing flags for this tenant
    await supabase.from('feature_flags').delete().eq('tenant_id', tenant_id)

    // Insert all flags (both enabled and disabled for persistence)
    if (flags.length > 0) {
      const { error } = await supabase.from('feature_flags').insert(
        flags.map((f) => ({
          tenant_id,
          flag_key: f.flag_key,
          enabled: f.enabled,
          description: f.description || null,
        }))
      )

      if (error) throw error
    }

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'feature_flags',
      entity_id: tenant_id,
      action: 'update',
      diff: { after: flags },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save feature flags' }
  }
}

// ─── BACKUP OPERATIONS (STUBBED) ─────────────────────────────────────────────

export async function createSnapshot(): Promise<ActionResult<{ snapshot_id: string }>> {
  try {
    const { tenant_id, user_id } = await getAuthContext()

    // TODO: Implement actual snapshot logic via Supabase RPC or external service
    // For now, just log the activity
    const snapshotId = `snapshot_${Date.now()}`

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'backup_snapshot',
      entity_id: snapshotId,
      action: 'create',
      diff: {
        after: {
          snapshot_id: snapshotId,
          created_at: new Date().toISOString(),
          status: 'stub',
        },
      },
    })

    return {
      success: true,
      data: { snapshot_id: snapshotId },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create snapshot' }
  }
}

// ─── IMPORT/EXPORT (STUBBED) ─────────────────────────────────────────────────

export async function downloadTemplate(entity: string): Promise<ActionResult<{ url: string }>> {
  try {
    // TODO: Generate actual CSV/JSON templates
    // For now, return a stub URL
    return {
      success: true,
      data: {
        url: `/api/templates/${entity}.csv`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate template' }
  }
}

export async function uploadImportFile(entity: string, file: File): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()

    // TODO: Implement actual file upload and processing
    // For now, just log the activity

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'data_import',
      entity_id: entity,
      action: 'create',
      diff: {
        after: {
          entity,
          filename: file.name,
          size: file.size,
          status: 'stub',
        },
      },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload file' }
  }
}
