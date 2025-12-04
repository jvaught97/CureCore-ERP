'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/utils/supabase/server'

type SalesOrderLineInput = {
  skuId?: string
  description: string
  qtyOrdered: number
  uom?: string
  unitPrice: number
  discountPct?: number | null
  taxCode?: string | null
}

export type SalesOrderPayload = {
  quoteId?: string | null
  accountId?: string | null
  currency?: string
  status?: 'draft' | 'confirmed' | 'picking' | 'shipped' | 'closed'
  notes?: string
  lines: SalesOrderLineInput[]
}

async function getClientWithUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function createSalesOrder(payload: SalesOrderPayload) {
  const { supabase, user } = await getClientWithUser()

  const { data: order, error } = await supabase
    .from('sales_orders')
    .insert({
      quote_id: payload.quoteId ?? null,
      account_id: payload.accountId ?? null,
      currency: payload.currency ?? 'USD',
      status: payload.status ?? 'draft',
      notes: payload.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !order) {
    console.error('createSalesOrder failed', error)
    throw error ?? new Error('Failed to create sales order')
  }

  if (payload.lines.length) {
    const formatted = payload.lines.map((line) => ({
      sales_order_id: order.id,
      sku_id: line.skuId ?? null,
      description: line.description,
      qty_ordered: line.qtyOrdered,
      qty_allocated: 0,
      qty_shipped: 0,
      uom: line.uom ?? 'unit',
      unit_price: line.unitPrice,
      discount_pct: line.discountPct ?? null,
      tax_code: line.taxCode ?? null,
      created_by: user.id,
    }))

    const { error: linesError } = await supabase
      .from('sales_order_lines')
      .insert(formatted)

    if (linesError) {
      console.error('createSalesOrder lines failed', linesError)
      throw linesError
    }
  }

  revalidatePath('/sales-orders')
  revalidatePath(`/sales-orders/${order.id}`)
  return order.id as string
}

export async function updateSalesOrder(id: string, payload: SalesOrderPayload) {
  if (!id) throw new Error('Sales order id is required')
  const { supabase, user } = await getClientWithUser()

  const { error } = await supabase
    .from('sales_orders')
    .update({
      quote_id: payload.quoteId ?? null,
      account_id: payload.accountId ?? null,
      currency: payload.currency ?? 'USD',
      status: payload.status ?? 'draft',
      notes: payload.notes ?? null,
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateSalesOrder failed', error)
    throw error
  }

  const { error: deleteLinesError } = await supabase
    .from('sales_order_lines')
    .delete()
    .eq('sales_order_id', id)
    .eq('created_by', user.id)

  if (deleteLinesError) {
    console.error('updateSalesOrder delete lines failed', deleteLinesError)
    throw deleteLinesError
  }

  if (payload.lines.length) {
    const formatted = payload.lines.map((line) => ({
      sales_order_id: id,
      sku_id: line.skuId ?? null,
      description: line.description,
      qty_ordered: line.qtyOrdered,
      qty_allocated: 0,
      qty_shipped: 0,
      uom: line.uom ?? 'unit',
      unit_price: line.unitPrice,
      discount_pct: line.discountPct ?? null,
      tax_code: line.taxCode ?? null,
      created_by: user.id,
    }))

    const { error: insertLinesError } = await supabase
      .from('sales_order_lines')
      .insert(formatted)

    if (insertLinesError) {
      console.error('updateSalesOrder insert lines failed', insertLinesError)
      throw insertLinesError
    }
  }

  revalidatePath('/sales-orders')
  revalidatePath(`/sales-orders/${id}`)
  return id
}

export async function moveSalesOrderToStatus(id: string, status: 'draft' | 'confirmed' | 'picking' | 'shipped' | 'closed') {
  const { supabase, user } = await getClientWithUser()
  const timestampField: Record<typeof status, string> = {
    draft: 'reserved_at',
    confirmed: 'confirmed_at',
    picking: 'picking_started_at',
    shipped: 'shipped_at',
    closed: 'closed_at',
  }

  const stamp = status === 'draft' ? null : new Date().toISOString()
  const updates: Record<string, any> = { status }
  const field = timestampField[status]
  if (field) updates[field] = stamp

  const { error } = await supabase
    .from('sales_orders')
    .update(updates)
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('moveSalesOrderToStatus failed', error)
    throw error
  }

  revalidatePath('/sales-orders')
  revalidatePath(`/sales-orders/${id}`)
}
