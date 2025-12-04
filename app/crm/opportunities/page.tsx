'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { Loader2, Plus } from 'lucide-react'

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']

type Opportunity = {
  id: string
  name: string
  stage: string | null
  value_amount: number | null
  account_name: string | null
  close_date: string | null
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [board, setBoard] = useState<Record<string, Opportunity[]>>({})

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_opportunities')
          .select('id,name,stage,value_amount,close_date,crm_accounts(name)')
          .order('created_at', { ascending: true })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load opportunities', error)
          if (isMounted) setBoard({})
          return
        }

        if (isMounted) {
          const grouped: Record<string, Opportunity[]> = {}
          STAGES.forEach((stage) => {
            grouped[stage] = []
          })
          ;(data ?? []).forEach((row: any) => {
            const stage = STAGES.includes(row.stage) ? row.stage : 'New'
            if (!grouped[stage]) grouped[stage] = []
            grouped[stage].push({
              id: row.id,
              name: row.name,
              stage,
              value_amount: row.value_amount,
              account_name: row.crm_accounts?.name ?? null,
              close_date: row.close_date,
            })
          })
          setBoard(grouped)
        }
      } catch (err) {
        console.error('Unexpected error loading opportunities', err)
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
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Opportunities</h1>
            <p className="text-sm text-gray-600">
              Track deals through each pipeline stage. Drag-and-drop coming soon.
            </p>
          </div>
          <button
            onClick={() => router.push('/crm/opportunities/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Opportunity
          </button>
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : (
          <section className="grid gap-4 overflow-x-auto md:grid-cols-3 lg:grid-cols-6">
            {STAGES.map((stage) => (
              <div key={stage} className="flex min-w-[220px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  {stage}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  {(board[stage] ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">No deals</p>
                  ) : (
                    board[stage].map((opp) => (
                      <button
                        key={opp.id}
                        onClick={() => router.push(`/crm/opportunities/${opp.id}`)}
                        className="w-full rounded-md border border-gray-200 p-3 text-left text-sm shadow-sm transition hover:border-[#174940]"
                      >
                        <p className="font-semibold text-gray-900">{opp.name}</p>
                        <p className="text-xs text-gray-500">{opp.account_name ?? 'Unassigned Account'}</p>
                        <p className="mt-1 text-xs text-gray-600">
                          ${Number(opp.value_amount ?? 0).toFixed(2)} •{' '}
                          {opp.close_date ? new Date(opp.close_date).toLocaleDateString() : 'No close date'}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
