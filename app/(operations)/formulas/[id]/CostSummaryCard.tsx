'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import {
  computeFormulaUnitCost,
  FormulaCostingResult,
  updateFormulaUnitSettings,
} from '@/app/(operations)/formulas/_actions/costing'

type CostSummaryCardProps = {
  formulaId: string
  initialData: FormulaCostingResult
}

type EditableFieldState = {
  unitSizeValue: string
  unitSizeUnit: string
  yieldPct: string
}

const UNIT_OPTIONS = ['g', 'mL', 'each']

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatQuantity(value: number | null | undefined, unit?: string | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
  return unit ? `${formatted} ${unit}` : formatted
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getErrorMessage(err: unknown): string {
  if (!err) return 'Something went wrong'
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Something went wrong'
}

export function CostSummaryCard({ formulaId, initialData }: CostSummaryCardProps) {
  const [data, setData] = useState<FormulaCostingResult>(initialData)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<boolean>(() => {
    const missingSize = !initialData.header.unit_size.value || !initialData.header.unit_size.unit
    return missingSize
  })
  const [fields, setFields] = useState<EditableFieldState>({
    unitSizeValue: initialData.header.unit_size.value?.toString() ?? '',
    unitSizeUnit: initialData.header.unit_size.unit ?? '',
    yieldPct: initialData.header.yield_pct?.toString() ?? '100',
  })
  const [showIngredients, setShowIngredients] = useState(true)
  const [showPackaging, setShowPackaging] = useState(false)

  const costPerContentLabel = useMemo(() => {
    const unit = data.header.unit_size.unit?.toLowerCase()
    if (!unit || data.totals.costPerContentUnit === null) return null
    if (unit === 'g' || unit === 'gram' || unit === 'grams') return 'Cost per gram'
    if (unit === 'ml' || unit === 'milliliter' || unit === 'milliliters') return 'Cost per milliliter'
    return null
  }, [data])

  function resetFieldsFromData(next: FormulaCostingResult) {
    setFields({
      unitSizeValue: next.header.unit_size.value?.toString() ?? '',
      unitSizeUnit: next.header.unit_size.unit ?? '',
      yieldPct: next.header.yield_pct?.toString() ?? '100',
    })
  }

  function validateFields(): { unitSizeValue: number | null; unitSizeUnit: string | null; yieldPct: number | null } {
    const unitSizeValue = parseNumber(fields.unitSizeValue)
    const unitSizeUnit = fields.unitSizeUnit ? fields.unitSizeUnit : null
    const yieldPct = parseNumber(fields.yieldPct)

    if ((unitSizeValue === null || !unitSizeUnit) && editing) {
      throw new Error('Unit size value and unit are required.')
    }

    if (yieldPct !== null && (yieldPct <= 0 || yieldPct > 999)) {
      throw new Error('Yield % must be greater than 0 and less than 1000.')
    }

    return { unitSizeValue, unitSizeUnit, yieldPct }
  }

  async function executeRecalculation() {
    setError(null)
    startTransition(async () => {
      try {
        const fresh = await computeFormulaUnitCost(formulaId)
        setData(fresh)
        if (!editing) {
          resetFieldsFromData(fresh)
        }
      } catch (err) {
        setError(getErrorMessage(err))
      }
    })
  }

  async function handleSave() {
    try {
      const payload = validateFields()
      setError(null)
      startTransition(async () => {
        try {
          const updated = await updateFormulaUnitSettings(formulaId, payload)
          setData(updated)
          resetFieldsFromData(updated)
          setEditing(false)
        } catch (err) {
          setError(getErrorMessage(err))
        }
      })
    } catch (validationError) {
      setError(getErrorMessage(validationError))
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cost Summary</h2>
          <p className="text-sm text-gray-500">Per-unit material and packaging costs, adjusted for yield.</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1a5c51] disabled:cursor-not-allowed disabled:bg-[#174940]/60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save &amp; Recalculate
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  resetFieldsFromData(data)
                  setError(null)
                }}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Adjust Unit Size
            </button>
          )}
          <button
            type="button"
            onClick={executeRecalculation}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recalculate
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-gray-200 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unit Size</span>
          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={fields.unitSizeValue}
                onChange={(event) =>
                  setFields((prev) => ({
                    ...prev,
                    unitSizeValue: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-2 focus:ring-[#174940]/20"
                placeholder="Quantity"
              />
              <select
                value={fields.unitSizeUnit}
                onChange={(event) =>
                  setFields((prev) => ({
                    ...prev,
                    unitSizeUnit: event.target.value,
                  }))
                }
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-2 focus:ring-[#174940]/20"
              >
                <option value="">Select unit</option>
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {data.header.unit_size.value
                ? formatQuantity(data.header.unit_size.value, data.header.unit_size.unit)
                : 'Not set'}
            </p>
          )}
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Yield %</span>
          {editing ? (
            <div className="mt-2">
              <input
                type="number"
                step="0.1"
                min="0"
                value={fields.yieldPct}
                onChange={(event) =>
                  setFields((prev) => ({
                    ...prev,
                    yieldPct: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-[#174940] focus:outline-none focus:ring-2 focus:ring-[#174940]/20"
              />
            </div>
          ) : (
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatQuantity(data.header.yield_pct, '%')}
            </p>
          )}
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ingredients Subtotal</span>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(data.totals.ingredientsSubtotal)}</p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Packaging Subtotal</span>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(data.totals.packagingSubtotal)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-[#174940] px-4 py-5 text-white shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Total Cost per Unit</span>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(data.totals.totalUnitCost)}</p>
        </div>
        {costPerContentLabel && data.totals.costPerContentUnit !== null ? (
          <div className="rounded-md border border-gray-200 px-4 py-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {costPerContentLabel}
            </span>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {formatCurrency(data.totals.costPerContentUnit)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Ingredients Table */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowIngredients((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>Ingredients Breakdown</span>
          {showIngredients ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {showIngredients ? (
          <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Phase</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Qty (base)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Unit Cost</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Line Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.breakdown.ingredients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No ingredients found.
                    </td>
                  </tr>
                ) : (
                  data.breakdown.ingredients.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">
                        {line.itemId ? (
                          <Link
                            href={`/inventory/items/${line.itemId}`}
                            className="text-[#174940] hover:underline"
                          >
                            {line.name}
                          </Link>
                        ) : (
                          line.name
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{line.phase ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {formatQuantity(line.qtyBase, line.baseUnit ?? undefined)}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{formatCurrency(line.unitCost)}</td>
                      <td className="px-4 py-2 text-gray-900">{formatCurrency(line.lineCost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Packaging Table */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowPackaging((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>Packaging Breakdown</span>
          {showPackaging ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {showPackaging ? (
          <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Qty (base)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Unit Cost</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Line Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.breakdown.packaging.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No packaging records found.
                    </td>
                  </tr>
                ) : (
                  data.breakdown.packaging.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">
                        {line.itemId ? (
                          <Link href={`/inventory/items/${line.itemId}`} className="text-[#174940] hover:underline">
                            {line.name}
                          </Link>
                        ) : (
                          line.name
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {formatQuantity(line.qtyBase, line.baseUnit ?? undefined)}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{formatCurrency(line.unitCost)}</td>
                      <td className="px-4 py-2 text-gray-900">{formatCurrency(line.lineCost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Warnings */}
      {(data.warnings.missingPrices.length > 0 || data.warnings.missingDensities.length > 0) && (
        <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Warnings</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {data.warnings.missingPrices.map((item) => (
              <li key={`price-${item.id}`}>
                Missing price for{' '}
                <Link href={`/inventory/items/${item.id}`} className="underline">
                  {item.name}
                </Link>
              </li>
            ))}
            {data.warnings.missingDensities.map((item) => (
              <li key={`density-${item.id}`}>
                Density required for{' '}
                <Link href={`/inventory/items/${item.id}`} className="underline">
                  {item.name}
                </Link>{' '}
                to convert g ↔ mL.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
