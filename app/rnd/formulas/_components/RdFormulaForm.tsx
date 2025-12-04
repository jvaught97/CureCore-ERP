'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, X, ArrowLeft } from 'lucide-react'
import {
  createRDFormula,
  updateRDFormula,
  createRDIngredient,
  createNewFormulaVersion,
  type FormulaPayload,
} from '@/app/rnd/_actions'
import { inventoryDemoData } from '@/data/inventoryDemo'

function isInformationalError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string | null; message?: string | null }
  if (!('code' in err)) return true
  if (err.code === '42P01' || err.code === 'PGRST116' || !err.code) {
    const hasMessage = typeof err.message === 'string' && err.message.trim().length > 0
    if (!hasMessage) return true
  }
  if (Object.keys(err).length === 0) return true
  return false
}

type InventoryIngredientOption = {
  id: string
  name: string
  unit: string | null
  cost_per_gram: number | null
}

type RdIngredientOption = {
  id: string
  name: string
  default_unit: string | null
  est_unit_cost: number | null
}

export type FormulaFormInitialState = {
  id?: string
  name: string
  version: string
  notes?: string
  isLocked?: boolean
  ingredients: Array<{
    sourceType: 'inventory' | 'rd'
    ingredientId?: string
    rdIngredientId?: string
    qty: number
    unit: string
    inStock?: boolean
    needPurchase?: boolean
    estUnitCost?: number | null
    supplierId?: string | null
  }>
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
}

type IngredientRowState = {
  uid: string
  sourceType: 'inventory' | 'rd'
  ingredientId?: string
  rdIngredientId?: string
  rdIngredientDraft?: {
    name: string
    description?: string
    defaultUnit?: string
    estUnitCost?: string
    supplierId?: string
  }
  qty: string
  unit: string
  inStock: boolean
  needPurchase: boolean
  estUnitCost?: string
  supplierId?: string
}

type StepRowState = {
  uid: string
  description: string
  time?: string
  temp?: string
}

type PackagingMaterialRow = {
  uid: string
  name: string
  supplier?: string
  cost?: string
}

type PackagingStepRow = {
  uid: string
  description: string
}

type RdFormulaFormProps = {
  initialState?: FormulaFormInitialState
  mode: 'create' | 'edit'
}

const COMMON_UNITS = [
  'g',
  'kg',
  'mg',
  'lb',
  'oz',
  'mL',
  'L',
  'fl oz',
  'gal',
  'unit',
  '%',
]

