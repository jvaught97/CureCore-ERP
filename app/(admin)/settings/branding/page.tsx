'use client'

import { useEffect, useState, FormEvent, useRef } from 'react'
import { Palette, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { useTheme } from '@/lib/context/ThemeContext'
import { getBrandingSettings, updateThemeSettings, uploadLogo, deleteLogo, updateDocumentTemplates } from './actions'

type BrandingData = {
  primary_color: string
  secondary_color?: string
  dark_mode: boolean
  navbar_logo_url?: string
  invoice_logo_url?: string
  packing_logo_url?: string
  analytics_logo_url?: string
}

type LogoType = 'navbar' | 'invoice' | 'packing' | 'analytics'

const DOCUMENT_TEMPLATES = {
  invoice: ['Standard Invoice', 'Detailed Invoice', 'Simple Invoice'],
  po: ['Standard PO', 'Detailed PO'],
  coa: ['Standard COA', 'Detailed COA with Photos'],
  batch_record: ['Standard Batch Record', 'GMP Batch Record'],
}

export default function BrandingSettingsPage() {
  const { isDarkMode, toggleDarkMode, updateColors } = useTheme()
  const [branding, setBranding] = useState<BrandingData>({
    primary_color: '#174940',
    secondary_color: '',
    dark_mode: false,
  })
  const [templates, setTemplates] = useState({
    invoice: 'Standard Invoice',
    po: 'Standard PO',
    coa: 'Standard COA',
    batch_record: 'Standard Batch Record',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<LogoType | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  const fileInputRefs = {
    navbar: useRef<HTMLInputElement>(null),
    invoice: useRef<HTMLInputElement>(null),
    packing: useRef<HTMLInputElement>(null),
    analytics: useRef<HTMLInputElement>(null),
  }

  useEffect(() => {
    loadBranding()
  }, [])

  async function loadBranding() {
    setLoading(true)
    const result = await getBrandingSettings()
    if (result.success && result.data) {
      const loadedBranding = {
        primary_color: result.data.primary_color || '#174940',
        secondary_color: result.data.secondary_color || '',
        dark_mode: result.data.dark_mode || false,
        navbar_logo_url: result.data.navbar_logo_url || undefined,
        invoice_logo_url: result.data.invoice_logo_url || undefined,
        packing_logo_url: result.data.packing_logo_url || undefined,
        analytics_logo_url: result.data.analytics_logo_url || undefined,
      }
      setBranding(loadedBranding)

      // Update theme context with loaded colors
      updateColors(loadedBranding.primary_color, loadedBranding.secondary_color)
    }
    setLoading(false)
  }

  async function handleThemeSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await updateThemeSettings({
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      dark_mode: branding.dark_mode,
    })

    setSaving(false)

    if (result.success) {
      // Update theme context with new colors
      updateColors(branding.primary_color, branding.secondary_color)
      showToast('Theme settings saved successfully', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save theme settings', 'error')
    }
  }

  function handleDarkModeToggle(checked: boolean) {
    setBranding({ ...branding, dark_mode: checked })
    toggleDarkMode()
  }

  async function handleFileChange(kind: LogoType, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(kind)
    const result = await uploadLogo(kind, file)
    setUploading(null)

    if (result.success) {
      setBranding((prev) => ({ ...prev, [`${kind}_logo_url`]: result.url }))
      showToast(`${kind.charAt(0).toUpperCase() + kind.slice(1)} logo uploaded successfully`, 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to upload logo', 'error')
    }

    // Reset file input
    if (fileInputRefs[kind].current) {
      fileInputRefs[kind].current!.value = ''
    }
  }

  async function handleDeleteLogo(kind: LogoType) {
    if (!confirm(`Delete ${kind} logo? This cannot be undone.`)) return

    const result = await deleteLogo(kind)

    if (result.success) {
      setBranding((prev) => ({ ...prev, [`${kind}_logo_url`]: undefined }))
      showToast(`${kind.charAt(0).toUpperCase() + kind.slice(1)} logo deleted`, 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to delete logo', 'error')
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Palette className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Branding & Templates</h1>
        </div>
        <p className="text-sm text-gray-600">
          Customize your brand colors, logos, and document templates.
        </p>
      </header>

      {/* Theme Settings */}
      <form onSubmit={handleThemeSubmit} className="space-y-8">
        <SettingsCard title="Theme" icon={Palette} description="Set your brand colors and appearance.">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsFormField label="Primary Color" hint="Used for buttons, links, and highlights">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
                    placeholder="#174940"
                  />
                </div>
              </SettingsFormField>

              <SettingsFormField label="Secondary Color (Optional)" hint="Used for accents and secondary actions">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.secondary_color || '#6b7280'}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={branding.secondary_color || ''}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
                    placeholder="#6b7280"
                  />
                </div>
              </SettingsFormField>
            </div>

            <SettingsFormField label="Dark Mode">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={(e) => handleDarkModeToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Enable dark mode theme</span>
              </label>
            </SettingsFormField>

            {/* Color Preview */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-gray-500">Preview</p>
              <div className="flex gap-3">
                <div
                  className="flex h-20 w-32 items-center justify-center rounded text-sm font-semibold text-white"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Primary
                </div>
                {branding.secondary_color && (
                  <div
                    className="flex h-20 w-32 items-center justify-center rounded text-sm font-semibold text-white"
                    style={{ backgroundColor: branding.secondary_color }}
                  >
                    Secondary
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save Theme Settings</SettingsSubmitButton>
      </form>

      {/* Logo Uploads */}
      <SettingsCard title="Brand Logos" icon={ImageIcon} description="Upload logos for different contexts. Recommended: PNG with transparent background or SVG.">
        <div className="grid gap-6 md:grid-cols-2">
          {(['navbar', 'invoice', 'packing', 'analytics'] as LogoType[]).map((kind) => {
            const logoUrl = branding[`${kind}_logo_url`]
            const isUploading = uploading === kind
            const label = kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' ')

            return (
              <div key={kind} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{label} Logo</h3>
                  {logoUrl && (
                    <button
                      onClick={() => handleDeleteLogo(kind)}
                      className="text-red-600 hover:text-red-700"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {logoUrl ? (
                  <div className="flex items-center justify-center rounded border border-gray-300 bg-white p-4">
                    <img src={logoUrl} alt={`${label} logo`} className="max-h-24 max-w-full" />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-white">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                <div>
                  <input
                    ref={fileInputRefs[kind]}
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={(e) => handleFileChange(kind, e)}
                    className="hidden"
                    id={`${kind}-upload`}
                  />
                  <label
                    htmlFor={`${kind}-upload`}
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                      isUploading
                        ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, SVG, or JPEG (max 5MB)</p>
              </div>
            )
          })}
        </div>
      </SettingsCard>

      {/* Document Templates */}
      <SettingsCard
        title="Document Templates"
        description="Select default templates for generated documents. Custom templates coming soon."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField label="Invoice Template">
            <select
              value={templates.invoice}
              onChange={(e) => setTemplates({ ...templates, invoice: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DOCUMENT_TEMPLATES.invoice.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </SettingsFormField>

          <SettingsFormField label="Purchase Order Template">
            <select
              value={templates.po}
              onChange={(e) => setTemplates({ ...templates, po: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DOCUMENT_TEMPLATES.po.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </SettingsFormField>

          <SettingsFormField label="COA Template">
            <select
              value={templates.coa}
              onChange={(e) => setTemplates({ ...templates, coa: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DOCUMENT_TEMPLATES.coa.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </SettingsFormField>

          <SettingsFormField label="Batch Record Template">
            <select
              value={templates.batch_record}
              onChange={(e) => setTemplates({ ...templates, batch_record: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DOCUMENT_TEMPLATES.batch_record.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </SettingsFormField>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Note: Template selections are stored locally. Custom template support will be added in a future update.
        </p>
      </SettingsCard>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
