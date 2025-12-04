'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Plug, Database, BarChart3, AlertTriangle, Truck, Calculator } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { getIntegrationPrefs, saveIntegrationPrefs, getStorageBuckets } from './actions'

type IntegrationPrefs = {
  posthog_api_key: string
  google_analytics_id: string
  sentry_dsn: string
  enable_fedex: boolean
  enable_ups: boolean
  enable_usps: boolean
  enable_avalara_tax: boolean
  enable_taxjar: boolean
}

type StorageBucket = {
  id: string
  name: string
  public: boolean
  created_at: string
}

export default function IntegrationsSettingsPage() {
  const [prefs, setPrefs] = useState<IntegrationPrefs>({
    posthog_api_key: '',
    google_analytics_id: '',
    sentry_dsn: '',
    enable_fedex: false,
    enable_ups: false,
    enable_usps: false,
    enable_avalara_tax: false,
    enable_taxjar: false,
  })
  const [buckets, setBuckets] = useState<StorageBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [prefsResult, bucketsResult] = await Promise.all([
      getIntegrationPrefs(),
      getStorageBuckets(),
    ])

    if (prefsResult.success && prefsResult.data) {
      setPrefs(prefsResult.data)
    }

    if (bucketsResult.success && bucketsResult.data) {
      setBuckets(bucketsResult.data)
    }

    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await saveIntegrationPrefs(prefs)
    setSaving(false)

    if (result.success) {
      showToast('Integration preferences saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save preferences', 'error')
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Plug className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Integrations</h1>
        </div>
        <p className="text-sm text-gray-600">
          Manage third-party integrations, storage, analytics, and shipping providers.
        </p>
      </header>

      {/* Storage Buckets (Read-only) */}
      <SettingsCard
        title="Supabase Storage Buckets"
        icon={Database}
        description="View configured storage buckets. Manage buckets in your Supabase dashboard."
      >
        {buckets.length === 0 ? (
          <p className="text-sm text-gray-500">No storage buckets configured.</p>
        ) : (
          <div className="space-y-2">
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{bucket.name}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        bucket.public
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {bucket.public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    ID: {bucket.id} • Created: {new Date(bucket.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-gray-500">
          To add or modify buckets, visit your Supabase project dashboard.
        </p>
      </SettingsCard>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Analytics */}
        <SettingsCard
          title="Analytics & Monitoring"
          icon={BarChart3}
          description="Configure analytics and error tracking integrations."
        >
          <div className="space-y-4">
            <SettingsFormField
              label="PostHog API Key"
              hint="Product analytics and feature flags"
            >
              <input
                type="text"
                value={prefs.posthog_api_key}
                onChange={(e) => setPrefs({ ...prefs, posthog_api_key: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="phc_..."
              />
            </SettingsFormField>

            <SettingsFormField
              label="Google Analytics ID"
              hint="Google Analytics tracking ID (GA4)"
            >
              <input
                type="text"
                value={prefs.google_analytics_id}
                onChange={(e) => setPrefs({ ...prefs, google_analytics_id: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="G-XXXXXXXXXX"
              />
            </SettingsFormField>

            <SettingsFormField label="Sentry DSN" hint="Error tracking and performance monitoring">
              <input
                type="text"
                value={prefs.sentry_dsn}
                onChange={(e) => setPrefs({ ...prefs, sentry_dsn: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="https://...@sentry.io/..."
              />
            </SettingsFormField>
          </div>
        </SettingsCard>

        {/* Shipping Carriers */}
        <SettingsCard
          title="Shipping Carriers"
          icon={Truck}
          description="Enable shipping carrier integrations. (API configuration coming soon)"
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={prefs.enable_fedex}
                onChange={(e) => setPrefs({ ...prefs, enable_fedex: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <div>
                <span className="font-semibold text-gray-900">FedEx</span>
                <p className="text-xs text-gray-500">Shipping rates and label printing</p>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={prefs.enable_ups}
                onChange={(e) => setPrefs({ ...prefs, enable_ups: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <div>
                <span className="font-semibold text-gray-900">UPS</span>
                <p className="text-xs text-gray-500">Shipping rates and tracking</p>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={prefs.enable_usps}
                onChange={(e) => setPrefs({ ...prefs, enable_usps: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <div>
                <span className="font-semibold text-gray-900">USPS</span>
                <p className="text-xs text-gray-500">Postal service rates and tracking</p>
              </div>
            </label>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            API credentials configuration will be available in a future update.
          </p>
        </SettingsCard>

        {/* Tax Engines */}
        <SettingsCard
          title="Tax Calculation Engines"
          icon={Calculator}
          description="Enable automated sales tax calculation. (API configuration coming soon)"
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={prefs.enable_avalara_tax}
                onChange={(e) => setPrefs({ ...prefs, enable_avalara_tax: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <div>
                <span className="font-semibold text-gray-900">Avalara</span>
                <p className="text-xs text-gray-500">
                  Automated sales tax calculation and compliance
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={prefs.enable_taxjar}
                onChange={(e) => setPrefs({ ...prefs, enable_taxjar: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <div>
                <span className="font-semibold text-gray-900">TaxJar</span>
                <p className="text-xs text-gray-500">Sales tax API and reporting</p>
              </div>
            </label>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            API credentials configuration will be available in a future update.
          </p>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save Integration Settings</SettingsSubmitButton>
      </form>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
