'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AppNav } from '@/components/nav/AppNav'
import {
  ArrowUpRight,
  BarChart2,
  Building,
  CalendarClock,
  DollarSign,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'

const card =
  'rounded-2xl border border-white/20 bg-white/90 backdrop-blur shadow-lg shadow-slate-200/60 p-5 flex flex-col gap-2'

export default function CommercialDashboard() {
  const { loading } = useAuth()

  const revenueHighlights = useMemo(
    () => [
      { label: 'Bookings (MTD)', value: '$1.24M', helper: '+18% vs plan', icon: DollarSign },
      { label: 'Pipeline Health', value: '$3.8M', helper: 'weighted 90 days', icon: BarChart2 },
      { label: 'Win rate', value: '32%', helper: '+3 pts YoY', icon: Target },
      { label: 'Average deal cycle', value: '41 days', helper: '-5 days vs Q4', icon: CalendarClock },
    ],
    [],
  )

  const topOpportunities = useMemo(
    () => [
      { account: 'Kindred Wellness', stage: 'Commit', value: '$420K', owner: 'Jordan', close: 'Jan 28' },
      { account: 'Bright Labs', stage: 'Evaluate', value: '$265K', owner: 'Amelia', close: 'Feb 6' },
      { account: 'Thrive Beauty', stage: 'Develop', value: '$190K', owner: 'Nate', close: 'Feb 18' },
    ],
    [],
  )

  const expansionSignals = useMemo(
    () => [
      { customer: 'Northstar Retail', metric: 'NPS 71', action: 'Offer refill automation' },
      { customer: 'Evergreen Spa', metric: 'Run-Rate +22%', action: 'Discuss 3PL bundling' },
      { customer: 'Calm Collective', metric: 'Bundle attach 1.8x', action: 'Launch co-marketing kit' },
    ],
    [],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/70">
        Syncing commercial telemetry…
      </div>
    )
  }

  return (
    <>
      <AppNav currentPage="dashboard-commercial" />
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-500/20 text-sky-300 border border-sky-500/50"
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

        <section className="bg-gradient-to-br from-sky-500 via-indigo-500 to-slate-900 text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/60">Commercial HQ</p>
                <h1 className="text-4xl font-semibold mt-3">Revenue Operations Pulse</h1>
                <p className="text-white/80 mt-2">Bookings, pipeline, and customer success signals in one pane.</p>
              </div>
              <div className="flex items-center gap-3 text-sky-50 text-sm">
                <Sparkles className="w-5 h-5" /> Forecast lock: confident
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {revenueHighlights.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4 flex justify-between items-start shadow-xl"
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
              <div className={`${card}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pipeline trajectory</p>
                    <h2 className="text-xl font-semibold text-slate-900">90-day weighted view</h2>
                  </div>
                  <LineChartIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    { label: 'Stage 1-2', value: '$1.6M', detail: 'top of funnel' },
                    { label: 'Stage 3-4', value: '$1.4M', detail: 'evaluation' },
                    { label: 'Commit', value: '$620K', detail: 'ready to book' },
                    { label: 'Backlog', value: '$180K', detail: 'awaiting PO' },
                  ].map((segment) => (
                    <div key={segment.label} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{segment.label}</p>
                      <p className="text-2xl font-semibold text-slate-900">{segment.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{segment.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  Commit coverage at <span className="font-semibold text-indigo-600">3.0x quota</span>; remain opportunistic
                  on strategic wins.
                </p>
              </div>
            </div>

            <div className={`${card}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-rose-500" />
                  Top opportunities
                </h3>
                <span className="text-xs text-slate-500">Next 30 days</span>
              </div>
              <div className="mt-4 space-y-4">
                {topOpportunities.map((op) => (
                  <div key={op.account} className="border-l-4 border-rose-400 pl-3">
                    <p className="font-semibold text-slate-900">{op.account}</p>
                    <p className="text-sm text-slate-500">
                      Stage {op.stage} · Owner {op.owner}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>Close {op.close}</span>
                      <span className="font-semibold text-slate-900">{op.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${card}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Key wins</p>
              <h3 className="text-2xl font-semibold text-slate-900">3 logos this week</h3>
              <p className="text-sm text-slate-500">
                Beacon Apothecary, Calm Collective, and Mode Labs all moved to contract with attach-rate above 1.6x.
              </p>
            </div>
            <div className={`${card}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Customer health</p>
              <h3 className="text-2xl font-semibold text-emerald-600">92% green</h3>
              <p className="text-sm text-slate-500">Only 2 accounts in attention status; CS teams engaged with success plans.</p>
            </div>
            <div className={`${card}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Marketing</p>
              <h3 className="text-2xl font-semibold text-indigo-600">18 SQLs</h3>
              <p className="text-sm text-slate-500">Product-market webinars continue outperforming, CAC trending down 14%.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${card}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-teal-500" />
                Expansion signals
              </h3>
              <div className="mt-4 space-y-3">
                {expansionSignals.map((signal) => (
                  <div key={signal.customer} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{signal.customer}</p>
                    <p className="text-sm text-slate-500">{signal.metric}</p>
                    <p className="text-xs text-teal-600 font-semibold mt-1">{signal.action}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${card}`}>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Leadership scoreboard
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'Seller of the week', value: 'Jordan Lee', helper: '$540K booked' },
                  { label: 'CS highlight', value: 'Mia Patel', helper: 'Renewal + expansion' },
                  { label: 'Marketing Hero', value: 'Performance Team', helper: 'SQLs +32%' },
                  { label: 'CX metric', value: 'NPS 68', helper: 'up 4pts' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.helper}</p>
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
