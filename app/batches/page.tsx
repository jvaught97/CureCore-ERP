'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { inventoryDemoData } from '@/data/inventoryDemo'
import { Plus, Eye, ArrowLeft, Upload, Download, Package, FlaskConical, Sparkles } from 'lucide-react'
import { AppNav } from '@/components/nav/AppNav'
import { exportBatchesToExcel } from '@/lib/export-utils'
import { PremiumBatchesView } from './_components/PremiumBatchesView'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useTheme } from '@/lib/context/ThemeContext'
import { getBackgroundClass, getTextColor, getTextMuted, getCardBackground, getBorderColor } from '@/lib/utils/themeUtils'

/* -------------------------------------------------------------
   Types
------------------------------------------------------------- */
type Batch = {
  id: string
  batch_code: string
  sku: string
  formulation_id: string
  size_liters: number
  manufacturing_status: 'in_process' | 'completed'
  packaging_status: 'pending' | 'ready' | 'in_process' | 'completed'
  expected_yield: number
  actual_yield: number | null
  created_at: string
  sent_to_packaging_at: string | null
  formulations: {
    name: string
    version: string
  } | null
}

type BatchStep = {
  id: string
  batch_id: string
  step_no: number
  title: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  notes: string | null
  users: {
    name: string
  } | null
}

type FormulationIngredient = {
  id: string
  ingredient_id: string
  percentage: number
  phase: string
  ingredients: {
    name: string
    unit: string | null
  } | null
}

type Formulation = {
  id: string
  name: string
  version: string
  steps: string | null
}

/* -------------------------------------------------------------
   Helpers
------------------------------------------------------------- */
const PHASE_ORDER: Record<string, number> = {
  'Oil Phase': 1,
  'Water Phase': 2,
  'Cannabinoid': 3,
  'Extract': 4,
  'Preservative': 5,
  'Essential Oil': 6,
}

function logSupabaseError(prefix: string, err: unknown) {
  try {
    const anyErr = err as any
    const msg =
      anyErr?.message ??
      anyErr?.error_description ??
      anyErr?.hint ??
      anyErr?.details ??
      (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err))
    console.error(`${prefix}:`, msg)
    console.dir(err, { depth: null })
    return msg
  } catch {
    console.error(`${prefix}:`, err)
    return String(err)
  }
}

