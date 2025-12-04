'use client'

import { AppNav } from '@/components/nav/AppNav'
import { ShipmentForm } from '@/app/distribution/shipments/shipment-form'

export default function NewShipmentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="distribution" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        <ShipmentForm mode="create" />
      </main>
    </div>
  )
}
