'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, FileText, BeakerIcon, ArrowLeft, ChevronRight, History } from 'lucide-react'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import RdFormulaForm, { type FormulaFormInitialState } from '@/app/rnd/formulas/_components/RdFormulaForm'
import { TestBatchList, RunTestBatchModal, RecordResultsModal } from '@/app/rnd/formulas/_components/test-batches'
import { GraduateToProductionModal } from '@/app/rnd/formulas/_components/GraduateToProductionModal'
import { VersionHistoryTab } from '@/app/rnd/formulas/_components/VersionHistoryTab'
import { getTestBatchesForFormula } from '@/app/rnd/_actions'

type RdFormulaRecord = {
  id: string
  name: string | null
  version: string | null
  notes: string | null
  is_locked: boolean | null
  manufacturing_steps: unknown
  packaging_materials: unknown
  packaging_steps: unknown
  rd_formula_ingredients?: RdFormulaIngredientRow[] | null
}

type RdFormulaIngredientRow = {
  id: string
  source_type: 'inventory' | 'rd'
  ingredient_id: string | null
  rd_ingredient_id: string | null
  qty: number | string | null
  unit: string | null
  in_stock: boolean | null
  need_purchase: boolean | null
  est_unit_cost: number | null
  supplier_id: string | null
}

type TestBatch = {
  id: string
  test_number: number
  batch_code: string
  batch_size: number
  batch_size_unit: string
  expected_yield?: number | null
  expected_yield_unit?: string | null
  test_date?: string | null
  completed_date?: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'failed'
  rd_test_results?: Array<{
    id: string
    actual_yield?: number | null
    yield_percentage?: number | null
    quality_rating?: number | null
    passed_requirements: boolean
    ready_for_production: boolean
  }>
  created_at: string
}

type ActiveTab = 'details' | 'test-batches' | 'version-history'

