'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createShipment, updateShipment, type ShipmentPayload } from '@/app/distribution/shipments/actions'
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export type ShipmentFormProps = {
  mode: 'create' | 'edit'
  shipmentId?: string
  initialState?: ShipmentPayload & { status?: string }
}

type LineRow = {
  id: string
  salesOrderLineId?: string
  qty: string
  uom: string
}

export function ShipmentForm({ mode, shipmentId, initialState }: ShipmentFormProps) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const [warehouseId, setWarehouseId] = useState(initialState?.warehouseId ?? '')
  const [salesOrderId, setSalesOrderId] = useState(initialState?.salesOrderId ?? '')
  const [carrier, setCarrier] = useState(initialState?.carrier ?? '')
  const [service, setService] = useState(initialState?.service ?? '')
  const [shipDate, setShipDate] = useState(initialState?.shipDate ?? '')
  const [trackingNumber, setTrackingNumber] = useState(initialState?.trackingNumber ?? '')
  const [notes, setNotes] = useState(initialState?.notes ?? '')
  const [status, setStatus] = useState(initialState?.status ?? 'draft')
  const [lines, setLines] = useState<LineRow[]>(() =>
    (initialState?.lines ?? []).map((line, idx) => ({
      id: `line-${idx}`,
      salesOrderLineId: line.salesOrderLineId,
      qty: line.qty != null ? String(line.qty) : '',
      uom: line.uom ?? 'unit',
    }))
  )

  const emptyLine = (): LineRow => ({ id: uuidv4(), qty: '', uom: 'unit' })

  const handleAddLine = () => setLines((prev) => [...prev, emptyLine()])
  const handleRemoveLine = (id: string) => setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== id) : prev))
  const handleLineChange = (id: string, field: keyof LineRow, value: string) =>
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)))

  const buildPayload = (): ShipmentPayload => ({
    warehouseId: warehouseId || undefined,
    salesOrderId: salesOrderId || undefined,
    carrier: carrier || undefined,
    service: service || undefined,
    shipDate: shipDate || undefined,
    trackingNumber: trackingNumber || undefined,
    notes: notes || undefined,
    status,
    lines: lines
      .filter((line) => line.qty && Number(line.qty) > 0)
      .map((line) => ({
        salesOrderLineId: line.salesOrderLineId,
        qty: Number(line.qty),
        uom: line.uom || 'unit',
      })),
  })

  const handleSubmit = () => {
    setMessage(null)
    const payload = buildPayload()
    if (!payload.warehouseId) {
      setMessage('Select a warehouse for the shipment.')
      return
    }
    if (!payload.lines.length) {
      setMessage('Add at least one line item with quantity.')
      return
    }

    startSaving(async () => {
      try {
        if (mode === 'edit' && shipmentId) {
          await updateShipment(shipmentId, payload)
          router.push(`/distribution/shipments/${shipmentId}`)
        } else {
          const id = await createShipment(payload)
          router.push(`/distribution/shipments/${id}`)
        }
      } catch (err) {
        console.error('Failed to save shipment', err)
        setMessage('Failed to save shipment. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <button
          onClick={() => router.push('/distribution')}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#174940] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shipments
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-gray-900">
            {mode === 'edit' ? `Shipment ${shipmentId?.slice(0, 8)}` : 'New Shipment'}
          </h1>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm capitalize text-gray-900"
          >
            {['draft', 'planned', 'picking', 'packed', 'in_transit', 'delivered', 'closed'].map((state) => (
              <option key={state} value={state}>
                {state.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </header>

      {message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Shipment Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Warehouse ID
            <input
              type="text"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Warehouse ID"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Sales Order ID
            <input
              type="text"
              value={salesOrderId}
              onChange={(event) => setSalesOrderId(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Sales Order ID"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Carrier
            <input
              type="text"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Service
            <input
              type="text"
              value={service}
              onChange={(event) => setService(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Ship Date
            <input
              type="date"
              value={shipDate}
              onChange={(event) => setShipDate(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Tracking Number
            <input
              type="text"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1 text-sm text-gray-600">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Lines</h2>
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-semibold text-[#174940] hover:bg-[#174940]/5"
          >
            <Plus className="h-4 w-4" />
            Add Line
          </button>
        </div>
        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex justify-between">
                <label className="flex-1 text-sm text-gray-600">
                  Sales Order Line ID
                  <input
                    type="text"
                    value={line.salesOrderLineId ?? ''}
                    onChange={(event) => handleLineChange(line.id, 'salesOrderLineId', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveLine(line.id)}
                  className="ml-2 inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-600">
                <label className="flex flex-col gap-1">
                  Quantity
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(event) => handleLineChange(line.id, 'qty', event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  UOM
                  <input
                    type="text"
                    value={line.uom}
                    onChange={(event) => handleLineChange(line.id, 'uom', event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Shipment' : 'Create Shipment'}
        </button>
      </div>
    </div>
  )
}
