// app/dashboard/page.tsx
'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { supabase } from '@/lib/supabase'
import { AppNav } from '@/components/nav/AppNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { X, Factory, Package, AlertTriangle, FileCheck, Clock, TrendingUp, Calendar } from 'lucide-react'
import {
  dismissMonthEndBanner,
  getMonthEndBannerState,
  runPnlCompletenessCheck,
  type CompletenessCheckResult,
} from '@/app/(dashboard)/_actions/monthEnd'

type DashboardStats = {
  batchesInProcess: number
  batchesCompleted: number
  lowStockCount: number
  pendingCOAs: number
}

type CompletedBatch = { id: string; completed_at: string | null }
type Ingredient = { id: string; name?: string | null; on_hand: number; reorder_point: number }
type COA = { batch_id: string }

type DayPoint = { day: string; completed: number }
type MixPoint = { label: string; count: number }

const cardClass =
  'rounded-2xl border border-white/20 bg-white/90 backdrop-blur shadow-lg shadow-slate-200/60 p-6'

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
function buildEmptySeries(fromISO: string, toISO: string): DayPoint[] {
  const from = startOfDay(new Date(fromISO))
  const to = endOfDay(new Date(toISO))
  const days: DayPoint[] = []
  for (let dt = new Date(from); dt <= to; dt.setDate(dt.getDate() + 1)) {
    days.push({ day: toISODate(dt), completed: 0 })
  }
  return days
}
function groupCompletedPerDay(emptySeries: DayPoint[], completed: CompletedBatch[]): DayPoint[] {
  const map = new Map(emptySeries.map((p) => [p.day, 0]))
  for (const b of completed) {
    if (!b.completed_at) continue
    const d = toISODate(new Date(b.completed_at))
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1)
  }
  return emptySeries.map((p) => ({ ...p, completed: map.get(p.day) ?? 0 }))
}
function exportCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0]!)
  const csv = [headers.join(',')]
    .concat(
      rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h]
            const s = val == null ? '' : String(val).replaceAll('"', '""')
            return `"${s}"`
          })
          .join(','),
      ),
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DashboardContent() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const today = useMemo(() => new Date(), [])
  const monthStart = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const currentMonthParam = useMemo(() => {
    const month = today.getMonth() + 1
    return `${today.getFullYear()}-${String(month).padStart(2, '0')}`
  }, [today])

  const [from, setFrom] = useState<string>(toISODate(monthStart))
  const [to, setTo] = useState<string>(toISODate(today))

  const [stats, setStats] = useState<DashboardStats>({
    batchesInProcess: 0,
    batchesCompleted: 0,
    lowStockCount: 0,
    pendingCOAs: 0,
  })
  const [series, setSeries] = useState<DayPoint[]>([])
  const [mixData, setMixData] = useState<MixPoint[]>([])
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([])
  const [pendingCOABatches, setPendingCOABatches] = useState<string[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bannerState, setBannerState] = useState<{ show: boolean; daysLeft: number }>({
    show: false,
    daysLeft: 0,
  })
  const [checkModalOpen, setCheckModalOpen] = useState(false)
  const [checkResult, setCheckResult] = useState<CompletenessCheckResult | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [bannerPending, startBannerTransition] = useTransition()
  const [checkPending, startCheckTransition] = useTransition()

  const highlights = useMemo(
    () => [
      {
        label: 'Batches In-Process',
        value: stats.batchesInProcess,
        helper: 'Active production batches',
        icon: Factory,
        action: stats.batchesInProcess > 0 ? () => router.push('/batches') : undefined,
        actionLabel: 'View batches →'
      },
      {
        label: 'Completed',
        value: stats.batchesCompleted,
        helper: `${from} → ${to}`,
        icon: TrendingUp,
      },
      {
        label: 'Low-Stock Items',
        value: stats.lowStockCount,
        helper: 'Below reorder point',
        icon: AlertTriangle,
        action: stats.lowStockCount > 0 ? () => router.push('/inventory') : undefined,
        actionLabel: '⚠️ Check inventory →',
        warning: stats.lowStockCount > 0
      },
      {
        label: 'Pending COAs',
        value: stats.pendingCOAs,
        helper: 'Need upload',
        icon: FileCheck,
        action: stats.pendingCOAs > 0 ? () => router.push('/packaging') : undefined,
        actionLabel: '⚠️ Upload COAs →',
        warning: stats.pendingCOAs > 0
      },
    ],
    [stats, from, to, router],
  )

  const fetchDashboard = useCallback(async () => {
    if (!user) return
    setLoadingStats(true)
    setError(null)
    try {
      const fromTs = startOfDay(new Date(from)).toISOString()
      const toTs = endOfDay(new Date(to)).toISOString()

      const [
        inProcRes,
        completedRangeRes,
        ingredientsRes,
        completedAllRes,
        coasRes,
      ] = await Promise.all([
        supabase
          .from('batches')
          .select('*', { count: 'exact', head: true })
          .eq('manufacturing_status', 'in_process'),
        supabase
          .from('batches')
          .select('id, completed_at')
          .eq('manufacturing_status', 'completed')
          .gte('completed_at', fromTs)
          .lte('completed_at', toTs),
        supabase.from('ingredients').select('id,name,on_hand,reorder_point').eq('status', 'active'),
        supabase.from('batches').select('id').eq('manufacturing_status', 'completed'),
        supabase.from('coas').select('batch_id'),
      ])

      if (inProcRes.error) throw inProcRes.error
      if (completedRangeRes.error) throw completedRangeRes.error
      if (ingredientsRes.error) throw ingredientsRes.error
      if (completedAllRes.error) throw completedAllRes.error
      if (coasRes.error) throw coasRes.error

      const inProcessCount = inProcRes.count ?? 0
      const completedInRange = (completedRangeRes.data as CompletedBatch[]) ?? []
      const completedCount = completedInRange.length

      const ingredients = (ingredientsRes.data as Ingredient[]) ?? []
      const lowStock = ingredients.filter((i) => i.on_hand < i.reorder_point)

      const allCompleted = (completedAllRes.data as { id: string }[]) ?? []
      const coas = (coasRes.data as COA[]) ?? []
      const coasSet = new Set(coas.map((c) => c.batch_id))
      const pendingCOA = allCompleted.filter((b) => !coasSet.has(b.id)).map((b) => b.id)

      const blank = buildEmptySeries(from, to)
      const byDay = groupCompletedPerDay(blank, completedInRange)
      const mix: MixPoint[] = [
        { label: 'In-Process', count: inProcessCount },
        { label: 'Completed', count: completedCount },
      ]

      setSeries(byDay)
      setMixData(mix)
      setLowStockItems(lowStock)
      setPendingCOABatches(pendingCOA)
      setStats({
        batchesInProcess: inProcessCount,
        batchesCompleted: completedCount,
        lowStockCount: lowStock.length,
        pendingCOAs: pendingCOA.length,
      })
    } catch (e: any) {
      console.error('Error fetching dashboard:', e)
      setError(e?.message ?? 'Failed to load dashboard')
    } finally {
      setLoadingStats(false)
    }
  }, [user, from, to])

  const handleOpenPnl = useCallback(() => {
    router.push(`/pnl?month=${currentMonthParam}`)
  }, [router, currentMonthParam])

  const handleDismissBanner = useCallback(() => {
    startBannerTransition(async () => {
      await dismissMonthEndBanner({ untilMidnight: true })
      setBannerState((prev) => ({ ...prev, show: false }))
    })
  }, [startBannerTransition])

  const handleRunCompleteness = useCallback((monthOverride?: string) => {
    setCheckError(null)
    startCheckTransition(async () => {
      try {
        const result = await runPnlCompletenessCheck({
          month: monthOverride ?? currentMonthParam,
        })
        setCheckResult(result)
        setCheckModalOpen(true)
      } catch (err) {
        console.error('Completeness check failed:', err)
        setCheckError('Unable to run completeness check. Please try again.')
      }
    })
  }, [currentMonthParam, startCheckTransition])

  const handleCloseCompleteness = useCallback(() => {
    setCheckModalOpen(false)
  }, [])

  useEffect(() => {
    if (user) fetchDashboard()
  }, [user, fetchDashboard])

  useEffect(() => {
    if (!user) return
    startBannerTransition(async () => {
      const state = await getMonthEndBannerState({ now: new Date().toISOString() })
      setBannerState(state)
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const monthParam = searchParams?.get('monthEndChecklist')
    if (!monthParam) return
    handleRunCompleteness(monthParam)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('monthEndChecklist')
    const queryString = nextParams.toString()
    router.replace(queryString ? `/?${queryString}` : '/', { scroll: false })
  }, [user, searchParams, handleRunCompleteness, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white/70">Loading...</div>
      </div>
    )
  }
  if (!user || !profile) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/70">
      Authenticating…
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <AppNav currentPage="dashboard" />

      {/* Dashboard Tabs */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-500/20 text-teal-300 border border-teal-500/50"
            >
              Overview
            </button>
            <button
              onClick={() => router.push('/dashboard/operations')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Operations
            </button>
            <button
              onClick={() => router.push('/dashboard/commercial')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Commercial
            </button>
            <button
              onClick={() => router.push('/dashboard/financial')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Financial
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section with Gradient */}
      <section className="bg-gradient-to-br from-teal-500 via-emerald-500 to-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">Overview</p>
              <h1 className="text-4xl font-semibold mt-3">Operations Dashboard</h1>
              <p className="text-white/80 mt-2">Real-time production, inventory, and quality metrics.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-md border border-white/30 bg-white/20 backdrop-blur px-2 py-1 text-sm text-white placeholder:text-white/60"
                />
                <span className="text-white/60">→</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-md border border-white/30 bg-white/20 backdrop-blur px-2 py-1 text-sm text-white placeholder:text-white/60"
                />
              </div>
              <button
                onClick={fetchDashboard}
                className="rounded-md bg-white/20 backdrop-blur border border-white/30 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* KPI Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {loadingStats ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 animate-pulse h-32"
                  />
                ))}
              </>
            ) : (
              highlights.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl bg-white/10 backdrop-blur border ${
                    stat.warning ? 'border-amber-300/50' : 'border-white/20'
                  } p-4 flex justify-between items-start shadow-xl`}
                >
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-sm text-white/70 mt-1">{stat.helper}</p>
                    {stat.action && (
                      <button
                        onClick={stat.action}
                        className="mt-2 text-sm text-white hover:underline"
                      >
                        {stat.actionLabel}
                      </button>
                    )}
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.warning ? 'text-amber-300' : 'text-white/70'}`} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-300/50 bg-red-50/90 backdrop-blur p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {bannerState.show && (
          <div className="mb-6 rounded-2xl border border-amber-300/50 bg-amber-50/90 backdrop-blur p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-amber-900">
                  Month end is in {bannerState.daysLeft} day{bannerState.daysLeft === 1 ? '' : 's'}.
                </p>
                <p className="text-sm text-amber-900">
                  Review P&amp;L inputs: Marketing, R&amp;D, Equipment; confirm batch postings &amp; inventory issues.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleOpenPnl}
                  className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Open P&amp;L
                </button>
                <button
                  onClick={handleRunCompleteness}
                  disabled={checkPending}
                  className="rounded-md border border-[#174940] px-4 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                >
                  {checkPending ? 'Checking…' : 'Run P&L Completeness Check'}
                </button>
                <button
                  onClick={handleDismissBanner}
                  disabled={bannerPending}
                  className="rounded-md border border-transparent px-4 py-2 text-sm font-medium text-[#174940] hover:bg-[#174940]/5 disabled:text-gray-400"
                >
                  {bannerPending ? 'Dismissing…' : 'Dismiss for today'}
                </button>
              </div>
            </div>
            {checkError && (
              <p className="mt-3 text-sm text-red-700">{checkError}</p>
            )}
          </div>
        )}

        {!loadingStats && (
          <>
            {/* Charts */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${cardClass} lg:col-span-2`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Completed per Day</h2>
                  <Clock className="w-5 h-5 text-teal-600" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" minTickGap={24} stroke="#64748b" />
                      <YAxis allowDecimals={false} stroke="#64748b" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#14b8a6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">WIP vs Completed</h2>
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mixData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#64748b" />
                      <YAxis allowDecimals={false} stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Data Tables */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Low-Stock Ingredients
                  </h2>
                  {lowStockItems.length > 0 && (
                    <button
                      onClick={() =>
                        exportCSV(
                          'low_stock.csv',
                          lowStockItems.map((i) => ({
                            id: i.id,
                            name: i.name ?? '',
                            on_hand: i.on_hand,
                            reorder_point: i.reorder_point,
                          })),
                        )
                      }
                      className="text-sm rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
                {lowStockItems.length === 0 ? (
                  <div className="text-sm text-slate-600">All good—no items below reorder point.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-200">
                          <th className="py-2 pr-4 font-medium text-slate-700">Name</th>
                          <th className="py-2 pr-4 font-medium text-slate-700">On Hand</th>
                          <th className="py-2 pr-4 font-medium text-slate-700">Reorder Point</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockItems.map((i) => (
                          <tr key={i.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2 pr-4">{i.name ?? i.id}</td>
                            <td className="py-2 pr-4">{i.on_hand}</td>
                            <td className="py-2 pr-4">{i.reorder_point}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-500" />
                    Pending COAs
                  </h2>
                  {pendingCOABatches.length > 0 && (
                    <button
                      onClick={() =>
                        exportCSV(
                          'pending_coas.csv',
                          pendingCOABatches.map((id) => ({ batch_id: id })),
                        )
                      }
                      className="text-sm rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
                {pendingCOABatches.length === 0 ? (
                  <div className="text-sm text-slate-600">No pending COAs 🎉</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-200">
                          <th className="py-2 pr-4 font-medium text-slate-700">Batch ID</th>
                          <th className="py-2 pr-4 font-medium text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingCOABatches.map((id) => (
                          <tr key={id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2 pr-4">{id}</td>
                            <td className="py-2 pr-4">
                              <button
                                onClick={() => router.push(`/packaging?batch=${encodeURIComponent(id)}`)}
                                className="text-sm text-teal-600 hover:underline"
                              >
                                Upload COA →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className={`${cardClass} mt-8`}>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <p className="text-slate-600 mb-4">
                You're logged in as <strong>{profile.email}</strong> with role <strong>{profile.role}</strong>.
              </p>

              {(stats.lowStockCount > 0 || stats.pendingCOAs > 0) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h3 className="font-semibold text-amber-900 mb-2">Action Required:</h3>
                  <ul className="space-y-1 text-sm text-amber-800">
                    {stats.lowStockCount > 0 && <li>• {stats.lowStockCount} ingredient(s) below reorder point</li>}
                    {stats.pendingCOAs > 0 && <li>• {stats.pendingCOAs} completed batch(es) need COA upload</li>}
                  </ul>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/batches')}
                  className="p-4 border border-slate-200 rounded-xl hover:border-teal-500 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="font-semibold text-slate-900">Create New Batch</div>
                  <div className="text-sm text-slate-600 mt-1">Start a new production batch</div>
                </button>
                <button
                  onClick={() => router.push('/formulations')}
                  className="p-4 border border-slate-200 rounded-xl hover:border-teal-500 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="font-semibold text-slate-900">New Formulation</div>
                  <div className="text-sm text-slate-600 mt-1">Create a new product formula</div>
                </button>
                <button
                  onClick={() => router.push('/inventory')}
                  className="p-4 border border-slate-200 rounded-xl hover:border-teal-500 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="font-semibold text-slate-900">Manage Inventory</div>
                  <div className="text-sm text-slate-600 mt-1">View and adjust stock levels</div>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      {checkModalOpen && checkResult && (
        <CompletenessModal result={checkResult} onClose={handleCloseCompleteness} />
      )}
    </div>
  )
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  )
}

function CompletenessModal({
  result,
  onClose,
}: {
  result: CompletenessCheckResult
  onClose: () => void
}) {
  const hasItems = result.items.length > 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">P&amp;L Completeness Check</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close completeness results"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">Month</p>
              <p className="text-base font-semibold text-gray-900">{result.month}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="rounded bg-green-100 px-2 py-1 text-green-800">
                Passed: {result.summary.passed}
              </span>
              <span className="rounded bg-red-100 px-2 py-1 text-red-800">
                Outstanding: {result.summary.failed}
              </span>
            </div>
          </div>

          {hasItems ? (
            <div className="space-y-3">
              {result.items.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className={`text-sm ${item.passed ? 'text-green-700' : 'text-red-700'}`}>
                        {item.passed ? 'Complete' : 'Action required'}
                      </p>
                      {item.details && (
                        <p className="mt-1 text-sm text-gray-600">{item.details}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      {typeof item.passedCount === 'number' && typeof item.totalCount === 'number' && (
                        <span className="text-xs text-gray-500">
                          {item.passedCount}/{item.totalCount} complete
                        </span>
                      )}
                      {item.link && (
                        <a
                          href={item.link}
                          className="text-sm font-medium text-teal-600 hover:underline"
                        >
                          Go to area →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No checklist items found for this month.
            </div>
          )}

          {result.fixList.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Fix list</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {result.fixList.map((fix) => (
                  <li key={fix.key}>
                    • {fix.label}
                    {fix.link && (
                      <>
                        {' '}
                        <a href={fix.link} className="font-medium text-teal-600 hover:underline">
                          Open
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
