'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchJournalEntries } from '@/app/accounting/_actions/journal-entries'
import { JournalEntryStatus, JournalEntryWithLines } from '@/types/accounting'
import { Loader2, Filter, FilePlus2 } from 'lucide-react'

const STATUS_OPTIONS: Array<{ value?: JournalEntryStatus; label: string }> = [
  { label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'reversed', label: 'Reversed' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

export default function JournalEntriesPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntryWithLines[]>([])
  const [status, setStatus] = useState<JournalEntryStatus | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function loadEntries() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchJournalEntries(status ? { status } : undefined)
        if (isMounted) setEntries(result)
      } catch (err: any) {
        console.error('Failed to load journal entries', err)
        if (isMounted) setError(err?.message ?? 'Failed to load journal entries')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadEntries()
    return () => {
      isMounted = false
    }
  }, [status])

  const totals = useMemo(() => {
    return entries.map((entry) => {
      const debit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
      const credit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0)
      return { debit, credit }
    })
  }, [entries])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-600">
            Review, post, or manage the entries that feed your general ledger.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/accounting')}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
        >
          <FilePlus2 className="h-4 w-4" />
          New Entry (coming soon)
        </button>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4 text-gray-400" />
            Filter
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Status
              <select
                value={status ?? ''}
                onChange={(event) => {
                  const value = event.target.value as JournalEntryStatus | ''
                  setStatus(value ? value : undefined)
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            Loading journal entries…
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          No journal entries found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Entry</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Debits</th>
                <th className="px-4 py-3 text-right">Credits</th>
                <th className="px-4 py-3 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{entry.entry_number}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{entry.description || '—'}</div>
                    {entry.reference_type && (
                      <div className="text-xs text-gray-500">
                        {entry.reference_type}
                        {entry.reference_id ? ` • ${entry.reference_id}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-900">{entry.status}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(totals[index]?.debit ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(totals[index]?.credit ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {new Date(entry.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
