'use client'

import { useEffect, useState, FormEvent } from 'react'
import {
  NotebookPen,
  Plus,
  Search,
  Download,
  RotateCcw,
  Trash2,
  CheckCircle,
  Eye,
  Edit2,
} from 'lucide-react'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  listJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  deleteJournalEntry,
  getChartOfAccounts,
} from './actions'

type JournalEntry = {
  id: string
  journal_number: string
  date: string
  memo: string
  status: 'draft' | 'posted' | 'reversed'
  total_debit: number
  total_credit: number
  posted_at: string | null
  created_at: string
}

type JournalLine = {
  id?: string
  account_id: string
  description: string
  debit: number
  credit: number
  sort_order: number
}

type Account = {
  id: string
  code: string
  name: string
  type: string
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
    loadAccounts()
  }, [page, search, statusFilter])

  async function loadData() {
    setLoading(true)
    const result = await listJournalEntries({
      page,
      limit: 25,
      search: search || undefined,
      status: statusFilter as "draft" | "posted" | "reversed" | undefined,
    })

    if (result.success && result.data) {
      setEntries(result.data.entries)
      setTotal(result.data.total)
    }
    setLoading(false)
  }

  async function loadAccounts() {
    const result = await getChartOfAccounts()
    if (result.success && result.data) {
      setAccounts(result.data)
    }
  }

  async function handleViewEntry(id: string) {
    const result = await getJournalEntry(id)
    if (result.success && result.data) {
      setEditingEntry(result.data)
      setShowDrawer(true)
    }
  }

  async function handlePostEntry(id: string) {
    if (!confirm('Post this journal entry? This cannot be undone.')) return

    const result = await postJournalEntry({ id })
    if (result.success) {
      showToast('Journal entry posted successfully', 'success')
      await loadData()
    } else {
      showToast('error' in result ? result.error : 'Failed to post entry', 'error')
    }
  }

  async function handleReverseEntry(id: string) {
    if (!confirm('Reverse this journal entry? A new reversing entry will be created.')) return

    const today = new Date().toISOString().split('T')[0]
    const result = await reverseJournalEntry({ id, date: today })
    if (result.success) {
      showToast('Journal entry reversed successfully', 'success')
      await loadData()
    } else {
      showToast('error' in result ? result.error : 'Failed to reverse entry', 'error')
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm('Delete this draft journal entry? This cannot be undone.')) return

    const result = await deleteJournalEntry(id)
    if (result.success) {
      showToast('Journal entry deleted', 'success')
      await loadData()
    } else {
      showToast('error' in result ? result.error : 'Failed to delete entry', 'error')
    }
  }

  function handleNewEntry() {
    setEditingEntry(null)
    setShowDrawer(true)
  }

  function getStatusBadge(status: string) {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      posted: 'bg-green-100 text-green-700',
      reversed: 'bg-red-100 text-red-700',
    }
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <NotebookPen className="h-8 w-8 text-[#174940]" />
            Journal Entries
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage general journal entries
          </p>
        </div>
        <button
          onClick={handleNewEntry}
          className="flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90"
        >
          <Plus className="h-4 w-4" />
          New Journal Entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by journal number or memo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Journal #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Memo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Credit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No journal entries found
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.journal_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.memo || '-'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                      ${entry.total_debit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                      ${entry.total_credit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewEntry(entry.id)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {entry.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handlePostEntry(entry.id)}
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                              title="Post"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {entry.status === 'posted' && (
                          <button
                            onClick={() => handleReverseEntry(entry.id)}
                            className="rounded p-1 text-orange-600 hover:bg-orange-50"
                            title="Reverse"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {showDrawer && (
        <JournalEntryDrawer
          entry={editingEntry}
          accounts={accounts}
          onClose={() => {
            setShowDrawer(false)
            setEditingEntry(null)
          }}
          onSave={async () => {
            await loadData()
            setShowDrawer(false)
            setEditingEntry(null)
          }}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

// ─── JOURNAL ENTRY DRAWER ────────────────────────────────────────────────────

function JournalEntryDrawer({
  entry,
  accounts,
  onClose,
  onSave,
  showToast,
}: {
  entry: any
  accounts: Account[]
  onClose: () => void
  onSave: () => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    journal_number: entry?.journal_number || `JE-${new Date().getFullYear()}-`,
    date: entry?.date || today,
    memo: entry?.memo || '',
  })
  const [lines, setLines] = useState<JournalLine[]>(
    entry?.journal_entry_lines?.map((l: any, idx: number) => ({
      id: l.id,
      account_id: l.account_id,
      description: l.description || '',
      debit: parseFloat(l.debit),
      credit: parseFloat(l.credit),
      sort_order: idx,
    })) || [
      { account_id: '', description: '', debit: 0, credit: 0, sort_order: 0 },
      { account_id: '', description: '', debit: 0, credit: 0, sort_order: 1 },
    ]
  )
  const [saving, setSaving] = useState(false)

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  function addLine() {
    setLines([
      ...lines,
      { account_id: '', description: '', debit: 0, credit: 0, sort_order: lines.length },
    ])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) {
      showToast('At least 2 lines are required', 'error')
      return
    }
    setLines(lines.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof JournalLine, value: any) {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }

    // If setting debit, clear credit and vice versa
    if (field === 'debit' && value > 0) {
      newLines[index].credit = 0
    } else if (field === 'credit' && value > 0) {
      newLines[index].debit = 0
    }

    setLines(newLines)
  }

  async function handleSave() {
    if (!formData.journal_number) {
      showToast('Journal number is required', 'error')
      return
    }

    if (lines.length < 2) {
      showToast('At least 2 lines are required', 'error')
      return
    }

    if (!isBalanced) {
      showToast('Debits must equal credits', 'error')
      return
    }

    setSaving(true)

    const payload = {
      ...formData,
      lines: lines.map((line, idx) => ({
        ...line,
        sort_order: idx,
      })),
    }

    const result = entry?.id
      ? await updateJournalEntry({ id: entry.id, ...payload })
      : await createJournalEntry(payload)

    setSaving(false)

    if (result.success) {
      showToast(
        entry?.id ? 'Journal entry updated' : 'Journal entry created',
        'success'
      )
      onSave()
    } else {
      showToast('error' in result ? result.error : 'Failed to save journal entry', 'error')
    }
  }

  const isReadOnly = entry?.status !== 'draft' && entry?.id

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {entry?.id ? (isReadOnly ? 'View' : 'Edit') : 'New'} Journal Entry
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Header Fields */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Journal Number *
                  </label>
                  <input
                    type="text"
                    value={formData.journal_number}
                    onChange={(e) =>
                      setFormData({ ...formData, journal_number: e.target.value })
                    }
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                    {entry?.status || 'Draft'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Memo</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  rows={2}
                />
              </div>

              {/* Lines */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Lines</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-sm text-[#174940] hover:text-[#174940]/80"
                    >
                      + Add Line
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded border border-gray-200 p-3"
                      style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr auto' }}
                    >
                      <select
                        value={line.account_id}
                        onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                        required
                      >
                        <option value="">Select Account</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        disabled={isReadOnly}
                        placeholder="Description"
                        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                      />

                      <input
                        type="number"
                        value={line.debit || ''}
                        onChange={(e) =>
                          updateLine(index, 'debit', parseFloat(e.target.value) || 0)
                        }
                        disabled={isReadOnly}
                        placeholder="Debit"
                        step="0.01"
                        min="0"
                        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                      />

                      <input
                        type="number"
                        value={line.credit || ''}
                        onChange={(e) =>
                          updateLine(index, 'credit', parseFloat(e.target.value) || 0)
                        }
                        disabled={isReadOnly}
                        placeholder="Credit"
                        step="0.01"
                        min="0"
                        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                      />

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-600">Total Debit</div>
                      <div className="text-lg font-semibold text-gray-900">
                        ${totalDebit.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Total Credit</div>
                      <div className="text-lg font-semibold text-gray-900">
                        ${totalCredit.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Balance</div>
                      <div
                        className={`text-lg font-semibold ${
                          isBalanced ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isBalanced ? '✓ Balanced' : `$${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isBalanced}
                className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