export default function RdFormulaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const formulaId = params?.id as string | undefined
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<FormulaFormInitialState | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('details')
  const [testBatches, setTestBatches] = useState<TestBatch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [showRunTestModal, setShowRunTestModal] = useState(false)
  const [showRecordResultsModal, setShowRecordResultsModal] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [showGraduateModal, setShowGraduateModal] = useState(false)

  useEffect(() => {
    if (!formulaId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: supabaseError } = await supabase
          .from('rd_formulas')
          .select(
            `
              id,
              name,
              version,
              notes,
              is_locked,
              manufacturing_steps,
              packaging_materials,
              packaging_steps,
              rd_formula_ingredients (
                id,
                source_type,
                ingredient_id,
                rd_ingredient_id,
                qty,
                unit,
                in_stock,
                need_purchase,
                est_unit_cost,
                supplier_id
              )
            `,
          )
          .eq('id', formulaId)
          .maybeSingle()

        if (supabaseError) {
          if (supabaseError.code === '42P01') {
            console.info('rd_formulas table not available yet.')
            if (isMounted) setError('R&D formulas table not available.')
          } else if (isMounted) {
            console.error('Failed to load formula', supabaseError)
            setError('Unable to load this formula. You may not have access.')
          }
          return
        }

        if (!data) {
          if (isMounted) setError('Formula not found.')
          return
        }

        const record = data as RdFormulaRecord

        const mapped: FormulaFormInitialState = {
          id: record.id,
          name: record.name ?? '',
          version: record.version ?? '',
          notes: record.notes ?? undefined,
          isLocked: record.is_locked ?? false,
          manufacturingSteps: Array.isArray(record.manufacturing_steps)
            ? (record.manufacturing_steps as Array<{ description: string; time?: string; temp?: string }>)
            : [],
          packagingMaterials: Array.isArray(record.packaging_materials)
            ? (record.packaging_materials as Array<{
                name: string
                supplier?: string
                cost?: number | null
              }>)
            : [],
          packagingSteps: Array.isArray(record.packaging_steps)
            ? (record.packaging_steps as Array<{ description: string }>)
            : [],
          ingredients: (record.rd_formula_ingredients ?? []).map((ing) => ({
            sourceType: ing.source_type,
            ingredientId: ing.ingredient_id ?? undefined,
            rdIngredientId: ing.rd_ingredient_id ?? undefined,
            qty: Number(ing.qty ?? 0),
            unit: ing.unit ?? '',
            inStock: Boolean(ing.in_stock),
            needPurchase: Boolean(ing.need_purchase),
            estUnitCost: ing.est_unit_cost ?? undefined,
            supplierId: ing.supplier_id ?? undefined,
          })),
        }

        if (isMounted) setInitialData(mapped)
      } catch (err) {
        console.error('Unexpected error loading formula', err)
        if (isMounted) setError('Unable to load this formula.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [formulaId, supabase])

  // Load test batches when switching to test batches tab
  useEffect(() => {
    if (!formulaId || activeTab !== 'test-batches') return

    let isMounted = true
    const loadBatches = async () => {
      setLoadingBatches(true)
      try {
        const batches = await getTestBatchesForFormula(formulaId)
        if (isMounted) setTestBatches(batches as TestBatch[])
      } catch (err) {
        console.error('Failed to load test batches:', err)
      } finally {
        if (isMounted) setLoadingBatches(false)
      }
    }

    loadBatches()

    return () => {
      isMounted = false
    }
  }, [formulaId, activeTab])

  const handleRunNewBatch = () => {
    setShowRunTestModal(true)
  }

  const handleBatchCreated = async (testBatchId: string) => {
    setShowRunTestModal(false)
    // Reload batches
    try {
      const batches = await getTestBatchesForFormula(formulaId!)
      setTestBatches(batches as TestBatch[])
    } catch (err) {
      console.error('Failed to reload test batches:', err)
    }
  }

  const handleViewBatch = (batchId: string) => {
    setSelectedBatchId(batchId)
    setShowRecordResultsModal(true)
  }

  const handleResultsSaved = async () => {
    setShowRecordResultsModal(false)
    setSelectedBatchId(null)
    // Reload batches
    try {
      const batches = await getTestBatchesForFormula(formulaId!)
      setTestBatches(batches as TestBatch[])
    } catch (err) {
      console.error('Failed to reload test batches:', err)
    }
  }

  if (!formulaId) {
    return null
  }

  const selectedBatch = testBatches.find((b) => b.id === selectedBatchId)

  // Calculate test batch readiness for graduation
  const testBatchStats = {
    totalTests: testBatches.length,
    passedTests: testBatches.filter(
      (b) => b.rd_test_results?.[0]?.passed_requirements
    ).length,
    readyForProduction: testBatches.some(
      (b) => b.rd_test_results?.[0]?.ready_for_production
    ),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="rnd" />

      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push('/rnd')}
              className="flex items-center gap-1 text-gray-600 hover:text-[#174940] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              R&D Workspace
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">
              {initialData?.name || 'Formula Details'}
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            Loading formula…
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <div className="mt-3">
              <button
                onClick={() => router.push('/rnd/formulas')}
                className="text-sm font-semibold text-[#174940] hover:underline"
              >
                Back to list
              </button>
            </div>
          </div>
        ) : initialData ? (
          <>
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  {initialData.name}
                  <span className="ml-3 text-lg font-medium text-gray-500">
                    v{initialData.version}
                  </span>
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage formula details and run test batches.
                </p>
              </div>
              <button
                onClick={() => setShowGraduateModal(true)}
                className="self-start rounded-md border-2 border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 shadow hover:bg-emerald-50 md:self-center"
              >
                Graduate to Production
              </button>
            </header>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex gap-4" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'details'
                      ? 'border-[#174940] text-[#174940]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Formula Details
                </button>
                <button
                  onClick={() => setActiveTab('test-batches')}
                  className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'test-batches'
                      ? 'border-[#174940] text-[#174940]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <BeakerIcon className="h-4 w-4" />
                  Test Batches
                  {testBatches.length > 0 && (
                    <span className="rounded-full bg-[#174940]/10 px-2 py-0.5 text-xs font-semibold text-[#174940]">
                      {testBatches.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('version-history')}
                  className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'version-history'
                      ? 'border-[#174940] text-[#174940]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <History className="h-4 w-4" />
                  Version History
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <RdFormulaForm mode="edit" initialState={initialData} />
            )}

            {activeTab === 'test-batches' && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                {loadingBatches ? (
                  <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
                    Loading test batches…
                  </div>
                ) : (
                  <TestBatchList
                    batches={testBatches}
                    onViewBatch={handleViewBatch}
                    onRunNewBatch={handleRunNewBatch}
                  />
                )}
              </div>
            )}

            {activeTab === 'version-history' && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <VersionHistoryTab
                  formulaName={initialData.name}
                  currentFormulaId={formulaId}
                />
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Modals */}
      {showRunTestModal && (
        <RunTestBatchModal
          rdFormulaId={formulaId}
          onClose={() => setShowRunTestModal(false)}
          onSuccess={handleBatchCreated}
        />
      )}

      {showRecordResultsModal && selectedBatch && (
        <RecordResultsModal
          testBatchId={selectedBatch.id}
          expectedYield={selectedBatch.expected_yield}
          expectedYieldUnit={selectedBatch.expected_yield_unit}
          onClose={() => {
            setShowRecordResultsModal(false)
            setSelectedBatchId(null)
          }}
          onSuccess={handleResultsSaved}
        />
      )}

      {showGraduateModal && initialData && (
        <GraduateToProductionModal
          rdFormulaId={formulaId}
          rdFormulaName={initialData.name}
          rdFormulaVersion={initialData.version}
          testBatchResults={testBatchStats}
          onClose={() => setShowGraduateModal(false)}
        />
      )}
    </div>
  )
}
