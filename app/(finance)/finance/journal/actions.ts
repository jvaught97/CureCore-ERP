'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
  postJournalEntrySchema,
  reverseJournalEntrySchema,
  listJournalEntriesSchema,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
  type PostJournalEntryInput,
  type ReverseJournalEntryInput,
  type ListJournalEntriesInput,
} from '@/lib/validation/finance'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// Helper to get auth context
async function getAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { user_id: user.id, tenant_id: user.id }
}

// ─── CREATE JOURNAL ENTRY ────────────────────────────────────────────────────

export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = createJournalEntrySchema.parse(input)
    const supabase = await createClient()

    // Check if journal number exists
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('journal_number', validated.journal_number)
      .single()

    if (existing) {
      return { success: false, error: 'Journal number already exists' }
    }

    // Create journal entry header
    const { data: journal, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id,
        journal_number: validated.journal_number,
        date: validated.date,
        memo: validated.memo || null,
        status: 'draft',
        created_by: user_id,
      })
      .select()
      .single()

    if (journalError) throw journalError

    // Create journal entry lines
    const lines = validated.lines.map((line, index) => ({
      tenant_id,
      journal_id: journal.id,
      account_id: line.account_id,
      description: line.description || null,
      debit: line.debit,
      credit: line.credit,
      department_id: line.department_id || null,
      reference_type: line.reference_type || null,
      reference_id: line.reference_id || null,
      sort_order: line.sort_order || index,
    }))

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines)

    if (linesError) throw linesError

    return { success: true, data: { id: journal.id } }
  } catch (err: any) {
    console.error('createJournalEntry error:', err)
    return { success: false, error: err.message || 'Failed to create journal entry' }
  }
}

// ─── UPDATE JOURNAL ENTRY ────────────────────────────────────────────────────

export async function updateJournalEntry(
  input: UpdateJournalEntryInput
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = updateJournalEntrySchema.parse(input)
    const supabase = await createClient()

    // Fetch existing journal entry
    const { data: existing, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(*)')
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Journal entry not found' }
    }

    // Only allow updates to draft entries
    if (existing.status !== 'draft') {
      return { success: false, error: 'Only draft journal entries can be updated' }
    }

    // Update journal entry header
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (validated.journal_number) updateData.journal_number = validated.journal_number
    if (validated.date) updateData.date = validated.date
    if (validated.memo !== undefined) updateData.memo = validated.memo

    const { data: journal, error: journalError } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (journalError) throw journalError

    // Update lines if provided
    if (validated.lines) {
      // Delete existing lines
      const { error: deleteError } = await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_id', validated.id)
        .eq('tenant_id', tenant_id)

      if (deleteError) throw deleteError

      // Insert new lines
      const lines = validated.lines.map((line, index) => ({
        tenant_id,
        journal_id: validated.id,
        account_id: line.account_id,
        description: line.description || null,
        debit: line.debit,
        credit: line.credit,
        department_id: line.department_id || null,
        reference_type: line.reference_type || null,
        reference_id: line.reference_id || null,
        sort_order: line.sort_order || index,
      }))

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines)

      if (linesError) throw linesError
    }

    return { success: true }
  } catch (err: any) {
    console.error('updateJournalEntry error:', err)
    return { success: false, error: err.message || 'Failed to update journal entry' }
  }
}

// ─── POST JOURNAL ENTRY ──────────────────────────────────────────────────────

export async function postJournalEntry(
  input: PostJournalEntryInput
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = postJournalEntrySchema.parse(input)
    const supabase = await createClient()

    // Fetch journal entry with lines
    const { data: journal, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(*)')
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (fetchError || !journal) {
      return { success: false, error: 'Journal entry not found' }
    }

    // Verify status is draft
    if (journal.status !== 'draft') {
      return { success: false, error: 'Only draft journal entries can be posted' }
    }

    // Validate debits = credits
    const totalDebit = journal.journal_entry_lines.reduce(
      (sum: number, line: any) => sum + parseFloat(line.debit),
      0
    )
    const totalCredit = journal.journal_entry_lines.reduce(
      (sum: number, line: any) => sum + parseFloat(line.credit),
      0
    )

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      return { success: false, error: 'Total debits must equal total credits' }
    }

    // Update status to posted
    const { data: posted, error: updateError } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('postJournalEntry error:', err)
    return { success: false, error: err.message || 'Failed to post journal entry' }
  }
}

// ─── REVERSE JOURNAL ENTRY ───────────────────────────────────────────────────

