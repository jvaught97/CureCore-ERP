'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  bankAdjustmentSchema,
  createBankStatementSchema,
  createReconciliationSchema,
  finalizeReconciliationSchema,
  getReconciliationSchema,
  manualMatchSchema,
  markClearedSchema,
  recalcReconciliationSchema,
  smartMatchSchema,
  type BankAdjustmentInput,
  type CreateBankStatementInput,
  type CreateReconciliationInput,
  type FinalizeReconciliationInput,
  type GetReconciliationInput,
  type ManualMatchInput,
  type MarkClearedInput,
  type ListReconciliationsInput,
  type RecalcReconciliationInput,
  type SmartMatchInput,
  listReconciliationsSchema,
} from '@/lib/validation/finance'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { BankLedgerEntryType } from '@/types/accounting'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

type Role = 'admin' | 'finance' | 'ops' | 'sales'

const MATCH_TOLERANCE = 0.01
const DATE_TOLERANCE_DAYS = 3

type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  tenantId: string
  role: Role
}

type LedgerCandidate = {
  id: string
  type: BankLedgerEntryType
  amount: number
  date: string
  description: string
  reference?: string
}

// ─── AUTH HELPERS ────────────────────────────────────────────────────────────

async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role?.toLowerCase() ?? 'ops') as Role

  return {
    supabase,
    userId: user.id,
    tenantId: user.id,
    role,
  }
}

function hasFinanceAccess(role: Role) {
  return role === 'admin' || role === 'finance'
}

// ─── LOGGING ─────────────────────────────────────────────────────────────────

async function logActivity(
  ctx: AuthContext,
  entity: string,
  entityId: string | null,
  action: string,
  before: unknown,
  after: unknown
) {
  try {
    await ctx.supabase.from('activity_log').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      entity,
      entity_id: entityId,
      action,
      diff: { before, after },
    })
  } catch (error) {
    console.error('Failed to write activity log', error)
  }
}

// ─── BANK ACCOUNTS ───────────────────────────────────────────────────────────

export async function listBankAccounts(): Promise<ActionResult<{ accounts: any[] }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const { data, error } = await ctx.supabase
      .from('bank_accounts')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return { success: true, data: { accounts: data ?? [] } }
  } catch (err: any) {
    console.error('listBankAccounts error:', err)
    return { success: false, error: err.message ?? 'Failed to load bank accounts' }
  }
}

export async function listReconciliations(
  input?: ListReconciliationsInput
): Promise<ActionResult<{ reconciliations: any[]; summary: { draft: number; finalized: number } }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = listReconciliationsSchema.parse(input ?? {})

    let query = ctx.supabase
      .from('bank_reconciliations')
      .select(
        `id, status, difference, ending_balance_per_bank, ending_balance_per_books,
         bank_account_id, statement_id, created_at, reconciled_at, reconciled_by,
         bank_accounts(name), bank_statements(start_date, end_date)`
      )
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (validated.bankAccountId) {
      query = query.eq('bank_account_id', validated.bankAccountId)
    }

    if (validated.status) {
      query = query.eq('status', validated.status)
    }

    if (validated.dateFrom) {
      query = query.gte('created_at', `${validated.dateFrom}T00:00:00Z`)
    }

    if (validated.dateTo) {
      query = query.lte('created_at', `${validated.dateTo}T23:59:59Z`)
    }

    const { data, error } = await query
    if (error) throw error

    const reconciliations = data ?? []

    const summary = reconciliations.reduce(
      (acc, item) => {
        if (item.status === 'draft') acc.draft += 1
        if (item.status === 'finalized') acc.finalized += 1
        return acc
      },
      { draft: 0, finalized: 0 }
    )

    return { success: true, data: { reconciliations, summary } }
  } catch (err: any) {
    console.error('listReconciliations error:', err)
    return { success: false, error: err.message ?? 'Failed to load reconciliations' }
  }
}

