'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import EstimateForm, { type EstimateInitialState } from '@/app/rnd/estimates/_components/EstimateForm'
import { Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Unit } from '@/lib/estimator/math'

type EstimateLineItemRecord = {
  id: string
  item_type: 'ingredient' | 'packaging' | 'other'
  source_type: 'inventory' | 'rd' | null
  ingredient_id: string | null
  rd_ingredient_id: string | null
  name: string
  need_purchase: boolean | null
  in_stock: boolean | null
  pack_size_value: number | null
  pack_size_unit: string | null
  pack_price: number | null
  cost_per_base_unit: number | null
  qty_per_unit_base: number | null
  output_unit: string | null
  waste_pct: number | null
  supplier_id: string | null
  notes: string | null
}

export default function EstimateDetailPage() {
  const params = useParams()
  const estimateId = params?.id as string | undefined
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialState, setInitialState] = useState<EstimateInitialState | null>(null)

  useEffect(() => {
    if (!estimateId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data: estimate, error: estimateError }, { data: lines, error: linesError }] =
          await Promise.all([
            supabase
              .from('rd_launch_estimates')
              .select('*')
              .eq('id', estimateId)
              .maybeSingle(),
            supabase
              .from('rd_estimate_line_items')
              .select('*')
              .eq('estimate_id', estimateId)
              .order('created_at', { ascending: true }),
          ])

        if (estimateError) {
          if (estimateError.code === '42P01') {
            console.info('rd_launch_estimates not available.')
            if (isMounted) setError('Launch estimates table not available yet.')
          } else if (isMounted) {
            console.error('Failed to load estimate', estimateError)
            setError('Unable to load this launch estimation. Check permissions.')
          }
          return
        }

        if (!estimate) {
          if (isMounted) setError('Launch estimation not found.')
          return
        }

        if (linesError && linesError.code !== '42P01') {
          console.error('Failed to load estimate line items', linesError)
          if (isMounted) setError('Unable to load estimate line items.')
        }

        if (!isMounted) return

        const state: EstimateInitialState = {
          id: estimate.id,
          title: estimate.title ?? '',
          rdFormulaId: estimate.rd_formula_id ?? undefined,
          packSizeValue: estimate.pack_size_value,
          packSizeUnit: estimate.pack_size_unit ?? undefined,
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
          lineItems: (Array.isArray(lines) ? (lines as EstimateLineItemRecord[]) : []).map((line) => {
            const packUnit = (line.pack_size_unit ?? 'g') as Unit
            const outputUnit = (line.output_unit ?? packUnit) as Unit
            return {
              uid: uuidv4(),
              itemType: line.item_type,
              sourceType: line.source_type ?? undefined,
              ingredientId: line.ingredient_id ?? undefined,
              rdIngredientId: line.rd_ingredient_id ?? undefined,
              name: line.name,
              needPurchase: line.need_purchase ?? true,
              inStock: line.in_stock ?? false,
              packSizeValue: line.pack_size_value?.toString() ?? '',
              packSizeUnit: packUnit,
              packPrice: line.pack_price?.toString() ?? '',
              density: '',
              qtyPerUnit: line.qty_per_unit_base?.toString() ?? '',
              qtyPerUnitUnit: outputUnit,
              wastePct: line.waste_pct?.toString() ?? '',
              supplierId: line.supplier_id ?? undefined,
              notes: line.notes ?? undefined,
            }
          }),
        }

        setInitialState(state)
      } catch (err) {
        console.error('Unexpected error loading estimate', err)
        if (isMounted) setError('Unable to load launch estimation.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [estimateId, supabase])

  if (!estimateId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="rnd" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            Loading launch estimation…
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : initialState ? (
          <>
            <header>
              <h1 className="text-3xl font-semibold text-gray-900">Edit Launch Estimation</h1>
              <p className="mt-2 text-sm text-gray-600">
                Update purchasing assumptions, landed costs, and pricing sandbox for this launch.
              </p>
            </header>
            <EstimateForm mode="edit" initialState={initialState} estimateId={estimateId} />
          </>
        ) : null}
      </main>
    </div>
  )
}
