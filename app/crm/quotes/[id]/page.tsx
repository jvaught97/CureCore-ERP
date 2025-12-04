'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { QuoteForm } from '@/app/crm/quotes/_components/QuoteForm'
import { Loader2 } from 'lucide-react'

type QuoteRecord = {
  id: string
  account_id: string
  currency: string
  status: string
  valid_until: string | null
  notes: string | null
  crm_quote_lines: Array<{
    description: string | null
    qty: number | null
    uom: string | null
    unit_price: number | null
    discount_pct: number | null
    tax_code: string | null
    sku_id: string | null
    requires_display_box: boolean | null
    display_box_quantity: number | null
  }>
}

export default function QuoteDetailPage() {
  const params = useParams()
  const quoteId = params?.id as string | undefined
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<QuoteRecord | null>(null)

  useEffect(() => {
    if (!quoteId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_quotes')
          .select(
            `id,account_id,currency,status,valid_until,notes,crm_quote_lines(description,qty,uom,unit_price,discount_pct,tax_code,sku_id,requires_display_box,display_box_quantity)`
          )
          .eq('id', quoteId)
          .maybeSingle()
        if (error) {
          console.error('Failed to load quote', error)
          if (isMounted) setQuote(null)
        } else if (isMounted) {
          setQuote(data as QuoteRecord | null)
        }
      } catch (err) {
        console.error('Unexpected error loading quote', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [quoteId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : quote ? (
          <>
            <header className="space-y-2">
              <button
                onClick={() => router.push('/crm?tab=quotes')}
                className="text-sm font-medium text-[#174940] hover:underline"
              >
                Back to Quotes
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-gray-900">Quote {quote.id.slice(0, 8)}</h1>
                <button
                  onClick={() => router.push(`/sales-orders/new?fromQuote=${quote.id}`)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
                >
                  Convert to Sales Order
                </button>
              </div>
            </header>
            <QuoteForm
              mode="edit"
              quoteId={quote.id}
              defaultValues={{
                accountId: quote.account_id,
                currency: quote.currency,
                status: quote.status as any,
                validUntil: quote.valid_until ?? undefined,
                notes: quote.notes ?? undefined,
                lines: quote.crm_quote_lines.map((line) => ({
                  productId: line.sku_id ?? '',
                  qty: line.qty ?? 0,
                  uom: line.uom ?? 'unit',
                  unitPrice: line.unit_price ?? 0,
                  discountPct: line.discount_pct ?? undefined,
                  taxCode: line.tax_code ?? undefined,
                  showDetails: false,
                  displayBoxQuantity: line.display_box_quantity ?? 0,
                })),
              }}
              onCancel={() => router.push('/crm?tab=quotes')}
            />
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Quote not found.
          </div>
        )}
      </main>
    </div>
  )
}
