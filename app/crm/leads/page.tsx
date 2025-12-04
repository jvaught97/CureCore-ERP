'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { Loader2, Plus } from 'lucide-react'

type LeadRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string | null
  created_at: string | null
}

export default function LeadsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_leads')
          .select('id,name,email,phone,source,status,created_at')
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load leads', error)
          if (isMounted) setLeads([])
          return
        }
        if (isMounted) setLeads(data ?? [])
      } catch (err) {
        console.error('Unexpected error loading leads', err)
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
            <h1 className="text-3xl font-semibold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-600">
              Capture inbound interest and move qualified leads into opportunities.
            </p>
          </div>
          <button
            onClick={() => router.push('/crm/leads/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lead List</h2>
              <p className="text-sm text-gray-500">
                Filter by source, status, or owner to focus on the next actions.
              </p>
            </div>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Lead</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                        No leads yet. Click “New Lead” to get started.
                      </td>
                    </tr>
                  )}
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-gray-600">
                          {lead.email && <p>{lead.email}</p>}
                          {lead.phone && <p>{lead.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">{lead.source ?? '—'}</td>
                      <td className="px-4 py-3">{lead.status ?? 'New'}</td>
                      <td className="px-4 py-3 text-right">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
