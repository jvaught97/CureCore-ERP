'use client'

import { useState, FormEvent, ChangeEvent } from 'react'
import { X, Upload, Calendar, Wallet, Calculator } from 'lucide-react'

type ImportStatementModalProps = {
  open: boolean
  accounts: { id: string; name: string }[]
  onClose: () => void
  onSubmit: (payload: {
    bankAccountId: string
    startDate: string
    endDate: string
    startingBalance: number
    endingBalance: number
    file: File
  }) => Promise<void>
}

export function ImportStatementModal({ open, accounts, onClose, onSubmit }: ImportStatementModalProps) {
  const [bankAccountId, setBankAccountId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startingBalance, setStartingBalance] = useState('')
  const [endingBalance, setEndingBalance] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) {
      setFile(selected)
    }
  }

  const reset = () => {
    setBankAccountId('')
    setStartDate('')
    setEndDate('')
    setStartingBalance('')
    setEndingBalance('')
    setFile(null)
    setSubmitting(false)
    setError(null)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!bankAccountId || !startDate || !endDate || !startingBalance || !endingBalance || !file) {
      setError('Please complete all fields and attach a statement file.')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start > end) {
      setError('Start date must be before end date.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        bankAccountId,
        startDate,
        endDate,
        startingBalance: Number(startingBalance),
        endingBalance: Number(endingBalance),
        file,
      })
      reset()
      onClose()
    } catch (err: any) {
      console.error('Import statement failed:', err)
      setError(err?.message || 'Failed to import bank statement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import Bank Statement</h2>
            <p className="text-sm text-gray-500">Upload a CSV, OFX, or QFX file to start a reconciliation.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close import statement modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Bank account
              <div className="relative">
                <Wallet className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <select
                  value={bankAccountId}
                  onChange={(event) => setBankAccountId(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  required
                >
                  <option value="" disabled>
                    Select bank account
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Start date
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              End date
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Starting balance
              <div className="relative">
                <Calculator className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="-100000000"
                  value={startingBalance}
                  onChange={(event) => setStartingBalance(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Ending balance
              <div className="relative">
                <Calculator className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="-100000000"
                  value={endingBalance}
                  onChange={(event) => setEndingBalance(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
              Statement file
              <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center hover:border-[#174940]">
                <input
                  id="statement-file"
                  type="file"
                  accept=".csv,.CSV,.ofx,.OFX,.qfx,.QFX"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="statement-file" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-gray-600">
                  <Upload className="h-5 w-5 text-[#174940]" />
                  {file ? (
                    <span className="font-medium text-gray-800">{file.name}</span>
                  ) : (
                    <span>
                      Drop your file here or <span className="text-[#174940]">browse</span>
                    </span>
                  )}
                  <span className="text-xs text-gray-400">CSV, OFX, or QFX up to 5 MB</span>
                </label>
              </div>
            </label>
          </div>

          {error ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

          <footer className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Importing…' : 'Import & Reconcile'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
