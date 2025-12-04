'use client'

import { AppNav } from '@/components/nav/AppNav'
import { ContactForm } from '@/app/crm/contacts/_components/ContactForm'

export default function NewContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900">New Contact</h1>
          <p className="text-sm text-gray-600">Create a new person record for outreach and opportunity tracking.</p>
        </header>
        <ContactForm mode="create" />
      </main>
    </div>
  )
}
