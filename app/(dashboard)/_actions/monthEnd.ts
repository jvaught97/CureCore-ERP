'use server'

import { createClient } from '@/app/utils/supabase/server'

type MonthEndBannerState = {
  show: boolean
  daysLeft: number
}

type MonthEndBannerInput = {
  now?: string
}

type DismissInput = {
  untilMidnight?: boolean
}

type CompletenessCheckInput = {
  month: string
}

type ChecklistItem = {
  key: string
  label: string
  passed: boolean
  passedCount?: number
  totalCount?: number
  link?: string
  details?: string
}

type CompletenessCheckResult = {
  month: string
  items: ChecklistItem[]
  summary: {
    total: number
    passed: number
    failed: number
  }
  fixList: Array<{ key: string; label: string; link?: string }>
}

const MS_IN_DAY = 1000 * 60 * 60 * 24

type BatchRow = {
  id: string
  status?: string | null
}

type InventoryIssueRow = {
  batch_id: string | null
}

type MaterialCostRow = {
  cost_source?: string | null
}

type LaborRow = {
  source?: string | null
}

type PackagingUsageRow = {
  status?: string | null
}

type ManualInputsRow = {
  marketing: number | null
  rnd: number | null
  equipment: number | null
}

type FormulationRow = {
  id: string
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getMonthBoundaries(month: string) {
  if (!month) {
    const now = new Date()
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
  }
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  return {
    start: startOfDay(new Date(year, monthIndex, 1)),
    end: endOfDay(new Date(year, monthIndex + 1, 0)),
  }
}

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('User not authenticated')
  return { supabase, user }
}

export async function getMonthEndBannerState({ now }: MonthEndBannerInput = {}): Promise<MonthEndBannerState> {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    const current = now ? new Date(now) : new Date()
    const today = startOfDay(current)
    const endOfMonth = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    const diffMs = endOfMonth.getTime() - today.getTime()
    const daysLeft = Math.max(0, Math.ceil(diffMs / MS_IN_DAY))

    if (daysLeft > 5) {
      return { show: false, daysLeft }
    }

    const { data: dismissal, error: dismissalError } = await supabase
      .from('user_dismissals')
      .select('dismiss_until')
      .eq('key', 'monthEndBanner')
      .eq('created_by', user.id)
      .gte('dismiss_until', today.toISOString().slice(0, 10))
      .maybeSingle()

    if (dismissalError && dismissalError.code !== 'PGRST116') {
      console.error('Failed to read dismissal state:', dismissalError)
    }

    const dismissedToday =
      dismissal &&
      dismissal.dismiss_until &&
      new Date(dismissal.dismiss_until).getTime() >= today.getTime()

    return {
      show: !dismissedToday && daysLeft > 0,
      daysLeft,
    }
  } catch (error) {
    console.error('getMonthEndBannerState failed:', error)
    return { show: false, daysLeft: 0 }
  }
}

