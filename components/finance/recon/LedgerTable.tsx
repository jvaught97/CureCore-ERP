'use client'

import { BadgeDollarSign } from 'lucide-react'
import { BankLedgerEntryType } from '@/types/accounting'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export type LedgerEntry = {
  id: string
  type: BankLedgerEntryType
  amount: number
  date: string
  description: string
  reference?: string
}

type LedgerTableProps = {
  entries: LedgerEntry[]
  filter: BankLedgerEntryType | 'all'
  matchedLedgerKeys: Set<string>
  onMatch?: (entry: LedgerEntry) => void
}

const typeLabels: Record<BankLedgerEntryType, string> = {
  je_line: 'Journal Entry',
  ar_payment: 'AR Payment',
  ap_payment: 'AP Payment',
}

export function LedgerTable({ entries, filter, matchedLedgerKeys, onMatch }: LedgerTableProps) {
  const filteredEntries = entries.filter((entry) => filter === 'all' || entry.type === filter)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Source</th>
            <th className="px-4 py-3 text-left">Reference</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredEntries.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                No ledger rows match this filter.
              </td>
            </tr>
          ) : null}

          {filteredEntries.map((entry) => {
            const key = `${entry.type}:${entry.id}`
            const matched = matchedLedgerKeys.has(key)
            const amountClass = entry.amount < 0 ? 'text-red-600' : 'text-[#174940]'

            return (
              <tr key={key} className="hover:bg-gray-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {new Date(entry.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      <BadgeDollarSign className="h-3 w-3 text-[#174940]" />
                      {typeLabels[entry.type]}
                    </span>
                    <span className="font-medium text-gray-900">{entry.description}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{entry.reference || '—'}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold ${amountClass}`}>
                  {money.format(entry.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  {onMatch ? (
                    <button
                      type="button"
                      onClick={() => onMatch(entry)}
                      disabled={matched}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {matched ? 'Matched' : 'Match' }
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-gray-400">{matched ? 'Matched' : 'Available'}</span>
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
