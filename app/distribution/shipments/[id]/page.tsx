'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { ShipmentForm } from '@/app/distribution/shipments/shipment-form'
import { Loader2 } from 'lucide-react'

type ShipmentRecord = {
  id: string
  warehouse_id: string | null
  sales_order_id: string | null
  carrier: string | null
  service: string | null
  ship_date: string | null
  tracking_number: string | null
  notes: string | null
  status: string | null
}

type ShipmentLineRecord = {
  sales_order_line_id: string | null
  qty: number | null
  uom: string | null
}

export default function ShipmentDetailPage() {
  const params = useParams()
  const shipmentId = params?.id as string | undefined
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState<ShipmentRecord | null>(null)
  const [lines, setLines] = useState<ShipmentLineRecord[]>([])

  useEffect(() => {
    if (!shipmentId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: shipment, error: shipmentError }, { data: lineItems, error: linesError }] = await Promise.all([
          supabase
            .from('shipments')
            .select('id,warehouse_id,sales_order_id,carrier,service,ship_date,tracking_number,notes,status')
            .eq('id', shipmentId)
            .maybeSingle(),
          supabase
            .from('shipment_lines')
            .select('sales_order_line_id,qty,uom')
            .eq('shipment_id', shipmentId),
        ])

        if (shipmentError) {
          console.error('Failed to load shipment', shipmentError)
          if (isMounted) setRecord(null)
        } else if (isMounted) {
          setRecord(shipment as ShipmentRecord | null)
        }

        if (linesError) {
          console.error('Failed to load shipment lines', linesError)
          if (isMounted) setLines([])
        } else if (isMounted) {
          setLines((lineItems as ShipmentLineRecord[]) ?? [])
        }
      } catch (err) {
        console.error('Unexpected error loading shipment', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [shipmentId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="distribution" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : record ? (
          <ShipmentForm
            mode="edit"
            shipmentId={record.id}
            initialState={{
              warehouseId: record.warehouse_id ?? undefined,
              salesOrderId: record.sales_order_id ?? undefined,
              carrier: record.carrier ?? undefined,
              service: record.service ?? undefined,
              shipDate: record.ship_date ?? undefined,
              trackingNumber: record.tracking_number ?? undefined,
              notes: record.notes ?? undefined,
              status: record.status ?? undefined,
              lines,
            }}
          />
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Shipment not found.
          </div>
        )}
      </main>
    </div>
  )
}
