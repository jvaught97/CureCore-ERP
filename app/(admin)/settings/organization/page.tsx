'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Building2, Globe, Calendar } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { getOrgSettings, saveOrgSettings } from './actions'
import type { OrgSettingsInput } from '@/lib/validation/settings'

type OrgFormState = OrgSettingsInput & {
  address_line1?: string
  address_line2?: string
  address_city?: string
  address_state?: string
  address_postal?: string
  address_country?: string
}

const DEFAULT_STATE: OrgFormState = {
  company_name: '',
  dba: '',
  legal_entity: '',
  ein: '',
  website: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  address_city: '',
  address_state: '',
  address_postal: '',
  address_country: 'USA',
  fiscal_year_start: '',
  default_currency: 'USD',
  default_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  batches_prefix: 'CURE-{YYYY}{MM}-###',
  coas_prefix: 'COA-{BATCH}-{SEQ}',
  invoices_prefix: 'INV-{FY}-####',
  pos_prefix: 'PO-{YYYY}-####',
  primary_color: '#174940',
  secondary_color: '',
  dark_mode: false,
}

export default function OrganizationSettingsPage() {
  const [form, setForm] = useState<OrgFormState>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const result = await getOrgSettings()
    if (result.success && result.data) {
      const addr = result.data.address as any
      setForm({
        company_name: result.data.company_name || '',
        dba: result.data.dba || '',
        legal_entity: result.data.legal_entity || '',
        ein: result.data.ein || '',
        website: result.data.website || '',
        phone: result.data.phone || '',
        address_line1: addr?.line1 || '',
        address_line2: addr?.line2 || '',
        address_city: addr?.city || '',
        address_state: addr?.state || '',
        address_postal: addr?.postal || '',
        address_country: addr?.country || 'USA',
        fiscal_year_start: result.data.fiscal_year_start || '',
        default_currency: result.data.default_currency || 'USD',
        default_timezone: result.data.default_timezone || DEFAULT_STATE.default_timezone,
        batches_prefix: result.data.batches_prefix || DEFAULT_STATE.batches_prefix,
        coas_prefix: result.data.coas_prefix || DEFAULT_STATE.coas_prefix,
        invoices_prefix: result.data.invoices_prefix || DEFAULT_STATE.invoices_prefix,
        pos_prefix: result.data.pos_prefix || DEFAULT_STATE.pos_prefix,
        primary_color: result.data.primary_color || '#174940',
        secondary_color: result.data.secondary_color || '',
        dark_mode: result.data.dark_mode || false,
      })
    }
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const payload: OrgSettingsInput = {
      company_name: form.company_name,
      dba: form.dba,
      legal_entity: form.legal_entity,
      ein: form.ein,
      website: form.website,
      phone: form.phone,
      address: {
        line1: form.address_line1,
        line2: form.address_line2,
        city: form.address_city,
        state: form.address_state,
        postal: form.address_postal,
        country: form.address_country,
      },
      fiscal_year_start: form.fiscal_year_start,
      default_currency: form.default_currency,
      default_timezone: form.default_timezone,
      batches_prefix: form.batches_prefix,
      coas_prefix: form.coas_prefix,
      invoices_prefix: form.invoices_prefix,
      pos_prefix: form.pos_prefix,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      dark_mode: form.dark_mode,
    }

    const result = await saveOrgSettings(payload)
    setSaving(false)

    if (result.success) {
      showToast('Organization settings saved successfully', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save settings', 'error')
    }
  }

  const generatePreview = (template: string) => {
    const now = new Date()
    return template
      .replace('{YYYY}', now.getFullYear().toString())
      .replace('{MM}', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('{FY}', now.getFullYear().toString().slice(-2))
      .replace('{BATCH}', 'CURE-202501-001')
      .replace('{SEQ}', '001')
      .replace(/###/g, '001')
      .replace(/####/g, '0001')
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Building2 className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Organization</h1>
        </div>
        <p className="text-sm text-gray-600">
          Configure your company details, localization, and numbering schemes.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Details */}
        <SettingsCard title="Company Details" icon={Building2}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsFormField label="Company Name" required>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              />
            </SettingsFormField>
            <SettingsFormField label="DBA (Doing Business As)">
              <input
                type="text"
                value={form.dba}
                onChange={(e) => setForm({ ...form, dba: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Legal Entity">
              <input
                type="text"
                value={form.legal_entity}
                onChange={(e) => setForm({ ...form, legal_entity: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="EIN (Tax ID)">
              <input
                type="text"
                value={form.ein}
                onChange={(e) => setForm({ ...form, ein: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Website">
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="https://example.com"
              />
            </SettingsFormField>
            <SettingsFormField label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="+1 (555) 123-4567"
              />
            </SettingsFormField>
          </div>
          <div className="grid gap-4">
            <SettingsFormField label="Address Line 1">
              <input
                type="text"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Address Line 2">
              <input
                type="text"
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <SettingsFormField label="City">
                <input
                  type="text"
                  value={form.address_city}
                  onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </SettingsFormField>
              <SettingsFormField label="State">
                <input
                  type="text"
                  value={form.address_state}
                  onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </SettingsFormField>
              <SettingsFormField label="Postal Code">
                <input
                  type="text"
                  value={form.address_postal}
                  onChange={(e) => setForm({ ...form, address_postal: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </SettingsFormField>
            </div>
          </div>
        </SettingsCard>

        {/* Localization */}
        <SettingsCard title="Localization" icon={Globe}>
          <div className="grid gap-4 sm:grid-cols-3">
            <SettingsFormField label="Fiscal Year Start" hint="YYYY-MM-DD">
              <input
                type="date"
                value={form.fiscal_year_start}
                onChange={(e) => setForm({ ...form, fiscal_year_start: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Default Currency">
              <select
                value={form.default_currency}
                onChange={(e) => setForm({ ...form, default_currency: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </SettingsFormField>
            <SettingsFormField label="Default Timezone">
              <input
                type="text"
                value={form.default_timezone}
                onChange={(e) => setForm({ ...form, default_timezone: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
          </div>
        </SettingsCard>

        {/* Numbering Schemes */}
        <SettingsCard title="Numbering Schemes" icon={Calendar}>
          <div className="space-y-4">
            <SettingsFormField
              label="Batch Prefix"
              hint={`Preview: ${generatePreview(form.batches_prefix || '')}`}
            >
              <input
                type="text"
                value={form.batches_prefix}
                onChange={(e) => setForm({ ...form, batches_prefix: e.target.value })}
                className="font-mono rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="CURE-{YYYY}{MM}-###"
              />
            </SettingsFormField>
            <SettingsFormField
              label="COA Prefix"
              hint={`Preview: ${generatePreview(form.coas_prefix || '')}`}
            >
              <input
                type="text"
                value={form.coas_prefix}
                onChange={(e) => setForm({ ...form, coas_prefix: e.target.value })}
                className="font-mono rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="COA-{BATCH}-{SEQ}"
              />
            </SettingsFormField>
            <SettingsFormField
              label="Invoice Prefix"
              hint={`Preview: ${generatePreview(form.invoices_prefix || '')}`}
            >
              <input
                type="text"
                value={form.invoices_prefix}
                onChange={(e) => setForm({ ...form, invoices_prefix: e.target.value })}
                className="font-mono rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="INV-{FY}-####"
              />
            </SettingsFormField>
            <SettingsFormField
              label="Purchase Order Prefix"
              hint={`Preview: ${generatePreview(form.pos_prefix || '')}`}
            >
              <input
                type="text"
                value={form.pos_prefix}
                onChange={(e) => setForm({ ...form, pos_prefix: e.target.value })}
                className="font-mono rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="PO-{YYYY}-####"
              />
            </SettingsFormField>
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save Organization Settings</SettingsSubmitButton>
      </form>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