export async function getReconciliationDetail(
  input: GetReconciliationInput
): Promise<ActionResult<{ reconciliation: any; statementLines: any[]; matches: any[]; ledgerCandidates: LedgerCandidate[]; outstanding: { depositsInTransit: number; outstandingChecks: number } }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = getReconciliationSchema.parse(input)

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select(
        `id, status, difference, ending_balance_per_bank, ending_balance_per_books,
         bank_account_id, statement_id, reconciled_at, reconciled_by, created_at,
         bank_accounts(name), bank_statements(start_date, end_date, starting_balance, ending_balance)`
      )
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    const { data: statementLines, error: linesError } = await ctx.supabase
      .from('bank_statement_lines')
      .select('id, date, amount, description, type, reference, cleared, note, matched_ledger_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('statement_id', reconciliation.statement_id)
      .order('date', { ascending: true })

    if (linesError) throw linesError

    const { data: matches, error: matchError } = await ctx.supabase
      .from('bank_reconciliation_lines')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('reconciliation_id', reconciliation.id)

    if (matchError) throw matchError

    const ledgerCandidates = await getLedgerCandidates(ctx, reconciliation.bank_account_id)
    const outstanding = calculateOutstanding(statementLines ?? [])

    return {
      success: true,
      data: {
        reconciliation,
        statementLines: statementLines ?? [],
        matches: matches ?? [],
        ledgerCandidates,
        outstanding,
      },
    }
  } catch (err: any) {
    console.error('getReconciliationDetail error:', err)
    return { success: false, error: err.message ?? 'Failed to load reconciliation' }
  }
}

// ─── STATEMENTS ──────────────────────────────────────────────────────────────

export async function createStatement(
  input: CreateBankStatementInput
): Promise<ActionResult<{ statementId: string }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = createBankStatementSchema.parse(input)

    const { data: statement, error } = await ctx.supabase
      .from('bank_statements')
      .insert({
        tenant_id: ctx.tenantId,
        bank_account_id: validated.bankAccountId,
        start_date: validated.startDate,
        end_date: validated.endDate,
        starting_balance: validated.startingBalance,
        ending_balance: validated.endingBalance,
        imported_by: ctx.userId,
      })
      .select()
      .single()

    if (error) throw error

    await logActivity(ctx, 'bank_statement', statement.id, 'create', null, statement)

    return { success: true, data: { statementId: statement.id } }
  } catch (err: any) {
    console.error('createStatement error:', err)
    return { success: false, error: err.message ?? 'Failed to create bank statement' }
  }
}

export async function importStatementCSV(
  statementId: string,
  file: File
): Promise<ActionResult<{ inserted: number }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) {
      return { success: false, error: 'No statement rows detected in file' }
    }

    const { data: statement, error: statementError } = await ctx.supabase
      .from('bank_statements')
      .select('id, tenant_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', statementId)
      .single()

    if (statementError || !statement) {
      throw statementError ?? new Error('Statement not found')
    }

    const existing = await ctx.supabase
      .from('bank_statement_lines')
      .select('id, date, amount, reference, description')
      .eq('statement_id', statementId)

    const existingRows = existing.data ?? []

    const toInsert = rows
      .map((row) => ({
        tenant_id: ctx.tenantId,
        statement_id: statementId,
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        reference: row.reference,
        cleared: false,
      }))
      .filter((row) => {
        return !existingRows.some((ex) => {
          return (
            ex.date === row.date &&
            Math.abs(Number(ex.amount) - Number(row.amount)) < MATCH_TOLERANCE &&
            (ex.reference ?? '').toLowerCase() === (row.reference ?? '').toLowerCase() &&
            (ex.description ?? '').toLowerCase() === (row.description ?? '').toLowerCase()
          )
        })
      })

    if (toInsert.length === 0) {
      return { success: true, data: { inserted: 0 } }
    }

    const { error: insertError } = await ctx.supabase
      .from('bank_statement_lines')
      .insert(toInsert)

    if (insertError) throw insertError

    await logActivity(
      ctx,
      'bank_statement',
      statementId,
      'import_lines',
      null,
      { count: toInsert.length }
    )

    return { success: true, data: { inserted: toInsert.length } }
  } catch (err: any) {
    console.error('importStatementCSV error:', err)
    return { success: false, error: err.message ?? 'Failed to import statement file' }
  }
}

