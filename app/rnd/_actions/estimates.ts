'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/utils/supabase/server'
import {
  computeCostPerBaseUnit,
  computeMaterialCostPerUnit,
  amortize,
  breakEvenUnits,
  grossMargin,
  toBaseUnit,
  type Unit,
} from '@/lib/estimator/math'

type EstimateLineItemInput = {
  id?: string
  itemType: 'ingredient' | 'packaging' | 'other'
  sourceType?: string
  ingredientId?: string
  rdIngredientId?: string
  name: string
  needPurchase?: boolean
  inStock?: boolean
  packSizeValue?: number | null
  packSizeUnit?: string | null
  packPrice?: number | null
  density?: number | null
  qtyPerUnit?: number | null
  qtyPerUnitUnit?: string | null
  wastePct?: number | null
  supplierId?: string | null
  notes?: string | null
}

export type LaunchEstimatePayload = {
  title: string
  rdFormulaId: string
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
  lineItems: EstimateLineItemInput[]
}

async function getClientWithUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

function computeRollups(
  payload: LaunchEstimatePayload,
  lineItems: EstimateLineItemInput[],
) {
  const wastePct = payload.materialWastePct ?? 0
  const totalUnits = payload.targetLaunchVolumeUnits ?? 0
  let materialCostPerUnit = 0

  const linePayload = lineItems.map((item) => {
    const packSizeValue = item.packSizeValue ?? 0
    const packPrice = item.packPrice ?? 0
    const packUnit = (item.packSizeUnit ?? 'unit') as Unit
    const qtyUnit = (item.qtyPerUnitUnit ?? packUnit) as Unit
    const qtyRaw = item.qtyPerUnit ?? 0

    const costPerBaseUnit = computeCostPerBaseUnit(
      packPrice,
      packSizeValue,
      packUnit,
      item.density ?? undefined,
    )
    const qtyBase = toBaseUnit(qtyRaw, qtyUnit, item.density ?? undefined)
    const costPerUnit = computeMaterialCostPerUnit(qtyBase, costPerBaseUnit, wastePct)
    if (item.itemType !== 'other') materialCostPerUnit += costPerUnit
    return {
      ...item,
      pack_size_value: packSizeValue || null,
      pack_size_unit: item.packSizeUnit ?? null,
      pack_price: packPrice || null,
      cost_per_base_unit: costPerBaseUnit || null,
      qty_per_unit_base: qtyBase || null,
      output_unit: item.qtyPerUnitUnit ?? null,
      waste_pct: item.wastePct ?? null,
      material_cost_per_unit: costPerUnit || 0,
    }
  })

  const laborRate = payload.laborRatePerHour ?? 0
  const laborHours = payload.laborHoursPerUnit ?? 0
  const laborLearning = payload.laborLearningPct ?? 0
  const laborCostPerUnit = laborRate * laborHours * (1 + laborLearning / 100)
  const overheadPerUnit = payload.overheadAllocationPerUnit ?? 0

  const freight = payload.freight ?? 0
  const dutyTax = payload.dutyTax ?? 0
  const insurance = payload.insurance ?? 0
  const handling = payload.handling ?? 0
  const landedTotal = freight + dutyTax + insurance + handling
  const landedPerUnit = totalUnits > 0 ? landedTotal / totalUnits : 0

  const tooling = payload.toolingNre ?? 0
  const certification = payload.certificationTesting ?? 0
  const label = payload.labelDesign ?? 0
  const amortizedOneOff = amortize(tooling + certification + label, totalUnits || 1)

  const contingencyPct = payload.contingencyPct ?? 0
  const contingencyPerUnit =
    (materialCostPerUnit + landedPerUnit + laborCostPerUnit + overheadPerUnit) *
    (contingencyPct / 100)

  const totalVariableCostPerUnit =
    materialCostPerUnit +
    landedPerUnit +
    laborCostPerUnit +
    overheadPerUnit +
    contingencyPerUnit +
    amortizedOneOff

  const price = payload.proposedPrice ?? 0
  const channelFeesPct = payload.channelFeesPct ?? 0
  const marginPct = grossMargin(price, totalVariableCostPerUnit, channelFeesPct)

  const fixedCosts = tooling + certification + label
  const breakEven = breakEvenUnits(fixedCosts, price, totalVariableCostPerUnit)

  return {
    linePayload,
    rollup: {
      material_cost_per_unit: materialCostPerUnit || null,
      landed_cost_per_unit: landedPerUnit || null,
      labor_cost_per_unit: laborCostPerUnit || null,
      total_variable_cost_per_unit: totalVariableCostPerUnit || null,
      gross_margin_pct: Number.isFinite(marginPct) ? marginPct : null,
      break_even_units: Number.isFinite(breakEven) ? breakEven : null,
    },
  }
}

