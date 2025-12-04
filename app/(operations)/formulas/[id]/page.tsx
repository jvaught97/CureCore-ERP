import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { computeFormulaUnitCost } from '@/app/(operations)/formulas/_actions/costing'
import { CostSummaryCard } from '@/app/(operations)/formulas/[id]/CostSummaryCard'

type PageParams = {
  params: {
    id: string
  }
}

function formatStatus(status: string) {
  const value = status ?? ''
  const normalized = value.toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function FormulaDetailPage({ params }: PageParams) {
  const formulaId = params.id

  if (!formulaId) {
    notFound()
  }

  let initialData
  try {
    initialData = await computeFormulaUnitCost(formulaId)
  } catch (error) {
    if (error instanceof Error && error.message === 'Formula not found') {
      notFound()
    }
    throw error
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="formulations" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/formulations" className="text-sm font-medium text-[#174940] hover:underline">
              ← Back to Formulations
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">{initialData.header.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>Version {initialData.header.version}</span>
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                {formatStatus(initialData.header.status)}
              </span>
              <span>Created {formatDate(initialData.header.created_at)}</span>
            </div>
          </div>
        </div>

        <CostSummaryCard formulaId={formulaId} initialData={initialData} />
      </main>
    </div>
  )
}
