'use client'

import { AppNav } from '@/components/nav/AppNav'
import { LeadForm } from '@/app/crm/leads/_components/LeadForm'

export default function NewLeadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900">New Lead</h1>
          <p className="text-sm text-gray-600">Capture inbound interest for follow-up and conversion.</p>
        </header>
        <LeadForm mode="create" />
      </main>
    </div>
  )
}
