'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { Loader2, Plus } from 'lucide-react'

type QuoteRow = {
  id: string
  account_name: string | null
  status: string | null
  currency: string | null
  totals: any
  created_at: string | null
}

export default function QuotesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<QuoteRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_quotes')
          .select('id, status, currency, totals, created_at, crm_accounts(name)')
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load quotes', error)
          if (isMounted) setQuotes([])
          return
        }
        if (isMounted) {
          const mapped =
            (data ?? []).map((row: any) => ({
              id: row.id,
              status: row.status,
              currency: row.currency,
              totals: row.totals,
              created_at: row.created_at,
              account_name: row.crm_accounts?.name ?? null,
            })) ?? []
          setQuotes(mapped)
        }
      } catch (err) {
        console.error('Unexpected error loading quotes', err)
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
            <h1 className="text-3xl font-semibold text-gray-900">Quotes</h1>
            <p className="text-sm text-gray-600">
              Build proposals and convert accepted quotes into sales orders.
            </p>
          </div>
          <button
            onClick={() => router.push('/crm/quotes/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Quote
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Quote List</h2>
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
                    <th className="px-4 py-3 text-left">Quote</th>
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quotes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                        No quotes yet.
                      </td>
                    </tr>
                  )}
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => router.push(`/crm/quotes/${quote.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">Quote #{quote.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{quote.account_name ?? '—'}</td>
                      <td className="px-4 py-3 capitalize">{quote.status ?? 'draft'}</td>
                      <td className="px-4 py-3 text-right">
                        {quote.totals?.total ? `${quote.currency ?? 'USD'} ${Number(quote.totals.total).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : '—'}
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
