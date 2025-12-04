'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { OpportunityForm } from '@/app/crm/opportunities/_components/OpportunityForm'
import {
  Loader2,
  Phone,
  Mail,
  MessageSquare,
  CalendarClock,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react'

type OpportunityRecord = {
  id: string
  account_id: string | null
  name: string
  value_amount: number | null
  value_currency: string | null
  stage: string | null
  close_date: string | null
  probability_pct: number | null
}

type ActivityRecord = {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task'
  subject: string | null
  body: string | null
  due_at: string | null
  done: boolean | null
  created_at: string | null
}

const ACTIVITY_TYPES: Array<{ value: ActivityRecord['type']; label: string }> = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task / Other' },
]

const ActivityIcon = ({ type }: { type: ActivityRecord['type'] }) => {
  const common = 'h-4 w-4'
  switch (type) {
    case 'call':
      return <Phone className={common} />
    case 'email':
      return <Mail className={common} />
    case 'meeting':
      return <MessageSquare className={common} />
    default:
      return <CalendarClock className={common} />
  }
}

export default function OpportunityDetailPage() {
  const params = useParams()
  const opportunityId = params?.id as string | undefined
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const bypassMode = useMemo(
    () => (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true',
    [],
  )
  const [loading, setLoading] = useState(true)
  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [savingActivity, setSavingActivity] = useState(false)
  const [activityForm, setActivityForm] = useState({
    type: 'call' as ActivityRecord['type'],
    subject: '',
    notes: '',
    recontactAt: '',
    markDone: false,
  })

  useEffect(() => {
    if (!opportunityId) return
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        if (bypassMode) {
          if (!isMounted) return
          setOpportunity({
            id: opportunityId ?? 'demo-opp',
            account_id: 'acct-demo-1',
            name: 'Calm Collective – Refill Program',
            value_amount: 185000,
            value_currency: 'USD',
            stage: 'Proposal',
            close_date: new Date(Date.now() + 14 * 86400000).toISOString(),
            probability_pct: 60,
          })
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('crm_opportunities')
          .select('id,account_id,name,value_amount,value_currency,stage,close_date,probability_pct')
          .eq('id', opportunityId)
          .maybeSingle()
        if (error) {
          console.error('Failed to load opportunity', error)
          if (isMounted) setOpportunity(null)
        } else if (isMounted) {
          setOpportunity(data as OpportunityRecord | null)
        }
      } catch (err) {
        console.error('Unexpected error loading opportunity', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    const loadActivities = async () => {
      if (!opportunityId) return
      setActivitiesLoading(true)
      try {
        if (bypassMode) {
          if (!isMounted) return
          setActivities([
            {
              id: 'demo-activity-1',
              type: 'call',
              subject: 'Review costed proposal',
              body: 'Walk through costing deltas.',
              due_at: new Date().toISOString(),
              done: false,
              created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
            },
          ])
          setActivitiesLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('crm_activities')
          .select('id,type,subject,body,due_at,done,created_at')
          .eq('opp_id', opportunityId)
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Failed to load activities', error)
          if (isMounted) setActivities([])
        } else if (isMounted) {
          setActivities((data as ActivityRecord[]) ?? [])
        }
      } catch (err) {
        console.error('Unexpected error loading activities', err)
      } finally {
        if (isMounted) setActivitiesLoading(false)
      }
    }
    loadActivities()
    return () => {
      isMounted = false
    }
  }, [bypassMode, opportunityId, supabase])

  const refreshActivities = async () => {
    if (!opportunityId) return
    try {
      if (bypassMode) return
      const { data, error } = await supabase
        .from('crm_activities')
        .select('id,type,subject,body,due_at,done,created_at')
        .eq('opp_id', opportunityId)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Failed to refresh activities', error)
      } else {
        setActivities((data as ActivityRecord[]) ?? [])
      }
    } catch (err) {
      console.error('Unexpected error refreshing activities', err)
    }
  }

  const handleAddActivity = async () => {
    if (!opportunityId) return
    if (!activityForm.subject.trim() && !activityForm.notes.trim()) {
      alert('Add at least a subject or some notes for the interaction.')
      return
    }
    setSavingActivity(true)
    try {
      if (bypassMode) {
        setActivityForm({
          type: 'call',
          subject: '',
          notes: '',
          recontactAt: '',
          markDone: false,
        })
        await refreshActivities()
        return
      }
      const { error } = await supabase
        .from('crm_activities')
        .insert({
          opp_id: opportunityId,
          type: activityForm.type,
          subject: activityForm.subject.trim() || `${activityForm.type} update`,
          body: activityForm.notes.trim() || null,
          due_at: activityForm.recontactAt ? new Date(activityForm.recontactAt).toISOString() : null,
          done: activityForm.markDone,
        })

      if (error) {
        console.error('Failed to log activity', error)
        alert('Failed to log interaction. Please try again.')
        return
      }

      setActivityForm({
        type: 'call',
        subject: '',
        notes: '',
        recontactAt: '',
        markDone: false,
      })
      await refreshActivities()
    } catch (err) {
      console.error('Unexpected error logging activity', err)
      alert('Unexpected error logging activity.')
    } finally {
      setSavingActivity(false)
    }
  }

  const handleToggleActivityDone = async (activity: ActivityRecord) => {
    try {
      if (bypassMode) {
        setActivities((prev) =>
          prev.map((item) =>
            item.id === activity.id ? { ...item, done: !item.done } : item
          ),
        )
        return
      }
      const nextDone = !activity.done
      setActivities((prev) =>
        prev.map((item) =>
          item.id === activity.id ? { ...item, done: nextDone } : item
        )
      )
      const { error } = await supabase
        .from('crm_activities')
        .update({ done: nextDone })
        .eq('id', activity.id)
      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Failed to update activity status', err)
      alert('Failed to update activity status.')
      refreshActivities()
    }
  }

  const handleDeleteActivity = async (activity: ActivityRecord) => {
    if (!confirm('Delete this interaction log?')) return
    try {
      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', activity.id)
      if (error) throw error
      setActivities((prev) => prev.filter((item) => item.id !== activity.id))
    } catch (err) {
      console.error('Failed to delete activity', err)
      alert('Failed to delete activity.')
    }
  }

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="crm" />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : opportunity ? (
          <>
            <header className="space-y-2">
              <button
                onClick={() => router.push('/crm?tab=opportunities')}
                className="text-sm font-medium text-[#174940] hover:underline"
              >
                Back to Opportunities
              </button>
              <h1 className="text-3xl font-semibold text-gray-900">{opportunity.name}</h1>
            </header>
            <OpportunityForm
              mode="edit"
              opportunityId={opportunity.id}
              defaultValues={{
                accountId: opportunity.account_id ?? undefined,
                name: opportunity.name,
                valueAmount: opportunity.value_amount != null ? String(opportunity.value_amount) : '',
                valueCurrency: opportunity.value_currency ?? undefined,
                stage: opportunity.stage ?? undefined,
                closeDate: opportunity.close_date ?? undefined,
                probabilityPct: opportunity.probability_pct != null ? String(opportunity.probability_pct) : '',
              }}
            />
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <header className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Relationship Log</h2>
                  <p className="text-sm text-gray-500">
                    Track every touchpoint and schedule follow-ups so nothing slips through the cracks.
                  </p>
                </div>
              </header>
              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    <Plus className="h-4 w-4" />
                    Log New Interaction
                  </h3>
                  <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-gray-600">
                        Interaction Type
                        <select
                          value={activityForm.type}
                          onChange={(event) =>
                            setActivityForm((prev) => ({
                              ...prev,
                              type: event.target.value as ActivityRecord['type'],
                            }))
                          }
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        >
                          {ACTIVITY_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-gray-600">
                        Recontact Date & Time
                        <input
                          type="datetime-local"
                          value={activityForm.recontactAt}
                          onChange={(event) =>
                            setActivityForm((prev) => ({
                              ...prev,
                              recontactAt: event.target.value,
                            }))
                          }
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Subject / Summary
                      <input
                        type="text"
                        value={activityForm.subject}
                        onChange={(event) =>
                          setActivityForm((prev) => ({
                            ...prev,
                            subject: event.target.value,
                          }))
                        }
                        placeholder="e.g. Intro call with buyer"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-600">
                      Notes
                      <textarea
                        value={activityForm.notes}
                        onChange={(event) =>
                          setActivityForm((prev) => ({
                            ...prev,
                            notes: event.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="What did you discuss? Any next steps?"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={activityForm.markDone}
                        onChange={(event) =>
                          setActivityForm((prev) => ({
                            ...prev,
                            markDone: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                      />
                      Mark this interaction as completed
                    </label>
                    <button
                      type="button"
                      onClick={handleAddActivity}
                      disabled={savingActivity}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c] disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {savingActivity && <Loader2 className="h-4 w-4 animate-spin" />}
                      Log Interaction
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Interaction History
                    </h3>
                    <button
                      type="button"
                      onClick={refreshActivities}
                      className="text-xs font-medium text-[#174940] hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                  {activitiesLoading ? (
                    <div className="flex h-24 items-center justify-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                      No touchpoints logged yet. Use the form to document your outreach.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#174940]/10 text-[#174940]">
                                <ActivityIcon type={activity.type} />
                              </span>
                              <div className="flex flex-col">
                                <span className="capitalize">
                                  {activity.type}{' '}
                                  {activity.done ? (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Completed
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Logged {formatDateTime(activity.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleActivityDone(activity)}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                              >
                                {activity.done ? 'Mark Open' : 'Mark Done'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(activity)}
                                className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-gray-700">
                            <strong className="text-gray-900">
                              {activity.subject || 'Untitled interaction'}
                            </strong>
                            {activity.body ? (
                              <p className="mt-1 whitespace-pre-wrap text-gray-600">{activity.body}</p>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                            <div className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              <span>
                                Recontact:{' '}
                                {activity.due_at
                                  ? formatDateTime(activity.due_at)
                                  : 'Not scheduled'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Opportunity not found.
          </div>
        )}
      </main>
    </div>
  )
}
