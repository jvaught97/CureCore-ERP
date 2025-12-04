'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import {
  createEstimate,
  updateEstimate,
  duplicateEstimate,
  type LaunchEstimatePayload,
} from '@/app/rnd/_actions/estimates'
import { toBaseUnit, computeCostPerBaseUnit, computeMaterialCostPerUnit, amortize, breakEvenUnits, grossMargin } from '@/lib/estimator/math'
import { v4 as uuidv4 } from 'uuid'
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Copy,
  Download,
} from 'lucide-react'

type Unit =
  | 'g'
  | 'kg'
  | 'mg'
  | 'lb'
  | 'oz'
  | 'ml'
  | 'l'
  | 'unit'

const UNIT_OPTIONS: Unit[] = ['g', 'kg', 'mg', 'lb', 'oz', 'ml', 'l', 'unit']

type FormulaOption = {
  id: string
  name: string
  version: string
}

export type EstimateInitialState = {
  id?: string
  title?: string
  rdFormulaId?: string
  packSizeValue?: number | null
  packSizeUnit?: string | null
  targetLaunchVolumeUnits?: number | null
  freight?: number | null
  dutyTax?: number | null
  insurance?: number | null
  handling?: number | null
  contingencyPct?: number | null
  toolingNre?: number | null
  certificationTesting?: number | null
  labelDesign?: number | null
  materialWastePct?: number | null
  laborLearningPct?: number | null
  laborRatePerHour?: number | null
  laborHoursPerUnit?: number | null
  overheadAllocationPerUnit?: number | null
  proposedPrice?: number | null
  channelFeesPct?: number | null
  lineItems?: Array<LineItemState>
}

type LineItemState = {
  uid: string
  itemType: 'ingredient' | 'packaging' | 'other'
  sourceType?: 'inventory' | 'rd'
  ingredientId?: string
  rdIngredientId?: string
  name: string
  needPurchase: boolean
  inStock: boolean
  packSizeValue: string
  packSizeUnit: Unit
  packPrice: string
  density: string
  qtyPerUnit: string
  qtyPerUnitUnit: Unit
  wastePct: string
  supplierId?: string
  notes?: string
}

function createEmptyLine(itemType: 'ingredient' | 'packaging' | 'other'): LineItemState {
  return {
    uid: uuidv4(),
    itemType,
    sourceType: itemType === 'ingredient' ? 'inventory' : undefined,
    name: '',
    needPurchase: true,
    inStock: false,
    packSizeValue: '',
    packSizeUnit: itemType === 'packaging' ? 'unit' : 'g',
    packPrice: '',
    density: '',
    qtyPerUnit: '',
    qtyPerUnitUnit: itemType === 'packaging' ? 'unit' : 'g',
    wastePct: '',
    supplierId: '',
    notes: '',
  }
}

type EstimateFormProps = {
  mode: 'create' | 'edit'
  initialState?: EstimateInitialState
  estimateId?: string
}

type FormulaIngredientRow = {
  source_type: 'inventory' | 'rd'
  ingredient_id: string | null
  rd_ingredient_id: string | null
  qty: number | null
  unit: string | null
  in_stock: boolean | null
  need_purchase: boolean | null
  ingredients?: { name?: string | null } | null
  rd_ingredients?: { name?: string | null } | null
}

