'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { SalesOrderForm } from '@/app/sales-orders/_components/SalesOrderForm'
import { Loader2 } from 'lucide-react'

type SalesOrderRecord = {
  id: string
  quote_id: string | null
  account_id: string | null
  currency: string | null
  status: string
  notes: string | null
}

type SalesOrderLineRecord = {
  sku_id: string | null
  description: string | null
  qty_ordered: number | null
  uom: string | null
  unit_price: number | null
  discount_pct: number | null
  tax_code: string | null
}

export default function SalesOrderDetailPage() {
  const params = useParams()
  const orderId = params?.id as string | undefined
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState<SalesOrderRecord | null>(null)
  const [lines, setLines] = useState<SalesOrderLineRecord[]>([])

  useEffect(() => {
    if (!orderId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: order, error: orderError }, { data: lineItems, error: linesError }] = await Promise.all([
          supabase
            .from('sales_orders')
            .select('id,quote_id,account_id,currency,status,notes')
            .eq('id', orderId)
            .maybeSingle(),
          supabase
            .from('sales_order_lines')
            .select('sku_id,description,qty_ordered,uom,unit_price,discount_pct,tax_code')
            .eq('sales_order_id', orderId),
        ])

        if (orderError) {
          console.error('Failed to load sales order', orderError)
          if (isMounted) setRecord(null)
        } else if (isMounted) {
          setRecord(order as SalesOrderRecord | null)
        }

        if (linesError) {
          console.error('Failed to load sales order lines', linesError)
          if (isMounted) setLines([])
        } else if (isMounted) {
          setLines((lineItems as SalesOrderLineRecord[]) ?? [])
        }
      } catch (err) {
        console.error('Unexpected error loading sales order', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [orderId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="sales-orders" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : record ? (
          <SalesOrderForm
            mode="edit"
            orderId={record.id}
            initialState={{
              quoteId: record.quote_id,
              accountId: record.account_id,
              currency: record.currency,
              status: record.status,
              notes: record.notes,
              lines,
            }}
          />
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Sales order not found.
          </div>
        )}
      </main>
    </div>
  )
}