// ─── RECONCILIATIONS ────────────────────────────────────────────────────────

export async function createReconciliation(
  input: CreateReconciliationInput
): Promise<ActionResult<{ reconciliationId: string }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = createReconciliationSchema.parse(input)

    const { data: statement, error: statementError } = await ctx.supabase
      .from('bank_statements')
      .select('id, bank_account_id, end_date, ending_balance')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.statementId)
      .single()

    if (statementError || !statement) {
      throw statementError ?? new Error('Statement not found')
    }

    const existing = await ctx.supabase
      .from('bank_reconciliations')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('statement_id', validated.statementId)
      .maybeSingle()

    if (existing.data?.id) {
      return {
        success: true,
        data: { reconciliationId: existing.data.id },
      }
    }

    const booksBalance = await getBooksCashBalance(
      ctx,
      statement.bank_account_id,
      statement.end_date
    )

    const { data: reconciliation, error: insertError } = await ctx.supabase
      .from('bank_reconciliations')
      .insert({
        tenant_id: ctx.tenantId,
        bank_account_id: statement.bank_account_id,
        statement_id: statement.id,
        ending_balance_per_bank: statement.ending_balance,
        ending_balance_per_books: booksBalance,
        difference: Number((booksBalance - statement.ending_balance).toFixed(2)),
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) throw insertError

    await logActivity(ctx, 'bank_reconciliation', reconciliation.id, 'create', null, reconciliation)

    return { success: true, data: { reconciliationId: reconciliation.id } }
  } catch (err: any) {
    console.error('createReconciliation error:', err)
    return { success: false, error: err.message ?? 'Failed to create reconciliation' }
  }
}

export async function smartMatch(input: SmartMatchInput): Promise<ActionResult<{ matches: number }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = smartMatchSchema.parse(input)

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select(
        'id, status, bank_account_id, statement_id, ending_balance_per_bank, ending_balance_per_books'
      )
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    if (reconciliation.status !== 'draft') {
      return { success: false, error: 'Reconciliation is locked' }
    }

    const { data: statementLines, error: linesError } = await ctx.supabase
      .from('bank_statement_lines')
      .select('id, date, amount, description, reference, cleared')
      .eq('tenant_id', ctx.tenantId)
      .eq('statement_id', reconciliation.statement_id)

    if (linesError) throw linesError

    const { data: matchesData, error: matchesError } = await ctx.supabase
      .from('bank_reconciliation_lines')
      .select('ledger_entry_id, ledger_entry_type, statement_line_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('reconciliation_id', reconciliation.id)

    if (matchesError) throw matchesError

    const matchedLedger = new Set(
      (matchesData ?? []).map((row) => `${row.ledger_entry_type}:${row.ledger_entry_id}`)
    )

    const matchedStatements = new Set(
      (matchesData ?? [])
        .map((row) => row.statement_line_id)
        .filter((id): id is string => Boolean(id))
    )

    const candidates = await getLedgerCandidates(ctx, reconciliation.bank_account_id)

    const statementsToMatch = (statementLines ?? []).filter(
      (line) => !matchedStatements.has(line.id)
    )

    const newMatches: {
      tenant_id: string
      reconciliation_id: string
      statement_line_id: string
      ledger_entry_id: string
      ledger_entry_type: BankLedgerEntryType
      matched_by: string
      auto_matched: boolean
    }[] = []

    const updates: Promise<any>[] = []

    for (const line of statementsToMatch) {
      const bestCandidate = findBestMatch(line, candidates, matchedLedger)
      if (!bestCandidate) continue

      matchedLedger.add(`${bestCandidate.type}:${bestCandidate.id}`)
      matchedStatements.add(line.id)

      newMatches.push({
        tenant_id: ctx.tenantId,
        reconciliation_id: reconciliation.id,
        statement_line_id: line.id,
        ledger_entry_id: bestCandidate.id,
        ledger_entry_type: bestCandidate.type,
        matched_by: ctx.userId,
        auto_matched: true,
      })

      updates.push(
        Promise.resolve(
          ctx.supabase
            .from('bank_statement_lines')
            .update({
              cleared: true,
              matched_ledger_id: bestCandidate.id,
            })
            .eq('id', line.id)
            .eq('tenant_id', ctx.tenantId)
            .then()
        )
      )
    }

    if (newMatches.length > 0) {
      const { error: insertError } = await ctx.supabase
        .from('bank_reconciliation_lines')
        .insert(newMatches)

      if (insertError) throw insertError

      await Promise.all(updates)
    }

    if (newMatches.length > 0) {
      await recalcReconciliation({ reconciliationId: reconciliation.id })
    }

    await logActivity(
      ctx,
      'bank_reconciliation',
      reconciliation.id,
      'smart_match',
      null,
      { matches: newMatches.length }
    )

    return { success: true, data: { matches: newMatches.length } }
  } catch (err: any) {
    console.error('smartMatch error:', err)
    return { success: false, error: err.message ?? 'Failed to smart match transactions' }
  }
}

