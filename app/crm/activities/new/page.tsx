'use client'

import { AppNav } from '@/components/nav/AppNav'
import { ActivityForm } from '@/app/crm/activities/_components/ActivityForm'

export default function NewActivityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900">Log Activity</h1>
          <p className="text-sm text-gray-600">Record outreach or follow-ups for this account/contact.</p>
        </header>
        <ActivityForm />
      </main>
    </div>
  )
}
