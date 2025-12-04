'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type GraduateToProductionModalProps = {
  rdFormulaId: string
  rdFormulaName: string
  rdFormulaVersion: string
  testBatchResults?: {
    totalTests: number
    passedTests: number
    readyForProduction: boolean
  }
  onClose: () => void
}

export function GraduateToProductionModal({
  rdFormulaId,
  rdFormulaName,
  rdFormulaVersion,
  testBatchResults,
  onClose,
}: GraduateToProductionModalProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productionName: rdFormulaName,
    productionVersion: rdFormulaVersion,
    notes: '',
  })

  const canGraduate =
    testBatchResults && testBatchResults.totalTests > 0 && testBatchResults.readyForProduction

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canGraduate) {
      setError('Cannot graduate: Formula needs at least one successful test batch marked as ready for production.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // TODO: Implement graduation API call
      // This would:
      // 1. Create a new production formula based on the R&D formula
      // 2. Copy ingredients, steps, and packaging info
      // 3. Link test batch results to the new production formula
      // 4. Mark the R&D formula as graduated

      alert('Graduation to production is not yet implemented. This will create a production formula and link test results.')
      onClose()

      // After implementation, would redirect to new production formula
      // router.push(`/formulations/${productionFormulaId}`)
    } catch (err) {
      console.error('Failed to graduate formula:', err)
      setError('Failed to graduate formula. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Graduate to Production</h2>
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

          {/* Readiness Check */}
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Readiness Check</h3>

            {testBatchResults ? (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  {canGraduate ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Test Batch Results</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>Total test batches: {testBatchResults.totalTests}</li>
                      <li>Passed requirements: {testBatchResults.passedTests}</li>
                      <li>
                        Ready for production:{' '}
                        {testBatchResults.readyForProduction ? (
                          <span className="font-medium text-green-600">Yes</span>
                        ) : (
                          <span className="font-medium text-yellow-600">No</span>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>

                {!canGraduate && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    <p className="font-medium">Requirements Not Met</p>
                    <p className="mt-1">
                      To graduate this formula, you need at least one completed test batch that
                      is marked as &quot;Ready for Production&quot;.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-medium">No Test Batches</p>
                <p className="mt-1">
                  This formula has no test batches yet. Run at least one successful test before
                  graduating to production.
                </p>
              </div>
            )}
          </div>

          {/* Production Formula Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Production Formula Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Production Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.productionName}
                onChange={(e) => setFormData({ ...formData, productionName: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                placeholder="e.g., Premium Face Cream"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Production Version <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.productionVersion}
                onChange={(e) =>
                  setFormData({ ...formData, productionVersion: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                placeholder="e.g., 1.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Graduation Notes
              </label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                placeholder="Notes about the graduation process, final adjustments, or production considerations..."
              />
            </div>
          </div>

          <div className="mt-6 rounded-md bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium">What happens when you graduate?</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>A new production formula will be created in the Formulations system</li>
              <li>All ingredients, manufacturing steps, and packaging info will be copied</li>
              <li>Test batch results will be linked to the production formula</li>
              <li>The R&amp;D formula will be marked as graduated (but remain accessible)</li>
            </ul>
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
              disabled={submitting || !canGraduate}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Graduate to Production
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
