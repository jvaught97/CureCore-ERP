'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Cog, Plus, Trash2, Edit2 } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { DraggableList } from '@/components/settings/DraggableList'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { getPhases, createPhase, updatePhase, deletePhase, reorderPhases, getMfgPrefs, saveMfgPrefs } from './actions'
import type { FormulaPhaseInput, MfgPrefsInput } from '@/lib/validation/settings'

type Phase = {
  id: string
  name: string
  code: string
  description: string
  sort_order: number
  is_active: boolean
  default_mix_temp_c?: number
  default_shear_time_min?: number
  default_target_ph?: number
}

export default function ManufacturingSettingsPage() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [prefs, setPrefs] = useState<MfgPrefsInput>({
    default_yield_pct: 100,
    include_scrap_pct: 0,
    include_overhead: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [phasesResult, prefsResult] = await Promise.all([getPhases(), getMfgPrefs()])

    if (phasesResult.success && phasesResult.data) {
      setPhases(phasesResult.data)
    }

    if (prefsResult.success && prefsResult.data) {
      setPrefs({
        default_yield_pct: prefsResult.data.default_yield_pct || 100,
        include_scrap_pct: prefsResult.data.include_scrap_pct || 0,
        include_overhead: prefsResult.data.include_overhead || false,
      })
    }

    setLoading(false)
  }

  async function handleSavePrefs(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await saveMfgPrefs(prefs)
    setSaving(false)

    if (result.success) {
      showToast('Manufacturing preferences saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save preferences', 'error')
    }
  }

  async function handleReorder(reorderedPhases: Phase[]) {
    const updated = reorderedPhases.map((p, idx) => ({ ...p, sort_order: idx }))
    setPhases(updated)

    const result = await reorderPhases({
      phases: updated.map((p) => ({ id: p.id, sort_order: p.sort_order })),
    })

    if (result.success) {
      showToast('Phases reordered', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to reorder', 'error')
      loadData() // Revert on error
    }
  }

  async function handleSavePhase(phase: FormulaPhaseInput) {
    const result = phase.id ? await updatePhase(phase) : await createPhase(phase)

    if (result.success) {
      showToast(`Phase ${phase.id ? 'updated' : 'created'}`, 'success')
      setShowPhaseModal(false)
      setEditingPhase(null)
      loadData()
    } else {
      showToast('error' in result ? result.error : 'Failed to save phase', 'error')
    }
  }

  async function handleDeletePhase(id: string) {
    if (!confirm('Delete this phase? This cannot be undone.')) return

    const result = await deletePhase(id)

    if (result.success) {
      showToast('Phase deleted', 'success')
      loadData()
    } else {
      showToast('error' in result ? result.error : 'Failed to delete', 'error')
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Cog className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Manufacturing</h1>
        </div>
        <p className="text-sm text-gray-600">
          Configure formula phases, batch settings, and manufacturing defaults.
        </p>
      </header>

      {/* Formula Phases */}
      <SettingsCard title="Formula Phases" description="Drag to reorder. Used in batch manufacturing workflows.">
        <div className="space-y-4">
          <button
            onClick={() => {
              setEditingPhase(null)
              setShowPhaseModal(true)
            }}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
          >
            <Plus className="h-4 w-4" />
            Add Phase
          </button>

          {phases.length === 0 ? (
            <p className="text-sm text-gray-500">No phases defined yet.</p>
          ) : (
            <DraggableList items={phases} onReorder={handleReorder} renderItem={(phase) => (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{phase.name}</span>
                    {phase.code && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{phase.code}</span>}
                    {!phase.is_active && <span className="text-xs text-gray-400">(Inactive)</span>}
                  </div>
                  {phase.description && <p className="text-xs text-gray-500">{phase.description}</p>}
                  {(phase.default_mix_temp_c || phase.default_shear_time_min || phase.default_target_ph) && (
                    <div className="mt-1 flex gap-3 text-xs text-gray-600">
                      {phase.default_mix_temp_c && <span>Temp: {phase.default_mix_temp_c}°C</span>}
                      {phase.default_shear_time_min && <span>Shear: {phase.default_shear_time_min} min</span>}
                      {phase.default_target_ph && <span>pH: {phase.default_target_ph}</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPhase(phase)
                      setShowPhaseModal(true)
                    }}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePhase(phase.id)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )} />
          )}
        </div>
      </SettingsCard>

      {/* Batch Defaults */}
      <form onSubmit={handleSavePrefs} className="space-y-8">
        <SettingsCard title="Batch Settings" description="Default values for batch production.">
          <div className="grid gap-4 sm:grid-cols-3">
            <SettingsFormField label="Default Yield (%)" hint="Expected yield percentage (0-100)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={prefs.default_yield_pct}
                onChange={(e) => setPrefs({ ...prefs, default_yield_pct: parseFloat(e.target.value) })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Include Scrap (%)" hint="Scrap/waste percentage (0-100)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={prefs.include_scrap_pct}
                onChange={(e) => setPrefs({ ...prefs, include_scrap_pct: parseFloat(e.target.value) })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Include Overhead">
              <label className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={prefs.include_overhead}
                  onChange={(e) => setPrefs({ ...prefs, include_overhead: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Include overhead in costing</span>
              </label>
            </SettingsFormField>
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save Manufacturing Settings</SettingsSubmitButton>
      </form>

      {/* Phase Modal */}
      {showPhaseModal && (
        <PhaseModal
          phase={editingPhase}
          onSave={handleSavePhase}
          onClose={() => {
            setShowPhaseModal(false)
            setEditingPhase(null)
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function PhaseModal({
  phase,
  onSave,
  onClose,
}: {
  phase: Phase | null
  onSave: (phase: FormulaPhaseInput) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormulaPhaseInput>({
    id: phase?.id,
    name: phase?.name || '',
    code: phase?.code || '',
    description: phase?.description || '',
    sort_order: phase?.sort_order || 0,
    is_active: phase?.is_active ?? true,
    default_mix_temp_c: phase?.default_mix_temp_c,
    default_shear_time_min: phase?.default_shear_time_min,
    default_target_ph: phase?.default_target_ph,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{phase ? 'Edit' : 'Add'} Phase</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsFormField label="Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              />
            </SettingsFormField>
            <SettingsFormField label="Code">
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
          </div>
          <SettingsFormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              rows={2}
            />
          </SettingsFormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <SettingsFormField label="Mix Temp (°C)">
              <input
                type="number"
                step="0.01"
                value={form.default_mix_temp_c || ''}
                onChange={(e) => setForm({ ...form, default_mix_temp_c: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Shear Time (min)">
              <input
                type="number"
                step="0.01"
                value={form.default_shear_time_min || ''}
                onChange={(e) => setForm({ ...form, default_shear_time_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
            <SettingsFormField label="Target pH">
              <input
                type="number"
                step="0.01"
                value={form.default_target_ph || ''}
                onChange={(e) => setForm({ ...form, default_target_ph: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#174940]"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
            >
              {phase ? 'Update' : 'Create'} Phase
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
