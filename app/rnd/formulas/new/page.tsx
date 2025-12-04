'use client'

import { AppNav } from '@/components/nav/AppNav'
import RdFormulaForm from '@/app/rnd/formulas/_components/RdFormulaForm'

export default function NewRdFormulaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="rnd" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        <header>
          <h1 className="text-3xl font-semibold text-gray-900">New R&amp;D Formula</h1>
          <p className="mt-2 text-sm text-gray-600">
            Capture experimental formulas with flexible ingredient sourcing and packaging notes.
          </p>
        </header>

        <RdFormulaForm mode="create" />
      </main>
    </div>
  )
}
