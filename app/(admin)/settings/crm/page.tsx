'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Users, Plus, Edit2, Trash2, GripVertical } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { DraggableList } from '@/components/settings/DraggableList'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  getLeadSources,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
  getCrmPrefs,
  saveCrmPrefs,
} from './actions'

type LeadSource = {
  id: string
  name: string
  is_active: boolean
}

type PipelineStage = {
  id: string
  name: string
  probability: number
  sla_hours?: number
  sort_order: number
  is_active: boolean
}

type CrmPrefs = {
  auto_convert_lead_to_opportunity: boolean
  auto_convert_statuses: string[]
}

const AUTO_CONVERT_STATUSES = [
  'Interested',
  'Demo Scheduled',
  'Proposal Sent',
  'Negotiation',
]

export default function CrmSettingsPage() {
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [prefs, setPrefs] = useState<CrmPrefs>({
    auto_convert_lead_to_opportunity: false,
    auto_convert_statuses: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLeadSourceModal, setShowLeadSourceModal] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  const [editingLeadSource, setEditingLeadSource] = useState<LeadSource | null>(null)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [sourcesResult, stagesResult, prefsResult] = await Promise.all([
      getLeadSources(),
      getPipelineStages(),
      getCrmPrefs(),
    ])

    if (sourcesResult.success) {
      setLeadSources(sourcesResult.data || [])
    }

    if (stagesResult.success) {
      setPipelineStages(stagesResult.data || [])
    }

    if (prefsResult.success && prefsResult.data) {
      setPrefs(prefsResult.data)
    }

    setLoading(false)
  }

  async function handleReorderStages(reordered: PipelineStage[]) {
    const updates = reordered.map((stage, idx) => ({ id: stage.id, sort_order: idx }))
    setPipelineStages(reordered) // Optimistic

    const result = await reorderPipelineStages(updates)
    if (!result.success) {
      showToast((result as any).error || 'Failed to reorder stages', 'error')
      await loadData() // Revert
    }
  }

  async function handleToggleLeadSourceActive(id: string, currentActive: boolean) {
    const result = await updateLeadSource(id, { is_active: !currentActive })
    if (result.success) {
      setLeadSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
      )
      showToast('Lead source updated', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to update lead source', 'error')
    }
  }

  async function handleToggleStageActive(id: string, currentActive: boolean) {
    const result = await updatePipelineStage(id, { is_active: !currentActive })
    if (result.success) {
      setPipelineStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
      )
      showToast('Pipeline stage updated', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to update stage', 'error')
    }
  }

  async function handleDeleteLeadSource(id: string) {
    if (!confirm('Delete this lead source? This cannot be undone.')) return

    const result = await deleteLeadSource(id)
    if (result.success) {
      setLeadSources((prev) => prev.filter((s) => s.id !== id))
      showToast('Lead source deleted', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to delete lead source', 'error')
    }
  }

  async function handleDeleteStage(id: string) {
    if (!confirm('Delete this pipeline stage? This cannot be undone.')) return

    const result = await deletePipelineStage(id)
    if (result.success) {
      setPipelineStages((prev) => prev.filter((s) => s.id !== id))
      showToast('Pipeline stage deleted', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to delete stage', 'error')
    }
  }

  async function handlePrefsSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await saveCrmPrefs(prefs)
    setSaving(false)

    if (result.success) {
      showToast('CRM preferences saved', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to save preferences', 'error')
    }
  }

  function toggleAutoConvertStatus(status: string) {
    setPrefs((prev) => ({
      ...prev,
      auto_convert_statuses: prev.auto_convert_statuses.includes(status)
        ? prev.auto_convert_statuses.filter((s) => s !== status)
        : [...prev.auto_convert_statuses, status],
    }))
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">CRM Settings</h1>
        </div>
        <p className="text-sm text-gray-600">
          Manage lead sources, pipeline stages, and CRM automation preferences.
        </p>
      </header>

      {/* Lead Sources */}
      <SettingsCard
        title="Lead Sources"
        icon={Users}
        description="Track where your leads come from."
      >
        <div className="space-y-4">
          <button
            onClick={() => {
              setEditingLeadSource(null)
              setShowLeadSourceModal(true)
            }}
            className="flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90"
          >
            <Plus className="h-4 w-4" />
            Add Lead Source
          </button>

          {leadSources.length === 0 ? (
            <p className="text-sm text-gray-500">No lead sources yet. Add your first source above.</p>
          ) : (
            <div className="space-y-2">
              {leadSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{source.name}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        source.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {source.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLeadSourceActive(source.id, source.is_active)}
                      className="rounded p-2 text-gray-600 hover:bg-gray-100"
                      title={source.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span className="text-xs">
                        {source.is_active ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingLeadSource(source)
                        setShowLeadSourceModal(true)
                      }}
                      className="rounded p-2 text-gray-600 hover:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLeadSource(source.id)}
                      className="rounded p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Pipeline Stages */}
      <SettingsCard
        title="Pipeline Stages"
        description="Define your sales pipeline stages with probability and SLA. Drag to reorder."
      >
        <div className="space-y-4">
          <button
            onClick={() => {
              setEditingStage(null)
              setShowStageModal(true)
            }}
            className="flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90"
          >
            <Plus className="h-4 w-4" />
            Add Pipeline Stage
          </button>

          {pipelineStages.length === 0 ? (
            <p className="text-sm text-gray-500">No pipeline stages yet. Add your first stage above.</p>
          ) : (
            <DraggableList
              items={pipelineStages}
              onReorder={handleReorderStages}
              renderItem={(stage) => (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 cursor-grab text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{stage.name}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            stage.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {stage.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-gray-600">
                        <span>Probability: {stage.probability}%</span>
                        {stage.sla_hours && <span>SLA: {stage.sla_hours}h</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStageActive(stage.id, stage.is_active)}
                      className="rounded p-2 text-gray-600 hover:bg-gray-100"
                      title={stage.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span className="text-xs">
                        {stage.is_active ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingStage(stage)
                        setShowStageModal(true)
                      }}
                      className="rounded p-2 text-gray-600 hover:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="rounded p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </SettingsCard>

      {/* CRM Preferences */}
      <form onSubmit={handlePrefsSubmit} className="space-y-8">
        <SettingsCard
          title="CRM Automation"
          description="Configure automatic lead conversion and other CRM automations."
        >
          <div className="space-y-4">
            <SettingsFormField
              label="Auto-Convert Lead to Opportunity"
              hint="Automatically convert leads to opportunities when they reach specific statuses"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.auto_convert_lead_to_opportunity}
                  onChange={(e) =>
                    setPrefs({ ...prefs, auto_convert_lead_to_opportunity: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Enable auto-conversion</span>
              </label>
            </SettingsFormField>

            {prefs.auto_convert_lead_to_opportunity && (
              <SettingsFormField
                label="Auto-Convert Statuses"
                hint="Select which statuses trigger automatic conversion"
              >
                <div className="space-y-2">
                  {AUTO_CONVERT_STATUSES.map((status) => (
                    <label key={status} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={prefs.auto_convert_statuses.includes(status)}
                        onChange={() => toggleAutoConvertStatus(status)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                      />
                      <span className="text-sm text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
              </SettingsFormField>
            )}
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save CRM Preferences</SettingsSubmitButton>
      </form>

      {/* Lead Source Modal */}
      {showLeadSourceModal && (
        <LeadSourceModal
          source={editingLeadSource}
          onClose={() => setShowLeadSourceModal(false)}
          onSave={async (data) => {
            if (editingLeadSource) {
              const result = await updateLeadSource(editingLeadSource.id, data)
              if (result.success) {
                await loadData()
                showToast('Lead source updated', 'success')
                setShowLeadSourceModal(false)
              } else {
                showToast('error' in result ? result.error : 'Failed to update lead source', 'error')
              }
            } else {
              const result = await createLeadSource(data)
              if (result.success) {
                await loadData()
                showToast('Lead source created', 'success')
                setShowLeadSourceModal(false)
              } else {
                showToast('error' in result ? result.error : 'Failed to create lead source', 'error')
              }
            }
          }}
        />
      )}

      {/* Pipeline Stage Modal */}
      {showStageModal && (
        <PipelineStageModal
          stage={editingStage}
          onClose={() => setShowStageModal(false)}
          onSave={async (data) => {
            if (editingStage) {
              const result = await updatePipelineStage(editingStage.id, data)
              if (result.success) {
                await loadData()
                showToast('Pipeline stage updated', 'success')
                setShowStageModal(false)
              } else {
                showToast('error' in result ? result.error : 'Failed to update stage', 'error')
              }
            } else {
              const result = await createPipelineStage(data)
              if (result.success) {
                await loadData()
                showToast('Pipeline stage created', 'success')
                setShowStageModal(false)
              } else {
                showToast('error' in result ? result.error : 'Failed to create stage', 'error')
              }
            }
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

// ─── LEAD SOURCE MODAL ───────────────────────────────────────────────────────

function LeadSourceModal({
  source,
  onClose,
  onSave,
}: {
  source: LeadSource | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    name: source?.name || '',
    is_active: source?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {source ? 'Edit Lead Source' : 'Add Lead Source'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SettingsFormField label="Source Name" required>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="e.g., Website, Referral, Trade Show"
              required
            />
          </SettingsFormField>

          <SettingsFormField label="Status">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </SettingsFormField>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : source ? 'Update Source' : 'Create Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PIPELINE STAGE MODAL ────────────────────────────────────────────────────

function PipelineStageModal({
  stage,
  onClose,
  onSave,
}: {
  stage: PipelineStage | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    name: stage?.name || '',
    probability: stage?.probability ?? 0,
    sla_hours: stage?.sla_hours || undefined,
    is_active: stage?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...formData,
      sla_hours: formData.sla_hours || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {stage ? 'Edit Pipeline Stage' : 'Add Pipeline Stage'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SettingsFormField label="Stage Name" required>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="e.g., Qualified, Proposal, Negotiation"
              required
            />
          </SettingsFormField>

          <SettingsFormField
            label="Probability (%)"
            hint="Win probability at this stage (0-100)"
            required
          >
            <input
              type="number"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) =>
                setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              required
            />
          </SettingsFormField>

          <SettingsFormField
            label="SLA (Hours)"
            hint="Optional: Expected response time in hours"
          >
            <input
              type="number"
              min="0"
              value={formData.sla_hours || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sla_hours: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="e.g., 24, 48"
            />
          </SettingsFormField>

          <SettingsFormField label="Status">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#174940]"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </SettingsFormField>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : stage ? 'Update Stage' : 'Create Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
