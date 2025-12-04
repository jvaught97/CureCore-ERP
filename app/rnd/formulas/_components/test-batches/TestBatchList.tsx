'use client'

import { useState } from 'react'
import { BeakerIcon, PlayIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react'

type TestBatch = {
  id: string
  test_number: number
  batch_code: string
  batch_size: number
  batch_size_unit: string
  expected_yield?: number | null
  expected_yield_unit?: string | null
  test_date?: string | null
  completed_date?: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'failed'
  total_batch_cost?: number | null
  rd_test_results?: Array<{
    id: string
    actual_yield?: number | null
    yield_percentage?: number | null
    quality_rating?: number | null
    passed_requirements: boolean
    ready_for_production: boolean
  }>
  created_at: string
}

type TestBatchListProps = {
  batches: TestBatch[]
  onViewBatch: (batchId: string) => void
  onRunNewBatch: () => void
}

export function TestBatchList({ batches, onViewBatch, onRunNewBatch }: TestBatchListProps) {
  if (batches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No Test Batches Yet</h3>
        <p className="mt-2 text-sm text-gray-600">
          Run your first test batch to start validating this formula.
        </p>
        <button
          onClick={onRunNewBatch}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
        >
          <PlayIcon className="h-4 w-4" />
          Run Test Batch
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Test Batches ({batches.length})
        </h3>
        <button
          onClick={onRunNewBatch}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
        >
          <PlayIcon className="h-4 w-4" />
          Run Test Batch
        </button>
      </div>

      <div className="space-y-3">
        {batches.map((batch) => (
          <TestBatchCard
            key={batch.id}
            batch={batch}
            onView={() => onViewBatch(batch.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TestBatchCard({ batch, onView }: { batch: TestBatch; onView: () => void }) {
  const result = batch.rd_test_results?.[0]

  const statusConfig = {
    planned: { icon: ClockIcon, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Planned' },
    in_progress: { icon: PlayIcon, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' },
    completed: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' },
    failed: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' },
  }

  const config = statusConfig[batch.status]
  const StatusIcon = config.icon

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="text-lg font-semibold text-gray-900">
              Test #{batch.test_number}
            </h4>
            <span className="rounded bg-[#174940]/10 px-2 py-1 text-xs font-medium text-[#174940]">
              {batch.batch_code}
            </span>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {config.label}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div>
              <span className="text-gray-600">Batch Size:</span>
              <span className="ml-2 font-medium text-gray-900">
                {batch.batch_size} {batch.batch_size_unit}
              </span>
            </div>
            {batch.expected_yield && (
              <div>
                <span className="text-gray-600">Expected Yield:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {batch.expected_yield} {batch.expected_yield_unit}
                </span>
              </div>
            )}
            {result && result.actual_yield && (
              <div>
                <span className="text-gray-600">Actual Yield:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {result.actual_yield} ({result.yield_percentage?.toFixed(1)}%)
                </span>
              </div>
            )}
            {batch.total_batch_cost !== null && batch.total_batch_cost !== undefined && batch.total_batch_cost > 0 && (
              <div>
                <span className="text-gray-600">Total Cost:</span>
                <span className="ml-2 font-semibold text-green-700">
                  ${batch.total_batch_cost.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {result && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {result.quality_rating && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Quality:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= result.quality_rating! ? 'text-yellow-500' : 'text-gray-300'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.passed_requirements && (
                <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  Passed Requirements
                </span>
              )}
              {result.ready_for_production && (
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                  Ready for Production
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            {batch.test_date && (
              <span>Test Date: {new Date(batch.test_date).toLocaleDateString()}</span>
            )}
            {batch.completed_date && (
              <span>Completed: {new Date(batch.completed_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <button
          onClick={onView}
          className="whitespace-nowrap rounded-md border border-[#174940] px-3 py-2 text-sm font-medium text-[#174940] hover:bg-[#174940]/5"
        >
          View Details
        </button>
      </div>
    </div>
  )
}
