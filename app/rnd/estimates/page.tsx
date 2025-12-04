'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { Loader2, Plus, ArrowRight, FileDown } from 'lucide-react'

type EstimateListRow = {
  id: string
  title: string
  created_at: string | null
  rd_formula_id: string | null
  material_cost_per_unit: number | null
  landed_cost_per_unit: number | null
  total_variable_cost_per_unit: number | null
  gross_margin_pct: number | null
  rd_formulas?: { name: string | null; version: string | null } | null
}

export default function RdEstimatesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estimates, setEstimates] = useState<EstimateListRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('rd_launch_estimates')
          .select(
            `
              id,
              title,
              created_at,
              rd_formula_id,
              material_cost_per_unit,
              landed_cost_per_unit,
              total_variable_cost_per_unit,
              gross_margin_pct,
              rd_formulas (name, version)
            `,
          )
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code === '42P01') {
            console.info('rd_launch_estimates table not available yet.')
            if (isMounted) setEstimates([])
          } else {
            console.error('Failed to load launch estimates', error)
            if (isMounted) setError('Unable to load launch estimates. Please try again later.')
          }
          return
        }

        if (isMounted) setEstimates(data ?? [])
      } catch (err) {
        console.error('Unexpected error loading estimates', err)
        if (isMounted) setError('Unable to load launch estimates. Please try again later.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="rnd" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Launch Estimations</h1>
            <p className="text-sm text-gray-600">
              Plan the costs to bring R&amp;D formulas to market, including materials, packaging, landed costs, and margin targets.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/rnd/estimates/new')}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Launch Estimation
            </button>
          </div>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Estimates Library</h2>
              <p className="text-sm text-gray-500">
                Track costing scenarios and compare margin outcomes across formulas.
              </p>
            </div>
            <button
              onClick={() => router.push('/rnd/formulas')}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileDown className="h-4 w-4" />
              Manage R&amp;D Formulas
            </button>
          </div>
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#174940]" />
                Loading launch estimations…
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : estimates.length === 0 ? (
              <EmptyState onCreate={() => router.push('/rnd/estimates/new')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Formula</th>
                      <th className="px-4 py-3 text-right">Materials / Unit</th>
                      <th className="px-4 py-3 text-right">Landed / Unit</th>
                      <th className="px-4 py-3 text-right">Total Cost / Unit</th>
                      <th className="px-4 py-3 text-right">Gross Margin %</th>
                      <th className="px-4 py-3 text-right">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {estimates.map((estimate) => (
                      <tr key={estimate.id} className="bg-white">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{estimate.title}</span>
                        </td>
                        <td className="px-4 py-3">
                          {estimate.rd_formulas?.name ? (
                            <>
                              {estimate.rd_formulas.name}{' '}
                              <span className="text-xs text-gray-500">
                                ({estimate.rd_formulas.version ?? 'v1'})
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(estimate.material_cost_per_unit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(estimate.landed_cost_per_unit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(estimate.total_variable_cost_per_unit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {estimate.gross_margin_pct != null
                            ? `${estimate.gross_margin_pct.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {estimate.created_at
                            ? new Date(estimate.created_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => router.push(`/rnd/estimates/${estimate.id}`)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#174940] px-3 py-1.5 text-xs font-semibold text-[#174940] hover:bg-[#174940]/5"
                          >
                            Open
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
      <p>No launch estimations yet. Plan the first launch to estimate materials, labor, and margins.</p>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New Launch Estimation
      </button>
    </div>
  )
}

function formatCurrency(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `$${value.toFixed(2)}`
}
