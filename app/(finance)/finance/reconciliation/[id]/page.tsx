'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  FileDown,
  Loader2,
  Lock,
  Scale,
  Wand2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  createBankAdjustmentJE,
  exportReconciliationPDF,
  finalizeReconciliation,
  getReconciliationDetail,
  manualMatch,
  markCleared,
  recalcReconciliation,
  smartMatch,
} from '../actions'
import { StatementTable } from '@/components/finance/recon/StatementTable'
import { LedgerTable, LedgerEntry } from '@/components/finance/recon/LedgerTable'
import { ManualMatchDrawer } from '@/components/finance/recon/ManualMatchDrawer'
import { AdjustmentDialog } from '@/components/finance/recon/AdjustmentDialog'
import { ReconciliationSummary } from '@/components/finance/recon/ReconciliationSummary'

type ReconciliationDetail = {
  reconciliation: any
  statementLines: Array<{
    id: string
    date: string
    amount: number
    description?: string | null
    type?: string | null
    reference?: string | null
    cleared: boolean
    note?: string | null
    matched_ledger_id?: string | null
  }>
  matches: Array<{
    statement_line_id?: string | null
    ledger_entry_id: string
    ledger_entry_type: 'je_line' | 'ar_payment' | 'ap_payment'
    auto_matched: boolean
  }>
  ledgerCandidates: LedgerEntry[]
  outstanding: { depositsInTransit: number; outstandingChecks: number }
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function ReconciliationWorkspacePage() {
  const params = useParams<{ id: string }>()
  const reconciliationId = params?.id
  const router = useRouter()
  const { profile } = useAuth()
  const role = profile?.role?.toLowerCase() ?? 'ops'
  const hasFinanceAccess = role === 'admin' || role === 'finance'
  const { toasts, showToast, dismissToast } = useToast()

  const [detail, setDetail] = useState<ReconciliationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'cleared' | 'uncleared' | 'unmatched'>('all')
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'je_line' | 'ar_payment' | 'ap_payment'>('all')
  const [matchDrawerOpen, setMatchDrawerOpen] = useState(false)
  const [selectedLine, setSelectedLine] = useState<ReconciliationDetail['statementLines'][0] | undefined>()
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'fee' | 'interest'>('fee')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!hasFinanceAccess || !reconciliationId) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconciliationId, hasFinanceAccess])

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await getReconciliationDetail({ reconciliationId: reconciliationId! })
      if (!result.success || !result.data) {
        throw new Error('error' in result ? result.error : 'Unable to load reconciliation')
      }
      setDetail(result.data as ReconciliationDetail)
    } catch (error: any) {
      console.error('Failed to load reconciliation detail:', error)
      showToast(error?.message || 'Failed to load reconciliation', 'error')
    } finally {
      setLoading(false)
    }
  }

  const statementMatches = useMemo(() => {
    const map: Record<string, { ledger_entry_id: string; ledger_entry_type: string; auto_matched: boolean }> = {}
    detail?.matches.forEach((match) => {
      if (match.statement_line_id) {
        map[match.statement_line_id] = {
          ledger_entry_id: match.ledger_entry_id,
          ledger_entry_type: match.ledger_entry_type,
          auto_matched: match.auto_matched,
        }
      }
    })
    return map
  }, [detail?.matches])

  const matchedLedgerKeys = useMemo(() => {
    const set = new Set<string>()
    detail?.matches.forEach((match) => {
      set.add(`${match.ledger_entry_type}:${match.ledger_entry_id}`)
    })
    return set
  }, [detail?.matches])

  const handleSmartMatch = async () => {
    if (!reconciliationId) return
    setActionLoading(true)
    const result = await smartMatch({ reconciliationId })
    if (!result.success) {
      showToast('error' in result ? result.error : 'Failed to match transactions', 'error')
    } else {
      showToast(`Matched ${result.data?.matches ?? 0} transactions`, 'success')
      await refresh()
    }
    setActionLoading(false)
  }

  const handleManualMatch = async (entry: LedgerEntry) => {
    if (!reconciliationId || !selectedLine) return
    setActionLoading(true)
    const result = await manualMatch({
      reconciliationId,
      statementLineId: selectedLine.id,
      ledgerEntryId: entry.id,
      ledgerEntryType: entry.type,
      action: 'match',
    })
    if (!result.success) {
      showToast('error' in result ? result.error : 'Operation failed', 'error')
    } else {
      showToast('Match created', 'success')
      await refresh()
      setMatchDrawerOpen(false)
      setSelectedLine(undefined)
    }
    setActionLoading(false)
  }

  const handleUnmatch = async (
    line: ReconciliationDetail['statementLines'][0],
    match: { ledger_entry_id: string; ledger_entry_type: 'je_line' | 'ar_payment' | 'ap_payment' }
  ) => {
    if (!reconciliationId) return
    setActionLoading(true)
    const result = await manualMatch({
      reconciliationId,
      statementLineId: line.id,
      ledgerEntryId: match.ledger_entry_id,
      ledgerEntryType: match.ledger_entry_type,
      action: 'unmatch',
    })
    if (!result.success) {
      showToast('error' in result ? result.error : 'Operation failed', 'error')
    } else {
      showToast('Match removed', 'success')
      await refresh()
    }
    setActionLoading(false)
  }

  const handleToggleCleared = async (line: ReconciliationDetail['statementLines'][0], cleared: boolean) => {
    const result = await markCleared({ statementLineId: line.id, cleared })
    if (!result.success) {
      showToast('error' in result ? result.error : 'Operation failed', 'error')
      return
    }
    await refresh()
  }

  const handleFinalize = async () => {
    if (!reconciliationId) return
    setActionLoading(true)
    const result = await finalizeReconciliation({ reconciliationId })
    if (!result.success) {
      showToast('error' in result ? result.error : 'Operation failed', 'error')
    } else {
      showToast('Reconciliation finalized', 'success')
      await refresh()
    }
    setActionLoading(false)
  }

  const handleExport = async () => {
    if (!reconciliationId) return
    const result = await exportReconciliationPDF(reconciliationId)
    if (!result.success || !result.data) {
      showToast('error' in result ? result.error : 'Failed to export reconciliation', 'error')
      return
    }
    window.open(result.data.dataUri, '_blank', 'noopener,noreferrer')
  }

  const handleAdjustment = (type: 'fee' | 'interest') => {
    setAdjustmentType(type)
    setAdjustmentOpen(true)
  }

  const submitAdjustment = async ({ type, amount, memo, date }: { type: 'fee' | 'interest'; amount: number; memo?: string; date: string }) => {
    if (!reconciliationId) return
    setActionLoading(true)
    const result = await createBankAdjustmentJE({ reconciliationId, type, amount, memo, date })
    if (!result.success) {
      setActionLoading(false)
      throw new Error('error' in result ? result.error : 'Failed to create adjustment')
    }
    showToast('Adjustment posted successfully', 'success')
    await refresh()
    setActionLoading(false)
  }

  const handleRecalc = async () => {
    if (!reconciliationId) return
    setActionLoading(true)
    const result = await recalcReconciliation({ reconciliationId })
    if (!result.success) {
      showToast('error' in result ? result.error : 'Operation failed', 'error')
    } else {
      await refresh()
    }
    setActionLoading(false)
  }

  const openManualMatch = (line: ReconciliationDetail['statementLines'][0]) => {
    setSelectedLine(line)
    setMatchDrawerOpen(true)
  }

  if (!hasFinanceAccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-gray-600">
        <Lock className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold text-gray-900">Admins only</h1>
        <p className="text-sm text-gray-500">Bank reconciliation is restricted to finance or admin users.</p>
      </div>
    )
  }

  if (loading || !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading reconciliation workspace…</p>
      </div>
    )
  }

  const reconciliation = detail.reconciliation
  const outstanding = detail.outstanding
  const statement = reconciliation.bank_statements ?? {}
  const bankAccountName = reconciliation.bank_accounts?.name || 'Bank account'
  const isFinalized = reconciliation.status === 'finalized'

  const manualMatchCandidates: LedgerEntry[] = detail.ledgerCandidates.filter((entry) => {
    const key = `${entry.type}:${entry.id}`
    if (matchedLedgerKeys.has(key)) return false
    if (!selectedLine) return true
    const amountClose = Math.abs(entry.amount - selectedLine.amount) <= 0.01
    const dateClose = Math.abs(new Date(entry.date).getTime() - new Date(selectedLine.date).getTime()) <= 1000 * 60 * 60 * 24 * 7
    return amountClose || dateClose
  })

  const defaultAdjustmentDate = statement.end_date ? statement.end_date : new Date().toISOString().slice(0, 10)

  return (
    <div className="flex h-full flex-col">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex-1 space-y-6 p-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/finance/reconciliation')}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#174940] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </button>
            <h1 className="text-3xl font-semibold text-gray-900">{bankAccountName}</h1>
            <p className="text-sm text-gray-600">
              Statement period {formatDateRange(statement.start_date, statement.end_date)} · Difference {currency.format(reconciliation.difference || 0)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSmartMatch}
              disabled={isFinalized || actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" />
              Smart Match
            </button>
            <button
              type="button"
              onClick={handleRecalc}
              disabled={isFinalized || actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Scale className="h-4 w-4" />
              Recalc Balances
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940]"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isFinalized || actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isFinalized ? 'Finalized' : 'Finalize & Lock'}
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Bank statement</h2>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                {(['all', 'cleared', 'uncleared', 'unmatched'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`${filter === key ? 'bg-[#174940] text-white' : 'bg-gray-100 text-gray-600'} rounded-full px-3 py-1`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <StatementTable
              lines={detail.statementLines}
              matches={statementMatches}
              filter={filter}
              onMatch={openManualMatch}
              onUnmatch={handleUnmatch}
              onToggleCleared={handleToggleCleared}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Ledger activity</h2>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                {(['all', 'je_line', 'ar_payment', 'ap_payment'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLedgerFilter(key)}
                    className={`${ledgerFilter === key ? 'bg-[#174940] text-white' : 'bg-gray-100 text-gray-600'} rounded-full px-3 py-1 capitalize`}
                  >
                    {key === 'je_line' ? 'Journal' : key === 'ar_payment' ? 'AR Payments' : key === 'ap_payment' ? 'AP Payments' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            <LedgerTable
              entries={detail.ledgerCandidates}
              filter={ledgerFilter}
              matchedLedgerKeys={matchedLedgerKeys}
            />
          </section>
        </div>
      </div>

      <ReconciliationSummary
        startingBalance={statement.starting_balance ? Number(statement.starting_balance) : undefined}
        bankEnding={reconciliation.ending_balance_per_bank ?? 0}
        booksEnding={reconciliation.ending_balance_per_books ?? 0}
        depositsInTransit={outstanding.depositsInTransit}
        outstandingChecks={outstanding.outstandingChecks}
        difference={reconciliation.difference ?? 0}
        onCreateAdjustment={handleAdjustment}
        disabled={isFinalized || actionLoading}
      />

      <ManualMatchDrawer
        open={matchDrawerOpen}
        line={selectedLine}
        candidates={manualMatchCandidates}
        onSelect={handleManualMatch}
        onClose={() => {
          setMatchDrawerOpen(false)
          setSelectedLine(undefined)
        }}
      />

      <AdjustmentDialog
        open={adjustmentOpen}
        type={adjustmentType}
        defaultDate={defaultAdjustmentDate}
        onClose={() => setAdjustmentOpen(false)}
        onSubmit={submitAdjustment}
      />
    </div>
  )
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start || !end) return '—'
  return `${new Date(start).toLocaleDateString()} → ${new Date(end).toLocaleDateString()}`
}
