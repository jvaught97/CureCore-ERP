'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createTestBatch, type TestBatchInput } from '@/app/rnd/_actions'

type RunTestBatchModalProps = {
  rdFormulaId: string
  onClose: () => void
  onSuccess: (testBatchId: string) => void
}

export function RunTestBatchModal({ rdFormulaId, onClose, onSuccess }: RunTestBatchModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    batchSize: '',
    batchSizeUnit: 'kg',
    expectedYield: '',
    expectedYieldUnit: 'kg',
    testDate: new Date().toISOString().split('T')[0], // Today's date
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const input: TestBatchInput = {
        rdFormulaId,
        batchSize: parseFloat(formData.batchSize),
        batchSizeUnit: formData.batchSizeUnit,
        expectedYield: formData.expectedYield ? parseFloat(formData.expectedYield) : undefined,
        expectedYieldUnit: formData.expectedYield ? formData.expectedYieldUnit : undefined,
        testDate: formData.testDate,
      }

      const testBatchId = await createTestBatch(input)
      onSuccess(testBatchId)
    } catch (err) {
      console.error('Failed to create test batch:', err)
      setError('Failed to create test batch. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Run Test Batch</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Batch Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.batchSize}
                  onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.batchSizeUnit}
                  onChange={(e) => setFormData({ ...formData, batchSizeUnit: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="gal">gal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expected Yield (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.expectedYield}
                  onChange={(e) => setFormData({ ...formData, expectedYield: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  placeholder="e.g., 4.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yield Unit
                </label>
                <select
                  value={formData.expectedYieldUnit}
                  onChange={(e) => setFormData({ ...formData, expectedYieldUnit: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="gal">gal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Test Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.testDate}
                onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
              />
            </div>

            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">What happens next?</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>A unique batch code will be auto-generated</li>
                <li>The current formula will be snapshotted for reference</li>
                <li>You can record test results after running the batch</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Test Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
