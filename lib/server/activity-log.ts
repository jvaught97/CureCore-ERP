import { createClient } from '@/app/utils/supabase/server'

type ActivityLogEntry = {
  tenant_id: string
  actor_user_id: string
  entity: string
  entity_id?: string
  action: 'create' | 'update' | 'delete' | 'invite' | 'deactivate' | 'reactivate'
  diff?: {
    before?: any
    after?: any
  }
}

export async function logActivity(entry: ActivityLogEntry) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('activity_log')
    .insert({
      tenant_id: entry.tenant_id,
      actor_user_id: entry.actor_user_id,
      entity: entry.entity,
      entity_id: entry.entity_id,
      action: entry.action,
      diff: entry.diff,
    })

  if (error) {
    console.error('Failed to log activity:', error)
  }
}

export async function getAuthContext() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  // Fetch user profile with tenant_id and role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  if (profile.role?.toLowerCase() !== 'admin') {
    throw new Error('Admin access required')
  }

  return {
    user,
    profile,
    tenant_id: profile.tenant_id,
    user_id: profile.id,
  }
}
