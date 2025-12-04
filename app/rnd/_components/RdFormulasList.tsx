'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Beaker, Calendar, Trash2 } from 'lucide-react'
import { deleteRDFormula } from '../_actions'

export type RdFormula = {
  id: string
  name: string
  version: string
  notes?: string | null
  created_at: string
  status?: string
  rd_formula_ingredients?: { count: number }[] | { count: number }
}

type RdFormulasListProps = {
  formulas: RdFormula[]
  onRefresh: () => void
}

export function RdFormulasList({ formulas, onRefresh }: RdFormulasListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, formulaId: string, formulaName: string) => {
    e.stopPropagation() // Prevent card click from navigating

    if (!confirm(`Are you sure you want to delete "${formulaName}"? This will also delete all associated test batches and results.`)) {
      return
    }

    setDeletingId(formulaId)
    try {
      await deleteRDFormula(formulaId)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete formula:', error)
      alert('Failed to delete formula. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (formulas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <Beaker className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No R&D Formulas Yet</h3>
        <p className="mt-2 text-sm text-gray-600">
          Create your first R&D formula to start experimenting.
        </p>
        <button
          onClick={() => router.push('/rnd/formulas/new')}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
        >
          <Beaker className="h-4 w-4" />
          Create Formula
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          R&D Formulas ({formulas.length})
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {formulas.map((formula) => {
          const ingredientCount = Array.isArray(formula.rd_formula_ingredients)
            ? formula.rd_formula_ingredients.length
            : (formula.rd_formula_ingredients as any)?.count || 0

          return (
            <div
              key={formula.id}
              onClick={() => router.push(`/rnd/formulas/${formula.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#174940] hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{formula.name}</h4>
                  <p className="text-sm text-gray-500">v{formula.version}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, formula.id, formula.name)}
                    disabled={deletingId === formula.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Delete formula"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Beaker className="h-5 w-5 text-[#174940]" />
                </div>
              </div>

              {formula.notes && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {formula.notes}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                <span>{ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(formula.created_at).toLocaleDateString()}
                </div>
              </div>

              {formula.status && (
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {formula.status}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
