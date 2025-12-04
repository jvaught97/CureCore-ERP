'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { LeadForm } from '@/app/crm/leads/_components/LeadForm'
import { convertLeadToAccount } from '@/app/crm/_actions'
import { Loader2 } from 'lucide-react'

type LeadDetail = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string | null
  notes: string | null
  created_at: string | null
}

export default function LeadDetailPage() {
  const params = useParams()
  const leadId = params?.id as string | undefined
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [converting, startConvert] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_leads')
          .select('*')
          .eq('id', leadId)
          .maybeSingle()

        if (error) {
          console.error('Failed to load lead detail', error)
          if (isMounted) setLead(null)
          return
        }
        if (isMounted) setLead(data)
      } catch (err) {
        console.error('Unexpected error loading lead detail', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [leadId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : lead ? (
          <>
            <header className="space-y-2">
              <button
                onClick={() => router.push('/crm?tab=leads')}
                className="text-sm font-medium text-[#174940] hover:underline"
              >
                Back to Leads
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-gray-900">{lead.name}</h1>
                <span className="rounded-full bg-[#174940]/10 px-3 py-1 text-xs font-semibold text-[#174940]">
                  {lead.status ?? 'New'}
                </span>
              </div>
              <p className="text-sm text-gray-600">Source: {lead.source ?? 'Unknown'} • Email: {lead.email ?? '—'} • Phone: {lead.phone ?? '—'}</p>
            </header>

            {message && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {message}
              </div>
            )}

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Edit Lead</h2>
                <button
                  onClick={() =>
                    startConvert(async () => {
                      try {
                        const result = await convertLeadToAccount(lead.id)
                        setMessage('Lead converted successfully!')
                        router.push(`/crm/accounts/${result.accountId}`)
                      } catch (err) {
                        console.error('Lead conversion failed', err)
                        setMessage('Conversion failed. Please try again.')
                      }
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5 disabled:cursor-not-allowed"
                  disabled={converting}
                >
                  {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Convert Lead
                </button>
              </div>
              <div className="mt-4">
                <LeadForm
                  mode="edit"
                  leadId={lead.id}
                  defaultValues={{
                    name: lead.name,
                    email: lead.email ?? undefined,
                    phone: lead.phone ?? undefined,
                    source: lead.source ?? undefined,
                    status: lead.status ?? undefined,
                    notes: lead.notes ?? undefined,
                  }}
                />
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Lead not found.
          </div>
        )}
      </main>
    </div>
  )
}
