'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { inventoryDemoData } from '@/data/inventoryDemo'
import { Package, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import { AppNav } from '@/components/nav/AppNav'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { PremiumPackagingCards } from '@/app/packaging/_components/PremiumPackagingCards'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'

type Batch = {
  id: string
  batch_code: string
  sku: string
  formulation_id: string
  size_liters: number
  manufacturing_status: string
  packaging_status: string
  units_produced: number | null
  storage_location: string | null
  packaging_notes: string | null
  expected_yield: number
  sent_to_packaging_at: string
  formulations: {
    name: string
    version: string
    packaging_steps: string | null
  }
}

type PackagingStep = {
  id: string
  batch_id: string
  step_no: number
  title: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  users: {
    name: string
  } | null
}

export default function PackagingWorkflowPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const { mode } = useTheme()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [packagingSteps, setPackagingSteps] = useState<PackagingStep[]>([])

  // Completion form
  const [unitsProduced, setUnitsProduced] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [packagingNotes, setPackagingNotes] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchReadyBatches()
    }
  }, [user])

  async function fetchReadyBatches() {
    setLoading(true)
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'

      if (bypass) {
        const demoFormulation = {
          packaging_steps: 'Inspect bottles\nLabel jars\nPack cases',
          name: 'Demo Serum',
          version: 'v1.0',
        }
        setBatches([
          {
            id: 'demo-packaging-batch',
            batch_code: 'BCH-PKG-001',
            sku: 'SKU-001',
            formulation_id: 'demo-formulation',
            size_liters: 40,
            manufacturing_status: 'completed',
            packaging_status: 'ready',
            units_produced: null,
            storage_location: null,
            packaging_notes: null,
            expected_yield: 38,
            sent_to_packaging_at: new Date().toISOString(),
            formulations: demoFormulation,
          },
        ] as Batch[])
        setPackagingSteps([])
        return
      }

      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          formulations (name, version, packaging_steps)
        `)
        .in('packaging_status', ['ready', 'in_process'])
        .order('sent_to_packaging_at', { ascending: true })

      if (error) throw error
      setBatches(data || [])
    } catch (error) {
      console.error('Error fetching batches:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPackagingSteps(batchId: string) {
    try {
      const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
      if (bypass) {
        setPackagingSteps(
          (batches.find((b) => b.id === batchId)?.formulations?.packaging_steps || '')
            .split('\n')
            .filter((step) => step.trim().length > 0)
            .map((title, idx) => ({
              id: `demo-step-${idx}`,
              batch_id: batchId,
              step_no: idx + 1,
              title,
              completed: idx === 0,
              completed_by: null,
              completed_at: null,
              users: null,
            })),
        )
        return
      }
      const { data, error } = await supabase
        .from('packaging_steps')
        .select(`
          *,
          users (name)
        `)
        .eq('batch_id', batchId)
        .order('step_no')

      if (error) throw error
      setPackagingSteps(data || [])
    } catch (error) {
      console.error('Error fetching packaging steps:', error)
    }
  }

  async function handleStartBatch(batch: Batch) {
    try {
      // Update batch status to in_process
      const { error: updateError } = await supabase
        .from('batches')
        .update({ packaging_status: 'in_process' })
        .eq('id', batch.id)

      if (updateError) throw updateError

      // Create packaging steps from formulation
      if (batch.formulations?.packaging_steps) {
        const stepsArray = batch.formulations.packaging_steps
          .split('\n')
          .map(step => step.trim())
          .filter(step => step.length > 0)

        const stepsToInsert = stepsArray.map((title, index) => ({
          batch_id: batch.id,
          step_no: index + 1,
          title: title,
          completed: false
        }))

        const { error: stepsError } = await supabase
          .from('packaging_steps')
          .insert(stepsToInsert)

        if (stepsError) throw stepsError
      }

      setSelectedBatch({ ...batch, packaging_status: 'in_process' })
      await fetchPackagingSteps(batch.id)
      fetchReadyBatches()
    } catch (error) {
      console.error('Error starting batch:', error)
      alert('Error starting batch. Please try again.')
    }
  }

  async function handleViewBatch(batch: Batch) {
    setSelectedBatch(batch)
    setUnitsProduced(batch.units_produced?.toString() || '')
    setStorageLocation(batch.storage_location || '')
    setPackagingNotes(batch.packaging_notes || '')
    await fetchPackagingSteps(batch.id)
  }

  async function toggleStepCompletion(step: PackagingStep) {
    try {
      const { error } = await supabase
        .from('packaging_steps')
        .update({
          completed: !step.completed,
          completed_by: !step.completed ? user?.id : null,
          completed_at: !step.completed ? new Date().toISOString() : null
        })
        .eq('id', step.id)

      if (error) throw error
      
      if (selectedBatch) {
        await fetchPackagingSteps(selectedBatch.id)
      }
    } catch (error) {
      console.error('Error updating step:', error)
      alert('Error updating step. Please try again.')
    }
  }

  async function handleCompleteBatch() {
    if (!selectedBatch) return
    
    const allStepsCompleted = packagingSteps.every(step => step.completed)
    
    if (!allStepsCompleted) {
      alert('Please complete all packaging steps before finishing.')
      return
    }

    if (!unitsProduced || !storageLocation) {
      alert('Please enter units produced and storage location.')
      return
    }

    const confirmed = confirm('Complete this batch? This will mark it as finished.')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('batches')
        .update({ 
          packaging_status: 'completed',
          units_produced: parseInt(unitsProduced),
          storage_location: storageLocation,
          packaging_notes: packagingNotes,
          packaging_completed_at: new Date().toISOString()
        })
        .eq('id', selectedBatch.id)

      if (error) throw error

      // Log inventory history for packaging materials used
      // This would be expanded based on your formulation_packaging data

      alert('Batch completed successfully!')
      setSelectedBatch(null)
      fetchReadyBatches()
    } catch (error) {
      console.error('Error completing batch:', error)
      alert('Error completing batch. Please try again.')
    }
  }

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Batch detail view
  if (selectedBatch) {
    const allStepsCompleted = packagingSteps.every(step => step.completed)

    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav currentPage="packaging" />

        <main className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedBatch(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Packaging Queue
          </button>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedBatch.batch_code}</h1>
                <p className="text-gray-600 mt-1">
                  {selectedBatch.formulations?.name} {selectedBatch.formulations?.version}
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                selectedBatch.packaging_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedBatch.packaging_status}
              </span>
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
                <div className="text-gray-500">Expected Units</div>
                <div className="font-medium text-gray-900">{selectedBatch.expected_yield}</div>
              </div>
              <div>
                <div className="text-gray-500">Sent to Packaging</div>
                <div className="font-medium text-gray-900">
                  {new Date(selectedBatch.sent_to_packaging_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {packagingSteps.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Packaging Steps</h3>
              <div className="space-y-3">
                {packagingSteps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={() => toggleStepCompletion(step)}
                      className="mt-1 w-5 h-5 cursor-pointer"
                      disabled={selectedBatch.packaging_status === 'completed'}
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${step.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
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
          )}

          {selectedBatch.packaging_status !== 'completed' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Complete Packaging</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Units Produced <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={unitsProduced}
                      onChange={(e) => setUnitsProduced(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                      placeholder="e.g. 450"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Storage Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                      placeholder="e.g. Shelf A-3"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packaging Notes
                  </label>
                  <textarea
                    rows={3}
                    value={packagingNotes}
                    onChange={(e) => setPackagingNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="Any notes about this packaging run..."
                  />
                </div>

                <button
                  onClick={handleCompleteBatch}
                  disabled={!allStepsCompleted}
                  className={`flex items-center gap-2 px-6 py-3 rounded font-medium ${
                    allStepsCompleted
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Complete Batch
                </button>
                {!allStepsCompleted && (
                  <p className="text-sm text-gray-500 mt-2">Complete all packaging steps to finish this batch</p>
                )}
              </div>
            </div>
          )}

          {selectedBatch.packaging_status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-2">Batch Completed</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-green-700">Units Produced</div>
                  <div className="font-medium text-green-900">{selectedBatch.units_produced}</div>
                </div>
                <div>
                  <div className="text-green-700">Storage Location</div>
                  <div className="font-medium text-green-900">{selectedBatch.storage_location}</div>
                </div>
                <div>
                  <div className="text-green-700">Notes</div>
                  <div className="font-medium text-green-900">{selectedBatch.packaging_notes || 'None'}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Batch list view
  const bgClass = getBackgroundClass(mode)
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const cardBg = getCardBackground(mode)
  const borderColor = getBorderColor(mode)

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <AppNav currentPage="packaging" />

      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${cardBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
            <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Packaging Command</p>
          </div>
          <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Packaging Workflow</h1>
          <p className={`${textMuted} text-sm md:text-base`}>Batches ready for packaging</p>
        </div>
      </div>

      <AnimatedBackground />
      <div className="relative z-10">
        <PremiumPackagingCards
          batches={batches}
          loading={loading}
          onStartBatch={handleStartBatch}
          onViewBatch={handleViewBatch}
        />
      </div>
    </div>
  )
}
