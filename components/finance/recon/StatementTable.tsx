'use client'
import { CheckCircle2, AlertCircle, Link2 } from 'lucide-react'

type StatementLine = {
  id: string
  date: string
  amount: number
  description?: string | null
  type?: string | null
  reference?: string | null
  cleared: boolean
  note?: string | null
  matched_ledger_id?: string | null
}

type StatementTableProps = {
  lines: StatementLine[]
  matches: Record<string, { ledger_entry_id: string; ledger_entry_type: string; auto_matched: boolean }>
  onMatch: (line: StatementLine) => void
  onUnmatch: (line: StatementLine, match: { ledger_entry_id: string; ledger_entry_type: string }) => void
  onToggleCleared: (line: StatementLine, cleared: boolean) => void
  filter: 'all' | 'cleared' | 'uncleared' | 'unmatched'
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function StatementTable({ lines, matches, onMatch, onUnmatch, onToggleCleared, filter }: StatementTableProps) {
  const filtered = lines.filter((line) => {
    if (filter === 'cleared') return line.cleared
    if (filter === 'uncleared') return !line.cleared
    if (filter === 'unmatched') return !matches[line.id]
    return true
  })

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Cleared</th>
            <th className="px-4 py-3">Match</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                No transactions to show.
              </td>
            </tr>
          ) : null}

          {filtered.map((line) => {
            const match = matches[line.id]
            const amountValue = Number(line.amount ?? 0)
            const amountClass = amountValue < 0 ? 'text-red-600' : 'text-[#174940]'

            return (
              <tr key={line.id} className="hover:bg-gray-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {new Date(line.date).toLocaleDateString()}
                </td>
                <td className="max-w-xs px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{line.description || '—'}</span>
                    <span className="text-xs text-gray-500">{line.reference || line.type || ''}</span>
                  </div>
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${amountClass}`}>
                  {currency.format(amountValue)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleCleared(line, !line.cleared)}
                    className={`${line.cleared ? 'bg-[#174940]' : 'bg-gray-200'} relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                    aria-pressed={line.cleared}
                  >
                    <span
                      className={`${line.cleared ? 'translate-x-4' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                    <span className="sr-only">Toggle cleared</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  {match ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      {match.auto_matched ? 'Auto' : 'Manual'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <AlertCircle className="h-3 w-3" />
                      Unmatched
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {match ? (
                    <button
                      type="button"
                      onClick={() => onUnmatch(line, match)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-500 hover:text-red-600"
                    >
                      <Link2 className="h-4 w-4 rotate-45" />
                      Unmatch
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMatch(line)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940]"
                    >
                      <Link2 className="h-4 w-4" />
                      Match
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