export async function manualMatch(input: ManualMatchInput): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = manualMatchSchema.parse(input)

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select('id, status, bank_account_id, statement_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    if (reconciliation.status !== 'draft') {
      return { success: false, error: 'Reconciliation is locked' }
    }

    if (validated.action === 'unmatch') {
      const { error: deleteError } = await ctx.supabase
        .from('bank_reconciliation_lines')
        .delete()
        .eq('tenant_id', ctx.tenantId)
        .eq('reconciliation_id', validated.reconciliationId)
        .eq('statement_line_id', validated.statementLineId)
        .eq('ledger_entry_id', validated.ledgerEntryId)
        .eq('ledger_entry_type', validated.ledgerEntryType)

      if (deleteError) throw deleteError

      await ctx.supabase
        .from('bank_statement_lines')
        .update({ cleared: false, matched_ledger_id: null })
        .eq('tenant_id', ctx.tenantId)
        .eq('id', validated.statementLineId)

      await logActivity(
        ctx,
        'bank_reconciliation',
        reconciliation.id,
        'manual_unmatch',
        { statementLineId: validated.statementLineId, ledgerEntryId: validated.ledgerEntryId },
        null
      )

      await recalcReconciliation({ reconciliationId: reconciliation.id })
      return { success: true }
    }

    const { data: existingMatch } = await ctx.supabase
      .from('bank_reconciliation_lines')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('reconciliation_id', validated.reconciliationId)
      .eq('statement_line_id', validated.statementLineId)
      .maybeSingle()

    if (existingMatch?.id) {
      return { success: false, error: 'Statement line already matched' }
    }

    const { error: insertError } = await ctx.supabase
      .from('bank_reconciliation_lines')
      .insert({
        tenant_id: ctx.tenantId,
        reconciliation_id: validated.reconciliationId,
        statement_line_id: validated.statementLineId,
        ledger_entry_id: validated.ledgerEntryId,
        ledger_entry_type: validated.ledgerEntryType,
        matched_by: ctx.userId,
        auto_matched: false,
      })

    if (insertError) throw insertError

    await ctx.supabase
      .from('bank_statement_lines')
      .update({ cleared: true, matched_ledger_id: validated.ledgerEntryId })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.statementLineId)

    await logActivity(
      ctx,
      'bank_reconciliation',
      reconciliation.id,
      'manual_match',
      null,
      validated
    )

    await recalcReconciliation({ reconciliationId: reconciliation.id })

    return { success: true }
  } catch (err: any) {
    console.error('manualMatch error:', err)
    return { success: false, error: err.message ?? 'Failed to update match' }
  }
}

