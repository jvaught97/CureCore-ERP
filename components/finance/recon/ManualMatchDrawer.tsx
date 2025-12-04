'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { LedgerEntry } from './LedgerTable'

type ManualMatchDrawerProps = {
  open: boolean
  line?: {
    id: string
    date: string
    amount: number
    description?: string | null
  }
  candidates: LedgerEntry[]
  onSelect: (entry: LedgerEntry) => void
  onClose: () => void
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function ManualMatchDrawer({ open, line, candidates, onSelect, onClose }: ManualMatchDrawerProps) {
  const sortedCandidates = useMemo(() => {
    if (!line) return candidates
    return [...candidates].sort((a, b) => {
      const amountDiffA = Math.abs(a.amount - line.amount)
      const amountDiffB = Math.abs(b.amount - line.amount)
      if (amountDiffA !== amountDiffB) return amountDiffA - amountDiffB
      const dateDiffA = Math.abs(new Date(a.date).getTime() - new Date(line.date).getTime())
      const dateDiffB = Math.abs(new Date(b.date).getTime() - new Date(line.date).getTime())
      return dateDiffA - dateDiffB
    })
  }, [candidates, line])

  if (!open || !line) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Match statement line</h3>
            <p className="text-xs text-gray-500">
              {new Date(line.date).toLocaleDateString()} · {formatter.format(line.amount)} · {line.description || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close match drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {sortedCandidates.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              No ledger entries available for matching.
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedCandidates.map((entry) => (
                <li key={`${entry.type}:${entry.id}`} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{entry.description}</span>
                      <span className={entry.amount < 0 ? 'font-semibold text-red-600' : 'font-semibold text-[#174940]'}>
                        {formatter.format(entry.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{entry.type.replace('_', ' ').toUpperCase()}</span>
                      {entry.reference ? (
                        <>
                          <span>•</span>
                          <span>{entry.reference}</span>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="self-start rounded-lg bg-[#174940] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#123830]"
                    >
                      Match this entry
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