export async function createEstimate(payload: LaunchEstimatePayload) {
  const { supabase, user } = await getClientWithUser()
  const { linePayload, rollup } = computeRollups(payload, payload.lineItems)

  const { data: estimateRow, error: insertError } = await supabase
    .from('rd_launch_estimates')
    .insert({
      rd_formula_id: payload.rdFormulaId,
      title: payload.title.trim(),
      pack_size_value: payload.packSizeValue ?? null,
      pack_size_unit: payload.packSizeUnit ?? null,
      target_launch_volume_units: payload.targetLaunchVolumeUnits ?? null,
      freight: payload.freight ?? null,
      duty_tax: payload.dutyTax ?? null,
      insurance: payload.insurance ?? null,
      handling: payload.handling ?? null,
      contingency_pct: payload.contingencyPct ?? null,
      tooling_nre: payload.toolingNre ?? null,
      certification_testing: payload.certificationTesting ?? null,
      label_design: payload.labelDesign ?? null,
      material_waste_pct: payload.materialWastePct ?? null,
      labor_learning_pct: payload.laborLearningPct ?? null,
      labor_rate_per_hour: payload.laborRatePerHour ?? null,
      labor_hours_per_unit: payload.laborHoursPerUnit ?? null,
      overhead_allocation_per_unit: payload.overheadAllocationPerUnit ?? null,
      proposed_price: payload.proposedPrice ?? null,
      channel_fees_pct: payload.channelFeesPct ?? null,
      labor_cost_per_unit: rollup.labor_cost_per_unit,
      material_cost_per_unit: rollup.material_cost_per_unit,
      landed_cost_per_unit: rollup.landed_cost_per_unit,
      total_variable_cost_per_unit: rollup.total_variable_cost_per_unit,
      gross_margin_pct: rollup.gross_margin_pct,
      break_even_units: rollup.break_even_units,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (insertError || !estimateRow) {
    console.error('createEstimate failed', insertError)
    throw insertError ?? new Error('Failed to create estimate')
  }

  if (linePayload.length) {
    const formatted = linePayload.map((item) => ({
      estimate_id: estimateRow.id,
      item_type: item.itemType,
      source_type: item.sourceType ?? null,
      ingredient_id: item.ingredientId ?? null,
      rd_ingredient_id: item.rdIngredientId ?? null,
      name: item.name.trim(),
      need_purchase: item.needPurchase ?? true,
      in_stock: item.inStock ?? false,
      pack_size_value: item.pack_size_value,
      pack_size_unit: item.pack_size_unit,
      pack_price: item.pack_price,
      cost_per_base_unit: item.cost_per_base_unit,
      qty_per_unit_base: item.qty_per_unit_base,
      output_unit: item.output_unit,
      waste_pct: item.waste_pct,
      supplier_id: item.supplierId ?? null,
      notes: item.notes ?? null,
      created_by: user.id,
    }))

    const { error } = await supabase.from('rd_estimate_line_items').insert(formatted)
    if (error) {
      console.error('createEstimate::line items failed', error)
      throw error
    }
  }

  revalidatePath('/rnd/estimates')
  revalidatePath(`/rnd/estimates/${estimateRow.id}`)
  return estimateRow.id as string
}

export async function updateEstimate(id: string, payload: LaunchEstimatePayload) {
  if (!id) throw new Error('Estimate ID is required')
  const { supabase, user } = await getClientWithUser()
  const { linePayload, rollup } = computeRollups(payload, payload.lineItems)

  const { error: updateError } = await supabase
    .from('rd_launch_estimates')
    .update({
      rd_formula_id: payload.rdFormulaId,
      title: payload.title.trim(),
      pack_size_value: payload.packSizeValue ?? null,
      pack_size_unit: payload.packSizeUnit ?? null,
      target_launch_volume_units: payload.targetLaunchVolumeUnits ?? null,
      freight: payload.freight ?? null,
      duty_tax: payload.dutyTax ?? null,
      insurance: payload.insurance ?? null,
      handling: payload.handling ?? null,
      contingency_pct: payload.contingencyPct ?? null,
      tooling_nre: payload.toolingNre ?? null,
      certification_testing: payload.certificationTesting ?? null,
      label_design: payload.labelDesign ?? null,
      material_waste_pct: payload.materialWastePct ?? null,
      labor_learning_pct: payload.laborLearningPct ?? null,
      labor_rate_per_hour: payload.laborRatePerHour ?? null,
      labor_hours_per_unit: payload.laborHoursPerUnit ?? null,
      overhead_allocation_per_unit: payload.overheadAllocationPerUnit ?? null,
      proposed_price: payload.proposedPrice ?? null,
      channel_fees_pct: payload.channelFeesPct ?? null,
      labor_cost_per_unit: rollup.labor_cost_per_unit,
      material_cost_per_unit: rollup.material_cost_per_unit,
      landed_cost_per_unit: rollup.landed_cost_per_unit,
      total_variable_cost_per_unit: rollup.total_variable_cost_per_unit,
      gross_margin_pct: rollup.gross_margin_pct,
      break_even_units: rollup.break_even_units,
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (updateError) {
    console.error('updateEstimate::update failed', updateError)
    throw updateError
  }

  const { error: deleteError } = await supabase
    .from('rd_estimate_line_items')
    .delete()
    .eq('estimate_id', id)
    .eq('created_by', user.id)

  if (deleteError) {
    console.error('updateEstimate::delete lines failed', deleteError)
    throw deleteError
  }

  if (linePayload.length) {
    const formatted = linePayload.map((item) => ({
      estimate_id: id,
      item_type: item.itemType,
      source_type: item.sourceType ?? null,
      ingredient_id: item.ingredientId ?? null,
      rd_ingredient_id: item.rdIngredientId ?? null,
      name: item.name.trim(),
      need_purchase: item.needPurchase ?? true,
      in_stock: item.inStock ?? false,
      pack_size_value: item.pack_size_value,
      pack_size_unit: item.pack_size_unit,
      pack_price: item.pack_price,
      cost_per_base_unit: item.cost_per_base_unit,
      qty_per_unit_base: item.qty_per_unit_base,
      output_unit: item.output_unit,
      waste_pct: item.waste_pct,
      supplier_id: item.supplierId ?? null,
      notes: item.notes ?? null,
      created_by: user.id,
    }))

    const { error: insertError } = await supabase
      .from('rd_estimate_line_items')
      .insert(formatted)

    if (insertError) {
      console.error('updateEstimate::insert lines failed', insertError)
      throw insertError
    }
  }

  revalidatePath('/rnd/estimates')
  revalidatePath(`/rnd/estimates/${id}`)
  return id
}

export async function duplicateEstimate(id: string) {
  const { supabase, user } = await getClientWithUser()
  const { data: estimate, error } = await supabase
    .from('rd_launch_estimates')
    .select('*')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle()

  if (error || !estimate) {
    throw error ?? new Error('Estimate not found')
  }

  const { data: lineItems, error: linesError } = await supabase
    .from('rd_estimate_line_items')
    .select('*')
    .eq('estimate_id', id)
    .eq('created_by', user.id)

  if (linesError) throw linesError

  const newId = await createEstimate({
    title: `${estimate.title} (Copy)`,
    rdFormulaId: estimate.rd_formula_id,
    packSizeValue: estimate.pack_size_value,
    packSizeUnit: estimate.pack_size_unit,
    targetLaunchVolumeUnits: estimate.target_launch_volume_units,
    freight: estimate.freight,
    dutyTax: estimate.duty_tax,
    insurance: estimate.insurance,
    handling: estimate.handling,
    contingencyPct: estimate.contingency_pct,
    toolingNre: estimate.tooling_nre,
    certificationTesting: estimate.certification_testing,
    labelDesign: estimate.label_design,
    materialWastePct: estimate.material_waste_pct,
    laborLearningPct: estimate.labor_learning_pct,
    laborRatePerHour: estimate.labor_rate_per_hour,
    laborHoursPerUnit: estimate.labor_hours_per_unit,
    overheadAllocationPerUnit: estimate.overhead_allocation_per_unit,
    proposedPrice: estimate.proposed_price,
    channelFeesPct: estimate.channel_fees_pct,
    lineItems: (lineItems ?? []).map((item) => ({
      itemType: item.item_type,
      sourceType: item.source_type ?? undefined,
      ingredientId: item.ingredient_id ?? undefined,
      rdIngredientId: item.rd_ingredient_id ?? undefined,
      name: item.name,
      needPurchase: item.need_purchase ?? undefined,
      inStock: item.in_stock ?? undefined,
      packSizeValue: item.pack_size_value ?? undefined,
      packSizeUnit: item.pack_size_unit ?? undefined,
      packPrice: item.pack_price ?? undefined,
      qtyPerUnit: item.qty_per_unit_base ?? undefined,
      qtyPerUnitUnit: item.output_unit ?? undefined,
      wastePct: item.waste_pct ?? undefined,
      supplierId: item.supplier_id ?? undefined,
      notes: item.notes ?? undefined,
    })),
  })

  return newId
}

export async function exportEstimate(id: string) {
  const { supabase, user } = await getClientWithUser()
  const { data: estimate, error } = await supabase
    .from('rd_launch_estimates')
    .select('*')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle()

  if (error || !estimate) {
    throw error ?? new Error('Estimate not found')
  }

  const { data: lineItems, error: linesError } = await supabase
    .from('rd_estimate_line_items')
    .select('*')
    .eq('estimate_id', id)
    .eq('created_by', user.id)

  if (linesError) throw linesError

  return {
    estimate,
    lineItems: lineItems ?? [],
  }
}
