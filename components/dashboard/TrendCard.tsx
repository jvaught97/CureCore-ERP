'use client'

import { ReactNode } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  BarChart,
  Bar,
} from 'recharts'
import Link from 'next/link'

type TrendDatum = { x: string | number | Date; y: number; y2?: number }

type TrendCardProps = {
  title: string
  subtitle?: string
  data: TrendDatum[]
  href?: string
  variant?: 'line' | 'bar'
  secondaryLabel?: string
}

type TooltipPayload = {
  value: number
  dataKey: string
}

function formatXAxis(value: string | number | Date) {
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === 'string') return value
  return new Intl.NumberFormat('en-US').format(value)
}

function TrendTooltip({
  active,
  label,
  payload,
  secondaryLabel,
}: {
  active?: boolean
  label?: string | number
  payload?: TooltipPayload[]
  secondaryLabel?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-gray-900">{formatXAxis(label ?? '')}</p>
      <p className="text-gray-600">
        {payload[0]?.value?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </p>
      {payload[1] ? (
        <p className="text-gray-500">
          {secondaryLabel ?? payload[1].dataKey}:{' '}
          {payload[1].value?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
      ) : null}
    </div>
  )
}

export function TrendCard({ title, subtitle, data, href, variant = 'line', secondaryLabel }: TrendCardProps) {
  const chartBody =
    variant === 'bar' ? (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: -20 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
          <XAxis dataKey="x" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatXAxis} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip content={<TrendTooltip secondaryLabel={secondaryLabel} />} />
          <Bar dataKey="y" fill="#174940" radius={[6, 6, 0, 0]} />
          {data.some((d) => d.y2 !== undefined) ? (
            <Line type="monotone" dataKey="y2" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: -20 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
          <XAxis dataKey="x" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatXAxis} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip content={<TrendTooltip secondaryLabel={secondaryLabel} />} />
          <Line type="monotone" dataKey="y" stroke="#174940" strokeWidth={2} dot={false} />
          {data.some((d) => d.y2 !== undefined) ? (
            <Line type="monotone" dataKey="y2" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    )

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="text-sm font-medium text-[#174940] transition hover:text-[#123830]"
        >
          View all
        </Link>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {header}
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          No data yet.
        </div>
      ) : (
        chartBody
      )}
    </div>
  )
}
