import Link from 'next/link'
import { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

type Delta = {
  value: number
  positiveIsGood?: boolean
}

type KpiCardProps = {
  label: string
  value: string | number
  delta?: Delta
  href?: string
  icon?: ReactNode
}

function DeltaBadge({ delta }: { delta: Delta }) {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    signDisplay: 'always',
  })

  const isPositive = delta.value >= 0
  const isGood = delta.positiveIsGood ?? true
  const positiveClass = isGood ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
  const negativeClass = isGood ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive ? positiveClass : negativeClass
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatter.format(delta.value)}%
    </span>
  )
}

export function KpiCard({ label, value, delta, href, icon }: KpiCardProps) {
  const content = (
    <div className="relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {icon ? <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">{icon}</div> : null}
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-2xl font-semibold text-gray-900">
        {typeof value === 'number' ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : value}
      </span>
      {delta ? <DeltaBadge delta={delta} /> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174940] focus-visible:ring-offset-2">
        {content}
      </Link>
    )
  }

  return content
}

