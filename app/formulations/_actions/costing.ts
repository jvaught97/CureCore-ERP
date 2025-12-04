'use server'

import { createClient } from '@/app/utils/supabase/server'

export type IngredientCost = {
  ingredient_id: string
  ingredient_name: string
  phase: string
  percentage: number
  quantity_grams: number
  cost_per_gram: number | null
  total_cost: number
  warning?: string
}

export type PackagingCost = {
  packaging_id: string
  packaging_name: string
  quantity: number
  cost_per_unit: number | null
  total_cost: number
  warning?: string
}

export type ManufacturingCostBreakdown = {
  ingredients: IngredientCost[]
  packaging: PackagingCost[]
  total_ingredients_cost: number
  total_packaging_cost: number
  total_manufacturing_cost: number
  cost_per_unit: number
  warnings: string[]
  unit_pack_size_value: number | null
  unit_pack_size_unit: string | null
  process_yield_pct: number
}

/**
 * Calculate the manufacturing cost for a formulation
 * @param formulation_id - The ID of the formulation
 * @returns Detailed cost breakdown
 */
export async function calculateFormulationCost(
  formulation_id: string
): Promise<ManufacturingCostBreakdown | null> {
  const supabase = await createClient()

  try {
    // Fetch formulation details
    const { data: formulation, error: formError } = await supabase
      .from('formulations')
      .select('unit_pack_size_value, unit_pack_size_unit, process_yield_pct')
      .eq('id', formulation_id)
      .single()

    if (formError) throw formError
    if (!formulation) return null

    const unitSize = formulation.unit_pack_size_value || 0
    const unitSizeUnit = formulation.unit_pack_size_unit || 'g'
    const yieldPct = formulation.process_yield_pct || 100

    // Fetch ingredients with costs
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('formulation_ingredients')
      .select(
        `
        id,
        ingredient_id,
        phase,
        percentage,
        ingredients (
          name,
          cost_per_gram,
          density_g_per_ml
        )
      `
      )
      .eq('formulation_id', formulation_id)
      .order('sort_order')

    if (ingredientsError) throw ingredientsError

    // Fetch packaging with costs
    const { data: packaging, error: packagingError } = await supabase
      .from('formulation_packaging')
      .select(
        `
        id,
        packaging_id,
        quantity_per_unit,
        packaging (
          name,
          cost_per_unit
        )
      `
      )
      .eq('formulation_id', formulation_id)

    if (packagingError) throw packagingError

    const warnings: string[] = []

    // Calculate ingredient costs
    const ingredientCosts: IngredientCost[] = (ingredients || []).map((ing: any) => {
      const ingredientName = ing.ingredients?.name || 'Unknown Ingredient'
      const costPerGram = ing.ingredients?.cost_per_gram
      const percentage = ing.percentage || 0

      // Calculate quantity in grams based on percentage and unit size
      // Formula: (percentage / 100) * unit_size / (yield_pct / 100)
      const quantityGrams = (percentage / 100) * unitSize / (yieldPct / 100)

      let totalCost = 0
      let warning: string | undefined

      if (costPerGram === null || costPerGram === undefined) {
        warning = `Missing cost for ${ingredientName}`
        warnings.push(warning)
      } else {
        totalCost = quantityGrams * costPerGram
      }

      return {
        ingredient_id: ing.ingredient_id,
        ingredient_name: ingredientName,
        phase: ing.phase || '',
        percentage,
        quantity_grams: quantityGrams,
        cost_per_gram: costPerGram,
        total_cost: totalCost,
        warning,
      }
    })

    // Calculate packaging costs
    const packagingCosts: PackagingCost[] = (packaging || []).map((pkg: any) => {
      const packagingName = pkg.packaging?.name || 'Unknown Packaging'
      const costPerUnit = pkg.packaging?.cost_per_unit
      const quantity = pkg.quantity_per_unit || 0

      let totalCost = 0
      let warning: string | undefined

      if (costPerUnit === null || costPerUnit === undefined) {
        warning = `Missing cost for ${packagingName}`
        warnings.push(warning)
      } else {
        totalCost = quantity * costPerUnit
      }

      return {
        packaging_id: pkg.packaging_id,
        packaging_name: packagingName,
        quantity,
        cost_per_unit: costPerUnit,
        total_cost: totalCost,
        warning,
      }
    })

    // Calculate totals
    const totalIngredientsCost = ingredientCosts.reduce((sum, ing) => sum + ing.total_cost, 0)
    const totalPackagingCost = packagingCosts.reduce((sum, pkg) => sum + pkg.total_cost, 0)
    const totalManufacturingCost = totalIngredientsCost + totalPackagingCost

    return {
      ingredients: ingredientCosts,
      packaging: packagingCosts,
      total_ingredients_cost: totalIngredientsCost,
      total_packaging_cost: totalPackagingCost,
      total_manufacturing_cost: totalManufacturingCost,
      cost_per_unit: totalManufacturingCost,
      warnings,
      unit_pack_size_value: unitSize,
      unit_pack_size_unit: unitSizeUnit,
      process_yield_pct: yieldPct,
    }
  } catch (error) {
    console.error('Error calculating formulation cost:', error)
    return null
  }
}

/**
 * Update the cached manufacturing cost in the formulations table
 * @param formulation_id - The ID of the formulation
 * @returns Success status
 */
export async function updateFormulationCost(formulation_id: string): Promise<boolean> {
  const costBreakdown = await calculateFormulationCost(formulation_id)

  if (!costBreakdown) return false

  const supabase = await createClient()

  const { error } = await supabase
    .from('formulations')
    .update({
      total_manufacturing_cost: costBreakdown.total_manufacturing_cost,
    })
    .eq('id', formulation_id)

  if (error) {
    console.error('Error updating formulation cost:', error)
    return false
  }

  return true
}

/**
 * Update formulation unit settings (size, unit, yield)
 * @param formulation_id - The ID of the formulation
 * @param unit_pack_size_value - Unit size value
 * @param unit_pack_size_unit - Unit size unit (g, mL, oz, etc)
 * @param process_yield_pct - Process yield percentage
 * @returns Success status
 */
export async function updateFormulationUnitSettings(
  formulation_id: string,
  unit_pack_size_value: number,
  unit_pack_size_unit: string,
  process_yield_pct: number
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('formulations')
    .update({
      unit_pack_size_value,
      unit_pack_size_unit,
      process_yield_pct,
    })
    .eq('id', formulation_id)

  if (error) {
    console.error('Error updating formulation unit settings:', error)
    return false
  }

  // Recalculate cost after updating settings
  await updateFormulationCost(formulation_id)

  return true
}
