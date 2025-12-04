'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { inventoryDemoData } from '@/data/inventoryDemo'
import { Plus, Edit, Eye, X, ArrowLeft, RefreshCw, Trash2, Sparkles } from 'lucide-react'
import { AppNav } from '@/components/nav/AppNav'
import { UnitSizeFields } from './components/UnitSizeFields'
import { CostBreakdown } from './components/CostBreakdown'
import { PremiumFormulationsView } from './_components/PremiumFormulationsView'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useTheme } from '@/lib/context/ThemeContext'
import { getBackgroundClass, getTextColor, getTextMuted, getCardBackground, getBorderColor } from '@/lib/utils/themeUtils'
import {
  calculateFormulationCost,
  updateFormulationCost,
  type ManufacturingCostBreakdown,
} from './_actions/costing'

type Formulation = {
  id: string
  name: string
  version: string
  status: string
  notes: string
  steps: string
  packaging_steps: string | null
  unit_pack_size_value: number | null
  unit_pack_size_unit: string | null
  process_yield_pct: number | null
  total_manufacturing_cost: number | null
  created_at: string
  created_by: string
}

type Ingredient = { id: string; name: string }
type PackagingItem = { id: string; name: string }

type FormulationIngredient = {
  id?: string
  ingredient_id: string
  phase: string
  percentage: number
  ingredients?: { name: string }
}

type FormulationPackaging = {
  id?: string
  packaging_id: string
  quantity_per_unit: number
  packaging?: { name: string }
}

type FormulationStep = { step_no: number; title: string }

