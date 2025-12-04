'use client'

import { useEffect, useState, FormEvent } from 'react'
import { DollarSign, Plus, X } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { getFinancePrefs, saveFinancePrefs } from './actions'

const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR']
const COSTING_METHODS = ['Weighted Average', 'FIFO', 'LIFO']
const EXPORT_PLATFORMS = ['QuickBooks', 'Xero']

type FinancePrefs = {
  enabled_currencies: string[]
  default_currency: string
  payment_terms: string[]
  costing_method: string
  overhead_rate_pct: number
  include_scrap_in_costing: boolean
  export_profiles: Record<string, any>
}

export default function FinanceSettingsPage() {
  const [prefs, setPrefs] = useState<FinancePrefs>({
    enabled_currencies: ['USD'],
    default_currency: 'USD',
    payment_terms: ['Net 15', 'Net 30', 'Net 45'],
    costing_method: 'Weighted Average',
    overhead_rate_pct: 0,
    include_scrap_in_costing: false,
    export_profiles: {},
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newPaymentTerm, setNewPaymentTerm] = useState('')
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const result = await getFinancePrefs()

    if (result.success && result.data) {
      setPrefs(result.data)
    }

    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await saveFinancePrefs(prefs)
    setSaving(false)

    if (result.success) {
      showToast('Finance preferences saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save preferences', 'error')
    }
  }

  function toggleCurrency(currency: string) {
    setPrefs((prev) => {
      const enabled = prev.enabled_currencies.includes(currency)
      let newEnabled: string[]

      if (enabled) {
        // Don't allow removing the default currency
        if (currency === prev.default_currency) {
          showToast('Cannot disable the default currency', 'error')
          return prev
        }
        newEnabled = prev.enabled_currencies.filter((c) => c !== currency)
      } else {
        newEnabled = [...prev.enabled_currencies, currency]
      }

      return { ...prev, enabled_currencies: newEnabled }
    })
  }

  function addPaymentTerm() {
    if (!newPaymentTerm.trim()) return

    if (prefs.payment_terms.includes(newPaymentTerm.trim())) {
      showToast('Payment term already exists', 'error')
      return
    }

    setPrefs((prev) => ({
      ...prev,
      payment_terms: [...prev.payment_terms, newPaymentTerm.trim()],
    }))
    setNewPaymentTerm('')
  }

  function removePaymentTerm(term: string) {
    setPrefs((prev) => ({
      ...prev,
      payment_terms: prev.payment_terms.filter((t) => t !== term),
    }))
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Finance Settings</h1>
        </div>
        <p className="text-sm text-gray-600">
          Configure currencies, payment terms, costing methods, and accounting integrations.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Currencies */}
        <SettingsCard
          title="Currencies"
          icon={DollarSign}
          description="Enable currencies for your organization and set the default."
        >
          <div className="space-y-4">
            <SettingsFormField label="Enabled Currencies" hint="Select which currencies to use">
              <div className="grid grid-cols-4 gap-3">
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <label key={currency} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prefs.enabled_currencies.includes(currency)}
                      onChange={() => toggleCurrency(currency)}
                      className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                    />
                    <span className="text-sm text-gray-700">{currency}</span>
                  </label>
                ))}
              </div>
            </SettingsFormField>

            <SettingsFormField
              label="Default Currency"
              hint="Primary currency for reporting and transactions"
              required
            >
              <select
                value={prefs.default_currency}
                onChange={(e) => {
                  const newDefault = e.target.value
                  setPrefs((prev) => ({
                    ...prev,
                    default_currency: newDefault,
                    enabled_currencies: prev.enabled_currencies.includes(newDefault)
                      ? prev.enabled_currencies
                      : [...prev.enabled_currencies, newDefault],
                  }))
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              >
                {prefs.enabled_currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </SettingsFormField>
          </div>
        </SettingsCard>

        {/* Payment Terms */}
        <SettingsCard
          title="Payment Terms"
          description="Define standard payment terms for invoices and purchase orders."
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPaymentTerm}
                onChange={(e) => setNewPaymentTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPaymentTerm()
                  }
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="e.g., Net 60, Due on Receipt, COD"
              />
              <button
                type="button"
                onClick={addPaymentTerm}
                className="flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {prefs.payment_terms.map((term) => (
                <div
                  key={term}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={() => removePaymentTerm(term)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Costing & Overhead */}
        <SettingsCard
          title="Costing & Overhead"
          description="Configure how inventory and manufacturing costs are calculated."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsFormField
              label="Costing Method"
              hint="Inventory valuation method"
              required
            >
              <select
                value={prefs.costing_method}
                onChange={(e) => setPrefs({ ...prefs, costing_method: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              >
                {COSTING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </SettingsFormField>

            <SettingsFormField
              label="Overhead Rate (%)"
              hint="Percentage added to material costs"
            >
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={prefs.overhead_rate_pct}
                onChange={(e) =>
                  setPrefs({ ...prefs, overhead_rate_pct: parseFloat(e.target.value) || 0 })
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
          </div>

          <SettingsFormField label="Include Scrap in Costing">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.include_scrap_in_costing}
                onChange={(e) =>
                  setPrefs({ ...prefs, include_scrap_in_costing: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <span className="text-sm text-gray-700">
                Include scrap/waste percentage in batch costing calculations
              </span>
            </label>
          </SettingsFormField>
        </SettingsCard>

        {/* Export Profiles */}
        <SettingsCard
          title="Export Profiles"
          description="Configure CSV export mappings for accounting software. (Coming soon)"
        >
          <div className="space-y-3">
            {EXPORT_PLATFORMS.map((platform) => (
              <div
                key={platform}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div>
                  <h4 className="font-semibold text-gray-900">{platform}</h4>
                  <p className="text-xs text-gray-500">CSV export format mapping</p>
                </div>
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-400 cursor-not-allowed"
                >
                  Configure
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Export profile configuration will be available in a future update.
            </p>
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save Finance Settings</SettingsSubmitButton>
      </form>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
