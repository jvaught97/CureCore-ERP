'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  JournalEntryWithLines,
  JournalEntryStatus,
  CreateJournalEntryInput,
  GeneralLedgerEntry,
} from '@/types/accounting'

export async function fetchJournalEntries(filters?: {
  status?: JournalEntryStatus
  start_date?: string
  end_date?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('journal_entries')
    .select(`
      id,
      journal_number,
      date,
      memo,
      status,
      posted_at,
      reversed_from,
      created_by,
      created_at,
      updated_at,
      lines:journal_entry_lines(
        id,
        journal_id,
        account_id,
        description,
        debit,
        credit,
        department_id,
        reference_type,
        reference_id,
        sort_order,
        created_at,
        account:chart_of_accounts(
          id,
          code,
          name,
          type,
          parent_id,
          is_active,
          created_at,
          updated_at
        )
      )
    `)
    .order('date', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.start_date) {
    query = query.gte('date', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('date', filters.end_date)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map((entry: any) => ({
    id: entry.id,
    entry_number: entry.journal_number,
    entry_date: entry.date,
    description: entry.memo ?? '',
    reference_type: undefined,
    reference_id: undefined,
    status: entry.status,
    posted_at: entry.posted_at ?? undefined,
    voided_at: entry.status === 'reversed' ? entry.updated_at : undefined,
    created_by: entry.created_by ?? undefined,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    lines: (entry.lines ?? []).map((line: any, index: number) => ({
      id: line.id,
      journal_entry_id: line.journal_id,
      line_number: (line.sort_order ?? index) + 1,
      account_id: line.account_id,
      debit: Number(line.debit ?? 0),
      credit: Number(line.credit ?? 0),
      memo: line.description ?? undefined,
      created_at: line.created_at,
      account: line.account
        ? {
            id: line.account.id,
            code: line.account.code,
            name: line.account.name,
            account_type: line.account.type,
            parent_id: line.account.parent_id ?? undefined,
            is_active: line.account.is_active,
            is_system_account: false,
            created_at: line.account.created_at,
            updated_at: line.account.updated_at,
          }
        : undefined,
    })),
  })) as JournalEntryWithLines[]
}

export async function fetchJournalEntryById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      id,
      journal_number,
      date,
      memo,
      status,
      posted_at,
      reversed_from,
      created_by,
      created_at,
      updated_at,
      lines:journal_entry_lines(
        id,
        journal_id,
        account_id,
        description,
        debit,
        credit,
        department_id,
        reference_type,
        reference_id,
        sort_order,
        created_at,
        account:chart_of_accounts(
          id,
          code,
          name,
          type,
          parent_id,
          is_active,
          created_at,
          updated_at
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return {
    id: data.id,
    entry_number: data.journal_number,
    entry_date: data.date,
    description: data.memo ?? '',
    reference_type: undefined,
    reference_id: undefined,
    status: data.status,
    posted_at: data.posted_at ?? undefined,
    voided_at: data.status === 'reversed' ? data.updated_at : undefined,
    created_by: data.created_by ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
    lines: (data.lines ?? []).map((line: any, index: number) => ({
      id: line.id,
      journal_entry_id: line.journal_id,
      line_number: (line.sort_order ?? index) + 1,
      account_id: line.account_id,
      debit: Number(line.debit ?? 0),
      credit: Number(line.credit ?? 0),
      memo: line.description ?? undefined,
      created_at: line.created_at,
      account: line.account
        ? {
            id: line.account.id,
            code: line.account.code,
            name: line.account.name,
            account_type: line.account.type,
            parent_id: line.account.parent_id ?? undefined,
            is_active: line.account.is_active,
            is_system_account: false,
            created_at: line.account.created_at,
            updated_at: line.account.updated_at,
          }
        : undefined,
    })),
  } as JournalEntryWithLines
}

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const tenantId = user.id

  // Generate a human-readable journal number
  const year = new Date().getFullYear()
  let journalNumber = `JE-${year}-${String(Date.now()).slice(-6)}`

  // Ensure uniqueness within tenant scope
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('journal_number', journalNumber)
      .single()
    if (!existing) break
    attempts += 1
    journalNumber = `JE-${year}-${(Math.floor(Math.random() * 1_000_000))
      .toString()
      .padStart(6, '0')}`
  }

  // Validate that debits = credits
  const totalDebits = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredits = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Journal entry does not balance: Debits = ${totalDebits}, Credits = ${totalCredits}`)
  }

  // Create journal entry
  const { data: journalEntry, error: jeError } = await supabase
    .from('journal_entries')
    .insert({
      tenant_id: tenantId,
      journal_number: journalNumber,
      date: input.entry_date,
      memo: input.description,
      status: 'draft',
      created_by: tenantId,
    })
    .select()
    .single()

  if (jeError) throw jeError

  // Create journal entry lines
  const lines = input.lines.map((line, index) => ({
    tenant_id: tenantId,
    journal_id: journalEntry.id,
    account_id: line.account_id,
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.memo,
    department_id: null,
    reference_type: input.reference_type ?? null,
    reference_id: input.reference_id ?? null,
    sort_order: index,
    created_by: tenantId,
  }))

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(lines)

  if (linesError) throw linesError

  return await fetchJournalEntryById(journalEntry.id)
}

export async function postJournalEntry(id: string): Promise<JournalEntryWithLines> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('journal_entries')
    .update({
      status: 'posted',
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
  return await fetchJournalEntryById(id)
}

export async function voidJournalEntry(id: string): Promise<JournalEntryWithLines> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('journal_entries')
    .update({
      status: 'reversed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
  return await fetchJournalEntryById(id)
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient()

  // Only allow deletion of draft entries
  const { data: entry } = await supabase
    .from('journal_entries')
    .select('status')
    .eq('id', id)
    .single()

  if (entry?.status !== 'draft') {
    throw new Error('Can only delete draft journal entries')
  }

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}

export async function fetchGeneralLedger(filters?: {
  account_id?: string
  start_date?: string
  end_date?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('general_ledger')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })

  if (filters?.account_id) {
    query = query.eq('account_id', filters.account_id)
  }

  if (filters?.start_date) {
    query = query.gte('entry_date', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('entry_date', filters.end_date)
  }

  const { data, error } = await query

  if (error) throw error
  return data as GeneralLedgerEntry[]
}
