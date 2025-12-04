'use client'

import { useState } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { createOrUpdateTestResults, updateTestBatchCosts, type TestResultsInput } from '@/app/rnd/_actions'

type RecordResultsModalProps = {
  testBatchId: string
  expectedYield?: number | null
  expectedYieldUnit?: string | null
  onClose: () => void
  onSuccess: () => void
}

type Issue = {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

export function RecordResultsModal({
  testBatchId,
  expectedYield,
  expectedYieldUnit,
  onClose,
  onSuccess,
}: RecordResultsModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])

  const [formData, setFormData] = useState({
    actualYield: '',
    actualYieldUnit: expectedYieldUnit || 'kg',
    qualityRating: 0,
    passedRequirements: false,
    appearanceNotes: '',
    viscosityNotes: '',
    scentNotes: '',
    stabilityNotes: '',
    sensoryNotes: '',
    generalNotes: '',
    adjustmentsNeeded: '',
    nextSteps: '',
    readyForProduction: false,
  })

  const [costData, setCostData] = useState({
    packagingCost: '',
    laborCost: '',
    overheadCost: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const input: TestResultsInput = {
        testBatchId,
        actualYield: formData.actualYield ? parseFloat(formData.actualYield) : undefined,
        actualYieldUnit: formData.actualYield ? formData.actualYieldUnit : undefined,
        qualityRating: formData.qualityRating || undefined,
        passedRequirements: formData.passedRequirements,
        appearanceNotes: formData.appearanceNotes || undefined,
        viscosityNotes: formData.viscosityNotes || undefined,
        scentNotes: formData.scentNotes || undefined,
        stabilityNotes: formData.stabilityNotes || undefined,
        sensoryNotes: formData.sensoryNotes || undefined,
        issues: issues.length > 0 ? issues : undefined,
        generalNotes: formData.generalNotes || undefined,
        adjustmentsNeeded: formData.adjustmentsNeeded || undefined,
        nextSteps: formData.nextSteps || undefined,
        readyForProduction: formData.readyForProduction,
      }

      await createOrUpdateTestResults(input)

      // Save cost data if any costs were provided
      const hasCosts = costData.packagingCost || costData.laborCost || costData.overheadCost
      if (hasCosts) {
        await updateTestBatchCosts({
          testBatchId,
          packagingCost: costData.packagingCost ? parseFloat(costData.packagingCost) : undefined,
          laborCost: costData.laborCost ? parseFloat(costData.laborCost) : undefined,
          overheadCost: costData.overheadCost ? parseFloat(costData.overheadCost) : undefined,
        })
      }

      onSuccess()
    } catch (err) {
      console.error('Failed to save test results:', err)
      setError('Failed to save test results. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const addIssue = () => {
    setIssues([...issues, { type: '', severity: 'medium', description: '' }])
  }

  const removeIssue = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index))
  }

  const updateIssue = (index: number, field: keyof Issue, value: string) => {
    const updated = [...issues]
    updated[index] = { ...updated[index], [field]: value }
    setIssues(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Record Test Results</h2>
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

          <div className="space-y-6">
            {/* Yield Results */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Yield Results</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Actual Yield</label>
                  {expectedYield && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Expected: {expectedYield} {expectedYieldUnit}
                    </p>
                  )}
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actualYield}
                    onChange={(e) => setFormData({ ...formData, actualYield: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="e.g., 4.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    value={formData.actualYieldUnit}
                    onChange={(e) => setFormData({ ...formData, actualYieldUnit: e.target.value })}
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
            </section>

            {/* Quality Assessment */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Quality Assessment</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData({ ...formData, qualityRating: rating })}
                        className={`text-3xl transition-colors ${
                          rating <= formData.qualityRating
                            ? 'text-yellow-500'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.passedRequirements}
                    onChange={(e) =>
                      setFormData({ ...formData, passedRequirements: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Passed All Requirements
                  </span>
                </label>
              </div>
            </section>

            {/* Detailed Observations */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Detailed Observations
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Appearance Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.appearanceNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, appearanceNotes: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Color, texture, clarity..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Viscosity Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.viscosityNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, viscosityNotes: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Thickness, flow characteristics..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scent Notes</label>
                  <textarea
                    rows={3}
                    value={formData.scentNotes}
                    onChange={(e) => setFormData({ ...formData, scentNotes: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Fragrance intensity, notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stability Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.stabilityNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, stabilityNotes: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Separation, phase changes..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Sensory Notes</label>
                <textarea
                  rows={3}
                  value={formData.sensoryNotes}
                  onChange={(e) => setFormData({ ...formData, sensoryNotes: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  placeholder="Feel, absorption, skin feel..."
                />
              </div>
            </section>

            {/* Issues Tracking */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Issues Encountered</h3>
                <button
                  type="button"
                  onClick={addIssue}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Issue
                </button>
              </div>
              {issues.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No issues recorded</p>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Issue type (e.g., Separation)"
                            value={issue.type}
                            onChange={(e) => updateIssue(index, 'type', e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                          />
                          <select
                            value={issue.severity}
                            onChange={(e) =>
                              updateIssue(index, 'severity', e.target.value)
                            }
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                          >
                            <option value="low">Low Severity</option>
                            <option value="medium">Medium Severity</option>
                            <option value="high">High Severity</option>
                          </select>
                          <textarea
                            placeholder="Description..."
                            rows={2}
                            value={issue.description}
                            onChange={(e) =>
                              updateIssue(index, 'description', e.target.value)
                            }
                            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeIssue(index)}
                          className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Next Steps */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Notes & Next Steps</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    General Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.generalNotes}
                    onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Overall observations, team feedback..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adjustments Needed
                  </label>
                  <textarea
                    rows={3}
                    value={formData.adjustmentsNeeded}
                    onChange={(e) =>
                      setFormData({ ...formData, adjustmentsNeeded: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Formula modifications, process changes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Next Steps</label>
                  <textarea
                    rows={3}
                    value={formData.nextSteps}
                    onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    placeholder="Run another test, adjust ingredients, stability testing..."
                  />
                </div>
              </div>
            </section>

            {/* Cost Tracking */}
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Cost Tracking (Optional)</h3>
              <p className="mt-1 text-xs text-gray-600">
                Ingredient cost is automatically calculated from the formula. Add optional costs below to track total R&D expenses.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Packaging Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costData.packagingCost}
                    onChange={(e) => setCostData({ ...costData, packagingCost: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Labor Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costData.laborCost}
                    onChange={(e) => setCostData({ ...costData, laborCost: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Overhead Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costData.overheadCost}
                    onChange={(e) => setCostData({ ...costData, overheadCost: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                </div>
              </div>
            </section>

            {/* Production Readiness */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.readyForProduction}
                  onChange={(e) =>
                    setFormData({ ...formData, readyForProduction: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">
                    Ready for Production
                  </span>
                  <p className="text-xs text-gray-600">
                    Check this if the formula is ready to be graduated to production
                  </p>
                </div>
              </label>
            </section>
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
              Save Results
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
