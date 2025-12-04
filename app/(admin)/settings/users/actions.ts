'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  inviteUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateUserPermissionsSchema,
  deleteUserSchema,
  type InviteUserInput,
  type UpdateUserRoleInput,
  type UpdateUserStatusInput,
  type UpdateUserPermissionsInput,
  type DeleteUserInput,
} from '@/lib/validation/settings'
import { getAuthContext, logActivity } from '@/lib/server/activity-log'

export async function getUsers() {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, status, last_login_at, created_at')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getUsers error:', error)
    return { success: false, error: error.message || 'Failed to fetch users' }
  }
}

export async function inviteUser(input: InviteUserInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = inviteUserSchema.parse(input)

    const supabase = await createClient()

    // Send Supabase Auth invite (magic link)
    // Note: This uses admin API which requires service role key
    // For now, we'll create the user record and mark as pending
    // In production, you'd use: supabase.auth.admin.inviteUserByEmail(...)

    const { data, error } = await supabase
      .from('users')
      .insert({
        tenant_id,
        name: validated.name,
        email: validated.email,
        role: validated.role,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'user',
      entity_id: data.id,
      action: 'invite',
      diff: { after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('inviteUser error:', error)
    return { success: false, error: error.message || 'Failed to invite user' }
  }
}

export async function updateUserRole(input: UpdateUserRoleInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = updateUserRoleSchema.parse(input)

    const supabase = await createClient()

    const { data: before } = await supabase
      .from('users')
      .select('*')
      .eq('id', validated.userId)
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('users')
      .update({ role: validated.role })
      .eq('id', validated.userId)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'user',
      entity_id: data.id,
      action: 'update',
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('updateUserRole error:', error)
    return { success: false, error: error.message || 'Failed to update user role' }
  }
}

export async function updateUserStatus(input: UpdateUserStatusInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = updateUserStatusSchema.parse(input)

    const supabase = await createClient()

    const { data: before } = await supabase
      .from('users')
      .select('*')
      .eq('id', validated.userId)
      .eq('tenant_id', tenant_id)
      .single()

    const { data, error } = await supabase
      .from('users')
      .update({ status: validated.status })
      .eq('id', validated.userId)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) throw error

    const action = validated.status === 'disabled' ? 'deactivate' : validated.status === 'active' ? 'reactivate' : 'update'

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'user',
      entity_id: data.id,
      action,
      diff: { before, after: data },
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('updateUserStatus error:', error)
    return { success: false, error: error.message || 'Failed to update user status' }
  }
}

export async function updateUserPermissions(input: UpdateUserPermissionsInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = updateUserPermissionsSchema.parse(input)

    const supabase = await createClient()

    // Delete existing permissions
    await supabase
      .from('role_permissions')
      .delete()
      .eq('tenant_id', tenant_id)
      .eq('user_id', validated.userId)

    // Insert new permissions
    const permissionsToInsert = validated.permissions.map((perm) => ({
      tenant_id,
      user_id: validated.userId,
      ...perm,
    }))

    const { error } = await supabase.from('role_permissions').insert(permissionsToInsert)

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'role_permissions',
      entity_id: validated.userId,
      action: 'update',
      diff: { after: validated.permissions },
    })

    return { success: true }
  } catch (error: any) {
    console.error('updateUserPermissions error:', error)
    return { success: false, error: error.message || 'Failed to update permissions' }
  }
}

export async function getUserPermissions(userId: string) {
  try {
    const { tenant_id } = await getAuthContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getUserPermissions error:', error)
    return { success: false, error: error.message || 'Failed to fetch permissions' }
  }
}

export async function deleteUser(input: DeleteUserInput) {
  try {
    const { tenant_id, user_id } = await getAuthContext()
    const validated = deleteUserSchema.parse(input)

    const supabase = await createClient()

    // Fetch user to verify and for logging
    const { data: userToDelete } = await supabase
      .from('users')
      .select('*')
      .eq('id', validated.userId)
      .eq('tenant_id', tenant_id)
      .single()

    if (!userToDelete) {
      throw new Error('User not found')
    }

    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', validated.userId)
      .eq('tenant_id', tenant_id)

    if (error) throw error

    await logActivity({
      tenant_id,
      actor_user_id: user_id,
      entity: 'user',
      entity_id: validated.userId,
      action: 'delete',
      diff: { before: userToDelete },
    })

    return { success: true }
  } catch (error: any) {
    console.error('deleteUser error:', error)
    return { success: false, error: error.message || 'Failed to delete user' }
  }
}
