'use client'

import { ReactNode } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

type PieDatum = {
  name: string
  value: number
}

type PieCardProps = {
  title: string
  subtitle?: string
  data: PieDatum[]
  colors?: string[]
  centerLabel?: string
  footer?: ReactNode
}

const DEFAULT_COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#a855f7', '#f97316', '#60a5fa']

function PieTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-lg">
      <p className="font-medium text-gray-900">{item.name}</p>
      <p className="text-xs text-gray-500">{item.value?.toLocaleString('en-US')}</p>
    </div>
  )
}

export function PieCard({ title, subtitle, data, colors = DEFAULT_COLORS, centerLabel, footer }: PieCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          No data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            {centerLabel ? (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-700 text-sm font-semibold">
                {centerLabel}
              </text>
            ) : (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-700 text-sm font-semibold">
                {total.toLocaleString('en-US')}
              </text>
            )}
          </PieChart>
        </ResponsiveContainer>
      )}
      {footer ? <div className="text-xs text-gray-500">{footer}</div> : null}
    </div>
  )
}

