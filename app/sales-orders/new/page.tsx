'use client'

import { AppNav } from '@/components/nav/AppNav'
import { SalesOrderForm } from '@/app/sales-orders/_components/SalesOrderForm'

export default function NewSalesOrderPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="sales-orders" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        <SalesOrderForm mode="create" />
      </main>
    </div>
  )
}
