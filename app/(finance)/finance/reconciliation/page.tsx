'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Banknote,
  CalendarRange,
  FileDown,
  FolderOpen,
  Loader2,
  Plus,
  ShieldAlert,
  RefreshCcw,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  createReconciliation,
  createStatement,
  exportReconciliationPDF,
  importStatementCSV,
  listBankAccounts,
  listReconciliations,
} from './actions'
import { ImportStatementModal } from '@/components/finance/recon/ImportStatementModal'

type BankAccount = { id: string; name: string }

type ReconciliationRow = {
  id: string
  status: 'draft' | 'finalized'
  difference: number
  ending_balance_per_bank: number
  ending_balance_per_books: number
  created_at: string
  reconciled_at?: string | null
  bank_accounts?: { name?: string | null } | null
  bank_statements?: { start_date?: string | null; end_date?: string | null } | null
}

type SummaryCounts = { draft: number; finalized: number }

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function BankReconciliationListPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { toasts, showToast, dismissToast } = useToast()

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [reconciliations, setReconciliations] = useState<ReconciliationRow[]>([])
  const [summary, setSummary] = useState<SummaryCounts>({ draft: 0, finalized: 0 })
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const role = profile?.role?.toLowerCase() ?? 'ops'
  const hasFinanceAccess = role === 'admin' || role === 'finance'

  useEffect(() => {
    if (!hasFinanceAccess) return
    loadData()
  }, [hasFinanceAccess])

  const loadData = async () => {
    setLoading(true)
    try {
      const accountsResult = await listBankAccounts()
      if (accountsResult.success && accountsResult.data) {
        setAccounts(accountsResult.data.accounts ?? [])
      }

      const reconResult = await listReconciliations()
      if (reconResult.success && reconResult.data) {
        setReconciliations(reconResult.data.reconciliations ?? [])
        setSummary(reconResult.data.summary)
      } else if (!reconResult.success) {
        showToast(reconResult.error, 'error')
      }
    } catch (error: any) {
      console.error('Failed to load reconciliation data:', error)
      showToast(error?.message || 'Failed to load bank reconciliations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleImport = async (payload: {
    bankAccountId: string
    startDate: string
    endDate: string
    startingBalance: number
    endingBalance: number
    file: File
  }) => {
    try {
      const statementResult = await createStatement({
        bankAccountId: payload.bankAccountId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        startingBalance: payload.startingBalance,
        endingBalance: payload.endingBalance,
      })

      if (!statementResult.success || !statementResult.data) {
        throw new Error(statementResult.error || 'Unable to create bank statement')
      }

      const statementId = statementResult.data.statementId

      const importResult = await importStatementCSV(statementId, payload.file)
      if (!importResult.success) {
        throw new Error(importResult.error || 'Statement import failed')
      }

      const reconciliationResult = await createReconciliation({ statementId })
      if (!reconciliationResult.success || !reconciliationResult.data) {
        throw new Error(reconciliationResult.error || 'Unable to create reconciliation')
      }

      showToast('Bank statement imported successfully', 'success')
      await loadData()
      router.push(`/finance/reconciliation/${reconciliationResult.data.reconciliationId}`)
    } catch (error: any) {
      console.error('Import workflow failed:', error)
      showToast(error?.message || 'Failed to import statement', 'error')
      throw error
    }
  }

  const handleExportPdf = async (reconciliationId: string) => {
    try {
      const result = await exportReconciliationPDF(reconciliationId)
      if (!result.success || !result.data) {
        throw new Error('error' in result ? result.error : 'Unable to export PDF')
      }
      const dataUri = result.data.dataUri
      window.open(dataUri, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      console.error('Export PDF failed:', error)
      showToast(error?.message || 'Failed to export reconciliation', 'error')
    }
  }

  const renderedRows = useMemo(() => reconciliations, [reconciliations])

  if (!hasFinanceAccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-gray-600">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold text-gray-900">Admins only</h1>
        <p className="text-sm text-gray-500">Bank reconciliation is restricted to finance or admin users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold text-gray-900">
            <Banknote className="h-8 w-8 text-[#174940]" />
            Bank Reconciliation
          </h1>
          <p className="text-sm text-gray-600">
            Import statements, match ledger activity, and finalize monthly reconciliations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830]"
          >
            <Plus className="h-4 w-4" />
            Import Statement
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Draft reconciliations"
          value={summary.draft}
          icon={<FolderOpen className="h-5 w-5 text-amber-500" />}
        />
        <SummaryCard
          label="Finalized reconciliations"
          value={summary.finalized}
          icon={<CalendarRange className="h-5 w-5 text-[#174940]" />}
        />
        <SummaryCard
          label="Active bank accounts"
          value={accounts.length}
          icon={<Banknote className="h-5 w-5 text-sky-600" />}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">Statement period</th>
              <th className="px-4 py-3 text-left">Bank ending</th>
              <th className="px-4 py-3 text-left">Books ending</th>
              <th className="px-4 py-3 text-left">Difference</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  <p className="mt-2">Loading reconciliations…</p>
                </td>
              </tr>
            ) : renderedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  No reconciliations yet. Import a bank statement to get started.
                </td>
              </tr>
            ) : (
              renderedRows.map((row) => {
                const differenceClass = Math.abs(row.difference) > 0.01 ? 'text-red-600' : 'text-[#174940]'
                const statusStyles =
                  row.status === 'finalized'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'

                return (
                  <tr key={row.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.bank_accounts?.name || 'Unknown account'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatRange(row.bank_statements?.start_date, row.bank_statements?.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {money.format(Number(row.ending_balance_per_bank ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {money.format(Number(row.ending_balance_per_books ?? 0))}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${differenceClass}`}>
                      {money.format(Number(row.difference ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles}`}>
                        {row.status === 'finalized' ? 'Finalized' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/finance/reconciliation/${row.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940]"
                        >
                          <FolderOpen className="h-4 w-4" />
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940]"
                        >
                          <FileDown className="h-4 w-4" />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      <ImportStatementModal
        open={importOpen}
        accounts={accounts}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImport}
      />
    </div>
  )
}

function formatRange(start?: string | null, end?: string | null) {
  if (!start || !end) return '—'
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()}`
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: JSX.Element }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
      </div>
      <div className="rounded-full bg-gray-50 p-3 text-gray-500">{icon}</div>
    </div>
  )
}
