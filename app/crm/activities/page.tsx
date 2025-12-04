'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { AppNav } from '@/components/nav/AppNav'
import { Loader2, Plus } from 'lucide-react'

type ActivityRow = {
  id: string
  type: string | null
  subject: string | null
  due_at: string | null
  done: boolean | null
  account_name: string | null
  contact_name: string | null
}

export default function ActivitiesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('crm_activities')
          .select(
            `
              id,
              type,
              subject,
              due_at,
              done,
              crm_accounts!crm_activities_account_id_fkey(name),
              crm_contacts!crm_activities_contact_id_fkey(first_name,last_name)
            `,
          )
          .order('due_at', { ascending: true })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load activities', error)
          if (isMounted) setActivities([])
          return
        }

        if (isMounted) {
          const mapped =
            (data ?? []).map((row: any) => ({
              id: row.id,
              type: row.type,
              subject: row.subject,
              due_at: row.due_at,
              done: row.done,
              account_name: row.crm_accounts?.name ?? null,
              contact_name: row.crm_contacts
                ? `${row.crm_contacts.first_name ?? ''} ${row.crm_contacts.last_name ?? ''}`.trim()
                : null,
            })) ?? []
          setActivities(mapped)
        }
      } catch (err) {
        console.error('Unexpected error loading activities', err)
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
            <h1 className="text-3xl font-semibold text-gray-900">Activities</h1>
            <p className="text-sm text-gray-600">
              Log outreach and follow-ups to keep the team aligned on next steps.
            </p>
          </div>
          <button
            onClick={() => router.push('/crm/activities/new')}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Log Activity
          </button>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {activities.length === 0 && (
                <li className="px-6 py-6 text-sm text-gray-500 text-center">No activities yet.</li>
              )}
              {activities.map((activity) => (
                <li key={activity.id} className="px-6 py-4 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{activity.subject ?? 'Untitled'}</p>
                      <p className="text-xs text-gray-500">
                        {activity.type ?? 'Task'} •{' '}
                        {activity.account_name ?? 'Unassigned'}{' '}
                        {activity.contact_name ? `• ${activity.contact_name}` : ''}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {activity.due_at ? new Date(activity.due_at).toLocaleString() : 'No due date'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
