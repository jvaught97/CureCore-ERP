'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Bell, Mail, MessageSquare, Webhook } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  getNotificationTriggers,
  saveNotificationTriggers,
} from './actions'

const NOTIFICATION_EVENTS = [
  { event: 'low_stock', label: 'Low Stock Alert', description: 'When inventory falls below reorder point' },
  { event: 'batch_complete', label: 'Batch Complete', description: 'When a manufacturing batch is completed' },
  { event: 'coa_ready', label: 'COA Ready', description: 'When a Certificate of Analysis is generated' },
  { event: 'lead_qualified', label: 'Lead Qualified', description: 'When a lead reaches qualified status' },
  { event: 'opportunity_stage_change', label: 'Opportunity Stage Change', description: 'When an opportunity moves to a new pipeline stage' },
]

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
]

type NotificationPrefs = {
  email_enabled: boolean
  email_smtp_host: string
  email_smtp_port: number
  email_smtp_user: string
  email_smtp_password: string
  email_from_address: string
  slack_webhook_url: string
  webhook_url: string
  webhook_secret: string
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  quiet_hours_timezone: string
}

type TriggerState = Record<string, boolean>

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_enabled: false,
    email_smtp_host: '',
    email_smtp_port: 587,
    email_smtp_user: '',
    email_smtp_password: '',
    email_from_address: '',
    slack_webhook_url: '',
    webhook_url: '',
    webhook_secret: '',
    quiet_hours_start: null,
    quiet_hours_end: null,
    quiet_hours_timezone: 'America/Los_Angeles',
  })
  const [triggers, setTriggers] = useState<TriggerState>({})
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingTriggers, setSavingTriggers] = useState(false)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [prefsResult, triggersResult] = await Promise.all([
      getNotificationPrefs(),
      getNotificationTriggers(),
    ])

    if (prefsResult.success && prefsResult.data) {
      setPrefs(prefsResult.data)
    }

    if (triggersResult.success && triggersResult.data) {
      const triggerMap: TriggerState = {}
      triggersResult.data.forEach((t: any) => {
        triggerMap[t.event] = t.enabled
      })
      setTriggers(triggerMap)
    }

    setLoading(false)
  }

  async function handlePrefsSubmit(e: FormEvent) {
    e.preventDefault()
    setSavingPrefs(true)

    const result = await saveNotificationPrefs(prefs)
    setSavingPrefs(false)

    if (result.success) {
      showToast('Notification preferences saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save preferences', 'error')
    }
  }

  async function handleTriggersSubmit(e: FormEvent) {
    e.preventDefault()
    setSavingTriggers(true)

    const triggerArray = NOTIFICATION_EVENTS.map((evt) => ({
      event: evt.event,
      enabled: triggers[evt.event] || false,
    }))

    const result = await saveNotificationTriggers(triggerArray)
    setSavingTriggers(false)

    if (result.success) {
      showToast('Notification triggers saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save triggers', 'error')
    }
  }

  function toggleTrigger(event: string) {
    setTriggers((prev) => ({ ...prev, [event]: !prev[event] }))
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Bell className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Notifications & Automations</h1>
        </div>
        <p className="text-sm text-gray-600">
          Configure notification channels, event triggers, and quiet hours.
        </p>
      </header>

      <form onSubmit={handlePrefsSubmit} className="space-y-8">
        {/* Email Channel */}
        <SettingsCard
          title="Email Notifications"
          icon={Mail}
          description="Configure SMTP settings for email notifications."
        >
          <div className="space-y-4">
            <SettingsFormField label="Enable Email Notifications">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.email_enabled}
                  onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Send notifications via email</span>
              </label>
            </SettingsFormField>

            {prefs.email_enabled && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsFormField label="SMTP Host" required>
                    <input
                      type="text"
                      value={prefs.email_smtp_host}
                      onChange={(e) => setPrefs({ ...prefs, email_smtp_host: e.target.value })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      placeholder="smtp.gmail.com"
                      required={prefs.email_enabled}
                    />
                  </SettingsFormField>

                  <SettingsFormField label="SMTP Port" required>
                    <input
                      type="number"
                      value={prefs.email_smtp_port}
                      onChange={(e) =>
                        setPrefs({ ...prefs, email_smtp_port: parseInt(e.target.value) || 587 })
                      }
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      placeholder="587"
                      required={prefs.email_enabled}
                    />
                  </SettingsFormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsFormField label="SMTP Username" required>
                    <input
                      type="text"
                      value={prefs.email_smtp_user}
                      onChange={(e) => setPrefs({ ...prefs, email_smtp_user: e.target.value })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      placeholder="your-email@example.com"
                      required={prefs.email_enabled}
                    />
                  </SettingsFormField>

                  <SettingsFormField label="SMTP Password" required>
                    <input
                      type="password"
                      value={prefs.email_smtp_password}
                      onChange={(e) => setPrefs({ ...prefs, email_smtp_password: e.target.value })}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      placeholder="••••••••"
                      required={prefs.email_enabled}
                    />
                  </SettingsFormField>
                </div>

                <SettingsFormField label="From Address" required>
                  <input
                    type="email"
                    value={prefs.email_from_address}
                    onChange={(e) => setPrefs({ ...prefs, email_from_address: e.target.value })}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    placeholder="notifications@yourcompany.com"
                    required={prefs.email_enabled}
                  />
                </SettingsFormField>
              </>
            )}
          </div>
        </SettingsCard>

        {/* Slack Channel */}
        <SettingsCard
          title="Slack Integration"
          icon={MessageSquare}
          description="Send notifications to a Slack channel via webhook."
        >
          <SettingsFormField
            label="Slack Webhook URL"
            hint="Create an incoming webhook in your Slack workspace"
          >
            <input
              type="url"
              value={prefs.slack_webhook_url}
              onChange={(e) => setPrefs({ ...prefs, slack_webhook_url: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="https://hooks.slack.com/services/..."
            />
          </SettingsFormField>
        </SettingsCard>

        {/* Generic Webhook */}
        <SettingsCard
          title="Generic Webhook"
          icon={Webhook}
          description="Send notifications to a custom webhook endpoint."
        >
          <div className="space-y-4">
            <SettingsFormField label="Webhook URL">
              <input
                type="url"
                value={prefs.webhook_url}
                onChange={(e) => setPrefs({ ...prefs, webhook_url: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="https://your-api.com/webhooks/notifications"
              />
            </SettingsFormField>

            <SettingsFormField
              label="Webhook Secret"
              hint="Secret key for authenticating webhook requests"
            >
              <input
                type="password"
                value={prefs.webhook_secret}
                onChange={(e) => setPrefs({ ...prefs, webhook_secret: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="••••••••"
              />
            </SettingsFormField>
          </div>
        </SettingsCard>

        {/* Quiet Hours */}
        <SettingsCard
          title="Quiet Hours"
          description="Suppress notifications during specific hours (e.g., nights and weekends)."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <SettingsFormField label="Start Time">
              <input
                type="time"
                value={prefs.quiet_hours_start || ''}
                onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value || null })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>

            <SettingsFormField label="End Time">
              <input
                type="time"
                value={prefs.quiet_hours_end || ''}
                onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value || null })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>

            <SettingsFormField label="Timezone">
              <select
                value={prefs.quiet_hours_timezone}
                onChange={(e) => setPrefs({ ...prefs, quiet_hours_timezone: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </SettingsFormField>
          </div>

          {prefs.quiet_hours_start && prefs.quiet_hours_end && (
            <p className="text-xs text-gray-500">
              Notifications will be suppressed from {prefs.quiet_hours_start} to{' '}
              {prefs.quiet_hours_end} ({prefs.quiet_hours_timezone})
            </p>
          )}
        </SettingsCard>

        <SettingsSubmitButton loading={savingPrefs}>
          Save Notification Preferences
        </SettingsSubmitButton>
      </form>

      {/* Event Triggers */}
      <form onSubmit={handleTriggersSubmit} className="space-y-8">
        <SettingsCard
          title="Event Triggers"
          description="Select which events should trigger notifications across all channels."
        >
          <div className="space-y-3">
            {NOTIFICATION_EVENTS.map((evt) => (
              <label
                key={evt.event}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={triggers[evt.event] || false}
                  onChange={() => toggleTrigger(evt.event)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <div>
                  <div className="font-semibold text-gray-900">{evt.label}</div>
                  <div className="text-sm text-gray-600">{evt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={savingTriggers}>
          Save Event Triggers
        </SettingsSubmitButton>
      </form>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
