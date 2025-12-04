'use client'

import { useEffect, useState, FormEvent, useRef } from 'react'
import { Database, Download, Upload, Archive, Flag, AlertCircle } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  getDataAdminPrefs,
  saveDataAdminPrefs,
  getFeatureFlags,
  saveFeatureFlags,
  createSnapshot,
  downloadTemplate,
} from './actions'

const IMPORT_EXPORT_ENTITIES = [
  { key: 'ingredients', label: 'Ingredients', description: 'Ingredient master data' },
  { key: 'formulas', label: 'Formulas', description: 'Product formulations' },
  { key: 'customers', label: 'Customers', description: 'Customer contact information' },
  { key: 'vendors', label: 'Vendors', description: 'Vendor/supplier information' },
  { key: 'sales_orders', label: 'Sales Orders', description: 'Order history' },
]

const AVAILABLE_FEATURE_FLAGS = [
  {
    key: 'enable_batch_costing',
    label: 'Batch Costing',
    description: 'Enable detailed batch cost calculations',
  },
  {
    key: 'enable_advanced_formulations',
    label: 'Advanced Formulations',
    description: 'Multi-phase formulations with process parameters',
  },
  {
    key: 'enable_crm_module',
    label: 'CRM Module',
    description: 'Customer relationship management features',
  },
  {
    key: 'enable_warehouse_management',
    label: 'Warehouse Management',
    description: 'Advanced inventory location tracking',
  },
  {
    key: 'enable_quality_control',
    label: 'Quality Control',
    description: 'QC testing and COA generation',
  },
  {
    key: 'enable_api_access',
    label: 'API Access',
    description: 'REST API for third-party integrations',
  },
]

type DataAdminPrefs = {
  environment: string
  show_environment_banner: boolean
}

type FeatureFlagState = Record<string, boolean>

export default function DataAdminSettingsPage() {
  const [prefs, setPrefs] = useState<DataAdminPrefs>({
    environment: 'production',
    show_environment_banner: true,
  })
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagState>({})
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingFlags, setSavingFlags] = useState(false)
  const [creatingSnapshot, setCreatingSnapshot] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [prefsResult, flagsResult] = await Promise.all([
      getDataAdminPrefs(),
      getFeatureFlags(),
    ])

    if (prefsResult.success && prefsResult.data) {
      setPrefs(prefsResult.data)
    }

    if (flagsResult.success && flagsResult.data) {
      const flagMap: FeatureFlagState = {}
      flagsResult.data.forEach((f: any) => {
        flagMap[f.flag_key] = f.enabled
      })
      setFeatureFlags(flagMap)
    }

    setLoading(false)
  }

  async function handlePrefsSubmit(e: FormEvent) {
    e.preventDefault()
    setSavingPrefs(true)

    const result = await saveDataAdminPrefs(prefs)
    setSavingPrefs(false)

    if (result.success) {
      showToast('Data admin preferences saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save preferences', 'error')
    }
  }

  async function handleFlagsSubmit(e: FormEvent) {
    e.preventDefault()
    setSavingFlags(true)

    const flagArray = AVAILABLE_FEATURE_FLAGS.map((flag) => ({
      flag_key: flag.key,
      enabled: featureFlags[flag.key] || false,
      description: flag.description,
    }))

    const result = await saveFeatureFlags(flagArray)
    setSavingFlags(false)

    if (result.success) {
      showToast('Feature flags saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save feature flags', 'error')
    }
  }

  async function handleCreateSnapshot() {
    if (!confirm('Create a database snapshot? This may take a few minutes.')) return

    setCreatingSnapshot(true)
    const result = await createSnapshot()
    setCreatingSnapshot(false)

    if (result.success) {
      showToast(
        `Snapshot created: ${result.data?.snapshot_id} (Note: This is a stub implementation)`,
        'success'
      )
    } else {
      showToast('error' in result ? result.error : 'Failed to create snapshot', 'error')
    }
  }

  async function handleDownloadTemplate(entity: string) {
    const result = await downloadTemplate(entity)
    if (result.success) {
      showToast(
        `Template download initiated for ${entity} (Note: This is a stub implementation)`,
        'info'
      )
    } else {
      showToast('error' in result ? result.error : 'Failed to download template', 'error')
    }
  }

  function toggleFeatureFlag(key: string) {
    setFeatureFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Database className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Data Administration</h1>
        </div>
        <p className="text-sm text-gray-600">
          Import/export data, create backups, manage environment settings, and configure feature
          flags.
        </p>
      </header>

      {/* Import/Export */}
      <SettingsCard
        title="Import / Export"
        icon={Database}
        description="Download CSV/JSON templates and upload data. (Server handlers coming soon)"
      >
        <div className="space-y-3">
          {IMPORT_EXPORT_ENTITIES.map((entity) => (
            <div
              key={entity.key}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div>
                <h4 className="font-semibold text-gray-900">{entity.label}</h4>
                <p className="text-xs text-gray-500">{entity.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(entity.key)}
                  className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </button>
              </div>
            </div>
          ))}

          <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" />

          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  Import/Export handlers are stubbed
                </p>
                <p className="text-xs text-yellow-700">
                  Full CSV/JSON import and export functionality will be implemented in a future
                  update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Backups */}
      <SettingsCard
        title="Database Snapshots"
        icon={Archive}
        description="Create manual backups of your database. (RPC handler coming soon)"
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={creatingSnapshot}
            className="flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            {creatingSnapshot ? 'Creating Snapshot...' : 'Create Snapshot'}
          </button>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Snapshot functionality is stubbed
                </p>
                <p className="text-xs text-blue-700">
                  Actual snapshot creation via Supabase RPC or external service will be implemented
                  in a future update. Snapshots will include all tenant data with point-in-time
                  recovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Environment Settings */}
      <form onSubmit={handlePrefsSubmit} className="space-y-8">
        <SettingsCard
          title="Environment Settings"
          description="Configure environment indicator and display settings."
        >
          <div className="space-y-4">
            <SettingsFormField label="Environment" required>
              <select
                value={prefs.environment}
                onChange={(e) => setPrefs({ ...prefs, environment: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </SettingsFormField>

            <SettingsFormField label="Environment Banner">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.show_environment_banner}
                  onChange={(e) =>
                    setPrefs({ ...prefs, show_environment_banner: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">
                  Show environment indicator banner at top of app
                </span>
              </label>
            </SettingsFormField>

            {prefs.show_environment_banner && (
              <div
                className={`rounded-lg p-3 text-center text-sm font-semibold ${
                  prefs.environment === 'sandbox'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {prefs.environment === 'sandbox'
                  ? 'SANDBOX ENVIRONMENT - Test data only'
                  : 'PRODUCTION ENVIRONMENT'}
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={savingPrefs}>
          Save Environment Settings
        </SettingsSubmitButton>
      </form>

      {/* Feature Flags */}
      <form onSubmit={handleFlagsSubmit} className="space-y-8">
        <SettingsCard
          title="Feature Flags"
          icon={Flag}
          description="Enable or disable specific features across your organization."
        >
          <div className="space-y-3">
            {AVAILABLE_FEATURE_FLAGS.map((flag) => (
              <label
                key={flag.key}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={featureFlags[flag.key] || false}
                  onChange={() => toggleFeatureFlag(flag.key)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <div>
                  <div className="font-semibold text-gray-900">{flag.label}</div>
                  <div className="text-sm text-gray-600">{flag.description}</div>
                </div>
              </label>
            ))}
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={savingFlags}>Save Feature Flags</SettingsSubmitButton>
      </form>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
