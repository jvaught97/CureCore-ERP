'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { ContactForm } from '@/app/crm/contacts/_components/ContactForm'
import { Loader2 } from 'lucide-react'

type ContactRecord = {
  id: string
  account_id: string | null
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
}

export default function ContactDetailPage() {
  const params = useParams()
  const contactId = params?.id as string | undefined
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState<ContactRecord | null>(null)

  useEffect(() => {
    if (!contactId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_contacts')
          .select('id,account_id,first_name,last_name,email,phone,title')
          .eq('id', contactId)
          .maybeSingle()
        if (error) {
          console.error('Failed to load contact', error)
          if (isMounted) setContact(null)
        } else if (isMounted) {
          setContact(data as ContactRecord | null)
        }
      } catch (err) {
        console.error('Unexpected error loading contact', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [contactId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : contact ? (
          <>
            <header className="space-y-2">
              <button
                onClick={() => router.push('/crm/contacts')}
                className="text-sm font-medium text-[#174940] hover:underline"
              >
                Back to Contacts
              </button>
              <h1 className="text-3xl font-semibold text-gray-900">
                {contact.first_name} {contact.last_name ?? ''}
              </h1>
            </header>
            <ContactForm
              mode="edit"
              contactId={contact.id}
              defaultValues={{
                accountId: contact.account_id ?? undefined,
                firstName: contact.first_name,
                lastName: contact.last_name ?? undefined,
                email: contact.email ?? undefined,
                phone: contact.phone ?? undefined,
                title: contact.title ?? undefined,
              }}
            />
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Contact not found.
          </div>
        )}
      </main>
    </div>
  )
}
