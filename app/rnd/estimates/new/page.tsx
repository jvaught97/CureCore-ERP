'use client'

import { AppNav } from '@/components/nav/AppNav'
import EstimateForm from '@/app/rnd/estimates/_components/EstimateForm'

export default function NewEstimatePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="rnd" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        <header>
          <h1 className="text-3xl font-semibold text-gray-900">New Launch Estimation</h1>
          <p className="mt-2 text-sm text-gray-600">
            Analyze launch costs from raw materials to labor and pricing scenarios before moving to production.
          </p>
        </header>
        <EstimateForm mode="create" />
      </main>
    </div>
  )
}