export async function markCleared(input: MarkClearedInput): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = markClearedSchema.parse(input)

    const { data: statementLine, error: fetchError } = await ctx.supabase
      .from('bank_statement_lines')
      .select('statement_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.statementLineId)
      .single()

    if (fetchError || !statementLine) {
      throw fetchError ?? new Error('Statement line not found')
    }

    const { error } = await ctx.supabase
      .from('bank_statement_lines')
      .update({ cleared: validated.cleared })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.statementLineId)

    if (error) throw error

    await logActivity(
      ctx,
      'bank_statement_line',
      validated.statementLineId,
      'mark_cleared',
      null,
      { cleared: validated.cleared }
    )

    const { data: reconciliation } = await ctx.supabase
      .from('bank_reconciliations')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('statement_id', statementLine.statement_id)
      .maybeSingle()

    if (reconciliation?.id) {
      await recalcReconciliation({ reconciliationId: reconciliation.id })
    }

    return { success: true }
  } catch (err: any) {
    console.error('markCleared error:', err)
    return { success: false, error: err.message ?? 'Failed to update cleared flag' }
  }
}

export async function createBankAdjustmentJE(
  input: BankAdjustmentInput
): Promise<ActionResult<{ journalEntryId: string }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = bankAdjustmentSchema.parse(input)

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select('id, status, bank_account_id, statement_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    if (reconciliation.status !== 'draft') {
      return { success: false, error: 'Reconciliation is locked' }
    }

    const { data: bankAccount, error: bankError } = await ctx.supabase
      .from('bank_accounts')
      .select('id, gl_account_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', reconciliation.bank_account_id)
      .single()

    if (bankError || !bankAccount) {
      throw bankError ?? new Error('Bank account not found')
    }

    const adjustmentAccounts = await getAdjustmentAccounts(ctx)

    const isFee = validated.type === 'fee'
    const memo =
      validated.memo ??
      (isFee ? 'Bank service charge adjustment' : 'Bank interest income adjustment')

    const amount = Number(validated.amount.toFixed(2))
    const debitLine = isFee
      ? {
          account_id: adjustmentAccounts.feeAccountId,
          description: memo,
          debit: amount,
          credit: 0,
          sort_order: 0,
        }
      : {
          account_id: bankAccount.gl_account_id,
          description: memo,
          debit: amount,
          credit: 0,
          sort_order: 0,
        }

    const creditLine = isFee
      ? {
          account_id: bankAccount.gl_account_id,
          description: memo,
          debit: 0,
          credit: amount,
          sort_order: 1,
        }
      : {
          account_id: adjustmentAccounts.interestAccountId,
          description: memo,
          debit: 0,
          credit: amount,
          sort_order: 1,
        }

    const { data: journalEntry, error: insertError } = await ctx.supabase
      .from('journal_entries')
      .insert({
        tenant_id: ctx.tenantId,
        journal_number: await generateNextJournalNumber(ctx),
        date: validated.date,
        memo,
        status: 'posted',
        posted_at: validated.date,
        created_by: ctx.userId,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const linesPayload = [debitLine, creditLine].map((line) => ({
      tenant_id: ctx.tenantId,
      journal_id: journalEntry.id,
      account_id: line.account_id,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      sort_order: line.sort_order,
      created_by: ctx.userId,
    }))

    const { data: insertedLines, error: linesError } = await ctx.supabase
      .from('journal_entry_lines')
      .insert(linesPayload)
      .select('id, account_id, debit, credit')

    if (linesError) throw linesError

    const cashLine = (insertedLines ?? []).find(
      (line) => line.account_id === bankAccount.gl_account_id
    )

    if (cashLine) {
      const targetAmount = isFee ? -amount : amount

      const { data: candidateLines } = await ctx.supabase
        .from('bank_statement_lines')
        .select('id, amount, cleared, matched_ledger_id')
        .eq('tenant_id', ctx.tenantId)
        .eq('statement_id', reconciliation.statement_id)
        .is('matched_ledger_id', null)

      const matchCandidate = (candidateLines ?? []).find(
        (line) => Math.abs(Number(line.amount) - targetAmount) <= MATCH_TOLERANCE
      )

      if (matchCandidate) {
        await ctx.supabase
          .from('bank_reconciliation_lines')
          .insert({
            tenant_id: ctx.tenantId,
            reconciliation_id: reconciliation.id,
            statement_line_id: matchCandidate.id,
            ledger_entry_id: cashLine.id,
            ledger_entry_type: 'je_line',
            matched_by: ctx.userId,
            auto_matched: true,
          })

        await ctx.supabase
          .from('bank_statement_lines')
          .update({ cleared: true, matched_ledger_id: cashLine.id })
          .eq('id', matchCandidate.id)
          .eq('tenant_id', ctx.tenantId)
      }
    }

    await logActivity(
      ctx,
      'journal_entry',
      journalEntry.id,
      'create_bank_adjustment',
      null,
      { memo, amount, type: validated.type }
    )

    await recalcReconciliation({ reconciliationId: reconciliation.id })

    return { success: true, data: { journalEntryId: journalEntry.id } }
  } catch (err: any) {
    console.error('createBankAdjustmentJE error:', err)
    return { success: false, error: err.message ?? 'Failed to create bank adjustment' }
  }
}

