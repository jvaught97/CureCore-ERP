'use client'

import { useState, FormEvent, useEffect } from 'react'
import { X } from 'lucide-react'

type AdjustmentDialogProps = {
  open: boolean
  type: 'fee' | 'interest'
  defaultDate: string
  onClose: () => void
  onSubmit: (payload: { type: 'fee' | 'interest'; amount: number; memo?: string; date: string }) => Promise<void>
}

export function AdjustmentDialog({ open, type, defaultDate, onClose, onSubmit }: AdjustmentDialogProps) {
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = type === 'fee' ? 'Bank fee' : 'Interest income'

  useEffect(() => {
    if (open) {
      setAmount('')
      setMemo('')
      setDate(defaultDate)
      setError(null)
      setLoading(false)
    }
  }, [open, defaultDate])

  if (!open) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    if (!amount) {
      setError('Enter an amount to create the adjustment.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit({ type, amount: Number(amount), memo: memo || undefined, date })
      onClose()
    } catch (err: any) {
      console.error('Adjustment creation failed:', err)
      setError(err?.message || 'Unable to create adjustment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create {label} adjustment</h3>
            <p className="text-xs text-gray-500">Automatically posts a journal entry and attempts to match it.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close adjustment dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4 text-sm text-gray-700">
          <label className="flex flex-col gap-1 font-medium text-gray-700">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
              required
            />
          </label>

          <label className="flex flex-col gap-1 font-medium text-gray-700">
            Adjustment date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
              required
            />
          </label>

          <label className="flex flex-col gap-1 font-medium text-gray-700">
            Memo <span className="text-xs font-normal text-gray-400">Optional</span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
              placeholder={`Describe the ${label.toLowerCase()}`}
            />
          </label>

          {error ? <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}

          <footer className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create adjustment'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
