'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { Loader2, Plus } from 'lucide-react'
import { inventoryDemoData } from '@/data/inventoryDemo'

type SalesOrderRow = {
  id: string
  status: string
  currency: string | null
  total: number | null
  account_name: string | null
  quote_id: string | null
  created_at: string | null
}

export default function SalesOrdersPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<SalesOrderRow[]>([])

  const isInformationalError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const err = error as { code?: string | null; message?: string | null }
    if (err.code === '42P01' || err.code === 'PGRST116') return true
    if (!err.code) {
      const hasMessage = typeof err.message === 'string' && err.message.trim().length > 0
      if (!hasMessage) return true
    }
    return Object.keys(err).length === 0
  }

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'

        if (bypass) {
          if (!isMounted) return
          setOrders(
            inventoryDemoData.ingredients.slice(0, 3).map((ing, idx) => ({
              id: `demo-so-${idx}`,
              status: idx === 0 ? 'draft' : idx === 1 ? 'sent' : 'fulfilled',
              currency: 'USD',
              total: 25000 + idx * 7800,
              quote_id: `demo-quote-${idx}`,
              created_at: new Date(Date.now() - idx * 86400000).toISOString(),
              account_name: idx === 0 ? 'Wellness Collective' : 'Calm Collective',
            })),
          )
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('sales_orders')
          .select('id,status,currency,total,quote_id,created_at,crm_accounts(name)')
          .order('created_at', { ascending: false })

        if (error) {
          if (isInformationalError(error)) {
            console.info('Sales orders not available yet.')
          } else {
            console.error('Failed to load sales orders', error)
          }
          if (isMounted) setOrders([])
          return
        }

        if (isMounted) {
          const mapped = (data ?? []).map((row: any) => ({
            id: row.id,
            status: row.status,
            currency: row.currency,
            total: row.total,
            quote_id: row.quote_id,
            account_name: row.crm_accounts?.name ?? null,
            created_at: row.created_at,
          }))
          setOrders(mapped)
        }
      } catch (err) {
        console.error('Unexpected error loading sales orders', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [supabase])

  useEffect(() => {
    const fromQuote = params?.get('fromQuote')
    if (fromQuote) {
      router.push(`/sales-orders/new?fromQuote=${fromQuote}`)
    }
  }, [params, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="sales-orders" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Sales Orders</h1>
            <p className="text-sm text-gray-600">
              Convert quotes into orders, manage fulfillment, and track order status.
            </p>
          </div>
          <button
            onClick={() => router.push('/sales-orders/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Sales Order
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Order List</h2>
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
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Quote</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        No sales orders yet. Click “New Sales Order” to get started.
                      </td>
                    </tr>
                  )}
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => router.push(`/sales-orders/${order.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">SO-{order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{order.account_name ?? '—'}</td>
                      <td className="px-4 py-3 capitalize">{order.status}</td>
                      <td className="px-4 py-3">{order.quote_id ? `Quote ${order.quote_id.slice(0, 8)}` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {order.total != null ? `${order.currency ?? 'USD'} ${order.total.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
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