export async function reverseJournalEntry(
  input: ReverseJournalEntryInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = reverseJournalEntrySchema.parse(input)
    const supabase = await createClient()

    // Fetch original journal entry with lines
    const { data: original, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(*)')
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (fetchError || !original) {
      return { success: false, error: 'Journal entry not found' }
    }

    // Verify status is posted
    if (original.status !== 'posted') {
      return { success: false, error: 'Only posted journal entries can be reversed' }
    }

    // Generate reverse journal number
    const reverseNumber = `${original.journal_number}-REV`

    // Check if already reversed
    const { data: existingReverse } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('journal_number', reverseNumber)
      .single()

    if (existingReverse) {
      return { success: false, error: 'This journal entry has already been reversed' }
    }

    // Create reverse journal entry header
    const { data: reverseJournal, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id,
        journal_number: reverseNumber,
        date: validated.date,
        memo: validated.memo || `Reversal of ${original.journal_number}`,
        status: 'posted',
        reversed_from: validated.id,
        created_by: user_id,
        posted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (journalError) throw journalError

    // Create reverse lines (flip debit/credit)
    const reverseLines = original.journal_entry_lines.map((line: any, index: number) => ({
      tenant_id,
      journal_id: reverseJournal.id,
      account_id: line.account_id,
      description: line.description ? `Reversal: ${line.description}` : 'Reversal',
      debit: line.credit, // Flip
      credit: line.debit, // Flip
      department_id: line.department_id,
      reference_type: line.reference_type,
      reference_id: line.reference_id,
      sort_order: index,
    }))

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(reverseLines)

    if (linesError) throw linesError

    // Update original to reversed status
    await supabase
      .from('journal_entries')
      .update({
        status: 'reversed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenant_id)

    return { success: true, data: { id: reverseJournal.id } }
  } catch (err: any) {
    console.error('reverseJournalEntry error:', err)
    return { success: false, error: err.message || 'Failed to reverse journal entry' }
  }
}

// ─── DELETE JOURNAL ENTRY ────────────────────────────────────────────────────

export async function deleteJournalEntry(id: string): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const supabase = await createClient()

    // Fetch existing journal entry
    const { data: existing, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Journal entry not found' }
    }

    // Only allow deletion of draft entries
    if (existing.status !== 'draft') {
      return { success: false, error: 'Only draft journal entries can be deleted' }
    }

    // Delete journal entry (lines will cascade)
    const { error: deleteError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    if (deleteError) throw deleteError

    return { success: true }
  } catch (err: any) {
    console.error('deleteJournalEntry error:', err)
    return { success: false, error: err.message || 'Failed to delete journal entry' }
  }
}

// ─── LIST JOURNAL ENTRIES ────────────────────────────────────────────────────

export async function listJournalEntries(
  input: ListJournalEntriesInput
): Promise<ActionResult<{ entries: any[]; total: number }>> {
  try {
    const { tenant_id } = await getAuth()
    const validated = listJournalEntriesSchema.parse(input)
    const supabase = await createClient()

    let query = supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(debit, credit)', {
        count: 'exact',
      })
      .eq('tenant_id', tenant_id)

    // Apply filters
    if (validated.search) {
      query = query.or(
        `journal_number.ilike.%${validated.search}%,memo.ilike.%${validated.search}%`
      )
    }

    if (validated.status) {
      query = query.eq('status', validated.status)
    }

    if (validated.dateFrom) {
      query = query.gte('date', validated.dateFrom)
    }

    if (validated.dateTo) {
      query = query.lte('date', validated.dateTo)
    }

    // Pagination
    const from = (validated.page - 1) * validated.limit
    const to = from + validated.limit - 1

    query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    // Calculate totals for each entry
    const entries = (data || []).map((entry: any) => {
      const totalDebit = entry.journal_entry_lines.reduce(
        (sum: number, line: any) => sum + parseFloat(line.debit || 0),
        0
      )
      const totalCredit = entry.journal_entry_lines.reduce(
        (sum: number, line: any) => sum + parseFloat(line.credit || 0),
        0
      )

      return {
        ...entry,
        total_debit: totalDebit,
        total_credit: totalCredit,
      }
    })

    return {
      success: true,
      data: {
        entries,
        total: count || 0,
      },
    }
  } catch (err: any) {
    console.error('listJournalEntries error:', err)
    return { success: false, error: err.message || 'Failed to list journal entries' }
  }
}

// ─── GET JOURNAL ENTRY ───────────────────────────────────────────────────────

export async function getJournalEntry(id: string): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(*, account:chart_of_accounts(code, name))')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    console.error('getJournalEntry error:', err)
    return { success: false, error: err.message || 'Failed to fetch journal entry' }
  }
}

// ─── GET CHART OF ACCOUNTS ───────────────────────────────────────────────────

export async function getChartOfAccounts(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('code')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getChartOfAccounts error:', err)
    return { success: false, error: err.message || 'Failed to fetch chart of accounts' }
  }
}
