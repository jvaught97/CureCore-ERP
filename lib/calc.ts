// Costing and calculation utilities for marketing tools

export interface UnitCostInputs {
  ingredientsCost: number;
  packagingCost: number;
  laborRate: number;
  laborHours: number;
  overheadPct: number; // 0.0 - 1.0
  wastePct: number;     // 0.0 - 1.0
  batchQty: number;
}

export interface UnitCostOutputs {
  unitCost: number;
  targetMSRP: number;
  grossMargin: number;
  total: number;
  breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    waste: number;
  };
}

export function calcUnitCost(inputs: UnitCostInputs): UnitCostOutputs {
  const materials = inputs.ingredientsCost + inputs.packagingCost;
  const labor = inputs.laborRate * inputs.laborHours;
  const base = materials + labor;
  const overhead = base * inputs.overheadPct;
  const waste = base * inputs.wastePct;
  const total = base + overhead + waste;
  const unitCost = inputs.batchQty > 0 ? total / inputs.batchQty : 0;

  // Standard retail markup (4x for beauty/cosmetics)
  const targetMSRP = unitCost * 4;
  const grossMargin = targetMSRP > 0 ? (targetMSRP - unitCost) / targetMSRP : 0;

  return {
    unitCost: parseFloat(unitCost.toFixed(2)),
    targetMSRP: parseFloat(targetMSRP.toFixed(2)),
    grossMargin: parseFloat((grossMargin * 100).toFixed(1)),
    total: parseFloat(total.toFixed(2)),
    breakdown: {
      materials: parseFloat(materials.toFixed(2)),
      labor: parseFloat(labor.toFixed(2)),
      overhead: parseFloat(overhead.toFixed(2)),
      waste: parseFloat(waste.toFixed(2)),
    },
  };
}

export interface BreakEvenInputs {
  fixedCosts: number;
  unitCost: number;
  sellingPrice: number;
}

export interface BreakEvenOutputs {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  contributionMargin: number;
  contributionMarginPct: number;
}

export function calcBreakEven(inputs: BreakEvenInputs): BreakEvenOutputs {
  const contributionMargin = inputs.sellingPrice - inputs.unitCost;
  const contributionMarginPct = inputs.sellingPrice > 0
    ? (contributionMargin / inputs.sellingPrice) * 100
    : 0;

  const breakEvenUnits = contributionMargin > 0
    ? Math.ceil(inputs.fixedCosts / contributionMargin)
    : Infinity;

  const breakEvenRevenue = breakEvenUnits * inputs.sellingPrice;

  return {
    breakEvenUnits,
    breakEvenRevenue: parseFloat(breakEvenRevenue.toFixed(2)),
    contributionMargin: parseFloat(contributionMargin.toFixed(2)),
    contributionMarginPct: parseFloat(contributionMarginPct.toFixed(1)),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(pct: number): string {
  return `${pct}%`;
}
