'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AppNav } from '@/components/nav/AppNav'
import {
  Activity,
  AlertTriangle,
  Beaker,
  Boxes,
  Factory,
  Gauge,
  ListChecks,
  TimerReset,
  Truck,
} from 'lucide-react'

const cardClass =
  'rounded-2xl border border-white/20 bg-white/90 backdrop-blur shadow-lg shadow-slate-200/60 p-5 flex flex-col gap-2'

export default function OperationsDashboard() {
  const { loading } = useAuth()

  const highlights = useMemo(
    () => [
      { label: 'Active Batches', value: '18', helper: '3 set up this morning', icon: Factory },
      { label: 'Inventory Coverage', value: '42 days', helper: 'raw + packaging', icon: Boxes },
      { label: 'First-Pass Yield', value: '97.4%', helper: '+1.2% vs last week', icon: Activity },
      { label: 'QC Holds', value: '2 lots', helper: 'awaiting COA upload', icon: AlertTriangle },
    ],
    [],
  )

  const productionTimeline = useMemo(
    () => [
      { workCenter: 'Blending Line A', batch: 'BCH-2418', status: 'Mixing 65%', eta: '11:20a' },
      { workCenter: 'Filling Line', batch: 'BCH-2417', status: 'Filling Run 2/3', eta: '2:05p' },
      { workCenter: 'Cure Tunnel', batch: 'BCH-2412', status: 'Curing / QA prep', eta: '4:30p' },
      { workCenter: 'Packaging Cell', batch: 'BCH-2409', status: 'Labeling & case pack', eta: 'Done 6:00p' },
    ],
    [],
  )

  const qaTiles = useMemo(
    () => [
      { title: 'Micro Hold – Lot 2416-01', owner: 'QC · Ellie', next: 'Results 3:15p' },
      { title: 'Label spec update', owner: 'Packaging Eng', next: 'Art final Wed' },
      { title: 'Scale calibration', owner: 'Maintenance', next: 'Completed (log signed)' },
    ],
    [],
  )

  const supplyRisks = useMemo(
    () => [
      { item: 'Vitamin C 15% sol.', supplier: 'Sunrise Labs', risk: 'ETA pushed 4 days', action: 'Switch to backup lot' },
      { item: '2oz Amber Bottle', supplier: 'Westpack', risk: 'Inbound palleting delay', action: 'Expedite FedEx - confirmed' },
    ],
    [],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/70">
        Connecting to operations data…
      </div>
    )
  }

  return (
    <>
      <AppNav currentPage="dashboard-operations" />
      <div className="min-h-screen bg-slate-950 text-slate-900">
        {/* Dashboard Tabs */}
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 py-3 overflow-x-auto">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Overview
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/operations'}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
              >
                Operations
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/commercial'}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Commercial
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/financial'}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Financial
              </button>
            </div>
          </div>
        </div>

        <section className="bg-gradient-to-br from-emerald-500 via-teal-500 to-slate-900 text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Ops Command</p>
                <h1 className="text-4xl font-semibold mt-3">Production & Supply Health</h1>
                <p className="text-white/80 mt-2">Live signal on batches, QA, and supplier readiness.</p>
              </div>
              <div className="flex items-center gap-3 text-emerald-100 text-sm">
                <TimerReset className="w-5 h-5" /> Updated 6 minutes ago
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              {highlights.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 flex justify-between items-start shadow-xl"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-sm text-white/70 mt-1">{stat.helper}</p>
                  </div>
                  <stat.icon className="w-8 h-8 text-white/70" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className={`${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Production timeline</p>
                    <h2 className="text-xl font-semibold text-slate-900">Today&apos;s work centers</h2>
                  </div>
                  <Gauge className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="mt-4 space-y-4">
                  {productionTimeline.map((slot) => (
                    <div
                      key={slot.batch}
                      className="rounded-xl border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{slot.workCenter}</p>
                        <p className="text-lg font-semibold text-slate-900">{slot.batch}</p>
                        <p className="text-sm text-slate-600">{slot.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">ETA</p>
                        <p className="text-lg font-semibold text-emerald-600">{slot.eta}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${cardClass}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-amber-500" />
                    QA queue
                  </h3>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    3 alerts
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {qaTiles.map((item) => (
                    <div key={item.title} className="py-3">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.owner}</p>
                      <p className="text-xs text-slate-400 mt-1">Next step · {item.next}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardClass}`}>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-500" />
                  Supply watchlist
                </h3>
                <div className="space-y-4 mt-2">
                  {supplyRisks.map((risk) => (
                    <div key={risk.item} className="border-l-4 border-indigo-400 pl-3">
                      <p className="font-semibold text-slate-900">{risk.item}</p>
                      <p className="text-sm text-slate-500">{risk.supplier}</p>
                      <p className="text-xs text-slate-400 mt-1">{risk.risk}</p>
                      <p className="text-xs text-indigo-600 font-semibold mt-1">{risk.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${cardClass}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Batch mix</p>
              <h3 className="text-2xl font-semibold text-slate-900">62% Make-to-Stock</h3>
              <p className="text-sm text-slate-500">
                Remaining 38% tied to live customer launch orders. Capacity remains at 81% load.
              </p>
            </div>
            <div className={`${cardClass}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Low-stock signals</p>
              <h3 className="text-2xl font-semibold text-red-500">5 critical</h3>
              <p className="text-sm text-slate-500">CO2 extract, Gums, and 120ml pump heads need PO updates today.</p>
            </div>
            <div className={`${cardClass}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Compliance</p>
              <h3 className="text-2xl font-semibold text-emerald-600">All audits clear</h3>
              <p className="text-sm text-slate-500">Digital batch records signed in under 18 hours on average.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${cardClass}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-teal-500" />
                Work order throughput
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'Avg cycle time', value: '6h 18m' },
                  { label: 'Changeover', value: '34m' },
                  { label: 'Downtime last 24h', value: '22m' },
                  { label: 'Expedites', value: '1 job' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    <p className="text-xl font-semibold text-slate-900 mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardClass}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-rose-500" />
                Inventory readiness
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Run-rate coverage', value: '42.3 days', accent: 'text-emerald-600' },
                  { label: 'Expiring lots (30d)', value: '4 lots', accent: 'text-amber-600' },
                  { label: 'Open cycle counts', value: '2 locations', accent: 'text-indigo-600' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <p className="text-sm text-slate-500">{row.label}</p>
                    <p className={`text-base font-semibold ${row.accent}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
