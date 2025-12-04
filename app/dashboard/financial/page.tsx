'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AppNav } from '@/components/nav/AppNav'
import {
  BadgeDollarSign,
  Banknote,
  BarChart,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  PieChart,
  PiggyBank,
  TrendingUp,
} from 'lucide-react'

const panel =
  'rounded-2xl border border-white/15 bg-white/95 backdrop-blur shadow-lg shadow-slate-200/60 p-5 flex flex-col gap-3'

export default function FinancialDashboard() {
  const { loading } = useAuth()

  const financialHighlights = useMemo(
    () => [
      { label: 'Revenue (MTD)', value: '$2.87M', helper: '+12.4% vs plan', icon: DollarSign },
      { label: 'Gross Margin', value: '61.2%', helper: 'Target 60%', icon: PieChart },
      { label: 'Cash on Hand', value: '$4.3M', helper: '9.8 months runway', icon: PiggyBank },
      { label: 'DSO', value: '37 days', helper: '-3 days vs Q4', icon: CreditCard },
    ],
    [],
  )

  const workingCapital = useMemo(
    () => [
      { label: 'Accounts Receivable', value: '$1.18M', accent: 'text-emerald-600' },
      { label: 'Accounts Payable', value: '$940K', accent: 'text-amber-600' },
      { label: 'Inventory', value: '$2.1M', accent: 'text-indigo-600' },
    ],
    [],
  )

  const forecastNotes = useMemo(
    () => [
      { title: 'Headcount ramp', detail: '+4 ops hires approved, impact +$82K monthly burn' },
      { title: 'Capex window', detail: 'Mix system upgrade advanced to March; cash impact model updated' },
      { title: 'R&D credit', detail: '$210K expected refund posting next cycle' },
    ],
    [],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/70">
        Loading financial statements…
      </div>
    )
  }

  return (
    <>
      <AppNav currentPage="dashboard-financial" />
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
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/50"
              >
                Financial
              </button>
            </div>
          </div>
        </div>

        <section className="bg-gradient-to-br from-purple-500 via-violet-600 to-slate-900 text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/60">Finance cockpit</p>
                <h1 className="text-4xl font-semibold mt-3">Health & Outlook</h1>
                <p className="text-white/80 mt-2">P&L, cash, and working capital telemetry for the exec stand-up.</p>
              </div>
              <div className="flex items-center gap-3 text-purple-50 text-sm">
                <FileSpreadsheet className="w-5 h-5" /> Month-end close: day 4 of 5
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {financialHighlights.map((highlight) => (
                <div
                  key={highlight.label}
                  className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4 flex justify-between items-start shadow-xl"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">{highlight.label}</p>
                    <p className="text-3xl font-bold mt-2">{highlight.value}</p>
                    <p className="text-sm text-white/70 mt-1">{highlight.helper}</p>
                  </div>
                  <highlight.icon className="w-8 h-8 text-white/70" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className={`${panel}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">P&L snapshot</p>
                    <h2 className="text-xl font-semibold text-slate-900">January month-to-date</h2>
                  </div>
                  <BarChart className="w-5 h-5 text-purple-600" />
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Net Revenue', value: '$2,874,000', helper: 'Plan $2,557,000' },
                    { label: 'COGS', value: '$1,116,000', helper: 'Materials + labor' },
                    { label: 'Gross Margin', value: '$1,758,000', helper: '61.2% margin' },
                    { label: 'Operating Expenses', value: '$1,148,000', helper: 'People + GTM + R&D' },
                    { label: 'EBITDA', value: '$610,000', helper: '21.2% margin' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                      <div>
                        <p className="text-sm text-slate-500">{row.label}</p>
                        <p className="text-xs text-slate-400">{row.helper}</p>
                      </div>
                      <p className="text-base font-semibold text-slate-900">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${panel}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Working capital
              </h3>
              <div className="space-y-4">
                {workingCapital.map((line) => (
                  <div key={line.label} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                    <p className="text-sm text-slate-500">{line.label}</p>
                    <p className={`text-lg font-semibold ${line.accent}`}>{line.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">Net working capital cycle 62 days · trending down.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${panel}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cash runway</p>
              <h3 className="text-2xl font-semibold text-slate-900">9.8 months</h3>
              <p className="text-sm text-slate-500">
                Includes committed ARR and verified renewals. Sensitivity model updated with new hiring plan.
              </p>
            </div>
            <div className={`${panel}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Collections</p>
              <h3 className="text-2xl font-semibold text-emerald-600">94% current</h3>
              <p className="text-sm text-slate-500">
                Two enterprise customers in the 45-day bucket; AR team coordinating CFO outreach this week.
              </p>
            </div>
            <div className={`${panel}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Budget variance</p>
              <h3 className="text-2xl font-semibold text-indigo-600">+3.4%</h3>
              <p className="text-sm text-slate-500">Heavy spend in growth programs; offset by higher gross margin.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${panel}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-rose-500" />
                Cash flow outlook
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'Operating CF', value: '+$540K' },
                  { label: 'Investing', value: '-$210K' },
                  { label: 'Financing', value: '$0' },
                  { label: 'Free cash flow', value: '+$330K' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    <p className="text-xl font-semibold text-slate-900 mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">Capex spike clears in March; returning to normalized cadence.</p>
            </div>

            <div className={`${panel}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <BadgeDollarSign className="w-4 h-4 text-amber-500" />
                CFO notes
              </h3>
              <div className="mt-4 space-y-3">
                {forecastNotes.map((note) => (
                  <div key={note.title} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{note.title}</p>
                    <p className="text-sm text-slate-500">{note.detail}</p>
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