export default function EstimateForm({ mode, initialState, estimateId }: EstimateFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [formulas, setFormulas] = useState<FormulaOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [dupLoading, setDupLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const [title, setTitle] = useState(initialState?.title ?? '')
  const [rdFormulaId, setRdFormulaId] = useState(initialState?.rdFormulaId ?? '')
  const [packSizeValue, setPackSizeValue] = useState(initialState?.packSizeValue?.toString() ?? '')
  const [packSizeUnit, setPackSizeUnit] = useState<Unit>(
    (initialState?.packSizeUnit as Unit) ?? 'ml',
  )
  const [targetVolume, setTargetVolume] = useState(
    initialState?.targetLaunchVolumeUnits?.toString() ?? '',
  )
  const [freight, setFreight] = useState(initialState?.freight?.toString() ?? '')
  const [dutyTax, setDutyTax] = useState(initialState?.dutyTax?.toString() ?? '')
  const [insurance, setInsurance] = useState(initialState?.insurance?.toString() ?? '')
  const [handling, setHandling] = useState(initialState?.handling?.toString() ?? '')
  const [contingencyPct, setContingencyPct] = useState(
    initialState?.contingencyPct?.toString() ?? '',
  )
  const [toolingNre, setToolingNre] = useState(initialState?.toolingNre?.toString() ?? '')
  const [certificationTesting, setCertificationTesting] = useState(
    initialState?.certificationTesting?.toString() ?? '',
  )
  const [labelDesign, setLabelDesign] = useState(initialState?.labelDesign?.toString() ?? '')
  const [materialWastePct, setMaterialWastePct] = useState(
    initialState?.materialWastePct?.toString() ?? '',
  )
  const [laborLearningPct, setLaborLearningPct] = useState(
    initialState?.laborLearningPct?.toString() ?? '',
  )
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialState?.laborRatePerHour?.toString() ?? '',
  )
  const [laborHoursPerUnit, setLaborHoursPerUnit] = useState(
    initialState?.laborHoursPerUnit?.toString() ?? '',
  )
  const [overheadPerUnit, setOverheadPerUnit] = useState(
    initialState?.overheadAllocationPerUnit?.toString() ?? '',
  )
  const [proposedPrice, setProposedPrice] = useState(
    initialState?.proposedPrice?.toString() ?? '',
  )
  const [channelFeesPct, setChannelFeesPct] = useState(
    initialState?.channelFeesPct?.toString() ?? '',
  )

  const [lineItems, setLineItems] = useState<LineItemState[]>(
    initialState?.lineItems
      ? initialState.lineItems
      : [],
  )

  const isInformationalError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const err = error as { code?: string | null; message?: string | null }
    if (err.code === '42P01' || err.code === 'PGRST116') return true
    if (!err.code) {
      const hasMessage = typeof err.message === 'string' && err.message.trim().length > 0
      if (!hasMessage) return true
    }
    return Object.keys(err).length === 0
  }

  useEffect(() => {
    let isMounted = true
    const loadFormulas = async () => {
      setLoadingOptions(true)
      try {
        const { data, error } = await supabase
          .from('rd_formulas')
          .select('id,name,version')
          .order('created_at', { ascending: false })
        if (error) {
          if (isInformationalError(error)) {
            console.info('R&D formulas not available yet.')
            if (isMounted) setFormulas([])
          } else {
            console.error('Failed to load formulas', error)
            if (isMounted) setMessage('Unable to load R&D formulas. Check permissions.')
          }
          return
        }
        if (isMounted) setFormulas(data ?? [])
      } finally {
        if (isMounted) setLoadingOptions(false)
      }
    }
    loadFormulas()
    return () => {
      isMounted = false
    }
  }, [supabase])

  useEffect(() => {
    if (!rdFormulaId || mode === 'edit') return
    let isMounted = true
    const hydrateFromFormula = async () => {
      try {
        const { data, error } = await supabase
          .from('rd_formula_ingredients')
          .select(
            `
              source_type,
              ingredient_id,
              rd_ingredient_id,
              qty,
              unit,
              in_stock,
              need_purchase,
              ingredients (name),
              rd_ingredients (name)
            `,
          )
          .eq('rd_formula_id', rdFormulaId)

        if (error) {
          if (isInformationalError(error)) {
            console.info('rd_formula_ingredients not ready yet.')
            return
          }
          console.error('Failed to load formula ingredients', error)
          setMessage('Unable to load formula ingredients.')
          return
        }

        if (!data || !isMounted) return

        const ingredients: LineItemState[] = data.map((row: FormulaIngredientRow) => ({
          uid: uuidv4(),
          itemType: 'ingredient',
          sourceType: row.source_type ?? 'inventory',
          ingredientId: row.ingredient_id ?? undefined,
          rdIngredientId: row.rd_ingredient_id ?? undefined,
          name:
            row.source_type === 'rd'
              ? row.rd_ingredients?.name ?? 'R&D Ingredient'
              : row.ingredients?.name ?? 'Inventory Ingredient',
          needPurchase:
            row.need_purchase ??
            (row.source_type === 'rd' ? true : !(row.in_stock ?? false)),
          inStock: row.in_stock ?? false,
          packSizeValue: '',
          packSizeUnit: 'g',
          packPrice: '',
          density: '',
          qtyPerUnit: row.qty != null ? String(row.qty) : '',
          qtyPerUnitUnit: (row.unit as Unit) ?? 'g',
          wastePct: '',
          supplierId: '',
          notes: '',
        }))

        if (isMounted) setLineItems(ingredients)
      } catch (err) {
        console.error('Unexpected error hydrating ingredients', err)
      }
    }
    hydrateFromFormula()
    return () => {
      isMounted = false
    }
  }, [rdFormulaId, mode, supabase])

  const totals = useMemo(() => {
    const targetUnits = Number(targetVolume) || 0
    const waste = Number(materialWastePct) || 0
    const contingency = Number(contingencyPct) || 0
    const laborLearning = Number(laborLearningPct) || 0
    const laborRate = Number(laborRatePerHour) || 0
    const laborHours = Number(laborHoursPerUnit) || 0
    const overhead = Number(overheadPerUnit) || 0
    const price = Number(proposedPrice) || 0
    const channelPct = Number(channelFeesPct) || 0

    let materialCostPerUnit = 0

    const enrichedLines = lineItems.map((item) => {
      const qty = Number(item.qtyPerUnit) || 0
      const packValue = Number(item.packSizeValue) || 0
      const packUnit = item.packSizeUnit
      const packPrice = Number(item.packPrice) || 0
      const density = Number(item.density) || undefined
      const wastePct = Number(item.wastePct) || waste

      const costPerBase = computeCostPerBaseUnit(
        packPrice,
        packValue,
        packUnit,
        density,
      )
      const qtyBase = toBaseUnit(qty, item.qtyPerUnitUnit, density)
      const costPerUnit = computeMaterialCostPerUnit(qtyBase, costPerBase, wastePct)
      if (item.itemType !== 'other') materialCostPerUnit += costPerUnit
      return {
        ...item,
        derivedCostPerBase: costPerBase,
        derivedQtyBase: qtyBase,
        derivedCostPerUnit: costPerUnit,
      }
    })

    const freightVal = Number(freight) || 0
    const dutyVal = Number(dutyTax) || 0
    const insuranceVal = Number(insurance) || 0
    const handlingVal = Number(handling) || 0
    const landedTotal = freightVal + dutyVal + insuranceVal + handlingVal
    const landedPerUnit = targetUnits > 0 ? landedTotal / targetUnits : 0

    const toolingVal = Number(toolingNre) || 0
    const certificationVal = Number(certificationTesting) || 0
    const labelVal = Number(labelDesign) || 0
    const amortizedFixed = amortize(toolingVal + certificationVal + labelVal, targetUnits || 1)

    const laborCost = laborRate * laborHours * (1 + laborLearning / 100)
    const contingencyPerUnit =
      (materialCostPerUnit + landedPerUnit + laborCost + overhead) * (contingency / 100)

    const totalVariableCost =
      materialCostPerUnit +
      landedPerUnit +
      laborCost +
      overhead +
      amortizedFixed +
      contingencyPerUnit

    const marginPct = grossMargin(price, totalVariableCost, channelPct)
    const breakEven = breakEvenUnits(
      toolingVal + certificationVal + labelVal,
      price,
      totalVariableCost,
    )

    const packValue = Number(packSizeValue) || 0
    const costPerFinishedUnit = packValue > 0 ? totalVariableCost / packValue : totalVariableCost

    return {
      lines: enrichedLines,
      materialCostPerUnit,
      landedPerUnit,
      laborCostPerUnit: laborCost,
      overheadPerUnit: overhead,
      amortizedFixed,
      contingencyPerUnit,
      totalVariableCost,
      grossMarginPct: Number.isFinite(marginPct) ? marginPct : null,
      breakEvenUnits: Number.isFinite(breakEven) ? breakEven : null,
      costPerFinishedUnit,
    }
  }, [
    lineItems,
    materialWastePct,
    contingencyPct,
    laborLearningPct,
    laborRatePerHour,
    laborHoursPerUnit,
    overheadPerUnit,
    proposedPrice,
    channelFeesPct,
    freight,
    dutyTax,
    insurance,
    handling,
    toolingNre,
    certificationTesting,
    labelDesign,
    packSizeValue,
    targetVolume,
  ])

  const moveLine = (uid: string, direction: 'up' | 'down') => {
    setLineItems((prev) => {
      const index = prev.findIndex((line) => line.uid === uid)
      if (index === -1) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleLineChange = (uid: string, patch: Partial<LineItemState>) => {
    setLineItems((prev) =>
      prev.map((line) => (line.uid === uid ? { ...line, ...patch } : line)),
    )
  }

  const handleRemoveLine = (uid: string) => {
    setLineItems((prev) => prev.filter((line) => line.uid !== uid))
  }

  const resetMessages = () => setMessage(null)

  const validate = () => {
    if (!title.trim()) return 'Title is required.'
    if (!rdFormulaId) return 'Select an R&D formula.'
    if (lineItems.length === 0) return 'Add at least one line item.'
    for (const line of lineItems) {
      if (!line.name.trim()) return 'Each line item requires a name.'
      if (!line.qtyPerUnit || Number(line.qtyPerUnit) <= 0) {
        return 'Each line item requires quantity per unit.'
      }
      if (!line.qtyPerUnitUnit) return 'Provide a unit for quantity per unit.'
      if (line.needPurchase && (!line.packSizeValue || !line.packPrice)) {
        return 'Enter pack size and price for purchases.'
      }
    }
    return null
  }

  const buildPayload = (): LaunchEstimatePayload => {
    return {
      title: title.trim(),
      rdFormulaId,
      packSizeValue: packSizeValue ? Number(packSizeValue) : null,
      packSizeUnit,
      targetLaunchVolumeUnits: targetVolume ? Number(targetVolume) : null,
      freight: freight ? Number(freight) : null,
      dutyTax: dutyTax ? Number(dutyTax) : null,
      insurance: insurance ? Number(insurance) : null,
      handling: handling ? Number(handling) : null,
      contingencyPct: contingencyPct ? Number(contingencyPct) : null,
      toolingNre: toolingNre ? Number(toolingNre) : null,
      certificationTesting: certificationTesting ? Number(certificationTesting) : null,
      labelDesign: labelDesign ? Number(labelDesign) : null,
      materialWastePct: materialWastePct ? Number(materialWastePct) : null,
      laborLearningPct: laborLearningPct ? Number(laborLearningPct) : null,
      laborRatePerHour: laborRatePerHour ? Number(laborRatePerHour) : null,
      laborHoursPerUnit: laborHoursPerUnit ? Number(laborHoursPerUnit) : null,
      overheadAllocationPerUnit: overheadPerUnit ? Number(overheadPerUnit) : null,
      proposedPrice: proposedPrice ? Number(proposedPrice) : null,
      channelFeesPct: channelFeesPct ? Number(channelFeesPct) : null,
      lineItems: lineItems.map((line) => ({
        itemType: line.itemType,
        sourceType: line.sourceType,
        ingredientId: line.ingredientId,
        rdIngredientId: line.rdIngredientId,
        name: line.name.trim(),
        needPurchase: line.needPurchase,
        inStock: line.inStock,
        packSizeValue: line.packSizeValue ? Number(line.packSizeValue) : null,
        packSizeUnit: line.packSizeUnit,
        packPrice: line.packPrice ? Number(line.packPrice) : null,
        density: line.density ? Number(line.density) : null,
        qtyPerUnit: line.qtyPerUnit ? Number(line.qtyPerUnit) : null,
        qtyPerUnitUnit: line.qtyPerUnitUnit,
        wastePct: line.wastePct ? Number(line.wastePct) : null,
        supplierId: line.supplierId?.trim() || null,
        notes: line.notes?.trim() || null,
      })),
    }
  }

  const handleSubmit = () => {
    resetMessages()
    const validation = validate()
    if (validation) {
      setMessage(validation)
      return
    }
    const payload = buildPayload()
    startSaving(async () => {
      try {
        if (mode === 'edit' && estimateId) {
          await updateEstimate(estimateId, payload)
        } else {
          const newId = await createEstimate(payload)
          router.push(`/rnd/estimates/${newId}`)
          return
        }
        router.push(estimateId ? `/rnd/estimates/${estimateId}` : '/rnd/estimates')
      } catch (err) {
        const error = err as { code?: string; message?: string }
        console.error('Failed to save estimate', error)
        if (error?.code === '42501') {
          setMessage('Permission denied by RLS. Ensure you created the record and tables are configured.')
        } else {
          setMessage(error?.message ?? 'Failed to save the estimate. Please try again.')
        }
      }
    })
  }

  const handleDuplicate = async () => {
    if (!estimateId) return
    setDupLoading(true)
    try {
      const newId = await duplicateEstimate(estimateId)
      router.push(`/rnd/estimates/${newId}`)
    } catch (err) {
      console.error('Duplicate failed', err)
      setMessage('Unable to duplicate estimate.')
    } finally {
      setDupLoading(false)
    }
  }

  const handleExport = async () => {
    if (!estimateId) return
    setExportLoading(true)
    try {
      const res = await fetch(`/api/rnd/estimates/${estimateId}/export`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `launch_estimate_${estimateId}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
      setMessage('Unable to export estimate.')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">1. Formula &amp; Basics</h2>
            <p className="text-sm text-gray-500">
              Select the R&amp;D formula driving this launch and define pack size + volume targets.
            </p>
          </div>
          {mode === 'edit' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={dupLoading}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                {dupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Duplicate
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export
              </button>
            </div>
          )}
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Estimate Title <span className="text-red-500">*</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            R&amp;D Formula <span className="text-red-500">*</span>
            <select
              value={rdFormulaId}
              onChange={(event) => setRdFormulaId(event.target.value)}
              disabled={mode === 'edit'}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
            >
              <option value="">Select formula</option>
              {formulas.map((formula) => (
                <option key={formula.id} value={formula.id}>
                  {formula.name} ({formula.version})
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Pack Size
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={packSizeValue}
                  onChange={(event) => setPackSizeValue(event.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                <select
                  value={packSizeUnit}
                  onChange={(event) => setPackSizeUnit(event.target.value as Unit)}
                  className="w-28 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Launch Volume (units)
              <input
                type="number"
                min="0"
                value={targetVolume}
                onChange={(event) => setTargetVolume(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>
        </div>
        {loadingOptions && (
          <div className="px-5 pb-4 text-sm text-gray-500">Loading formulas…</div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">2. Materials &amp; Packaging</h2>
            <p className="text-sm text-gray-500">
              Specify what needs to be purchased for this launch along with pack economics.
            </p>
          </div>
          <button
            onClick={() => setLineItems((prev) => [...prev, createEmptyLine('ingredient')])}
            className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {lineItems.map((line, index) => (
            <div key={line.uid} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    #{index + 1} — {line.itemType.toUpperCase()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveLine(line.uid, 'up')}
                      disabled={index === 0}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLine(line.uid, 'down')}
                      disabled={index === lineItems.length - 1}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLine(line.uid)}
                  className="inline-flex items-center gap-1 rounded border border-transparent px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Line Type
                  <select
                    value={line.itemType}
                    onChange={(event) =>
                      handleLineChange(line.uid, {
                        itemType: event.target.value as LineItemState['itemType'],
                      })
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="ingredient">Ingredient</option>
                    <option value="packaging">Packaging</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                {line.itemType === 'ingredient' && (
                  <label className="flex flex-col gap-1 text-sm text-gray-600">
                    Source Type
                    <select
                      value={line.sourceType ?? 'inventory'}
                      onChange={(event) =>
                        handleLineChange(line.uid, {
                          sourceType: event.target.value as 'inventory' | 'rd',
                        })
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="inventory">Inventory</option>
                      <option value="rd">R&amp;D</option>
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-1 text-sm text-gray-600 md:col-span-2">
                  Name <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={line.name}
                    onChange={(event) => handleLineChange(line.uid, { name: event.target.value })}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-6 text-sm text-gray-600">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={line.needPurchase}
                    onChange={(event) =>
                      handleLineChange(line.uid, { needPurchase: event.target.checked })
                    }
                    className="rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                  />
                  Need Purchase?
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={line.inStock}
                    onChange={(event) =>
                      handleLineChange(line.uid, { inStock: event.target.checked })
                    }
                    className="rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                  />
                  In Stock?
                </label>
                <label className="flex flex-col gap-1">
                  Pack Size
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={line.packSizeValue}
                      onChange={(event) =>
                        handleLineChange(line.uid, { packSizeValue: event.target.value })
                      }
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                    <select
                      value={line.packSizeUnit}
                      onChange={(event) =>
                        handleLineChange(line.uid, { packSizeUnit: event.target.value as Unit })
                      }
                      className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      {UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  Pack Price
                  <input
                    type="number"
                    value={line.packPrice}
                    onChange={(event) =>
                      handleLineChange(line.uid, { packPrice: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Density (optional)
                  <input
                    type="number"
                    value={line.density}
                    onChange={(event) =>
                      handleLineChange(line.uid, { density: event.target.value })
                    }
                    placeholder="g/mL"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Waste %
                  <input
                    type="number"
                    value={line.wastePct}
                    onChange={(event) =>
                      handleLineChange(line.uid, { wastePct: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  Qty Used per Unit <span className="text-red-500">*</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={line.qtyPerUnit}
                      onChange={(event) =>
                        handleLineChange(line.uid, { qtyPerUnit: event.target.value })
                      }
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                    <select
                      value={line.qtyPerUnitUnit}
                      onChange={(event) =>
                        handleLineChange(line.uid, {
                          qtyPerUnitUnit: event.target.value as Unit,
                        })
                      }
                      className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      {UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  Supplier ID
                  <input
                    type="text"
                    value={line.supplierId ?? ''}
                    onChange={(event) =>
                      handleLineChange(line.uid, { supplierId: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-3">
                  Notes
                  <textarea
                    value={line.notes ?? ''}
                    onChange={(event) =>
                      handleLineChange(line.uid, { notes: event.target.value })
                    }
                    rows={2}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>

              <div className="grid gap-3 border-t border-gray-200 pt-4 text-xs text-gray-600 md:grid-cols-3">
                <div>
                  <p className="font-semibold text-gray-700">Cost per Base Unit</p>
                  <p>{totals.lines[index]?.derivedCostPerBase?.toFixed(4) ?? '—'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Qty per Unit (base)</p>
                  <p>{totals.lines[index]?.derivedQtyBase?.toFixed(4) ?? '—'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Material Cost per Unit</p>
                  <p>{totals.lines[index]?.derivedCostPerUnit?.toFixed(4) ?? '—'}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLineItems((prev) => [...prev, createEmptyLine('packaging')])}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
              Add Packaging
            </button>
            <button
              type="button"
              onClick={() => setLineItems((prev) => [...prev, createEmptyLine('other')])}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
              Add Other Cost
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">3. Landed, One-off, and Labor</h2>
          <p className="text-sm text-gray-500">
            Capture freight, duties, tooling, certifications, and labor assumptions.
          </p>
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-3 text-sm text-gray-600">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500">Landed Costs</h3>
            <InputField label="Freight" value={freight} onChange={setFreight} />
            <InputField label="Duty / Tax" value={dutyTax} onChange={setDutyTax} />
            <InputField label="Insurance" value={insurance} onChange={setInsurance} />
            <InputField label="Handling" value={handling} onChange={setHandling} />
            <InputField label="Contingency %" value={contingencyPct} onChange={setContingencyPct} />
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500">One-off / NPI</h3>
            <InputField label="Tooling / NRE" value={toolingNre} onChange={setToolingNre} />
            <InputField
              label="Certification & Testing"
              value={certificationTesting}
              onChange={setCertificationTesting}
            />
            <InputField label="Label / Design" value={labelDesign} onChange={setLabelDesign} />
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500">Labor & Waste</h3>
            <InputField label="Material Waste %" value={materialWastePct} onChange={setMaterialWastePct} />
            <InputField label="Labor Learning %" value={laborLearningPct} onChange={setLaborLearningPct} />
            <InputField label="Labor Rate / hr" value={laborRatePerHour} onChange={setLaborRatePerHour} />
            <InputField label="Labor hrs / unit" value={laborHoursPerUnit} onChange={setLaborHoursPerUnit} />
            <InputField label="Overhead / unit" value={overheadPerUnit} onChange={setOverheadPerUnit} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">4. Unit Economics</h2>
          <p className="text-sm text-gray-500">
            Review per-unit economics, margin, and break-even estimates in real time.
          </p>
        </div>
        <div className="grid gap-4 px-5 py-4 text-sm text-gray-700 md:grid-cols-2 lg:grid-cols-3">
          <Metric label="Material Cost / Unit" value={totals.materialCostPerUnit} prefix="$" />
          <Metric label="Landed Adders / Unit" value={totals.landedPerUnit} prefix="$" />
          <Metric label="Labor Cost / Unit" value={totals.laborCostPerUnit} prefix="$" />
          <Metric label="Overhead / Unit" value={totals.overheadPerUnit} prefix="$" />
          <Metric label="Amortized One-off / Unit" value={totals.amortizedFixed} prefix="$" />
          <Metric label="Contingency / Unit" value={totals.contingencyPerUnit} prefix="$" />
          <Metric
            label="Total Variable Cost / Unit"
            value={totals.totalVariableCost}
            prefix="$"
            highlight
          />
          <InputField
            label="Proposed Price"
            value={proposedPrice}
            onChange={setProposedPrice}
          />
          <InputField
            label="Channel Fees %"
            value={channelFeesPct}
            onChange={setChannelFeesPct}
          />
          <Metric
            label="Gross Margin %"
            value={totals.grossMarginPct ?? undefined}
            suffix="%"
          />
          <Metric
            label="Break-even Units"
            value={totals.breakEvenUnits ?? undefined}
          />
          <Metric
            label="Cost per gram / mL"
            value={totals.costPerFinishedUnit}
            prefix="$"
          />
        </div>
        <p className="px-5 pb-4 text-xs text-gray-500">
          Break-even units = (Tooling + Certification + Label) ÷ (Price − Variable Cost).
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/rnd/estimates')}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Launch Estimate' : 'Create Launch Estimate'}
        </button>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
    </label>
  )
}

function Metric({
  label,
  value,
  prefix,
  suffix,
  highlight,
}: {
  label: string
  value?: number
  prefix?: string
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        highlight ? 'border-[#174940] bg-[#174940]/5' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? 'text-[#174940]' : 'text-gray-900'}`}>
        {value == null || Number.isNaN(value)
          ? '—'
          : `${prefix ?? ''}${value.toFixed(2)}${suffix ?? ''}`}
      </p>
    </div>
  )
}
