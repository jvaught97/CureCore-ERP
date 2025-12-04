'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/utils/supabase/server'

export type RdIngredientDraft = {
  name: string
  description?: string
  category?: string
  onHand?: number
  unit?: string
  reorderPoint?: number
  costPerGram?: number
  status?: string
  organicCert?: boolean
  coaUrl?: string
  coaExpirationDate?: string
  unitSize?: number
  unitMeasure?: string
  pricePerUnit?: number
  lastPurchasePrice?: number
  lastPurchaseDate?: string
  supplierId?: string | null
}

export type FormulaIngredientInput = {
  sourceType: 'inventory' | 'rd'
  ingredientId?: string
  rdIngredientId?: string
  rdIngredientDraft?: RdIngredientDraft
  qty: number
  unit: string
  inStock?: boolean
  needPurchase?: boolean
  estUnitCost?: number | null
  supplierId?: string | null
}

export type FormulaPayload = {
  name: string
  version: string
  notes?: string
  manufacturingSteps: Array<{
    description: string
    time?: string
    temp?: string
  }>
  packagingMaterials?: Array<{
    name: string
    supplier?: string
    cost?: number | null
  }>
  packagingSteps?: Array<{ description: string }>
  ingredients: FormulaIngredientInput[]
}

async function getSupabaseWithUser() {
  const supabase = await createClient()

  // Force bypass auth to false - using real database with authentication
  const bypassAuth = false

  if (bypassAuth) {
    // In bypass mode, don't try to get user, just return dummy user
    return {
      supabase,
      user: {
        id: '00000000-0000-0000-0000-000000000000'
      } as any
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function createRDIngredient(draft: RdIngredientDraft) {
  const { supabase, user } = await getSupabaseWithUser()

  // Validate supplier_id is a valid UUID or null
  let supplierId: string | null = null
  if (draft.supplierId && draft.supplierId.trim()) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(draft.supplierId.trim())) {
      supplierId = draft.supplierId.trim()
    }
    // If it's not a valid UUID, we'll just ignore it (set to null)
  }

  // Use direct INSERT via Supabase client
  // The remote Supabase instance has all columns, so this should work
  const { data, error } = await supabase
    .from('rd_ingredients')
    .insert({
      name: draft.name.trim(),
      description: draft.description ?? null,
      category: draft.category ?? null,
      on_hand: draft.onHand ?? 0,
      unit: draft.unit ?? 'g',
      reorder_point: draft.reorderPoint ?? null,
      cost_per_gram: draft.costPerGram ?? null,
      status: draft.status ?? 'active',
      organic_cert: draft.organicCert ?? false,
      coa_url: draft.coaUrl ?? null,
      coa_expiration_date: draft.coaExpirationDate ?? null,
      unit_size: draft.unitSize ?? null,
      unit_measure: draft.unitMeasure ?? null,
      price_per_unit: draft.pricePerUnit ?? null,
      last_purchase_price: draft.lastPurchasePrice ?? null,
      last_purchase_date: draft.lastPurchaseDate ?? null,
      supplier_id: supplierId,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createRDIngredient failed', error)
    throw new Error(
      `createRDIngredient failed: ${error.message ?? 'Unknown error'} (code ${error.code ?? 'n/a'})`
    )
  }

  if (!data?.id) {
    throw new Error('Failed to create R&D ingredient - no ID returned')
  }

  return data.id as string
}

async function ensureRdIngredientId(input: FormulaIngredientInput) {
  if (input.sourceType === 'inventory') return input
  if (input.rdIngredientId) return input
  if (!input.rdIngredientDraft) throw new Error('Missing R&D ingredient draft details')
  const rdIngredientId = await createRDIngredient(input.rdIngredientDraft)
  return {
    ...input,
    rdIngredientId,
  }
}

export async function createRDFormula(payload: FormulaPayload) {
  const { supabase, user } = await getSupabaseWithUser()

  const normalizedIngredients: FormulaIngredientInput[] = []
  for (const ing of payload.ingredients) {
    normalizedIngredients.push(await ensureRdIngredientId(ing))
  }

  const { data: formulaRow, error: formulaError } = await supabase
    .from('rd_formulas')
    .insert({
      name: payload.name.trim(),
      version: payload.version.trim(),
      notes: payload.notes ?? null,
      manufacturing_steps: payload.manufacturingSteps,
      packaging_materials: payload.packagingMaterials ?? [],
      packaging_steps: payload.packagingSteps ?? [],
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (formulaError || !formulaRow) {
    console.error('createRDFormula::insert formula error', formulaError)
    throw formulaError ?? new Error('Failed to create formula')
  }

  const ingredientsPayload = normalizedIngredients.map((ing) => {
    // Validate supplier_id is a valid UUID or null
    let supplierId: string | null = null
    if (ing.supplierId && ing.supplierId.trim()) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(ing.supplierId.trim())) {
        supplierId = ing.supplierId.trim()
      }
    }

    return {
      rd_formula_id: formulaRow.id,
      source_type: ing.sourceType,
      ingredient_id: ing.sourceType === 'inventory' ? ing.ingredientId ?? null : null,
      rd_ingredient_id: ing.sourceType === 'rd' ? ing.rdIngredientId ?? null : null,
      qty: ing.qty,
      unit: ing.unit,
      in_stock: ing.inStock ?? false,
      need_purchase: ing.needPurchase ?? (ing.sourceType === 'rd' ? true : false),
      est_unit_cost: ing.estUnitCost ?? null,
      supplier_id: supplierId,
      created_by: user.id,
    }
  })

  if (ingredientsPayload.length) {
    const { error: ingredientsError } = await supabase
      .from('rd_formula_ingredients')
      .insert(ingredientsPayload)

    if (ingredientsError) {
      console.error('createRDFormula::insert ingredients error', ingredientsError)
      throw ingredientsError
    }
  }

  revalidatePath('/rnd/formulas')
  return formulaRow.id as string
}

export async function updateRDFormula(id: string, payload: FormulaPayload) {
  if (!id) throw new Error('Formula id is required')
  const { supabase, user } = await getSupabaseWithUser()

  // Check if formula is locked
  const { data: existingFormula } = await supabase
    .from('rd_formulas')
    .select('is_locked')
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  if (existingFormula?.is_locked) {
    throw new Error('Cannot update a locked formula version. Please create a new version instead.')
  }

  const normalizedIngredients: FormulaIngredientInput[] = []
  for (const ing of payload.ingredients) {
    normalizedIngredients.push(await ensureRdIngredientId(ing))
  }

  const { error: updateError } = await supabase
    .from('rd_formulas')
    .update({
      name: payload.name.trim(),
      version: payload.version.trim(),
      notes: payload.notes ?? null,
      manufacturing_steps: payload.manufacturingSteps,
      packaging_materials: payload.packagingMaterials ?? [],
      packaging_steps: payload.packagingSteps ?? [],
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (updateError) {
    console.error('updateRDFormula::update formula error', updateError)
    throw updateError
  }

  // Replace ingredients to keep things simple for now
  const { error: deleteError } = await supabase
    .from('rd_formula_ingredients')
    .delete()
    .eq('rd_formula_id', id)
    .eq('created_by', user.id)

  if (deleteError) {
    console.error('updateRDFormula::delete ingredients error', deleteError)
    throw deleteError
  }

  const ingredientsPayload = normalizedIngredients.map((ing) => {
    // Validate supplier_id is a valid UUID or null
    let supplierId: string | null = null
    if (ing.supplierId && ing.supplierId.trim()) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(ing.supplierId.trim())) {
        supplierId = ing.supplierId.trim()
      }
    }

    return {
      rd_formula_id: id,
      source_type: ing.sourceType,
      ingredient_id: ing.sourceType === 'inventory' ? ing.ingredientId ?? null : null,
      rd_ingredient_id: ing.sourceType === 'rd' ? ing.rdIngredientId ?? null : null,
      qty: ing.qty,
      unit: ing.unit,
      in_stock: ing.inStock ?? false,
      need_purchase: ing.needPurchase ?? (ing.sourceType === 'rd' ? true : false),
      est_unit_cost: ing.estUnitCost ?? null,
      supplier_id: supplierId,
      created_by: user.id,
    }
  })

  if (ingredientsPayload.length) {
    const { error: insertError } = await supabase
      .from('rd_formula_ingredients')
      .insert(ingredientsPayload)

    if (insertError) {
      console.error('updateRDFormula::insert ingredients error', insertError)
      throw insertError
    }
  }

  revalidatePath('/rnd/formulas')
  revalidatePath(`/rnd/formulas/${id}`)
  return id
}

// ============================================================================
// Test Batch Operations
// ============================================================================

export type TestBatchInput = {
  rdFormulaId: string
  batchSize: number
  batchSizeUnit: string
  expectedYield?: number
  expectedYieldUnit?: string
  testDate?: string
  testerId?: string
}

export type TestResultsInput = {
  testBatchId: string
  actualYield?: number
  actualYieldUnit?: string
  qualityRating?: number
  passedRequirements?: boolean
  appearanceNotes?: string
  viscosityNotes?: string
  scentNotes?: string
  stabilityNotes?: string
  sensoryNotes?: string
  issues?: Array<{type: string; severity: string; description: string}>
  photos?: Array<{url: string; caption?: string}>
  documents?: Array<{url: string; name: string; type: string}>
  generalNotes?: string
  adjustmentsNeeded?: string
  nextSteps?: string
  readyForProduction?: boolean
}

export type TestMetricInput = {
  testBatchId: string
  metricName: string
  metricValue: string
  metricUnit?: string
  targetValue?: string
  passed?: boolean
  notes?: string
}

export async function createTestBatch(input: TestBatchInput) {
  const { supabase, user } = await getSupabaseWithUser()

  // Get next test number for this formula
  const { data: testNumberData } = await supabase.rpc('get_next_test_number', {
    formula_id: input.rdFormulaId
  })

  const testNumber = testNumberData || 1

  // Generate batch code
  const { data: batchCodeData } = await supabase.rpc('generate_rd_batch_code', {
    formula_id: input.rdFormulaId,
    test_num: testNumber
  })

  // Get formula snapshot with ingredient details
  const { data: formula } = await supabase
    .from('rd_formulas')
    .select(`
      *,
      rd_formula_ingredients(*)
    `)
    .eq('id', input.rdFormulaId)
    .single()

  // Calculate ingredient cost from formula snapshot
  let ingredientCost = null
  if (formula) {
    const { data: calculatedCost } = await supabase.rpc(
      'calculate_ingredient_cost_from_snapshot',
      { p_formula_snapshot: formula }
    )
    ingredientCost = calculatedCost
  }

  const { data, error } = await supabase
    .from('rd_test_batches')
    .insert({
      rd_formula_id: input.rdFormulaId,
      test_number: testNumber,
      batch_code: batchCodeData || `TEST-${testNumber}`,
      batch_size: input.batchSize,
      batch_size_unit: input.batchSizeUnit,
      expected_yield: input.expectedYield ?? null,
      expected_yield_unit: input.expectedYieldUnit ?? null,
      test_date: input.testDate ?? null,
      tester_id: input.testerId ?? null,
      status: 'planned',
      formula_snapshot: formula,
      ingredient_cost: ingredientCost,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createTestBatch failed', error)
    throw error
  }

  revalidatePath(`/rnd/formulas/${input.rdFormulaId}`)
  return data.id
}

export async function updateTestBatchStatus(testBatchId: string, status: string) {
  const { supabase } = await getSupabaseWithUser()

  const updates: any = { status }
  if (status === 'completed' || status === 'failed') {
    updates.completed_date = new Date().toISOString()
  }

  const { error } = await supabase
    .from('rd_test_batches')
    .update(updates)
    .eq('id', testBatchId)

  if (error) {
    console.error('updateTestBatchStatus failed', error)
    throw error
  }

  revalidatePath('/rnd/formulas')
}

export async function createOrUpdateTestResults(input: TestResultsInput) {
  const { supabase, user } = await getSupabaseWithUser()

  // Calculate yield percentage if both values provided
  let yieldPercentage = null
  if (input.actualYield) {
    const { data: testBatch } = await supabase
      .from('rd_test_batches')
      .select('expected_yield')
      .eq('id', input.testBatchId)
      .single()

    if (testBatch?.expected_yield) {
      yieldPercentage = (input.actualYield / testBatch.expected_yield) * 100
    }
  }

  const payload = {
    test_batch_id: input.testBatchId,
    actual_yield: input.actualYield ?? null,
    actual_yield_unit: input.actualYieldUnit ?? null,
    yield_percentage: yieldPercentage,
    quality_rating: input.qualityRating ?? null,
    passed_requirements: input.passedRequirements ?? false,
    appearance_notes: input.appearanceNotes ?? null,
    viscosity_notes: input.viscosityNotes ?? null,
    scent_notes: input.scentNotes ?? null,
    stability_notes: input.stabilityNotes ?? null,
    sensory_notes: input.sensoryNotes ?? null,
    issues: input.issues ?? [],
    photos: input.photos ?? [],
    documents: input.documents ?? [],
    general_notes: input.generalNotes ?? null,
    adjustments_needed: input.adjustmentsNeeded ?? null,
    next_steps: input.nextSteps ?? null,
    ready_for_production: input.readyForProduction ?? false,
    created_by: user.id,
  }

  // Try to upsert (insert or update)
  const { data, error } = await supabase
    .from('rd_test_results')
    .upsert(payload, {
      onConflict: 'test_batch_id'
    })
    .select()
    .single()

  if (error) {
    console.error('createOrUpdateTestResults failed', error)
    throw error
  }

  // Update test batch status to completed if results are saved
  await updateTestBatchStatus(input.testBatchId, 'completed')

  revalidatePath('/rnd/formulas')
  return data.id
}

export async function addTestMetric(input: TestMetricInput) {
  const { supabase } = await getSupabaseWithUser()

  const { data, error } = await supabase
    .from('rd_test_metrics')
    .insert({
      test_batch_id: input.testBatchId,
      metric_name: input.metricName,
      metric_value: input.metricValue,
      metric_unit: input.metricUnit ?? null,
      target_value: input.targetValue ?? null,
      passed: input.passed ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('addTestMetric failed', error)
    throw error
  }

  revalidatePath('/rnd/formulas')
  return data.id
}

export async function getTestBatchesForFormula(rdFormulaId: string) {
  const { supabase } = await getSupabaseWithUser()

  const { data, error } = await supabase
    .from('rd_test_batches')
    .select(`
      *,
      rd_test_results(*),
      rd_test_metrics(*)
    `)
    .eq('rd_formula_id', rdFormulaId)
    .order('test_number', { ascending: false })

  if (error) {
    console.error('getTestBatchesForFormula failed', error)
    throw error
  }

  return data
}

export async function getTestBatchDetail(testBatchId: string) {
  const { supabase } = await getSupabaseWithUser()

  const { data, error} = await supabase
    .from('rd_test_batches')
    .select(`
      *,
      rd_test_results(*),
      rd_test_metrics(*)
    `)
    .eq('id', testBatchId)
    .single()

  if (error) {
    console.error('getTestBatchDetail failed', error)
    throw error
  }

  return data
}

export async function getRDIngredients() {
  const { supabase } = await getSupabaseWithUser()

  const { data, error } = await supabase
    .from('rd_ingredients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getRDIngredients failed', error)
    throw error
  }

  // Fetch suppliers separately if needed
  if (data && data.length > 0) {
    const supplierIds = data
      .map(d => d.supplier_id)
      .filter(id => id != null)

    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIds)

      if (suppliers) {
        // Map suppliers to ingredients
        return data.map(ingredient => ({
          ...ingredient,
          suppliers: suppliers.find(s => s.id === ingredient.supplier_id) || null
        }))
      }
    }
  }

  return data
}

export async function updateRDIngredient(id: string, updates: Partial<RdIngredientDraft>) {
  if (!id) throw new Error('Ingredient id is required')
  const { supabase } = await getSupabaseWithUser()

  // Validate supplier_id is a valid UUID or null
  let supplierId: string | null | undefined = updates.supplierId
  if (supplierId !== undefined) {
    if (supplierId && supplierId.trim()) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(supplierId.trim())) {
        supplierId = null
      } else {
        supplierId = supplierId.trim()
      }
    } else {
      supplierId = null
    }
  }

  const payload: any = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.description !== undefined) payload.description = updates.description || null
  if (updates.category !== undefined) payload.category = updates.category || null
  if (updates.onHand !== undefined) payload.on_hand = updates.onHand ?? 0
  if (updates.unit !== undefined) payload.unit = updates.unit || 'g'
  if (updates.reorderPoint !== undefined) payload.reorder_point = updates.reorderPoint ?? null
  if (updates.costPerGram !== undefined) payload.cost_per_gram = updates.costPerGram ?? null
  if (updates.status !== undefined) payload.status = updates.status || 'active'
  if (updates.organicCert !== undefined) payload.organic_cert = updates.organicCert ?? false
  if (updates.coaUrl !== undefined) payload.coa_url = updates.coaUrl || null
  if (updates.coaExpirationDate !== undefined) payload.coa_expiration_date = updates.coaExpirationDate || null
  if (updates.unitSize !== undefined) payload.unit_size = updates.unitSize ?? null
  if (updates.unitMeasure !== undefined) payload.unit_measure = updates.unitMeasure || null
  if (updates.pricePerUnit !== undefined) payload.price_per_unit = updates.pricePerUnit ?? null
  if (updates.lastPurchasePrice !== undefined) payload.last_purchase_price = updates.lastPurchasePrice ?? null
  if (updates.lastPurchaseDate !== undefined) payload.last_purchase_date = updates.lastPurchaseDate || null
  if (supplierId !== undefined) payload.supplier_id = supplierId

  const optionalFields: Record<string, any> = {}

  const tryUpdate = async (body: Record<string, any>) =>
    supabase.from('rd_ingredients').update(body).eq('id', id)

  const isMissingOptionalCols = (err: any) =>
    err &&
    (err.code === '42703' ||
      err.code === 'PGRST204' ||
      `${err.message ?? ''}`.toLowerCase().includes('schema cache') ||
      `${err.message ?? ''}`.toLowerCase().includes('column') ||
      `${err.message ?? ''}`.toLowerCase().includes('rd_ingredients'))

  let error
  ;({ error } = await tryUpdate({ ...payload, ...optionalFields }))

  if (error && isMissingOptionalCols(error)) {
    console.warn(
      '[updateRDIngredient] Optional columns missing on remote (category/quantity). Retrying without them.',
      {
        code: (error as any)?.code,
        message: (error as any)?.message,
      }
    )
    ;({ error } = await tryUpdate(payload))
  }

  if (error) {
    console.error('updateRDIngredient failed', error)
    throw new Error(
      `updateRDIngredient failed: ${(error as any)?.message ?? 'Unknown error'} (code ${(error as any)?.code ?? 'n/a'})`
    )
  }

  revalidatePath('/rnd')
}

