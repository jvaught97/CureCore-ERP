type NormalizedUnit = 'g' | 'ml' | 'each'

function normalizeUnit(unit?: string | null): NormalizedUnit | null {
  if (!unit) return null
  const value = unit.trim().toLowerCase()
  if (value === 'g' || value === 'gram' || value === 'grams') return 'g'
  if (value === 'ml' || value === 'milliliter' || value === 'milliliters') return 'ml'
  if (value === 'each' || value === 'ea' || value === 'unit' || value === 'units') return 'each'
  return null
}

export type BaseUnitConversion = {
  quantity: number | null
  requiresDensity: boolean
}

/**
 * Convert a quantity to the inventory item's base unit.
 * Supports g ↔ mL using density and each → each.
 */
export function toBaseUnit(
  value: number | null | undefined,
  fromUnit: string | null | undefined,
  itemBaseUnit: string | null | undefined,
  densityGPerMl?: number | null,
): BaseUnitConversion {
  if (value === null || value === undefined) {
    return { quantity: null, requiresDensity: false }
  }

  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) {
    return { quantity: null, requiresDensity: false }
  }

  const from = normalizeUnit(fromUnit)
  const base = normalizeUnit(itemBaseUnit)
  if (!from || !base) {
    return { quantity: null, requiresDensity: false }
  }

  if (from === base) {
    return { quantity: normalizedValue, requiresDensity: false }
  }

  const density = densityGPerMl ?? null

  if (from === 'g' && base === 'ml') {
    if (!density || density <= 0) {
      return { quantity: null, requiresDensity: true }
    }
    return { quantity: normalizedValue / density, requiresDensity: false }
  }

  if (from === 'ml' && base === 'g') {
    if (!density || density <= 0) {
      return { quantity: null, requiresDensity: true }
    }
    return { quantity: normalizedValue * density, requiresDensity: false }
  }

  if (from === 'each' && base === 'each') {
    return { quantity: normalizedValue, requiresDensity: false }
  }

  return { quantity: null, requiresDensity: false }
}

/**
 * Inflates required base quantity to account for process yield.
 */
export function applyYield(qtyBase: number, yieldPct?: number | null): number {
  const quantity = Number.isFinite(qtyBase) ? qtyBase : 0
  const pct = typeof yieldPct === 'number' && Number.isFinite(yieldPct) ? yieldPct : 100
  if (pct <= 0) return quantity
  const ratio = pct / 100
  if (ratio === 1) return quantity
  return quantity / ratio
}

/**
 * Simple multiplication of quantity and unit cost.
 */
export function costForQtyBase(qtyBase: number | null | undefined, costPerBase: number | null | undefined): number {
  const qty = typeof qtyBase === 'number' && Number.isFinite(qtyBase) ? qtyBase : 0
  const cost = typeof costPerBase === 'number' && Number.isFinite(costPerBase) ? costPerBase : 0
  return qty * cost
}