function parseStepsFromString(steps: string | null | undefined): string[] {
  if (!steps || !steps.trim()) return []
  return steps
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/* -------------------------------------------------------------
   Component
------------------------------------------------------------- */
export default function BatchesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const { mode } = useTheme()

  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [batchSteps, setBatchSteps] = useState<BatchStep[]>([])
  const [formulationIngredients, setFormulationIngredients] = useState<FormulationIngredient[]>([])
  const [formulations, setFormulations] = useState<Formulation[]>([])
  const [showNewBatchForm, setShowNewBatchForm] = useState(false)

  const [newBatchSku, setNewBatchSku] = useState('')
  const [newBatchFormulation, setNewBatchFormulation] = useState('')
  const [newBatchSize, setNewBatchSize] = useState('')
  const [newBatchYield, setNewBatchYield] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchBatches()
      fetchFormulations()
    }
  }, [user])

  /* -----------------------------------------------------------
     Data Loads
  ----------------------------------------------------------- */
  async function fetchBatches() {
    setLoading(true)
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'

      if (bypass) {
        const demoFormulation = {
          id: 'demo-formulation',
          name: 'Demo Serum',
          version: 'v1.0',
          steps: 'Mix / Inspect / Fill',
        }
        setFormulations([demoFormulation])
        setBatches([
          {
            id: 'demo-batch',
            batch_code: 'BCH-0001',
            sku: 'SKU-001',
            formulation_id: demoFormulation.id,
            size_liters: 50,
            manufacturing_status: 'in_process',
            packaging_status: 'pending',
            expected_yield: 48,
            actual_yield: null,
            created_at: new Date().toISOString(),
            sent_to_packaging_at: null,
            formulations: { name: demoFormulation.name, version: demoFormulation.version },
          },
        ] as Batch[])
        setBatchSteps([])
        setFormulationIngredients(
          inventoryDemoData.ingredients.slice(0, 3).map((ing, idx) => ({
            id: `demo-form-ingredient-${idx}`,
            ingredient_id: ing.id,
            percentage: 10 + idx * 5,
            phase: idx % 2 === 0 ? 'Oil Phase' : 'Water Phase',
            ingredients: { name: ing.name, unit: ing.unit ?? 'g' },
          })),
        )
        return
      }

      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          formulations (name, version)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBatches(data || [])
    } catch (err) {
      logSupabaseError('Error fetching batches', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFormulations() {
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
      if (bypass) return
      const { data, error } = await supabase
        .from('formulations')
        .select('id, name, version, steps')
        .eq('status', 'approved')
        .order('name', { ascending: true })

      if (error) throw error
      setFormulations(data || [])
    } catch (err) {
      logSupabaseError('Error fetching formulations', err)
    }
  }

  async function fetchBatchSteps(batchId: string) {
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
      if (bypass) return
      const { data, error } = await supabase
        .from('batch_steps')
        .select(`
          *,
          users (name)
        `)
        .eq('batch_id', batchId)
        .order('step_no', { ascending: true })

      if (error) throw error
      setBatchSteps(data || [])
    } catch (err) {
      logSupabaseError('Error fetching batch steps', err)
    }
  }

  async function fetchFormulationIngredients(formulationId: string) {
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
      if (bypass) return
      const { data, error } = await supabase
        .from('formulation_ingredients')
        .select(`
          id,
          ingredient_id,
          percentage,
          phase,
          ingredients (name, unit)
        `)
        .eq('formulation_id', formulationId)
        .order('phase', { ascending: true })

      if (error) throw error
      setFormulationIngredients(data || [])
    } catch (err) {
      logSupabaseError('Error fetching formulation ingredients', err)
      setFormulationIngredients([])
    }
  }

  /* -----------------------------------------------------------
     Handlers
  ----------------------------------------------------------- */
  async function handleViewBatch(batch: Batch) {
    setSelectedBatch(batch)
    await fetchBatchSteps(batch.id)
    await fetchFormulationIngredients(batch.formulation_id)
  }

  async function toggleStepCompletion(step: BatchStep) {
    try {
      const { error } = await supabase
        .from('batch_steps')
        .update({
          completed: !step.completed,
          completed_by: !step.completed ? user?.id : null,
          completed_at: !step.completed ? new Date().toISOString() : null,
        })
        .eq('id', step.id)

      if (error) throw error

      if (selectedBatch) {
        await fetchBatchSteps(selectedBatch.id)
      }
    } catch (err) {
      const msg = logSupabaseError('Error updating step', err)
      alert(`Error updating step: ${msg}`)
    }
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()

    try {
      const selForm = formulations.find((f) => f.id === newBatchFormulation)
      if (!selForm) {
        alert('Please select a formulation.')
        return
      }

      const sizeLiters = Number(newBatchSize)
      const expectedYield = Number(newBatchYield)

      if (!Number.isFinite(sizeLiters) || sizeLiters <= 0) {
        alert('Batch Size must be a positive number.')
        return
      }
      if (!Number.isFinite(expectedYield) || expectedYield <= 0) {
        alert('Expected Yield must be a positive number.')
        return
      }

      // Generate a batch code
      const year = new Date().getFullYear()
      const { count, error: countError } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
      if (countError) throw countError

      const batchNumber = (count || 0) + 1
      const batchCode = `COR-${year}-${String(batchNumber).padStart(3, '0')}`

      // Insert new batch
      const { data: newBatch, error: insertError } = await supabase
        .from('batches')
        .insert({
          batch_code: batchCode,
          sku: newBatchSku,
          formulation_id: selForm.id,
          size_liters: sizeLiters,
          expected_yield: expectedYield,
          manufacturing_status: 'in_process',
          packaging_status: 'pending',
          created_by: user?.id ?? null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Parse or default steps
      let steps = parseStepsFromString(selForm.steps)
      if (steps.length === 0) {
        steps = [
          'Weigh Phase A ingredients',
          'Heat Phase A to 160°F',
          'Heat Phase B to 160°F',
          'Emulsify and mix to homogeneity',
          'Cool to 45°C',
          'Add cool-down ingredients',
          'Quality check',
          'Fill & package',
        ]
      }

      // Insert batch_steps (using step_no)
      const stepsToInsert = steps.map((title, idx) => ({
        batch_id: newBatch.id,
        step_no: idx + 1,
        title,
        completed: false,
      }))

      const { error: stepsError } = await supabase.from('batch_steps').insert(stepsToInsert)
      if (stepsError) {
        const msg = logSupabaseError('Error creating batch steps', stepsError)
        alert(`Batch ${batchCode} created, but there was an error creating steps: ${msg}`)
        await fetchBatches()
        setShowNewBatchForm(false)
        return
      }

      // Reset form
      setNewBatchSku('')
      setNewBatchFormulation('')
      setNewBatchSize('')
      setNewBatchYield('')
      setShowNewBatchForm(false)

      await fetchBatches()
    } catch (err) {
      const msg = logSupabaseError('Error creating batch', err)
      alert(`Error creating batch: ${msg}`)
    }
  }

  async function handleSendToPackaging() {
    if (!selectedBatch) return
    const allStepsCompleted = batchSteps.every((s) => s.completed)

    if (!allStepsCompleted) {
      alert('Please complete all manufacturing steps before sending to packaging.')
      return
    }

    const confirmed = confirm('Send this batch to packaging? The packaging team will be notified.')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('batches')
        .update({
          manufacturing_status: 'completed',
          packaging_status: 'ready',
          sent_to_packaging_at: new Date().toISOString(),
        })
        .eq('id', selectedBatch.id)

      if (error) throw error

      alert('Batch sent to packaging successfully!')
      setSelectedBatch(null)
      await fetchBatches()
    } catch (err) {
      const msg = logSupabaseError('Error sending batch to packaging', err)
      alert(`Error sending batch to packaging: ${msg}`)
    }
  }

  /* -----------------------------------------------------------
     Derived
  ----------------------------------------------------------- */
  const groupedIngredients = useMemo(() => {
    return formulationIngredients.reduce((acc, ing) => {
      const phase = ing.phase || 'Other'
      if (!acc[phase]) acc[phase] = []
      acc[phase].push(ing)
      return acc
    }, {} as Record<string, FormulationIngredient[]>)
  }, [formulationIngredients])

  const sortedPhases = useMemo(() => {
    return Object.entries(groupedIngredients).sort(([a], [b]) => {
      const orderA = PHASE_ORDER[a] ?? 999
      const orderB = PHASE_ORDER[b] ?? 999
      return orderA - orderB
    })
  }, [groupedIngredients])

  const calculateAmount = (percentage: number, batchSizeLiters: number): string => {
    // Simple assumption: 1L ≈ 1000g (adjust if you track densities)
    const batchSizeGrams = batchSizeLiters * 1000
    const amount = (percentage / 100) * batchSizeGrams
    return amount.toFixed(2)
  }

  /* -----------------------------------------------------------
     Guards
  ----------------------------------------------------------- */
  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  /* -----------------------------------------------------------
     Detail View
  ----------------------------------------------------------- */
  if (selectedBatch) {
    const allStepsCompleted = batchSteps.every((s) => s.completed)
    const canSendToPackaging = allStepsCompleted && selectedBatch.manufacturing_status !== 'completed'

    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav currentPage="batches" />

        <main className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => {
              setSelectedBatch(null)
              setFormulationIngredients([])
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </button>

          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedBatch.batch_code}</h1>
                <p className="text-gray-600 mt-1">
                  {selectedBatch.formulations?.name} {selectedBatch.formulations?.version}
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    selectedBatch.manufacturing_status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Manufacturing: {selectedBatch.manufacturing_status}
                </span>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    selectedBatch.packaging_status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : selectedBatch.packaging_status === 'ready'
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedBatch.packaging_status === 'in_process'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Packaging: {selectedBatch.packaging_status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">SKU</div>
                <div className="font-medium text-gray-900">{selectedBatch.sku}</div>
              </div>
              <div>
                <div className="text-gray-500">Batch Size</div>
                <div className="font-medium text-gray-900">{selectedBatch.size_liters}L</div>
              </div>
              <div>
                <div className="text-gray-500">Expected Yield</div>
                <div className="font-medium text-gray-900">{selectedBatch.expected_yield} units</div>
              </div>
              <div>
                <div className="text-gray-500">Created</div>
                <div className="font-medium text-gray-900">
                  {new Date(selectedBatch.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Two Column: Steps + Ingredients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Steps */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#174940]" />
                Manufacturing Steps
              </h3>
              <div className="space-y-3">
                {batchSteps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={() => toggleStepCompletion(step)}
                      className="mt-1 w-5 h-5 cursor-pointer"
                      disabled={selectedBatch.manufacturing_status === 'completed'}
                    />
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          step.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {step.step_no}. {step.title}
                      </div>
                      {step.completed && step.completed_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Completed by {step.users?.name || 'Unknown'} •{' '}
                          {new Date(step.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#174940]" />
                Formulation Recipe
              </h3>

              {formulationIngredients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No ingredient data available</p>
                  <p className="text-sm mt-2">Check formulation setup</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPhases.map(([phase, ings]) => (
                    <div key={phase} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-[#174940] text-white px-4 py-2 font-semibold text-sm">{phase}</div>
                      <div className="divide-y divide-gray-200">
                        {ings.map((ing) => (
                          <div key={ing.id} className="p-3 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{ing.ingredients?.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{ing.percentage}% of formula</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-[#174940] text-lg">
                                  {calculateAmount(ing.percentage, selectedBatch.size_liters)}g
                                </div>
                                <div className="text-xs text-gray-500">for this batch</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Linked Documents</h3>
            <div className="border border-gray-200 rounded p-4">
              <p className="text-sm text-gray-500 mb-3">No documents uploaded yet</p>
              <button className="flex items-center gap-2 text-sm text-[#174940] hover:underline">
                <Upload className="w-4 h-4" />
                Upload COA or Document
              </button>
            </div>
          </div>

          {/* Actions */}
          {canSendToPackaging && (
            <div className="flex gap-2">
              <button
                onClick={handleSendToPackaging}
                className="flex items-center gap-2 px-6 py-3 bg-[#174940] text-white rounded hover:bg-[#1a5c51] font-medium"
              >
                <Package className="w-5 h-5" />
                Send to Packaging
              </button>
            </div>
          )}

          {selectedBatch.manufacturing_status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✓ Manufacturing completed and sent to packaging on{' '}
                {selectedBatch.sent_to_packaging_at
                  ? new Date(selectedBatch.sent_to_packaging_at).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          )}
        </main>
      </div>
    )
  }

  /* -----------------------------------------------------------
     List View
  ----------------------------------------------------------- */
  const bgClass = getBackgroundClass(mode)
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const cardBg = getCardBackground(mode)
  const borderColor = getBorderColor(mode)

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <AppNav currentPage="batches" />

      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${cardBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Batch Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Batches</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Your production pipeline at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportBatchesToExcel(batches)}
              className={`flex items-center gap-2 border ${borderColor} px-4 py-2 rounded-full hover:border-[#174940] transition ${textColor}`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowNewBatchForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              New Batch
            </button>
          </div>
        </div>
      </div>

      <AnimatedBackground />
      <div className="relative z-10">
        <PremiumBatchesView
          batches={batches}
          loading={loading}
          onView={(batch) => {
            setSelectedBatch(batch)
            fetchBatchDetails(batch.id)
          }}
          onExport={() => exportBatchesToExcel(batches)}
        />
      </div>

      {/* New Batch Modal */}
      {showNewBatchForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Batch</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={newBatchSku}
                  onChange={(e) => setNewBatchSku(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formulation</label>
                <select
                  value={newBatchFormulation}
                  onChange={(e) => setNewBatchFormulation(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  required
                >
                  <option value="">Select formulation...</option>
                  {formulations.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.version}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size (liters)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBatchSize}
                  onChange={(e) => setNewBatchSize(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Yield (units)</label>
                <input
                  type="number"
                  value={newBatchYield}
                  onChange={(e) => setNewBatchYield(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewBatchForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#1a5c51]">
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