export async function deleteRDIngredient(id: string) {
  if (!id) throw new Error('Ingredient id is required')
  const { supabase } = await getSupabaseWithUser()

  const { error } = await supabase
    .from('rd_ingredients')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteRDIngredient failed', error)
    throw error
  }

  revalidatePath('/rnd')
}

export async function getRDFormulas() {
  const { supabase } = await getSupabaseWithUser()

  const { data, error } = await supabase
    .from('rd_formulas')
    .select(`
      *,
      rd_formula_ingredients(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getRDFormulas failed', error)
    throw error
  }

  return data
}

export async function deleteRDFormula(id: string) {
  if (!id) throw new Error('Formula id is required')
  const { supabase } = await getSupabaseWithUser()

  const { error } = await supabase
    .from('rd_formulas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteRDFormula failed', error)
    throw error
  }

  revalidatePath('/rnd')
  revalidatePath('/rnd/formulas')
}

// ============================================================================
// Version Management
// ============================================================================

export type CreateVersionInput = {
  sourceFormulaId: string
  changeType: 'major' | 'minor'
}

export async function createNewFormulaVersion(input: CreateVersionInput) {
  const { supabase, user } = await getSupabaseWithUser()

  // Get the source formula with all its data
  const { data: sourceFormula, error: fetchError } = await supabase
    .from('rd_formulas')
    .select(`
      *,
      rd_formula_ingredients(*)
    `)
    .eq('id', input.sourceFormulaId)
    .eq('created_by', user.id)
    .single()

  if (fetchError || !sourceFormula) {
    console.error('createNewFormulaVersion::fetch source formula error', fetchError)
    throw fetchError ?? new Error('Source formula not found')
  }

  // Get the next version number using the database function
  const { data: nextVersion, error: versionError } = await supabase.rpc(
    'get_next_formula_version',
    {
      p_formula_name: sourceFormula.name,
      p_change_type: input.changeType
    }
  )

  if (versionError) {
    console.error('createNewFormulaVersion::get next version error', versionError)
    throw versionError
  }

  // Lock the source formula
  const { error: lockError } = await supabase
    .from('rd_formulas')
    .update({ is_locked: true })
    .eq('id', input.sourceFormulaId)
    .eq('created_by', user.id)

  if (lockError) {
    console.error('createNewFormulaVersion::lock source formula error', lockError)
    throw lockError
  }

  // Create the new version
  const { data: newFormula, error: createError } = await supabase
    .from('rd_formulas')
    .insert({
      name: sourceFormula.name,
      version: nextVersion,
      notes: sourceFormula.notes,
      manufacturing_steps: sourceFormula.manufacturing_steps,
      packaging_materials: sourceFormula.packaging_materials,
      packaging_steps: sourceFormula.packaging_steps,
      parent_version_id: input.sourceFormulaId,
      is_locked: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (createError || !newFormula) {
    console.error('createNewFormulaVersion::create new formula error', createError)
    throw createError ?? new Error('Failed to create new formula version')
  }

  // Copy all ingredients to the new version
  if (sourceFormula.rd_formula_ingredients && sourceFormula.rd_formula_ingredients.length > 0) {
    const ingredientsCopy = sourceFormula.rd_formula_ingredients.map((ing: any) => ({
      rd_formula_id: newFormula.id,
      source_type: ing.source_type,
      ingredient_id: ing.ingredient_id,
      rd_ingredient_id: ing.rd_ingredient_id,
      qty: ing.qty,
      unit: ing.unit,
      in_stock: ing.in_stock,
      need_purchase: ing.need_purchase,
      est_unit_cost: ing.est_unit_cost,
      supplier_id: ing.supplier_id,
      created_by: user.id,
    }))

    const { error: ingredientsError } = await supabase
      .from('rd_formula_ingredients')
      .insert(ingredientsCopy)

    if (ingredientsError) {
      console.error('createNewFormulaVersion::copy ingredients error', ingredientsError)
      throw ingredientsError
    }
  }

  revalidatePath('/rnd/formulas')
  revalidatePath(`/rnd/formulas/${input.sourceFormulaId}`)
  return newFormula.id
}

export async function getFormulaVersions(formulaName: string) {
  const { supabase } = await getSupabaseWithUser()

  const { data, error } = await supabase
    .from('rd_formulas')
    .select(`
      id,
      name,
      version,
      version_major,
      version_minor,
      is_locked,
      parent_version_id,
      created_at,
      notes
    `)
    .eq('name', formulaName)
    .order('version_major', { ascending: true })
    .order('version_minor', { ascending: true })

  if (error) {
    console.error('getFormulaVersions failed', error)
    throw error
  }

  return data
}

// ============================================================================
// Cost Tracking
// ============================================================================

export type TestBatchCostInput = {
  testBatchId: string
  packagingCost?: number
  laborCost?: number
  overheadCost?: number
}

export async function updateTestBatchCosts(input: TestBatchCostInput) {
  const { supabase, user } = await getSupabaseWithUser()

  const payload: any = {}
  if (input.packagingCost !== undefined) payload.packaging_cost = input.packagingCost
  if (input.laborCost !== undefined) payload.labor_cost = input.laborCost
  if (input.overheadCost !== undefined) payload.overhead_cost = input.overheadCost

  const { error } = await supabase
    .from('rd_test_batches')
    .update(payload)
    .eq('id', input.testBatchId)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateTestBatchCosts failed', error)
    throw error
  }

  // Get the formula ID to revalidate the correct path
  const { data: testBatch } = await supabase
    .from('rd_test_batches')
    .select('rd_formula_id')
    .eq('id', input.testBatchId)
    .single()

  if (testBatch?.rd_formula_id) {
    revalidatePath(`/rnd/formulas/${testBatch.rd_formula_id}`)
  }
}
