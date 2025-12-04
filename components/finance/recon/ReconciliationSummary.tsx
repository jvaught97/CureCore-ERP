'use client'

import { ReactNode } from 'react'
import { AlertTriangle, PiggyBank } from 'lucide-react'

type ReconciliationSummaryProps = {
  startingBalance?: number
  bankEnding: number
  booksEnding: number
  depositsInTransit: number
  outstandingChecks: number
  difference: number
  onCreateAdjustment: (type: 'fee' | 'interest') => void
  disabled?: boolean
  actions?: ReactNode
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function ReconciliationSummary({
  startingBalance,
  bankEnding,
  booksEnding,
  depositsInTransit,
  outstandingChecks,
  difference,
  onCreateAdjustment,
  disabled,
  actions,
}: ReconciliationSummaryProps) {
  const adjustedBank = bankEnding + depositsInTransit + outstandingChecks
  const differenceLabel = formatter.format(difference)
  const differenceAlert = Math.abs(difference) > 0.01

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 md:grid-cols-3 lg:grid-cols-5">
            {startingBalance !== undefined ? (
              <SummaryItem label="Beginning balance" value={formatter.format(startingBalance)} />
            ) : null}
            <SummaryItem label="Ending balance (bank)" value={formatter.format(bankEnding)} />
            <SummaryItem label="Deposits in transit" value={formatter.format(depositsInTransit)} />
            <SummaryItem label="Outstanding checks" value={formatter.format(outstandingChecks)} />
            <SummaryItem label="Adjusted bank balance" value={formatter.format(adjustedBank)} />
            <SummaryItem label="Ending balance (books)" value={formatter.format(booksEnding)} />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
              <PiggyBank className="h-4 w-4 text-[#174940]" />
              Difference: <span className={differenceAlert ? 'text-red-600' : 'text-[#174940]'}>{differenceLabel}</span>
            </span>

            {differenceAlert ? (
              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Balance must be zero before finalizing
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:w-60">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onCreateAdjustment('fee')}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Bank Fee Adjustment
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onCreateAdjustment('interest')}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Interest Adjustment
          </button>
          {actions}
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  )
}
