'use client'

import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { QuoteForm } from '@/app/crm/quotes/_components/QuoteForm'

export default function NewQuotePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900">New Quote</h1>
          <p className="text-sm text-gray-600">Build pricing proposals for customers.</p>
        </header>
        <QuoteForm
          mode="create"
          onCancel={() => {
            router.push('/crm?tab=quotes')
          }}
        />
      </main>
    </div>
  )
}
