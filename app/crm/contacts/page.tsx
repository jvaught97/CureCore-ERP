'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { Loader2, Plus } from 'lucide-react'

type ContactRow = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  account_name: string | null
}

export default function ContactsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<ContactRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_contacts')
          .select(
            `
              id,
              first_name,
              last_name,
              email,
              phone,
              account_id,
              crm_accounts (name)
            `,
          )
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load contacts', error)
          if (isMounted) setContacts([])
          return
        }
        if (isMounted) {
          const mapped =
            (data ?? []).map((row: any) => ({
              id: row.id,
              first_name: row.first_name,
              last_name: row.last_name,
              email: row.email,
              phone: row.phone,
              account_name: row.crm_accounts?.name ?? null,
            })) ?? []
          setContacts(mapped)
        }
      } catch (err) {
        console.error('Unexpected error loading contacts', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-600">
              Manage people across accounts to coordinate outreach and follow-ups.
            </p>
          </div>
          <button
            onClick={() => router.push('/crm/contacts/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Contact
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Contact List</h2>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No contacts yet.
                      </td>
                    </tr>
                  )}
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {contact.first_name} {contact.last_name ?? ''}
                      </td>
                      <td className="px-4 py-3">{contact.account_name ?? '—'}</td>
                      <td className="px-4 py-3">{contact.email ?? '—'}</td>
                      <td className="px-4 py-3">{contact.phone ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