export default function FormulationsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const { mode } = useTheme()

  const [formulations, setFormulations] = useState<Formulation[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedFormulation, setSelectedFormulation] = useState<Formulation | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list')

  const [formName, setFormName] = useState('')
  const [formVersion, setFormVersion] = useState('v1.0')
  const [formStatus, setFormStatus] = useState<'draft' | 'approved'>('draft')
  const [formNotes, setFormNotes] = useState('')
  const [formSteps, setFormSteps] = useState<FormulationStep[]>([{ step_no: 1, title: '' }])
  const [formPackagingSteps, setFormPackagingSteps] = useState<FormulationStep[]>([{ step_no: 1, title: '' }])
  const [formIngredients, setFormIngredients] = useState<FormulationIngredient[]>([
    { ingredient_id: '', phase: 'Oil Phase', percentage: 0 },
  ])
  const [formPackaging, setFormPackaging] = useState<FormulationPackaging[]>([
    { packaging_id: '', quantity_per_unit: 1 },
  ])
  const [formUnitPackSizeValue, setFormUnitPackSizeValue] = useState('50')
  const [formUnitPackSizeUnit, setFormUnitPackSizeUnit] = useState('g')
  const [formProcessYieldPct, setFormProcessYieldPct] = useState('100')
  const [costData, setCostData] = useState<ManufacturingCostBreakdown | null>(null)
  const [costLoading, setCostLoading] = useState(false)

  // ---------- helpers ----------
  function parseStepsFromString(stepsString: string): FormulationStep[] {
    if (!stepsString || !stepsString.trim()) return []
    return stepsString
      .split('\n')
      .map((step) => step.trim())
      .filter((step) => step.length > 0)
      .map((step, index) => ({ step_no: index + 1, title: step }))
  }

  function convertStepsToString(steps: FormulationStep[]): string {
    return steps
      .filter((step) => step.title.trim().length > 0)
      .map((step) => step.title.trim())
      .join('\n')
  }

  function logMsg(prefix: string, err: unknown) {
    const e = err as any
    console.error(
      prefix,
      e?.message ?? e?.error_description ?? e?.hint ?? e?.details ?? JSON.stringify(e)
    )
    return e?.message ?? e?.error_description ?? e?.hint ?? 'Something went wrong.'
  }

  function getTotalPercentage() {
    return formIngredients.reduce((sum, ing) => sum + (parseFloat(ing.percentage as any) || 0), 0)
  }

  function handleEdit() {
    setViewMode('edit')
  }

  function handleBackToList() {
    setSelectedFormulation(null)
    setViewMode('list')
    resetForm()
  }

  function resetForm() {
    setFormName('')
    setFormVersion('v1.0')
    setFormStatus('draft')
    setFormNotes('')
    setFormSteps([{ step_no: 1, title: '' }])
    setFormPackagingSteps([{ step_no: 1, title: '' }])
    setFormIngredients([{ ingredient_id: '', phase: 'Oil Phase', percentage: 0 }])
    setFormPackaging([{ packaging_id: '', quantity_per_unit: 1 }])
    setFormUnitPackSizeValue('50')
    setFormUnitPackSizeUnit('g')
    setFormProcessYieldPct('100')
    setCostData(null)
  }

  // ---------- auth / initial load ----------
  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  // ---------- data fetching ----------
  async function fetchData() {
    setLoading(true)
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'

      if (bypass) {
        setFormulations([])
        setIngredients(
          inventoryDemoData.ingredients.map((ing) => ({
            id: ing.id,
            name: ing.name,
          })),
        )
        setPackagingItems([])
        return
      }

      const { data: formulationsData, error: formulationsError } = await supabase
        .from('formulations')
        .select('*')
        .order('created_at', { ascending: false })

      if (formulationsError) throw formulationsError
      setFormulations(formulationsData || [])

      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (ingredientsError) throw ingredientsError
      setIngredients(ingredientsData || [])

      const { data: packagingData, error: packagingError } = await supabase
        .from('packaging')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (packagingError) throw packagingError
      setPackagingItems(packagingData || [])
    } catch (error) {
      logMsg('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFormulationDetails(formulation: Formulation) {
    try {
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('formulation_ingredients')
        .select(
          `
          *,
          ingredients (name)
        `
        )
        .eq('formulation_id', formulation.id)
        .order('sort_order')
      if (ingredientsError) throw ingredientsError

      const { data: packagingData, error: packagingError } = await supabase
        .from('formulation_packaging')
        .select(
          `
          *,
          packaging (name)
        `
        )
        .eq('formulation_id', formulation.id)
      if (packagingError) throw packagingError

      setSelectedFormulation(formulation)
      setFormIngredients(ingredientsData || [])
      setFormPackaging(packagingData || [{ packaging_id: '', quantity_per_unit: 1 }])
      setFormName(formulation.name)
      setFormVersion(formulation.version)
      setFormStatus(formulation.status as 'draft' | 'approved')
      setFormNotes(formulation.notes || '')
      setFormUnitPackSizeValue(formulation.unit_pack_size_value?.toString() || '50')
      setFormUnitPackSizeUnit(formulation.unit_pack_size_unit || 'g')
      setFormProcessYieldPct(formulation.process_yield_pct?.toString() || '100')

      const stepsArray = parseStepsFromString(formulation.steps || '')
      setFormSteps(stepsArray.length > 0 ? stepsArray : [{ step_no: 1, title: '' }])

      const packagingStepsArray = parseStepsFromString(formulation.packaging_steps || '')
      setFormPackagingSteps(
        packagingStepsArray.length > 0 ? packagingStepsArray : [{ step_no: 1, title: '' }]
      )

      // Load cost data
      const costs = await calculateFormulationCost(formulation.id)
      setCostData(costs)

      setViewMode('view')
    } catch (error) {
      logMsg('Error fetching formulation details:', error)
    }
  }

  // ---------- ingredient rows ----------
  function addIngredientRow() {
    setFormIngredients([
      ...formIngredients,
      { ingredient_id: '', phase: 'Oil Phase', percentage: 0 },
    ])
  }
  function removeIngredientRow(index: number) {
    setFormIngredients(formIngredients.filter((_, i) => i !== index))
  }
  function updateIngredient(index: number, field: keyof FormulationIngredient, value: any) {
    const updated = [...formIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setFormIngredients(updated)
  }

  // ---------- packaging rows ----------
  function addPackagingRow() {
    setFormPackaging([...formPackaging, { packaging_id: '', quantity_per_unit: 1 }])
  }
  function removePackagingRow(index: number) {
    setFormPackaging(formPackaging.filter((_, i) => i !== index))
  }
  function updatePackaging(index: number, field: keyof FormulationPackaging, value: any) {
    const updated = [...formPackaging]
    updated[index] = { ...updated[index], [field]: value }
    setFormPackaging(updated)
  }

  // ---------- step rows ----------
  function addStepRow() {
    const newStepNo = formSteps.length + 1
    setFormSteps([...formSteps, { step_no: newStepNo, title: '' }])
  }
  function removeStepRow(index: number) {
    const updated = formSteps.filter((_, i) => i !== index)
    const renumbered = updated.map((step, i) => ({ ...step, step_no: i + 1 }))
    setFormSteps(renumbered)
  }
  function updateStep(index: number, value: string) {
    const updated = [...formSteps]
    updated[index] = { ...updated[index], title: value }
    setFormSteps(updated)
  }

  // ---------- packaging step rows ----------
  function addPackagingStepRow() {
    const newStepNo = formPackagingSteps.length + 1
    setFormPackagingSteps([...formPackagingSteps, { step_no: newStepNo, title: '' }])
  }
  function removePackagingStepRow(index: number) {
    const updated = formPackagingSteps.filter((_, i) => i !== index)
    const renumbered = updated.map((step, i) => ({ ...step, step_no: i + 1 }))
    setFormPackagingSteps(renumbered)
  }
  function updatePackagingStep(index: number, value: string) {
    const updated = [...formPackagingSteps]
    updated[index] = { ...updated[index], title: value }
    setFormPackagingSteps(updated)
  }

  // ---------- submit / update ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      alert('Not authenticated.')
      return
    }

    const total = getTotalPercentage()
    // Allow percentages to exceed 100% for loss calculations
    // if (total > 100.0001) {
    //   alert(`Ingredients total ${total.toFixed(2)}%. It cannot exceed 100%.`)
    //   return
    // }

    try {
      const stepsString = convertStepsToString(formSteps)
      const packagingStepsString = convertStepsToString(formPackagingSteps)

      // Insert parent and only return id (avoids broad * and RLS surprises)
      const { data: newFormulation, error: formError } = await supabase
        .from('formulations')
        .insert({
          name: formName,
          version: formVersion,
          status: formStatus,
          notes: formNotes,
          steps: stepsString,
          packaging_steps: packagingStepsString,
          unit_pack_size_value: parseFloat(formUnitPackSizeValue) || null,
          unit_pack_size_unit: formUnitPackSizeUnit,
          process_yield_pct: parseFloat(formProcessYieldPct) || 100,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (formError) throw formError
      if (!newFormulation?.id) throw new Error('Insert succeeded but no id returned.')

      // Insert ingredients (if any)
      const ingredientsToInsert = formIngredients
        .filter((ing) => ing.ingredient_id && ing.percentage > 0)
        .map((ing, index) => ({
          formulation_id: newFormulation.id,
          ingredient_id: ing.ingredient_id,
          phase: ing.phase,
          percentage: ing.percentage,
          sort_order: index,
        }))

      if (ingredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('formulation_ingredients')
          .insert(ingredientsToInsert)
        if (ingredientsError) throw ingredientsError
      }

      // Insert packaging (if any)
      const packagingToInsert = formPackaging
        .filter((pkg) => pkg.packaging_id && pkg.quantity_per_unit > 0)
        .map((pkg) => ({
          formulation_id: newFormulation.id,
          packaging_id: pkg.packaging_id,
          quantity_per_unit: pkg.quantity_per_unit,
        }))

      if (packagingToInsert.length > 0) {
        const { error: packagingError } = await supabase
          .from('formulation_packaging')
          .insert(packagingToInsert)
        if (packagingError) throw packagingError
      }

      // Calculate and save manufacturing cost
      await updateFormulationCost(newFormulation.id)

      resetForm()
      setShowForm(false)
      await fetchData()
    } catch (error) {
      const msg = logMsg('Error creating formulation:', error)
      alert(msg || 'Error creating formulation. Please try again.')
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFormulation) return

    const total = getTotalPercentage()
    // Allow percentages to exceed 100% for loss calculations
    // if (total > 100.0001) {
    //   alert(`Ingredients total ${total.toFixed(2)}%. It cannot exceed 100%.`)
    //   return
    // }

    try {
      const stepsString = convertStepsToString(formSteps)
      const packagingStepsString = convertStepsToString(formPackagingSteps)

      const { error: formError } = await supabase
        .from('formulations')
        .update({
          name: formName,
          version: formVersion,
          status: formStatus,
          notes: formNotes,
          steps: stepsString,
          packaging_steps: packagingStepsString,
          unit_pack_size_value: parseFloat(formUnitPackSizeValue) || null,
          unit_pack_size_unit: formUnitPackSizeUnit,
          process_yield_pct: parseFloat(formProcessYieldPct) || 100,
        })
        .eq('id', selectedFormulation.id)
      if (formError) throw formError

      // Reset children: delete then re-insert
      const { error: delIngErr } = await supabase
        .from('formulation_ingredients')
        .delete()
        .eq('formulation_id', selectedFormulation.id)
      if (delIngErr) throw delIngErr

      const ingredientsToInsert = formIngredients
        .filter((ing) => ing.ingredient_id && ing.percentage > 0)
        .map((ing, index) => ({
          formulation_id: selectedFormulation.id,
          ingredient_id: ing.ingredient_id,
          phase: ing.phase,
          percentage: ing.percentage,
          sort_order: index,
        }))

      if (ingredientsToInsert.length > 0) {
        const { error: insIngErr } = await supabase
          .from('formulation_ingredients')
          .insert(ingredientsToInsert)
        if (insIngErr) throw insIngErr
      }

      const { error: delPkgErr } = await supabase
        .from('formulation_packaging')
        .delete()
        .eq('formulation_id', selectedFormulation.id)
      if (delPkgErr) throw delPkgErr

      const packagingToInsert = formPackaging
        .filter((pkg) => pkg.packaging_id && pkg.quantity_per_unit > 0)
        .map((pkg) => ({
          formulation_id: selectedFormulation.id,
          packaging_id: pkg.packaging_id,
          quantity_per_unit: pkg.quantity_per_unit,
        }))

      if (packagingToInsert.length > 0) {
        const { error: insPkgErr } = await supabase
          .from('formulation_packaging')
          .insert(packagingToInsert)
        if (insPkgErr) throw insPkgErr
      }

      // Recalculate and update manufacturing cost
      await updateFormulationCost(selectedFormulation.id)
      const updatedCosts = await calculateFormulationCost(selectedFormulation.id)
      setCostData(updatedCosts)

      setViewMode('view')
      await fetchData()
      setSelectedFormulation({
        ...selectedFormulation,
        name: formName,
        version: formVersion,
        status: formStatus,
        notes: formNotes,
        steps: stepsString,
        packaging_steps: packagingStepsString,
        unit_pack_size_value: parseFloat(formUnitPackSizeValue) || null,
        unit_pack_size_unit: formUnitPackSizeUnit,
        process_yield_pct: parseFloat(formProcessYieldPct) || 100,
      })
    } catch (error) {
      const msg = logMsg('Error updating formulation:', error)
      alert(msg || 'Error updating formulation. Please try again.')
    }
  }

  async function handleDelete(formulation: Formulation) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${formulation.name}" (${formulation.version})? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      // First check if there are any batches using this formulation
      const { data: batches, error: checkError } = await supabase
        .from('batches')
        .select('id, batch_code')
        .eq('formulation_id', formulation.id)
        .limit(5)

      if (checkError) throw checkError

      if (batches && batches.length > 0) {
        const batchCodes = batches.map(b => b.batch_code).join(', ')
        const moreText = batches.length === 5 ? ' (and possibly more)' : ''
        alert(
          `Cannot delete this formulation because it is being used by ${batches.length} batch(es): ${batchCodes}${moreText}.\n\nPlease delete or reassign these batches first.`
        )
        return
      }

      const { error } = await supabase
        .from('formulations')
        .delete()
        .eq('id', formulation.id)

      if (error) throw error

      // If we're currently viewing this formulation, go back to list
      if (selectedFormulation?.id === formulation.id) {
        handleBackToList()
      }

      await fetchData()
    } catch (error) {
      const msg = logMsg('Error deleting formulation:', error)
      alert(msg || 'Error deleting formulation. Please try again.')
    }
  }

  // ---------- early loading ----------
  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // ---------- view/edit mode ----------
  if (viewMode === 'view' || viewMode === 'edit') {
    const isEditing = viewMode === 'edit'
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav currentPage="formulations" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Formulations
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Formulation' : selectedFormulation?.name}
              </h1>
              {!isEditing && selectedFormulation && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 text-[#174940] hover:underline"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedFormulation)}
                    className="flex items-center gap-2 text-red-600 hover:underline"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={isEditing ? handleUpdate : (e) => e.preventDefault()} className="space-y-6">
              {/* Name / Version / Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                      required
                    />
                  ) : (
                    <div className="text-gray-900">{selectedFormulation?.name}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                      required
                    />
                  ) : (
                    <div className="text-gray-900">{selectedFormulation?.version}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {isEditing ? (
                    <select
                      value={formStatus}
                      onChange={(e) =>
                        setFormStatus((e.target.value as 'draft' | 'approved') ?? 'draft')
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    >
                      <option value="draft">Draft</option>
                      <option value="approved">Approved</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        selectedFormulation?.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedFormulation?.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Unit Size & Yield */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Unit Configuration
                </label>
                {isEditing ? (
                  <UnitSizeFields
                    unitPackSizeValue={formUnitPackSizeValue}
                    unitPackSizeUnit={formUnitPackSizeUnit}
                    processYieldPct={formProcessYieldPct}
                    onUnitPackSizeValueChange={setFormUnitPackSizeValue}
                    onUnitPackSizeUnitChange={setFormUnitPackSizeUnit}
                    onProcessYieldPctChange={setFormProcessYieldPct}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Unit Size</p>
                        <p className="font-medium text-gray-900">
                          {selectedFormulation?.unit_pack_size_value || '—'}{' '}
                          {selectedFormulation?.unit_pack_size_unit || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Unit Type</p>
                        <p className="font-medium text-gray-900">
                          {selectedFormulation?.unit_pack_size_unit || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Process Yield</p>
                        <p className="font-medium text-gray-900">
                          {selectedFormulation?.process_yield_pct || 100}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredients (Total: {getTotalPercentage().toFixed(2)}%)
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {formIngredients.map((ing, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={ing.ingredient_id}
                          onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                          required
                        >
                          <option value="">Select ingredient...</option>
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={ing.phase}
                          onChange={(e) => updateIngredient(index, 'phase', e.target.value)}
                          className="w-40 border border-gray-300 rounded px-3 py-2 text-gray-900"
                        >
                          <option value="Oil Phase">Oil Phase</option>
                          <option value="Water Phase">Water Phase</option>
                          <option value="Cannabinoid">Cannabinoid</option>
                          <option value="Extract">Extract</option>
                          <option value="Preservative">Preservative</option>
                          <option value="Essential Oil">Essential Oil</option>
                          <option value="Functional Additives">Functional Additives</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={ing.percentage}
                          onChange={(e) =>
                            updateIngredient(index, 'percentage', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 border border-gray-300 rounded px-3 py-2 text-gray-900"
                          placeholder="%"
                          required
                        />
                        {formIngredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="text-sm text-[#174940] hover:underline"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Ingredient
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Phase
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formIngredients.map((ing, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {ing.ingredients?.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{ing.phase}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {ing.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Manufacturing Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manufacturing Steps
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {formSteps.map((step, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="w-8 text-sm text-gray-600 text-right">{step.step_no}.</div>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(index, e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                          placeholder="Enter step description..."
                          required
                        />
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStepRow(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addStepRow}
                      className="text-sm text-[#174940] hover:underline"
                    >
                      + Add Step
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded p-4 border border-gray-200">
                    <ol className="space-y-2">
                      {formSteps.map((step) => (
                        <li key={step.step_no} className="text-gray-900">
                          <span className="font-medium">{step.step_no}.</span> {step.title}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Packaging Materials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Materials
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {formPackaging.map((pkg, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={pkg.packaging_id}
                          onChange={(e) => updatePackaging(index, 'packaging_id', e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                          required
                        >
                          <option value="">Select packaging...</option>
                          {packagingItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="1"
                          value={pkg.quantity_per_unit}
                          onChange={(e) =>
                            updatePackaging(
                              index,
                              'quantity_per_unit',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-32 border border-gray-300 rounded px-3 py-2 text-gray-900"
                          placeholder="Qty per unit"
                          required
                        />
                        {formPackaging.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePackagingRow(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPackagingRow}
                      className="text-sm text-[#174940] hover:underline"
                    >
                      + Add Packaging
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Packaging Item
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Qty Per Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formPackaging.map((pkg, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {pkg.packaging?.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {pkg.quantity_per_unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Packaging Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Steps
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {formPackagingSteps.map((step, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="w-8 text-sm text-gray-600 text-right">{step.step_no}.</div>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updatePackagingStep(index, e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                          placeholder="Enter packaging step..."
                          required
                        />
                        {formPackagingSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePackagingStepRow(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPackagingStepRow}
                      className="text-sm text-[#174940] hover:underline"
                    >
                      + Add Packaging Step
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded p-4 border border-gray-200">
                    <ol className="space-y-2">
                      {formPackagingSteps.map((step) => (
                        <li key={step.step_no} className="text-gray-900">
                          <span className="font-medium">{step.step_no}.</span> {step.title}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="Additional notes..."
                  />
                ) : (
                  <div className="text-gray-900 bg-gray-50 rounded p-4 border border-gray-200">
                    {selectedFormulation?.notes || 'No notes'}
                  </div>
                )}
              </div>

              {/* Manufacturing Cost Breakdown */}
              {!isEditing && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Manufacturing Cost
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedFormulation?.id) {
                          setCostLoading(true)
                          const costs = await calculateFormulationCost(selectedFormulation.id)
                          setCostData(costs)
                          setCostLoading(false)
                        }
                      }}
                      className="flex items-center gap-1 text-sm text-[#174940] hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recalculate
                    </button>
                  </div>
                  <CostBreakdown costData={costData} loading={costLoading} />
                </div>
              )}

              {isEditing && (
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('view')}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#1a5c51]"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      </div>
    )
  }

  // ---------- list mode ----------
  const bgClass = getBackgroundClass(mode)
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const cardBg = getCardBackground(mode)
  const borderColor = getBorderColor(mode)

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <AppNav currentPage="formulations" />

      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${cardBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Formulation Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Formulations</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Your product recipes and manufacturing guides.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              New Formulation
            </button>
          </div>
        </div>
      </div>

      <AnimatedBackground />
      <div className="relative z-10">
        <PremiumFormulationsView
          formulations={formulations}
          loading={loading}
          onView={fetchFormulationDetails}
          onDelete={handleDelete}
        />
      </div>

      {/* New Formulation Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">New Formulation</h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus((e.target.value as 'draft' | 'approved') ?? 'draft')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              {/* Unit Size & Yield */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Unit Configuration
                </label>
                <UnitSizeFields
                  unitPackSizeValue={formUnitPackSizeValue}
                  unitPackSizeUnit={formUnitPackSizeUnit}
                  processYieldPct={formProcessYieldPct}
                  onUnitPackSizeValueChange={setFormUnitPackSizeValue}
                  onUnitPackSizeUnitChange={setFormUnitPackSizeUnit}
                  onProcessYieldPctChange={setFormProcessYieldPct}
                />
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredients (Total: {getTotalPercentage().toFixed(2)}%)
                </label>
                <div className="space-y-2">
                  {formIngredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={ing.ingredient_id}
                        onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                        required
                      >
                        <option value="">Select ingredient...</option>
                        {ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={ing.phase}
                        onChange={(e) => updateIngredient(index, 'phase', e.target.value)}
                        className="w-36 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="Oil Phase">Oil Phase</option>
                        <option value="Water Phase">Water Phase</option>
                        <option value="Cannabinoid">Cannabinoid</option>
                        <option value="Extract">Extract</option>
                        <option value="Preservative">Preservative</option>
                        <option value="Essential Oil">Essential Oil</option>
                        <option value="Functional Additives">Functional Additives</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={ing.percentage}
                        onChange={(e) =>
                          updateIngredient(index, 'percentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                        placeholder="%"
                        required
                      />
                      {formIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="mt-2 text-sm text-[#174940] hover:underline"
                >
                  + Add Ingredient
                </button>
              </div>

              {/* Manufacturing Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manufacturing Steps
                </label>
                <div className="space-y-2">
                  {formSteps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="w-6 text-sm text-gray-600 text-right">{step.step_no}.</div>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                        placeholder="Enter step description..."
                        required
                      />
                      {formSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStepRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addStepRow}
                  className="mt-2 text-sm text-[#174940] hover:underline"
                >
                  + Add Step
                </button>
              </div>

              {/* Packaging Materials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Materials
                </label>
                <div className="space-y-2">
                  {formPackaging.map((pkg, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={pkg.packaging_id}
                        onChange={(e) => updatePackaging(index, 'packaging_id', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                        required
                      >
                        <option value="">Select packaging...</option>
                        {packagingItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="1"
                        value={pkg.quantity_per_unit}
                        onChange={(e) =>
                          updatePackaging(index, 'quantity_per_unit', parseInt(e.target.value) || 0)
                        }
                        className="w-32 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                        placeholder="Qty per unit"
                        required
                      />
                      {formPackaging.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePackagingRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPackagingRow}
                  className="mt-2 text-sm text-[#174940] hover:underline"
                >
                  + Add Packaging
                </button>
              </div>

              {/* Packaging Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Steps
                </label>
                <div className="space-y-2">
                  {formPackagingSteps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="w-6 text-sm text-gray-600 text-right">{step.step_no}.</div>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updatePackagingStep(index, e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                        placeholder="Enter packaging step..."
                        required
                      />
                      {formPackagingSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePackagingStepRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPackagingStepRow}
                  className="mt-2 text-sm text-[#174940] hover:underline"
                >
                  + Add Packaging Step
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="Additional notes or special considerations..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#1a5c51]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
