'use server'

import { createClient } from '@/app/utils/supabase/server'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'
import {
  notificationPrefsSchema,
  type NotificationPrefsInput,
} from '@/lib/validation/settings'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────

export async function getNotificationPrefs(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || {
        email_enabled: false,
        email_smtp_host: '',
        email_smtp_port: 587,
        email_smtp_user: '',
        email_smtp_password: '',
        email_from_address: '',
        slack_webhook_url: '',
        webhook_url: '',
        webhook_secret: '',
        quiet_hours_start: null,
        quiet_hours_end: null,
        quiet_hours_timezone: 'America/Los_Angeles',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch notification preferences' }
  }
}

export async function saveNotificationPrefs(input: NotificationPrefsInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = notificationPrefsSchema.parse(input)
    const supabase = await createClient()

    const { data: before } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('notification_prefs')
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
      entity: 'notification_prefs',
      entity_id: tenant_id,
      action: before ? 'update' : 'create',
      diff: { before, after: data },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save notification preferences' }
  }
}

// ─── NOTIFICATION TRIGGERS ───────────────────────────────────────────────────

export async function getNotificationTriggers(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notification_triggers')
      .select('*')
      .eq('tenant_id', tenant_id)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch notification triggers' }
  }
}

export async function saveNotificationTriggers(
  triggers: Array<{ event: string; enabled: boolean }>
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const supabase = await createClient()

    // Delete all existing triggers for this tenant
    await supabase.from('notification_triggers').delete().eq('tenant_id', tenant_id)

    // Insert enabled triggers
    const enabledTriggers = triggers.filter((t) => t.enabled)

    if (enabledTriggers.length > 0) {
      const { error } = await supabase.from('notification_triggers').insert(
        enabledTriggers.map((t) => ({
          tenant_id,
          event: t.event,
          enabled: t.enabled,
        }))
      )

      if (error) throw error
    }

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'notification_triggers',
      entity_id: tenant_id,
      action: 'update',
      diff: { after: triggers },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save notification triggers' }
  }
}
