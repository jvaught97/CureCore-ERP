'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { Loader2, Plus } from 'lucide-react'

type AccountRow = {
  id: string
  name: string
  website: string | null
  phone: string | null
  created_at: string | null
}

export default function AccountsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_accounts')
          .select('id,name,website,phone,created_at')
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load accounts', error)
          if (isMounted) setAccounts([])
          return
        }
        if (isMounted) setAccounts(data ?? [])
      } catch (err) {
        console.error('Unexpected error loading accounts', err)
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
            <h1 className="text-3xl font-semibold text-gray-900">Accounts</h1>
            <p className="text-sm text-gray-600">
              Manage company records and link contacts, opportunities, and activities.
            </p>
          </div>
          <button
            onClick={() => router.push('/crm/accounts/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Account
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Account List</h2>
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
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Website</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No accounts yet.
                      </td>
                    </tr>
                  )}
                  {accounts.map((acct) => (
                    <tr
                      key={acct.id}
                      className="cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => router.push(`/crm/accounts/${acct.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{acct.name}</td>
                      <td className="px-4 py-3">{acct.website ?? '—'}</td>
                      <td className="px-4 py-3">{acct.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {acct.created_at ? new Date(acct.created_at).toLocaleDateString() : '—'}
                      </td>
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
