'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/utils/supabase/server'

export type ShipmentLineInput = {
  salesOrderLineId?: string
  qty: number
  uom: string
}

export type ShipmentPayload = {
  warehouseId?: string
  salesOrderId?: string
  carrier?: string
  service?: string
  shipDate?: string
  trackingNumber?: string
  notes?: string
  status?: string
  lines: ShipmentLineInput[]
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

export async function createShipment(payload: ShipmentPayload) {
  const { supabase, user } = await getClientWithUser()
  const { data: shipment, error } = await supabase
    .from('shipments')
    .insert({
      warehouse_id: payload.warehouseId ?? null,
      sales_order_id: payload.salesOrderId ?? null,
      carrier: payload.carrier ?? null,
      service: payload.service ?? null,
      ship_date: payload.shipDate ?? null,
      tracking_number: payload.trackingNumber ?? null,
      notes: payload.notes ?? null,
      status: payload.status ?? 'draft',
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !shipment) {
    console.error('createShipment failed', error)
    throw error ?? new Error('Failed to create shipment')
  }

  if (payload.lines.length) {
    const formatted = payload.lines.map((line) => ({
      shipment_id: shipment.id,
      sales_order_line_id: line.salesOrderLineId ?? null,
      qty: line.qty,
      uom: line.uom,
      created_by: user.id,
    }))
    const { error: linesError } = await supabase.from('shipment_lines').insert(formatted)
    if (linesError) {
      console.error('createShipment lines failed', linesError)
      throw linesError
    }
  }

  revalidatePath('/distribution')
  revalidatePath(`/distribution/shipments/${shipment.id}`)
  return shipment.id as string
}

export async function updateShipment(id: string, payload: ShipmentPayload) {
  const { supabase, user } = await getClientWithUser()
  const { error } = await supabase
    .from('shipments')
    .update({
      warehouse_id: payload.warehouseId ?? null,
      sales_order_id: payload.salesOrderId ?? null,
      carrier: payload.carrier ?? null,
      service: payload.service ?? null,
      ship_date: payload.shipDate ?? null,
      tracking_number: payload.trackingNumber ?? null,
      notes: payload.notes ?? null,
      status: payload.status ?? 'draft',
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    console.error('updateShipment failed', error)
    throw error
  }

  const { error: deleteLinesError } = await supabase
    .from('shipment_lines')
    .delete()
    .eq('shipment_id', id)
    .eq('created_by', user.id)

  if (deleteLinesError) {
    console.error('updateShipment delete lines failed', deleteLinesError)
    throw deleteLinesError
  }

  if (payload.lines.length) {
    const formatted = payload.lines.map((line) => ({
      shipment_id: id,
      sales_order_line_id: line.salesOrderLineId ?? null,
      qty: line.qty,
      uom: line.uom,
      created_by: user.id,
    }))
    const { error: insertLinesError } = await supabase
      .from('shipment_lines')
      .insert(formatted)
    if (insertLinesError) {
      console.error('updateShipment insert lines failed', insertLinesError)
      throw insertLinesError
    }
  }

  revalidatePath('/distribution')
  revalidatePath(`/distribution/shipments/${id}`)
}
