'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'

type RdFormulaListItem = {
  id: string
  name: string
  version: string
  notes: string | null
  created_at: string | null
}

export default function RdFormulasPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formulas, setFormulas] = useState<RdFormulaListItem[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: supabaseError } = await supabase
          .from('rd_formulas')
          .select('id,name,version,notes,created_at')
          .order('created_at', { ascending: false })

        if (supabaseError) {
          if (supabaseError.code === '42P01') {
            console.info('rd_formulas table not available yet.')
            if (isMounted) setFormulas([])
          } else {
            console.error('Failed to fetch RD formulas', supabaseError)
            if (isMounted) setError('Unable to load formulas. Please try again later.')
          }
          return
        }

        if (isMounted) setFormulas(data ?? [])
      } catch (err) {
        console.error('Unexpected error loading RD formulas', err)
        if (isMounted) setError('Unable to load formulas. Please try again later.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="rnd" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">R&amp;D Formulas</h1>
            <p className="text-sm text-gray-600">
              Track in-flight R&amp;D formulations before they are ready for production.
            </p>
          </div>
          <button
            onClick={() => router.push('/rnd/formulas/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New R&amp;D Formula
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Formula Library</h2>
            <p className="text-sm text-gray-500">
              Only formulas created by you are visible until they graduate to production.
            </p>
          </div>
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#174940]" />
                Loading formulas…
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : formulas.length === 0 ? (
              <EmptyState onCreate={() => router.push('/rnd/formulas/new')} />
            ) : (
              <div className="grid gap-4">
                {formulas.map((formula) => (
                  <FormulaCard key={formula.id} formula={formula} onOpen={() => router.push(`/rnd/formulas/${formula.id}`)} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
      <p>No R&amp;D formulas yet. Start one to capture ingredients and manufacturing steps.</p>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New R&amp;D Formula
      </button>
    </div>
  )
}

function FormulaCard({
  formula,
  onOpen,
}: {
  formula: RdFormulaListItem
  onOpen: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{formula.name}</h3>
          <span className="rounded bg-[#174940]/10 px-2 py-1 text-xs font-medium text-[#174940]">
            {formula.version}
          </span>
        </div>
        {formula.notes && (
          <p className="mt-1 max-w-2xl text-sm text-gray-600 line-clamp-2">{formula.notes}</p>
        )}
        {formula.created_at && (
          <p className="mt-2 text-xs text-gray-500">
            Created {new Date(formula.created_at).toLocaleString()}
          </p>
        )}
      </div>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 self-start rounded-md border border-[#174940] px-3 py-2 text-sm font-medium text-[#174940] hover:bg-[#174940]/5 md:self-center"
      >
        View Formula
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
