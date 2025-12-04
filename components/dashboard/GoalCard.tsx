'use client'

import { ReactNode, useMemo } from 'react'

type GoalCardProps = {
  title: string
  period: string
  current: number
  target: number
  invert?: boolean
  accent?: 'emerald' | 'sky' | 'amber' | 'violet'
  icon?: ReactNode
  currentLabel?: string
  targetLabel?: string
}

const ACCENT_MAP: Record<NonNullable<GoalCardProps['accent']>, { bg: string; text: string; bar: string }> = {
  emerald: { bg: 'from-emerald-500/15 to-emerald-500/0', text: 'text-emerald-500', bar: 'bg-emerald-500' },
  sky: { bg: 'from-sky-500/15 to-sky-500/0', text: 'text-sky-500', bar: 'bg-sky-500' },
  amber: { bg: 'from-amber-500/15 to-amber-500/0', text: 'text-amber-500', bar: 'bg-amber-500' },
  violet: { bg: 'from-violet-500/15 to-violet-500/0', text: 'text-violet-500', bar: 'bg-violet-500' },
}

export function GoalCard({
  title,
  period,
  current,
  target,
  invert = false,
  accent = 'emerald',
  icon,
  currentLabel,
  targetLabel,
}: GoalCardProps) {
  const safeTarget = Math.max(target, 0.0001)

  let progress = current / safeTarget
  if (invert) {
    progress = current >= target ? 0 : 1 - current / safeTarget
  }
  progress = Math.max(0, Math.min(progress, 1))

  const accentTheme = ACCENT_MAP[accent]

  const statusLabel = useMemo(() => {
    if (invert) {
      return current <= target ? 'On track' : 'Needs attention'
    }
    if (current >= target) return 'Goal met'
    if (current >= target * 0.8) return 'Nearly there'
    return 'Needs attention'
  }, [current, invert, target])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-slate-100 shadow-lg shadow-slate-900/40">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentTheme.bg}`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-800/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
            {period}
          </span>
          <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
        </div>
        {icon ? <div className={`text-2xl ${accentTheme.text}`}>{icon}</div> : null}
      </div>

      <div className="relative mt-6 space-y-3">
        <div className="flex items-baseline justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current</span>
            <span className="text-base font-semibold text-white">
              {currentLabel ?? current.toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
          <span className="text-xs uppercase tracking-wide text-slate-500">{statusLabel}</span>
        </div>
        <div className="flex items-baseline justify-between text-sm text-slate-400">
          <span>Target</span>
          <span>{targetLabel ?? target.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800/80">
          <div
            className={`h-full rounded-full ${accentTheme.bar} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(progress * 100, 6)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