export async function recalcReconciliation(
  input: RecalcReconciliationInput
): Promise<ActionResult<{ difference: number }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = recalcReconciliationSchema.parse(input)

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select('id, status, bank_account_id, statement_id, ending_balance_per_bank')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    const { data: statement, error: statementError } = await ctx.supabase
      .from('bank_statements')
      .select('end_date')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', reconciliation.statement_id)
      .single()

    if (statementError || !statement) {
      throw statementError ?? new Error('Statement not found')
    }

    const booksBalance = await getBooksCashBalance(
      ctx,
      reconciliation.bank_account_id,
      statement.end_date
    )

    const { data: unmatchedLines, error: unmatchedError } = await ctx.supabase
      .from('bank_statement_lines')
      .select('amount, cleared, statement_id, id')
      .eq('tenant_id', ctx.tenantId)
      .eq('statement_id', reconciliation.statement_id)

    if (unmatchedError) throw unmatchedError

    const outstanding = calculateOutstanding(unmatchedLines ?? [])

    const adjustedBank =
      reconciliation.ending_balance_per_bank +
      outstanding.depositsInTransit +
      outstanding.outstandingChecks

    const difference = Number((adjustedBank - booksBalance).toFixed(2))

    const { error: updateError } = await ctx.supabase
      .from('bank_reconciliations')
      .update({
        ending_balance_per_books: booksBalance,
        difference,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', reconciliation.id)

    if (updateError) throw updateError

    return { success: true, data: { difference } }
  } catch (err: any) {
    console.error('recalcReconciliation error:', err)
    return { success: false, error: err.message ?? 'Failed to recalc reconciliation' }
  }
}

export async function finalizeReconciliation(
  input: FinalizeReconciliationInput
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const validated = finalizeReconciliationSchema.parse(input)

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select('id, status, difference, bank_account_id, statement_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', validated.reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    if (reconciliation.status !== 'draft') {
      return { success: false, error: 'Reconciliation already finalized' }
    }

    if (Math.abs(reconciliation.difference) > 0.5) {
      return { success: false, error: 'Difference must be zero before finalizing' }
    }

    const { error: updateError } = await ctx.supabase
      .from('bank_reconciliations')
      .update({
        status: 'finalized',
        reconciled_by: ctx.userId,
        reconciled_at: new Date().toISOString(),
      })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', reconciliation.id)

    if (updateError) throw updateError

    await logActivity(
      ctx,
      'bank_reconciliation',
      reconciliation.id,
      'finalize',
      null,
      { difference: reconciliation.difference }
    )

    return { success: true }
  } catch (err: any) {
    console.error('finalizeReconciliation error:', err)
    return { success: false, error: err.message ?? 'Failed to finalize reconciliation' }
  }
}