export async function dismissMonthEndBanner({ untilMidnight = true }: DismissInput = {}) {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    const now = new Date()
    const dismissDate = untilMidnight ? startOfDay(now) : now

    const { error } = await supabase
      .from('user_dismissals')
      .upsert(
        {
          key: 'monthEndBanner',
          dismiss_until: dismissDate.toISOString().slice(0, 10),
          created_by: user.id,
        },
        { onConflict: 'key' },
      )

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('dismissMonthEndBanner failed:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function runPnlCompletenessCheck({ month }: CompletenessCheckInput): Promise<CompletenessCheckResult> {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    const { start, end } = getMonthBoundaries(month)

    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const batchesPromise = supabase
      .from('batches')
      .select('id,status,completed_at,inventory_posted,labor_captured,packaging_posted')
      .gte('completed_at', startISO)
      .lte('completed_at', endISO)

    const inventoryIssuesPromise = supabase
      .from('inventory_issues')
      .select('id,batch_id,status')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const materialPricingPromise = supabase
      .from('issued_material_costs')
      .select('id,batch_id,cost_source')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const laborPromise = supabase
      .from('batch_labor')
      .select('id,batch_id,source')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const packagingPromise = supabase
      .from('packaging_usage')
      .select('id,batch_id,status')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const manualInputsPromise = supabase
      .from('pnl_manual_inputs')
      .select('id,marketing,rnd,equipment')
      .eq('month', start.toISOString().slice(0, 10))
      .eq('created_by', user.id)
      .maybeSingle()

    const stdCostPromise = supabase
      .from('formulations')
      .select('id,name,status,created_at')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const [
      { data: batches = [], error: batchesError },
      { data: inventoryIssues = [], error: inventoryError },
      { data: materialCosts = [], error: materialError },
      { data: labor = [], error: laborError },
      { data: packagingUsage = [], error: packagingError },
      { data: manualInputs, error: manualInputsError },
      { data: newFormulations = [], error: formulationsError },
    ] = await Promise.all([
      batchesPromise,
      inventoryIssuesPromise,
      materialPricingPromise,
      laborPromise,
      packagingPromise,
      manualInputsPromise,
      stdCostPromise,
    ])

    const shouldLog = (err?: { code?: string } | null) => err && err.code !== '42P01'

    if (shouldLog(batchesError)) console.error('batches check failed', batchesError)
    if (shouldLog(inventoryError)) console.error('inventory check failed', inventoryError)
    if (shouldLog(materialError)) console.error('material check failed', materialError)
    if (shouldLog(laborError)) console.error('labor check failed', laborError)
    if (shouldLog(packagingError)) console.error('packaging check failed', packagingError)
    if (manualInputsError && manualInputsError.code !== 'PGRST116' && manualInputsError.code !== '42P01') {
      console.error('manual inputs check failed', manualInputsError)
    }
    if (shouldLog(formulationsError)) console.error('formulations check failed', formulationsError)

    const batchesList = (Array.isArray(batches) ? batches : []) as BatchRow[]
    const inventoryIssuesList = (Array.isArray(inventoryIssues) ? inventoryIssues : []) as InventoryIssueRow[]
    const materialCostsList = (Array.isArray(materialCosts) ? materialCosts : []) as MaterialCostRow[]
    const laborList = (Array.isArray(labor) ? labor : []) as LaborRow[]
    const packagingUsageList = (Array.isArray(packagingUsage) ? packagingUsage : []) as PackagingUsageRow[]
    const manualInputRecord = (manualInputs as ManualInputsRow | null) ?? null
    const newFormulationsList = (Array.isArray(newFormulations) ? newFormulations : []) as FormulationRow[]

    const totalBatches = batchesList.length
    const postedBatches = batchesList.filter((b) => b.status === 'completed').length
    const inProcessBatches = totalBatches - postedBatches

    const issuesByBatch = new Map<string, number>()
    inventoryIssuesList.forEach((issue) => {
      if (!issue.batch_id) return
      const current = issuesByBatch.get(issue.batch_id) ?? 0
      issuesByBatch.set(issue.batch_id, current + 1)
    })

    const batchesMissingCosts = materialCostsList.filter((cost) => !cost.cost_source).length
    const batchesMissingLabor = laborList.filter((entry) => !entry.source).length
    const packagingMissing = packagingUsageList.filter((entry) => entry.status !== 'posted').length

    const manualInputMissing =
      !manualInputRecord ||
      manualInputRecord.marketing == null ||
      manualInputRecord.rnd == null ||
      manualInputRecord.equipment == null

    const items: ChecklistItem[] = [
      {
        key: 'batches',
        label: 'Batches posted for the month',
        passed: inProcessBatches === 0,
        passedCount: postedBatches,
        totalCount: totalBatches,
        link: '/batches?status=in_process',
        details: inProcessBatches > 0 ? `${inProcessBatches} batches still in process` : undefined,
      },
      {
        key: 'inventory',
        label: 'Inventory issues posted for completed batches',
        passed: issuesByBatch.size === 0,
        totalCount: issuesByBatch.size,
        link: '/inventory?view=issues',
        details: issuesByBatch.size > 0 ? 'Open inventory issues detected' : undefined,
      },
      {
        key: 'materials',
        label: 'Material price sources captured',
        passed: batchesMissingCosts === 0,
        totalCount: materialCosts?.length || 0,
        link: '/inventory?view=costing',
        details: batchesMissingCosts > 0 ? `${batchesMissingCosts} entries missing cost source` : undefined,
      },
      {
        key: 'labor',
        label: 'Labor capture complete',
        passed: batchesMissingLabor === 0,
        totalCount: labor?.length || 0,
        link: '/batches?view=labor',
        details: batchesMissingLabor > 0 ? `${batchesMissingLabor} labor entries need review` : undefined,
      },
      {
        key: 'packaging',
        label: 'Packaging consumption posted',
        passed: packagingMissing === 0,
        totalCount: packagingUsage?.length || 0,
        link: '/packaging?view=usage',
        details: packagingMissing > 0 ? `${packagingMissing} packaging entries pending` : undefined,
      },
      {
        key: 'manualInputs',
        label: 'Manual inputs (Marketing, R&D, Equipment) captured',
        passed: !manualInputMissing,
        link: `/pnl?month=${month}`,
        details: manualInputMissing ? 'Update month-end manual inputs' : undefined,
      },
      {
        key: 'stdCosts',
        label: 'Std costs in place for launches this month',
        passed: (newFormulationsList?.length || 0) === 0,
        totalCount: newFormulationsList?.length || 0,
        link: '/rnd',
        details:
          (newFormulationsList?.length || 0) > 0 ? `${newFormulationsList?.length} new formulas to review` : undefined,
      },
    ]

    const failedItems = items.filter((item) => !item.passed)

    return {
      month,
      items,
      summary: {
        total: items.length,
        passed: items.length - failedItems.length,
        failed: failedItems.length,
      },
      fixList: failedItems.map(({ key, label, link }) => ({ key, label, link })),
    }
  } catch (error) {
    console.error('runPnlCompletenessCheck failed:', error)
    return {
      month,
      items: [],
      summary: { total: 0, passed: 0, failed: 0 },
      fixList: [],
    }
  }
}

export type { ChecklistItem, CompletenessCheckResult }
