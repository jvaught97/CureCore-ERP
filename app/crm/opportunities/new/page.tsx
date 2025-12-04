'use client'

import { AppNav } from '@/components/nav/AppNav'
import { OpportunityForm } from '@/app/crm/opportunities/_components/OpportunityForm'

export default function NewOpportunityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900">New Opportunity</h1>
          <p className="text-sm text-gray-600">Track revenue potential for key deals.</p>
        </header>
        <OpportunityForm mode="create" />
      </main>
    </div>
  )
}