export async function exportReconciliationPDF(
  reconciliationId: string
): Promise<ActionResult<{ dataUri: string }>> {
  try {
    const ctx = await getAuthContext()
    if (!hasFinanceAccess(ctx.role)) {
      return { success: false, error: 'Admins only' }
    }

    const { data: reconciliation, error: reconciliationError } = await ctx.supabase
      .from('bank_reconciliations')
      .select(
        `id, status, difference, ending_balance_per_bank, ending_balance_per_books,
         reconciled_at, reconciled_by, created_at,
         bank_account:bank_accounts(name),
         statement:bank_statements(start_date, end_date)`
      )
      .eq('tenant_id', ctx.tenantId)
      .eq('id', reconciliationId)
      .single()

    if (reconciliationError || !reconciliation) {
      throw reconciliationError ?? new Error('Reconciliation not found')
    }

    const pdf = await PDFDocument.create()
    const page = pdf.addPage([612, 792]) // Letter
    const font = await pdf.embedFont(StandardFonts.Helvetica)

    const drawText = (text: string, x: number, y: number, size = 12) => {
      page.drawText(text, { x, y, size, font })
    }

    let cursor = 750
    drawText('Bank Reconciliation Summary', 50, cursor, 18)
    cursor -= 30

    drawText(`Bank Account: ${Array.isArray(reconciliation.bank_account) ? reconciliation.bank_account[0]?.name : reconciliation.bank_account?.name ?? 'N/A'}`, 50, cursor)
    cursor -= 18
    drawText(
      `Statement Period: ${reconciliation.statement?.start_date ?? '—'} to ${
        reconciliation.statement?.end_date ?? '—'
      }`,
      50,
      cursor
    )
    cursor -= 18
    drawText(`Status: ${reconciliation.status}`, 50, cursor)
    cursor -= 18
    drawText(
      `Difference: ${reconciliation.difference.toFixed(2)}`,
      50,
      cursor
    )
    cursor -= 18
    drawText(
      `Ending Balance (Bank): ${reconciliation.ending_balance_per_bank.toFixed(2)}`,
      50,
      cursor
    )
    cursor -= 18
    drawText(
      `Ending Balance (Books): ${reconciliation.ending_balance_per_books.toFixed(2)}`,
      50,
      cursor
    )

    const dataUri = await pdf.saveAsBase64({ dataUri: true })

    return { success: true, data: { dataUri } }
  } catch (err: any) {
    console.error('exportReconciliationPDF error:', err)
    return { success: false, error: err.message ?? 'Failed to export reconciliation' }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getBooksCashBalance(
  ctx: AuthContext,
  glAccountId: string,
  asOfDate: string
): Promise<number> {
  const { data, error } = await ctx.supabase
    .from('journal_entry_lines')
    .select('debit, credit, journal_entries!inner(status, date)')
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', glAccountId)
    .eq('journal_entries.status', 'posted')
    .lte('journal_entries.date', asOfDate)

  if (error) {
    console.error('getBooksCashBalance error:', error)
    return 0
  }

  const total = (data ?? []).reduce((sum, line) => {
    return sum + Number(line.debit ?? 0) - Number(line.credit ?? 0)
  }, 0)

  return Number(total.toFixed(2))
}

async function getLedgerCandidates(
  ctx: AuthContext,
  glAccountId: string
): Promise<LedgerCandidate[]> {
  const candidates: LedgerCandidate[] = []

  const { data: journalLines, error: journalError } = await ctx.supabase
    .from('journal_entry_lines')
    .select('id, debit, credit, journal_entries!inner(journal_number, date, status, memo)')
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', glAccountId)
    .eq('journal_entries.status', 'posted')

  if (!journalError && journalLines) {
    for (const line of journalLines) {
      const amount = Number(line.debit ?? 0) - Number(line.credit ?? 0)
      if (!line.journal_entries) continue
      candidates.push({
        id: line.id,
        type: 'je_line',
        amount: Number(amount.toFixed(2)),
        date: line.journal_entries.date,
        description:
          line.journal_entries.memo ?? `Journal Entry ${line.journal_entries.journal_number}`,
        reference: line.journal_entries.journal_number ?? undefined,
      })
    }
  }

  const { data: arPayments, error: arError } = await ctx.supabase
    .from('ar_payments')
    .select('id, payment_date, amount, reference')
    .eq('tenant_id', ctx.tenantId)

  if (!arError && arPayments) {
    for (const payment of arPayments) {
      candidates.push({
        id: payment.id,
        type: 'ar_payment',
        amount: Number(payment.amount.toFixed(2)),
        date: payment.payment_date,
        description: 'Customer payment',
        reference: payment.reference ?? undefined,
      })
    }
  }

  const { data: apPayments, error: apError } = await ctx.supabase
    .from('ap_payments')
    .select('id, payment_date, amount, reference')
    .eq('tenant_id', ctx.tenantId)

  if (!apError && apPayments) {
    for (const payment of apPayments) {
      candidates.push({
        id: payment.id,
        type: 'ap_payment',
        amount: Number((-payment.amount).toFixed(2)),
        date: payment.payment_date,
        description: 'Vendor payment',
        reference: payment.reference ?? undefined,
      })
    }
  }

  return candidates
}

function findBestMatch(
  line: { amount: number; date: string },
  candidates: LedgerCandidate[],
  matched: Set<string>
) {
  const tolerance = MATCH_TOLERANCE

  let best: { candidate: LedgerCandidate; score: number } | null = null

  for (const candidate of candidates) {
    const key = `${candidate.type}:${candidate.id}`
    if (matched.has(key)) continue

    if (Math.abs(candidate.amount - Number(line.amount)) > tolerance) continue

    const dateScore = Math.abs(
      differenceInDays(candidate.date, line.date)
    )

    if (dateScore > DATE_TOLERANCE_DAYS) continue

    const score = dateScore
    if (!best || score < best.score) {
      best = { candidate, score }
    }
  }

  return best?.candidate
}

function differenceInDays(date1: string, date2: string) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.floor(Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)))
}

