'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/utils/supabase/server'
import { applyYield, costForQtyBase, toBaseUnit } from '@/lib/costing/math'

type InventoryItemRef = {
  id: string
  name: string | null
  base_unit: string | null
  cost_per_base_unit: number | null
  density_g_per_ml: number | null
}

type IngredientRow = {
  id: string
  phase: string | null
  percentage: number | null
  qty_value: number | null
  qty_unit: string | null
  inventory: InventoryItemRef | null
}

type PackagingRow = {
  id: string
  qty_value: number | null
  qty_unit: string | null
  item: InventoryItemRef | null
}

type BreakdownLine = {
  id: string
  itemId: string | null
  name: string
  phase?: string | null
  qtyBase: number | null
  baseUnit: string | null
  unitCost: number | null
  lineCost: number
}

export type FormulaCostingResult = {
  header: {
    name: string
    version: string
    status: string
    created_at: string
    unit_size: {
      value: number | null
      unit: string | null
    }
    yield_pct: number
  }
  breakdown: {
    ingredients: BreakdownLine[]
    packaging: BreakdownLine[]
  }
  totals: {
    ingredientsSubtotal: number
    packagingSubtotal: number
    totalUnitCost: number
    costPerContentUnit: number | null
  }
  warnings: {
    missingPrices: { id: string; name: string }[]
    missingDensities: { id: string; name: string }[]
  }
}

async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

function deriveQuantityInFormulaUnit(
  row: IngredientRow,
  unitSizeValue: number | null,
  unitSizeUnit: string | null,
): { quantity: number | null; unit: string | null } {
  if (row.qty_value !== null && row.qty_value !== undefined) {
    return { quantity: Number(row.qty_value), unit: row.qty_unit }
  }

  const pct = row.percentage !== null && row.percentage !== undefined ? Number(row.percentage) : null
  if (pct !== null && Number.isFinite(pct) && unitSizeValue !== null && Number.isFinite(unitSizeValue)) {
    const quantity = (pct / 100) * Number(unitSizeValue)
    return { quantity, unit: unitSizeUnit }
  }

  return { quantity: null, unit: null }
}

function derivePackagingQuantity(row: PackagingRow, unitSizeUnit: string | null): { quantity: number | null; unit: string | null } {
  if (row.qty_value !== null && row.qty_value !== undefined) {
    return { quantity: Number(row.qty_value), unit: row.qty_unit }
  }
  return { quantity: null, unit: unitSizeUnit }
}

