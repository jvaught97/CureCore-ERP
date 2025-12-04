'use server'

import { createClient } from '@/app/utils/supabase/server'
import { Account, AccountType, AccountSubtype } from '@/types/accounting'

export async function fetchAccounts(filters?: {
  account_type?: AccountType
  is_active?: boolean
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('chart_of_accounts')
    .select('id, code, name, type, parent_id, is_active, created_at, updated_at')
    .order('code', { ascending: true })

  if (filters?.account_type) {
    query = query.eq('type', filters.account_type)
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.search) {
    query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    account_type: row.type,
    account_subtype: undefined,
    parent_id: row.parent_id ?? undefined,
    description: undefined,
    is_active: row.is_active,
    is_system_account: false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Account[]
}

export async function fetchAccountById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, type, parent_id, is_active, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    account_type: data.type,
    account_subtype: undefined,
    parent_id: data.parent_id ?? undefined,
    description: undefined,
    is_active: data.is_active,
    is_system_account: false,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Account
}

export async function fetchAccountBalances() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('account_balances')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data
}

export async function createAccount(account: {
  code: string
  name: string
  account_type: AccountType
  account_subtype?: AccountSubtype
  parent_id?: string
  description?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const payload = {
    tenant_id: user.id,
    code: account.code,
    name: account.name,
    type: account.account_type,
    parent_id: account.parent_id ?? null,
    is_active: true,
    created_by: user.id,
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert(payload)
    .select('id, code, name, type, parent_id, is_active, created_at, updated_at')
    .single()

  if (error) throw error
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    account_type: data.type,
    account_subtype: undefined,
    parent_id: data.parent_id ?? undefined,
    description: undefined,
    is_active: data.is_active,
    is_system_account: false,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Account
}

export async function updateAccount(id: string, updates: Partial<Account>) {
  const supabase = await createClient()

  const patch: Record<string, unknown> = {}
  if (updates.code !== undefined) patch.code = updates.code
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.account_type !== undefined) patch.type = updates.account_type
  if (updates.parent_id !== undefined) patch.parent_id = updates.parent_id ?? null
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.is_active !== undefined) patch.is_active = updates.is_active

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update(patch)
    .eq('id', id)
    .select('id, code, name, type, parent_id, is_active, created_at, updated_at')
    .single()

  if (error) throw error
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    account_type: data.type,
    account_subtype: undefined,
    parent_id: data.parent_id ?? undefined,
    description: undefined,
    is_active: data.is_active,
    is_system_account: false,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Account
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()

  // Check if account is a system account
  const { data: account } = await supabase
    .from('chart_of_accounts')
    .select('id, code, type')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}

export async function toggleAccountActive(id: string, is_active: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update({ is_active })
    .eq('id', id)
    .select('id, code, name, type, parent_id, is_active, created_at, updated_at')
    .single()

  if (error) throw error
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    account_type: data.type,
    account_subtype: undefined,
    parent_id: data.parent_id ?? undefined,
    description: undefined,
    is_active: data.is_active,
    is_system_account: false,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Account
}