function calculateOutstanding(lines: { amount: number; cleared: boolean }[]) {
  const unmatched = lines.filter((line) => !line.cleared)

  const depositsInTransit = unmatched
    .filter((line) => line.amount > 0)
    .reduce((sum, line) => sum + Number(line.amount), 0)

  const outstandingChecks = unmatched
    .filter((line) => line.amount < 0)
    .reduce((sum, line) => sum + Number(line.amount), 0)

  return {
    depositsInTransit: Number(depositsInTransit.toFixed(2)),
    outstandingChecks: Number(outstandingChecks.toFixed(2)),
  }
}

async function getAdjustmentAccounts(ctx: AuthContext) {
  const { data, error } = await ctx.supabase
    .from('chart_of_accounts')
    .select('id, code')
    .eq('tenant_id', ctx.tenantId)
    .in('code', ['6100', '4100'])

  if (error) throw error

  const feeAccountId = data?.find((row) => row.code === '6100')?.id
  const interestAccountId = data?.find((row) => row.code === '4100')?.id

  if (!feeAccountId || !interestAccountId) {
    throw new Error('Configure bank fee and interest accounts in chart of accounts')
  }

  return { feeAccountId, interestAccountId }
}

async function generateNextJournalNumber(ctx: AuthContext) {
  const today = new Date()
  const year = today.getFullYear()

  const { data, error } = await ctx.supabase
    .from('journal_entries')
    .select('journal_number')
    .ilike('journal_number', `BR-${year}-%`)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    console.error('generateNextJournalNumber error:', error)
    return `BR-${year}-001`
  }

  const sequence = (data ?? [])
    .map((row) => {
      const match = row.journal_number?.match(/BR-\d{4}-(\d+)/)
      return match ? Number(match[1]) : 0
    })
    .reduce((max, current) => Math.max(max, current), 0) + 1

  return `BR-${year}-${String(sequence).padStart(3, '0')}`
}

function parseCsv(content: string) {
  const rows: {
    date: string
    description: string
    amount: number
    type?: string
    reference?: string
  }[] = []

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) return rows

  for (let i = 1; i < lines.length; i++) {
    const [date, description, amount, type, reference] = lines[i].split(',').map((value) => value.trim())
    if (!date || !amount) continue

    const parsedAmount = Number(amount)
    if (Number.isNaN(parsedAmount)) continue

    rows.push({
      date,
      description,
      amount: Number(parsedAmount.toFixed(2)),
      type,
      reference,
    })
  }

  return rows
}
