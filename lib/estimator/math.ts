export type Unit = 'g' | 'kg' | 'mg' | 'lb' | 'oz' | 'ml' | 'l' | 'unit'

function toGrams(value: number, unit: Unit): number {
  switch (unit) {
    case 'kg':
      return value * 1_000
    case 'mg':
      return value / 1_000
    case 'lb':
      return value * 453.59237
    case 'oz':
      return value * 28.3495231
    default:
      return value
  }
}

function toMilliLiters(value: number, unit: Unit): number {
  switch (unit) {
    case 'l':
      return value * 1_000
    default:
      return value
  }
}

export function toBaseUnit(value: number, unit: Unit, density?: number): number {
  if (unit === 'unit') return value
  if (['g', 'kg', 'mg', 'lb', 'oz'].includes(unit)) {
    return toGrams(value, unit)
  }
  if (['ml', 'l'].includes(unit)) {
    const ml = toMilliLiters(value, unit)
    if (!density) return ml
    return ml * density
  }
  return value
}

export function computeCostPerBaseUnit(
  packPrice: number,
  packSizeValue: number,
  packSizeUnit: Unit,
  density?: number,
): number {
  if (packPrice <= 0 || packSizeValue <= 0) return 0
  const baseQty = toBaseUnit(packSizeValue, packSizeUnit, density)
  if (baseQty === 0) return 0
  return packPrice / baseQty
}

export function computeMaterialCostPerUnit(
  qtyPerUnitBase: number,
  costPerBaseUnit: number,
  wastePct: number = 0,
): number {
  const adjustedQty = qtyPerUnitBase * (1 + (wastePct || 0) / 100)
  return adjustedQty * costPerBaseUnit
}

export function amortize(value: number, units: number): number {
  if (!value || value <= 0) return 0
  if (!units || units <= 0) return 0
  return value / units
}

export function breakEvenUnits(
  fixedCosts: number,
  pricePerUnit: number,
  variableCostPerUnit: number,
): number {
  if (pricePerUnit <= variableCostPerUnit) return Infinity
  return fixedCosts / (pricePerUnit - variableCostPerUnit)
}

export function grossMargin(
  price: number,
  variableCost: number,
  channelFeesPct: number = 0,
): number {
  if (!price || price <= 0) return 0
  const channelFees = price * (channelFeesPct / 100)
  const margin = price - variableCost - channelFees
  return (margin / price) * 100
}