export default function RdFormulaForm({ initialState, mode }: RdFormulaFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  // Force database mode - bypass auth is disabled
  const demoMode = useRef(false).current
  const [inventoryOptions, setInventoryOptions] = useState<InventoryIngredientOption[]>([])
  const [rdOptions, setRdOptions] = useState<RdIngredientOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [showRdModal, setShowRdModal] = useState<boolean>(false)
  const [activeRdRowId, setActiveRdRowId] = useState<string | null>(null)
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false)
  const [versionChangeType, setVersionChangeType] = useState<'major' | 'minor'>('minor')

  const [name, setName] = useState(initialState?.name ?? '')
  const [version, setVersion] = useState(initialState?.version ?? 'v0.1')
  const [notes, setNotes] = useState(initialState?.notes ?? '')
  const [ingredients, setIngredients] = useState<IngredientRowState[]>(() =>
    (initialState?.ingredients ?? [
      {
        uid: uuidv4(),
        sourceType: 'inventory',
        ingredientId: undefined,
        qty: '',
        unit: '',
        inStock: false,
        needPurchase: false,
      },
    ]).map((ing) => ({
      uid: uuidv4(),
      sourceType: ing.sourceType,
      ingredientId: ing.ingredientId,
      rdIngredientId: ing.rdIngredientId,
      qty: ing.qty?.toString() ?? '',
      unit: ing.unit ?? '',
      inStock: ing.inStock ?? false,
      needPurchase:
        ing.needPurchase ?? (ing.sourceType === 'rd' ? true : false),
      estUnitCost: ing.estUnitCost != null ? ing.estUnitCost.toString() : undefined,
      supplierId: ing.supplierId ?? undefined,
    })),
  )
  const [steps, setSteps] = useState<StepRowState[]>(() =>
    (initialState?.manufacturingSteps ?? [{ description: '', time: '', temp: '' }]).map((step) => ({
      uid: uuidv4(),
      description: step.description,
      time: step.time ?? '',
      temp: step.temp ?? '',
    })),
  )
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingMaterialRow[]>(() =>
    (initialState?.packagingMaterials ?? []).map((item) => ({
      uid: uuidv4(),
      name: item.name,
      supplier: item.supplier ?? '',
      cost: item.cost != null ? item.cost.toString() : '',
    })),
  )
  const [packagingSteps, setPackagingSteps] = useState<PackagingStepRow[]>(() =>
    (initialState?.packagingSteps ?? []).map((item) => ({
      uid: uuidv4(),
      description: item.description,
    })),
  )

  const [rdModalDraft, setRdModalDraft] = useState({
    name: '',
    description: '',
    category: '',
    defaultUnit: '',
    quantity: '1',
    estUnitCost: '',
    supplierId: '',
  })
  const [rdModalSaving, setRdModalSaving] = useState(false)
  const [formMessage, setFormMessage] = useState<string | null>(null)

  const unitOptions = useMemo(() => {
    const set = new Set(COMMON_UNITS)
    inventoryOptions.forEach((item) => {
      if (item.unit?.trim()) set.add(item.unit.trim())
    })
    rdOptions.forEach((item) => {
      if (item.default_unit?.trim()) set.add(item.default_unit.trim())
    })
    ingredients.forEach((item) => {
      if (item.unit?.trim()) set.add(item.unit.trim())
    })
    return Array.from(set)
  }, [inventoryOptions, rdOptions, ingredients])

  useEffect(() => {
    let isMounted = true
    const loadOptions = async () => {
      setLoadingOptions(true)
      try {
        console.log('🔍 [FORMULA] Loading ingredient options, demoMode:', demoMode)

        // Always load real R&D ingredients from database
        const rdPromise = supabase
          .from('rd_ingredients')
          .select('id,name,default_unit,est_unit_cost')
          .order('created_at', { ascending: false })
          .limit(500)

        if (demoMode) {
          // In demo mode, use demo inventory but real R&D ingredients
          const rdRes = await rdPromise

          if (isMounted) {
            setInventoryOptions(
              inventoryDemoData.ingredients.map((ing) => ({
                id: ing.id,
                name: ing.name,
                unit: ing.unit ?? 'g',
                cost_per_gram: (ing.cost_per_gram as number | null) ?? null,
              })),
            )

            // Load real R&D ingredients from database
            if (rdRes.error) {
              if (isInformationalError(rdRes.error)) {
                console.info('R&D ingredients not available yet.')
                setRdOptions([])
              } else {
                console.info('Failed to load R&D ingredients', rdRes.error)
              }
            } else if (rdRes.data) {
              setRdOptions(rdRes.data)
            }

            setError(null)
          }
          setLoadingOptions(false)
          return
        }

        // Production mode - load both from database
        const [inventoryRes, rdRes] = await Promise.all([
          supabase
            .from('ingredients')
            .select('id,name,unit,cost_per_gram')
            .order('name')
            .limit(500),
          rdPromise,
        ])

        if (inventoryRes.error) {
          if (isInformationalError(inventoryRes.error)) {
            console.info('Inventory ingredients not available yet.')
            if (isMounted) setInventoryOptions([])
          } else {
            console.error('Failed to load inventory ingredients', inventoryRes.error)
            if (isMounted) setError('Unable to load inventory ingredients.')
          }
        } else if (isMounted && inventoryRes.data) {
          setInventoryOptions(inventoryRes.data)
        }

        if (rdRes.error) {
          if (isInformationalError(rdRes.error)) {
            console.info('R&D ingredients not available yet.')
            if (isMounted) setRdOptions([])
          } else {
            console.error('❌ [FORMULA] Failed to load R&D ingredients:', rdRes.error)
            console.error('❌ [FORMULA] Error details:', {
              message: rdRes.error.message,
              code: rdRes.error.code,
              details: rdRes.error.details,
              hint: rdRes.error.hint,
            })
            if (isMounted) setError('Unable to load R&D ingredients.')
          }
        } else if (isMounted && rdRes.data) {
          console.log('✅ [FORMULA] R&D ingredients loaded:', rdRes.data.length, 'items')
          setRdOptions(rdRes.data)
        }
      } catch (err) {
        console.error('Unexpected error loading ingredient options', err)
        if (isMounted) setError('Unable to load ingredients.')
      } finally {
        if (isMounted) setLoadingOptions(false)
      }
    }

    loadOptions()
    return () => {
      isMounted = false
    }
  }, [supabase, demoMode])

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        uid: uuidv4(),
        sourceType: 'inventory',
        ingredientId: undefined,
        qty: '',
        unit: '',
        inStock: false,
        needPurchase: false,
      },
    ])
  }

  const handleIngredientChange = (uid: string, patch: Partial<IngredientRowState>) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.uid === uid ? { ...ing, ...patch } : ing)),
    )
  }

  const handleRemoveIngredient = (uid: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.uid !== uid))
  }

  const moveRow = <T extends { uid: string }>(
    items: T[],
    uid: string,
    direction: 'up' | 'down',
  ): T[] => {
    const index = items.findIndex((item) => item.uid === uid)
    if (index === -1) return items
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return items
    const newItems = [...items]
    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    return newItems
  }

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { uid: uuidv4(), description: '', time: '', temp: '' },
    ])
  }

  const handleStepChange = (uid: string, patch: Partial<StepRowState>) => {
    setSteps((prev) =>
      prev.map((step) => (step.uid === uid ? { ...step, ...patch } : step)),
    )
  }

  const handleRemoveStep = (uid: string) => {
    setSteps((prev) => prev.filter((step) => step.uid !== uid))
  }

  const handleAddPackagingMaterial = () => {
    setPackagingMaterials((prev) => [
      ...prev,
      { uid: uuidv4(), name: '', supplier: '', cost: '' },
    ])
  }

  const handlePackagingMaterialChange = (
    uid: string,
    patch: Partial<PackagingMaterialRow>,
  ) => {
    setPackagingMaterials((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)),
    )
  }

  const handleRemovePackagingMaterial = (uid: string) => {
    setPackagingMaterials((prev) => prev.filter((item) => item.uid !== uid))
  }

  const handleAddPackagingStep = () => {
    setPackagingSteps((prev) => [...prev, { uid: uuidv4(), description: '' }])
  }

  const handlePackagingStepChange = (uid: string, patch: Partial<PackagingStepRow>) => {
    setPackagingSteps((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)),
    )
  }

  const handleRemovePackagingStep = (uid: string) => {
    setPackagingSteps((prev) => prev.filter((item) => item.uid !== uid))
  }

  const openRdModal = (rowId: string) => {
    setActiveRdRowId(rowId)
    setRdModalDraft({
      name: '',
      description: '',
      category: '',
      defaultUnit: '',
      quantity: '1',
      estUnitCost: '',
      supplierId: '',
    })
    setShowRdModal(true)
  }

  const handleCreateRdIngredient = async () => {
    if (!activeRdRowId) return
    if (!rdModalDraft.name.trim()) {
      setFormMessage('Provide a name for the new R&D ingredient.')
      return
    }
    setRdModalSaving(true)
    setFormMessage(null)
    try {
      const quantityValue = rdModalDraft.quantity ? Number(rdModalDraft.quantity) : undefined
      const estCostValue = rdModalDraft.estUnitCost ? Number(rdModalDraft.estUnitCost) : undefined
      const newId = await createRDIngredient({
        name: rdModalDraft.name.trim(),
        description: rdModalDraft.description?.trim() || undefined,
        category: rdModalDraft.category?.trim() || undefined,
        defaultUnit: rdModalDraft.defaultUnit?.trim() || undefined,
        quantity: quantityValue != null && !Number.isNaN(quantityValue) ? quantityValue : undefined,
        estUnitCost: estCostValue != null && !Number.isNaN(estCostValue) ? estCostValue : undefined,
        supplierId: rdModalDraft.supplierId?.trim() || undefined,
      })

      // Refresh RD options
      const { data: latestRd } = await supabase
        .from('rd_ingredients')
        .select('id,name,default_unit,est_unit_cost')
        .order('created_at', { ascending: false })
        .limit(100)

      if (latestRd) setRdOptions(latestRd)

      handleIngredientChange(activeRdRowId, {
        rdIngredientId: newId,
        rdIngredientDraft: undefined,
      })
      setShowRdModal(false)
    } catch (err) {
      console.error('Failed to create R&D ingredient', err)
      setFormMessage('Failed to create R&D ingredient. Please try again.')
    } finally {
      setRdModalSaving(false)
    }
  }

  const resetErrors = () => {
    setError(null)
    setFormMessage(null)
  }

  const validateForm = () => {
    if (!name.trim()) return 'Name is required.'
    if (!version.trim()) return 'Version is required.'
    if (ingredients.length === 0) return 'Add at least one ingredient.'
    for (const ing of ingredients) {
      if (!ing.qty || Number(ing.qty) <= 0) return 'Ingredient quantity is required.'
      if (!ing.unit.trim()) return 'Ingredient unit is required.'
      if (ing.sourceType === 'inventory' && !ing.ingredientId) {
        return 'Select an inventory ingredient.'
      }
      if (ing.sourceType === 'rd' && !ing.rdIngredientId && !ing.rdIngredientDraft?.name) {
        return 'Specify an R&D ingredient or create a new one.'
      }
    }
    if (steps.length === 0) return 'Add at least one manufacturing step.'
    for (const step of steps) {
      if (!step.description.trim()) return 'Each manufacturing step needs a description.'
    }
    return null
  }

  const buildPayload = (): FormulaPayload => {
    return {
      name: name.trim(),
      version: version.trim(),
      notes: notes.trim() || undefined,
      manufacturingSteps: steps.map((step) => ({
        description: step.description.trim(),
        time: step.time?.trim() || undefined,
        temp: step.temp?.trim() || undefined,
      })),
      packagingMaterials: packagingMaterials
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          supplier: item.supplier?.trim() || undefined,
          cost:
            item.cost && !Number.isNaN(Number(item.cost))
              ? Number(item.cost)
              : undefined,
        })),
      packagingSteps: packagingSteps
        .filter((item) => item.description.trim())
        .map((item) => ({ description: item.description.trim() })),
      ingredients: ingredients.map((ing) => ({
        sourceType: ing.sourceType,
        ingredientId: ing.sourceType === 'inventory' ? ing.ingredientId : undefined,
        rdIngredientId: ing.sourceType === 'rd' ? ing.rdIngredientId : undefined,
        rdIngredientDraft:
          ing.sourceType === 'rd' && !ing.rdIngredientId
            ? {
                name: ing.rdIngredientDraft?.name?.trim() ?? '',
                description: ing.rdIngredientDraft?.description?.trim() || undefined,
                defaultUnit: ing.rdIngredientDraft?.defaultUnit?.trim() || undefined,
                estUnitCost:
                  ing.rdIngredientDraft?.estUnitCost &&
                  !Number.isNaN(Number(ing.rdIngredientDraft.estUnitCost))
                    ? Number(ing.rdIngredientDraft.estUnitCost)
                    : undefined,
                supplierId: ing.rdIngredientDraft?.supplierId?.trim() || undefined,
              }
            : undefined,
        qty: Number(ing.qty),
        unit: ing.unit.trim(),
        inStock: ing.inStock,
        needPurchase: ing.needPurchase,
        estUnitCost:
          ing.estUnitCost && !Number.isNaN(Number(ing.estUnitCost))
            ? Number(ing.estUnitCost)
            : undefined,
        supplierId: ing.supplierId?.trim() || undefined,
      })),
    }
  }

  const handleSubmit = () => {
    console.log('🔵 [FORMULA] handleSubmit called')
    resetErrors()
    const validationError = validateForm()
    if (validationError) {
      console.error('❌ [FORMULA] Validation failed:', validationError)
      setFormMessage(validationError)
      return
    }
    console.log('✅ [FORMULA] Validation passed')
    const payload = buildPayload()
    console.log('📦 [FORMULA] Payload built:', payload)
    startSaving(async () => {
      try {
        console.log('💾 [FORMULA] Starting save operation, mode:', mode)
        if (mode === 'edit' && initialState?.id) {
          console.log('✏️ [FORMULA] Updating formula:', initialState.id)
          await updateRDFormula(initialState.id, payload)
        } else {
          console.log('➕ [FORMULA] Creating new formula')
          await createRDFormula(payload)
        }
        console.log('✅ [FORMULA] Save successful, redirecting to /rnd/formulas')
        router.push('/rnd/formulas')
      } catch (err) {
        console.error('❌ [FORMULA] Save failed:', err)
        console.error('❌ [FORMULA] Error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          err
        })
        setFormMessage('Failed to save the formula. Please try again.')
      }
    })
  }

  const handleCreateNewVersion = () => {
    if (!initialState?.id) return
    startSaving(async () => {
      try {
        const newVersionId = await createNewFormulaVersion({
          sourceFormulaId: initialState.id!,
          changeType: versionChangeType,
        })
        console.log('✅ [FORMULA] New version created:', newVersionId)
        setShowVersionModal(false)
        router.push(`/rnd/formulas/${newVersionId}`)
      } catch (err) {
        console.error('❌ [FORMULA] Failed to create new version:', err)
        setFormMessage('Failed to create new version. Please try again.')
      }
    })
  }

  const isLocked = mode === 'edit' && initialState?.isLocked

  return (
    <div className="space-y-6">
      {isLocked && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">This formula version is locked</p>
          <p className="mt-1">
            This is a historical version and cannot be edited. To make changes, create a new version using the "Save as New Version" button below.
          </p>
        </div>
      )}
      {formMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {formMessage}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Formula Details</h2>
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Name <span className="text-red-500">*</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isLocked}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Version <span className="text-red-500">*</span>
            <input
              type="text"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              disabled={isLocked}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </label>
        </div>
        <div className="px-5 pb-5">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              disabled={isLocked}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ingredients</h2>
            <p className="text-sm text-gray-500">
              Capture both inventory ingredients and experimental inputs.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddIngredient}
            disabled={isLocked}
            className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {ingredients.map((ing, index) => (
            <div key={ing.uid} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Ingredient #{index + 1}
                  </span>
                  <div className="flex gap-2 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => setIngredients((prev) => moveRow(prev, ing.uid, 'up'))}
                      disabled={index === 0}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngredients((prev) => moveRow(prev, ing.uid, 'down'))}
                      disabled={index === ingredients.length - 1}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(ing.uid)}
                  className="inline-flex items-center gap-1 rounded border border-transparent px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Source
                  <select
                    value={ing.sourceType}
                    onChange={(event) => {
                      const value = event.target.value as 'inventory' | 'rd'
                      handleIngredientChange(ing.uid, {
                        sourceType: value,
                        ingredientId: value === 'inventory' ? ing.ingredientId : undefined,
                        rdIngredientId: value === 'rd' ? ing.rdIngredientId : undefined,
                        needPurchase:
                          value === 'rd'
                            ? true
                            : ing.needPurchase,
                      })
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="inventory">Inventory Ingredient</option>
                    <option value="rd">R&amp;D-Only Ingredient</option>
                  </select>
                </label>

                <div className="grid gap-3">
                  {ing.sourceType === 'inventory' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-gray-600">
                        Ingredient <span className="text-red-500">*</span>
                        <select
                          value={ing.ingredientId ?? ''}
                          onChange={(event) =>
                            handleIngredientChange(ing.uid, {
                              ingredientId: event.target.value || undefined,
                            })
                          }
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                        >
                          <option value="">Select ingredient</option>
                          {inventoryOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={ing.inStock}
                            onChange={(event) =>
                              handleIngredientChange(ing.uid, { inStock: event.target.checked })
                            }
                            className="rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                          />
                          In stock?
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={ing.needPurchase}
                            onChange={(event) =>
                              handleIngredientChange(ing.uid, { needPurchase: event.target.checked })
                            }
                            className="rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                          />
                          Need purchase?
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-gray-600">
                        R&amp;D Ingredient <span className="text-red-500">*</span>
                        <select
                          value={ing.rdIngredientId ?? ''}
                          onChange={(event) =>
                            handleIngredientChange(ing.uid, {
                              rdIngredientId: event.target.value || undefined,
                              rdIngredientDraft: undefined,
                            })
                          }
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                        >
                          <option value="">Select R&amp;D ingredient</option>
                          {rdOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => openRdModal(ing.uid)}
                        className="self-end inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
                      >
                        <Plus className="h-4 w-4" />
                        New R&amp;D Ingredient
                      </button>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Quantity <span className="text-red-500">*</span>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={ing.qty}
                        onChange={(event) =>
                          handleIngredientChange(ing.uid, { qty: event.target.value })
                        }
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Unit <span className="text-red-500">*</span>
                      <select
                        value={ing.unit}
                        onChange={(event) =>
                          handleIngredientChange(ing.uid, { unit: event.target.value })
                        }
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="">Select unit</option>
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Est. Unit Cost
                      <input
                        type="number"
                        step="0.01"
                        value={ing.estUnitCost ?? ''}
                        onChange={(event) =>
                          handleIngredientChange(ing.uid, { estUnitCost: event.target.value })
                        }
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Supplier ID
                      <input
                        type="text"
                        value={ing.supplierId ?? ''}
                        onChange={(event) =>
                          handleIngredientChange(ing.uid, { supplierId: event.target.value })
                        }
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loadingOptions && (
            <div className="text-sm text-gray-500">Loading ingredient options…</div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manufacturing Steps</h2>
            <p className="text-sm text-gray-500">
              Document process order, timing, and optional temperature controls.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddStep}
            className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
          >
            <Plus className="h-4 w-4" />
            Add Step
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {steps.map((step, index) => (
            <div key={step.uid} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Step #{index + 1}
                  </span>
                  <div className="flex gap-2 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => setSteps((prev) => moveRow(prev, step.uid, 'up'))}
                      disabled={index === 0}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
                      aria-label="Move step up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSteps((prev) => moveRow(prev, step.uid, 'down'))}
                      disabled={index === steps.length - 1}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
                      aria-label="Move step down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(step.uid)}
                  className="inline-flex items-center gap-1 rounded border border-transparent px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="md:col-span-3 flex flex-col gap-1 text-sm text-gray-600">
                  Description <span className="text-red-500">*</span>
                  <textarea
                    value={step.description}
                    onChange={(event) =>
                      handleStepChange(step.uid, { description: event.target.value })
                    }
                    rows={2}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Time (optional)
                  <input
                    type="text"
                    value={step.time ?? ''}
                    onChange={(event) =>
                      handleStepChange(step.uid, { time: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Temperature (optional)
                  <input
                    type="text"
                    value={step.temp ?? ''}
                    onChange={(event) =>
                      handleStepChange(step.uid, { temp: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Packaging (Optional)</h2>
              <p className="text-sm text-gray-500">
                Capture packaging materials and steps once the formula is ready to scale.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-6 px-5 py-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Materials</h3>
              <button
                type="button"
                onClick={handleAddPackagingMaterial}
                className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-xs font-semibold text-[#174940] hover:bg-[#174940]/5"
              >
                <Plus className="h-4 w-4" />
                Add Material
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {packagingMaterials.map((item) => (
                <div
                  key={item.uid}
                  className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 md:grid-cols-4"
                >
                  <input
                    type="text"
                    placeholder="Name"
                    value={item.name}
                    onChange={(event) =>
                      handlePackagingMaterialChange(item.uid, { name: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Supplier"
                    value={item.supplier ?? ''}
                    onChange={(event) =>
                      handlePackagingMaterialChange(item.uid, { supplier: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    value={item.cost ?? ''}
                    onChange={(event) =>
                      handlePackagingMaterialChange(item.uid, { cost: event.target.value })
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePackagingMaterial(item.uid)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Packaging Steps</h3>
              <button
                type="button"
                onClick={handleAddPackagingStep}
                className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-xs font-semibold text-[#174940] hover:bg-[#174940]/5"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {packagingSteps.map((item) => (
                <div
                  key={item.uid}
                  className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:gap-4"
                >
                  <textarea
                    value={item.description}
                    onChange={(event) =>
                      handlePackagingStepChange(item.uid, { description: event.target.value })
                    }
                    rows={2}
                    placeholder="Describe packaging step"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePackagingStep(item.uid)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
        <div className="flex flex-wrap gap-2">
          {mode === 'edit' && !isLocked && (
            <button
              type="button"
              onClick={() => setShowVersionModal(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-4 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save as New Version
            </button>
          )}
          {!isLocked && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {mode === 'create' ? 'Save Formula' : 'Update Formula'}
                </>
              )}
            </button>
          )}
          {isLocked && (
            <button
              type="button"
              onClick={() => setShowVersionModal(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Version…
                </>
              ) : (
                'Create New Version'
              )}
            </button>
          )}
        </div>
      </div>

      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Create New Formula Version</h3>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <p className="text-sm text-gray-600">
                Creating a new version will lock this current version (making it read-only) and create a copy with an incremented version number.
              </p>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Select version change type:</p>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="versionType"
                    value="minor"
                    checked={versionChangeType === 'minor'}
                    onChange={() => setVersionChangeType('minor')}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Minor Change (v1.0 → v1.1)</span>
                    <p className="text-xs text-gray-500">Small tweaks, ingredient adjustments, or process refinements</p>
                  </div>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="versionType"
                    value="major"
                    checked={versionChangeType === 'major'}
                    onChange={() => setVersionChangeType('major')}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Major Change (v1.9 → v2.0)</span>
                    <p className="text-xs text-gray-500">Significant formula changes, new ingredients, or major process updates</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                disabled={saving}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewVersion}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create New Version'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">New R&amp;D Ingredient</h3>
              <button
                type="button"
                onClick={() => setShowRdModal(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-gray-700">
              <label className="flex flex-col gap-1">
                Name <span className="text-red-500">*</span>
                <input
                  type="text"
                  value={rdModalDraft.name}
                  onChange={(event) =>
                    setRdModalDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                Category
                <input
                  type="text"
                  value={rdModalDraft.category}
                  onChange={(event) =>
                    setRdModalDraft((prev) => ({ ...prev, category: event.target.value }))
                  }
                  placeholder="e.g., Sweetener, Protein, Fat, Preservative"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                Description
                <textarea
                  value={rdModalDraft.description}
                  onChange={(event) =>
                    setRdModalDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                  Default Unit
                  <select
                    value={rdModalDraft.defaultUnit}
                    onChange={(event) =>
                      setRdModalDraft((prev) => ({ ...prev, defaultUnit: event.target.value }))
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Select unit (optional)</option>
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  Package Quantity
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rdModalDraft.quantity}
                    onChange={(event) =>
                      setRdModalDraft((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                    placeholder="1"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Total Cost
                  <input
                    type="number"
                    step="0.01"
                    value={rdModalDraft.estUnitCost}
                    onChange={(event) =>
                      setRdModalDraft((prev) => ({ ...prev, estUnitCost: event.target.value }))
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                Supplier ID
                <input
                  type="text"
                  value={rdModalDraft.supplierId}
                  onChange={(event) =>
                    setRdModalDraft((prev) => ({ ...prev, supplierId: event.target.value }))
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowRdModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rdModalSaving}
                onClick={handleCreateRdIngredient}
                className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {rdModalSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Create Ingredient'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