function roundValue(value: number | null, precision = 6): number | null {
  if (value === null || !Number.isFinite(value)) return value
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export async function computeFormulaUnitCost(formulaId: string): Promise<FormulaCostingResult> {
  if (!formulaId) throw new Error('Formula id is required')

  const { supabase, user } = await getAuthedClient()

  const {
    data: formula,
    error: formulaError,
  } = await supabase
    .from('formulas')
    .select(
      'id, name, version, status, unit_pack_size_value, unit_pack_size_unit, process_yield_pct, created_at',
    )
    .eq('id', formulaId)
    .eq('created_by', user.id)
    .maybeSingle()

  if (formulaError) {
    console.error('computeFormulaUnitCost: formula query failed', formulaError)
    throw formulaError
  }

  if (!formula) {
    throw new Error('Formula not found')
  }

  const unitSizeValue =
    formula.unit_pack_size_value !== null && formula.unit_pack_size_value !== undefined
      ? Number(formula.unit_pack_size_value)
      : null
  const unitSizeUnit = formula.unit_pack_size_unit ?? null
  const yieldPct =
    formula.process_yield_pct !== null && formula.process_yield_pct !== undefined
      ? Number(formula.process_yield_pct)
      : 100

  const {
    data: ingredients,
    error: ingredientsError,
  } = await supabase
    .from('formula_ingredients')
    .select(
      `
      id,
      phase,
      percentage,
      qty_value,
      qty_unit,
      inventory:ingredient_id (
        id,
        name,
        base_unit,
        cost_per_base_unit,
        density_g_per_ml
      )
    `,
    )
    .eq('formula_id', formulaId)
    .order('phase', { ascending: true })

  if (ingredientsError) {
    console.error('computeFormulaUnitCost: ingredients query failed', ingredientsError)
    throw ingredientsError
  }

  const {
    data: packaging,
    error: packagingError,
  } = await supabase
    .from('formula_packaging')
    .select(
      `
      id,
      qty_value,
      qty_unit,
      item:pack_item_id (
        id,
        name,
        base_unit,
        cost_per_base_unit,
        density_g_per_ml
      )
    `,
    )
    .eq('formula_id', formulaId)

  if (packagingError) {
    console.error('computeFormulaUnitCost: packaging query failed', packagingError)
    throw packagingError
  }

  const ingredientLines: BreakdownLine[] = []
  const packagingLines: BreakdownLine[] = []
  let ingredientsSubtotal = 0
  let packagingSubtotal = 0

  const missingPrices = new Map<string, string>()
  const missingDensities = new Map<string, string>()

  for (const row of ingredients ?? []) {
    const inventory = row.inventory
    const inventoryName = inventory?.name ?? 'Unnamed Ingredient'
    const inventoryId = inventory?.id ?? null
    const baseUnit = inventory?.base_unit ?? null
    const unitCost =
      inventory?.cost_per_base_unit !== null && inventory?.cost_per_base_unit !== undefined
        ? Number(inventory.cost_per_base_unit)
        : null

    const { quantity, unit } = deriveQuantityInFormulaUnit(row, unitSizeValue, unitSizeUnit)
    const conversion = toBaseUnit(quantity, unit, baseUnit, inventory?.density_g_per_ml ?? null)

    if (conversion.requiresDensity && inventoryId && inventoryName) {
      missingDensities.set(inventoryId, inventoryName)
    }
    if (unitCost === null && inventoryId && inventoryName) {
      missingPrices.set(inventoryId, inventoryName)
    }

    const qtyBaseRaw = conversion.quantity !== null ? conversion.quantity : null
    const qtyBaseWithYield =
      qtyBaseRaw !== null && Number.isFinite(qtyBaseRaw) ? applyYield(qtyBaseRaw, yieldPct) : null
    const qtyBase = roundValue(qtyBaseWithYield)
    const lineCost = qtyBase !== null ? costForQtyBase(qtyBase, unitCost) : 0

    if (Number.isFinite(lineCost)) {
      ingredientsSubtotal += lineCost
    }

    ingredientLines.push({
      id: row.id,
      itemId: inventoryId,
      name: inventoryName,
      phase: row.phase ?? null,
      qtyBase,
      baseUnit,
      unitCost,
      lineCost: Math.round(lineCost * 100) / 100,
    })
  }

  for (const row of packaging ?? []) {
    const item = row.item
    const itemName = item?.name ?? 'Unnamed Packaging'
    const itemId = item?.id ?? null
    const baseUnit = item?.base_unit ?? null
    const unitCost =
      item?.cost_per_base_unit !== null && item?.cost_per_base_unit !== undefined
        ? Number(item.cost_per_base_unit)
        : null

    const { quantity, unit } = derivePackagingQuantity(row, unitSizeUnit)
    const conversion = toBaseUnit(quantity, unit, baseUnit, item?.density_g_per_ml ?? null)

    if (conversion.requiresDensity && itemId && itemName) {
      missingDensities.set(itemId, itemName)
    }
    if (unitCost === null && itemId && itemName) {
      missingPrices.set(itemId, itemName)
    }

    const qtyBase = roundValue(conversion.quantity)
    const lineCost = qtyBase !== null ? costForQtyBase(qtyBase, unitCost) : 0

    if (Number.isFinite(lineCost)) {
      packagingSubtotal += lineCost
    }

    packagingLines.push({
      id: row.id,
      itemId,
      name: itemName,
      qtyBase,
      baseUnit,
      unitCost,
      lineCost: Math.round(lineCost * 100) / 100,
    })
  }

  const totalUnitCost = Math.round((ingredientsSubtotal + packagingSubtotal) * 100) / 100
  ingredientsSubtotal = Math.round(ingredientsSubtotal * 100) / 100
  packagingSubtotal = Math.round(packagingSubtotal * 100) / 100

  let costPerContentUnit: number | null = null
  const normalizedUnit = (unitSizeUnit ?? '').toLowerCase()
  if (
    unitSizeValue &&
    Number.isFinite(unitSizeValue) &&
    (normalizedUnit === 'g' || normalizedUnit === 'gram' || normalizedUnit === 'grams' || normalizedUnit === 'ml')
  ) {
    costPerContentUnit = Math.round((totalUnitCost / Number(unitSizeValue)) * 1000) / 1000
  }

  return {
    header: {
      name: formula.name,
      version: formula.version,
      status: formula.status,
      created_at: formula.created_at,
      unit_size: {
        value: unitSizeValue,
        unit: unitSizeUnit,
      },
      yield_pct: yieldPct,
    },
    breakdown: {
      ingredients: ingredientLines,
      packaging: packagingLines,
    },
    totals: {
      ingredientsSubtotal,
      packagingSubtotal,
      totalUnitCost,
      costPerContentUnit,
    },
    warnings: {
      missingPrices: Array.from(missingPrices, ([id, name]) => ({ id, name })),
      missingDensities: Array.from(missingDensities, ([id, name]) => ({ id, name })),
    },
  }
}

export type FormulaUnitSettingsInput = {
  unitSizeValue: number | null
  unitSizeUnit: string | null
  yieldPct: number | null
}

export async function updateFormulaUnitSettings(
  formulaId: string,
  input: FormulaUnitSettingsInput,
): Promise<FormulaCostingResult> {
  if (!formulaId) throw new Error('Formula id is required')
  const { supabase, user } = await getAuthedClient()

  const updates = {
    unit_pack_size_value: input.unitSizeValue,
    unit_pack_size_unit: input.unitSizeUnit,
    process_yield_pct:
      input.yieldPct !== null && input.yieldPct !== undefined ? Number(input.yieldPct) : 100,
  }

  const { error } = await supabase
    .from('formulas')
    .update(updates)
    .eq('id', formulaId)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateFormulaUnitSettings: update failed', error)
    throw error
  }

  revalidatePath(`/formulas/${formulaId}`)
  return computeFormulaUnitCost(formulaId)
}
