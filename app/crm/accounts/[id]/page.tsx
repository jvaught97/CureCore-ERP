'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { AccountForm } from '@/app/crm/accounts/_components/AccountForm'
import { createClient } from '@/app/utils/supabase/client'
import { Loader2 } from 'lucide-react'

type AccountRecord = {
  id: string
  name: string
  website: string | null
  phone: string | null
  notes: string | null
}

export default function AccountDetailPage() {
  const params = useParams()
  const accountId = params?.id as string | undefined
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountRecord | null>(null)

  useEffect(() => {
    if (!accountId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_accounts')
          .select('id,name,website,phone,notes')
          .eq('id', accountId)
          .maybeSingle()
        if (error) {
          console.error('Failed to load account', error)
          if (isMounted) setAccount(null)
        } else if (isMounted) {
          setAccount(data as AccountRecord | null)
        }
      } catch (err) {
        console.error('Unexpected error loading account', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [accountId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : account ? (
          <>
            <header className="space-y-2">
              <button
                onClick={() => router.push('/crm/accounts')}
                className="text-sm font-medium text-[#174940] hover:underline"
              >
                Back to Accounts
              </button>
              <h1 className="text-3xl font-semibold text-gray-900">{account.name}</h1>
            </header>
            <AccountForm
              mode="edit"
              accountId={account.id}
              defaultValues={{
                name: account.name,
                website: account.website ?? undefined,
                phone: account.phone ?? undefined,
                notes: account.notes ?? undefined,
              }}
            />
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Account not found.
          </div>
        )}
      </main>
    </div>
  )
}
