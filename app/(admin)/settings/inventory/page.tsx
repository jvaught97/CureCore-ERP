'use client'

import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react'
import { Package, Plus, Edit2, Trash2, GripVertical } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsSubmitButton } from '@/components/settings/SettingsSubmitButton'
import { DraggableList } from '@/components/settings/DraggableList'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getInventoryPrefs,
  saveInventoryPrefs,
} from './actions'
import type { IngredientCategoryInput } from '@/lib/validation/settings'

type Category = {
  id: string
  name: string
  code?: string
  description?: string
  sort_order: number
  is_active: boolean
  default_expiry_days?: number
}

type InventoryPrefs = {
  enable_fefo: boolean
  default_expiry_days: number
  track_lot_numbers: boolean
  require_container_weight: boolean
}

const CATEGORY_TEMPLATES = [
  {
    name: 'Base Ingredients',
    code: 'BASE',
    description: 'Carriers, solvents, waxes, and stabilizers',
    defaultExpiryDays: 730,
  },
  {
    name: 'Botanicals & Extracts',
    code: 'BOT',
    description: 'Plant extracts, tinctures, and actives',
    defaultExpiryDays: 540,
  },
  {
    name: 'Actives & Functional Additives',
    code: 'ACT',
    description: 'Vitamins, peptides, and targeted actives',
    defaultExpiryDays: 365,
  },
  {
    name: 'Fragrance & Flavor',
    code: 'FRG',
    description: 'Fragrance oils, essential oils, and flavors',
    defaultExpiryDays: 365,
  },
  {
    name: 'Supplements & Nutraceuticals',
    code: 'SUP',
    description: 'Powders, capsules, herbal blends',
    defaultExpiryDays: 365,
  },
  {
    name: 'Packaging Components',
    code: 'PKG',
    description: 'Bottles, pumps, closures, secondary packaging',
    defaultExpiryDays: 1095,
  },
] as const

export default function InventorySettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [prefs, setPrefs] = useState<InventoryPrefs>({
    enable_fefo: true,
    default_expiry_days: 365,
    track_lot_numbers: true,
    require_container_weight: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [addingPreset, setAddingPreset] = useState<string | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  const availableCategoryTemplates = useMemo(
    () =>
      CATEGORY_TEMPLATES.filter(
        (template) =>
          !categories.some(
            (cat) => cat.name.toLowerCase() === template.name.toLowerCase(),
          ),
      ),
    [categories],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    const [catResult, prefsResult] = await Promise.all([getCategories(), getInventoryPrefs()])

    if (catResult.success) {
      setCategories(catResult.data || [])
    }

    if (prefsResult.success && prefsResult.data) {
      setPrefs(prefsResult.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadData()
    })
    return () => cancelAnimationFrame(frame)
  }, [loadData])

  async function handleQuickAddCategory(template: (typeof CATEGORY_TEMPLATES)[number]) {
    setAddingPreset(template.name)
    const result = await createCategory({
      name: template.name,
      code: template.code,
      description: template.description,
      is_active: true,
      default_expiry_days: template.defaultExpiryDays,
    })
    setAddingPreset(null)

    if (result.success) {
      await loadData()
      showToast(`Added ${template.name}`, 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to add category', 'error')
    }
  }

  async function handleReorder(reordered: Category[]) {
    const updates = reordered.map((cat, idx) => ({ id: cat.id, sort_order: idx }))
    setCategories(reordered) // Optimistic

    const result = await reorderCategories(updates)
    if (!result.success) {
      showToast('error' in result ? result.error : 'Failed to reorder categories', 'error')
      await loadData() // Revert
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    const result = await updateCategory(id, { is_active: !currentActive })
    if (result.success) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentActive } : c))
      )
      showToast('Category updated', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to update category', 'error')
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Delete this category? This cannot be undone.')) return

    const result = await deleteCategory(id)
    if (result.success) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      showToast('Category deleted', 'success')
    } else {
      showToast('error' in result ? result.error : 'Failed to delete category', 'error')
    }
  }

  async function handlePrefsSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await saveInventoryPrefs(prefs)
    setSaving(false)

    if (result.success) {
      showToast('Inventory preferences saved', 'success')
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
          <Package className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Inventory Settings</h1>
        </div>
        <p className="text-sm text-gray-600">
          Manage ingredient categories, units of measure, and inventory tracking preferences.
        </p>
      </header>

      {/* Ingredient Categories */}
      <SettingsCard
        title="Ingredient Categories"
        icon={Package}
        description="Organize ingredients into categories for easier management and reporting."
      >
        <div className="space-y-4">
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>

          {availableCategoryTemplates.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white/60 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Quick-add starter categories
              </p>
              <p className="text-xs text-gray-500">
                Common structures used across skincare, supplements, and CPG.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableCategoryTemplates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleQuickAddCategory(template)}
                    disabled={addingPreset === template.name}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-[#174940] hover:text-[#174940] disabled:cursor-not-allowed disabled:opacity-60"
                    title={template.description}
                  >
                    {addingPreset === template.name ? 'Adding…' : template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">No categories yet. Add your first category above.</p>
          ) : (
            <DraggableList
              items={categories}
              onReorder={handleReorder}
              renderItem={(cat) => (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 cursor-grab text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{cat.name}</span>
                        {cat.code && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                            {cat.code}
                          </span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            cat.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="mt-1 text-sm text-gray-600">{cat.description}</p>
                      )}
                      {cat.default_expiry_days && (
                        <p className="mt-1 text-xs text-gray-500">
                          Default expiry: {cat.default_expiry_days} days
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(cat.id, cat.is_active)}
                      className="rounded p-2 text-gray-600 hover:bg-gray-100"
                      title={cat.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span className="text-xs">
                        {cat.is_active ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(cat)
                        setShowCategoryModal(true)
                      }}
                      className="rounded p-2 text-gray-600 hover:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
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

      {/* Inventory Preferences */}
      <form onSubmit={handlePrefsSubmit} className="space-y-8">
        <SettingsCard
          title="Inventory Preferences"
          description="Configure how inventory is tracked and managed across your organization."
        >
          <div className="space-y-4">
            <SettingsFormField
              label="FEFO (First Expiry, First Out)"
              hint="Automatically prioritize materials with earliest expiry dates"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.enable_fefo}
                  onChange={(e) => setPrefs({ ...prefs, enable_fefo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Enable FEFO tracking</span>
              </label>
            </SettingsFormField>

            <SettingsFormField
              label="Default Expiry (Days)"
              hint="Default shelf life for materials without a category-specific expiry"
            >
              <input
                type="number"
                min="0"
                value={prefs.default_expiry_days}
                onChange={(e) =>
                  setPrefs({ ...prefs, default_expiry_days: parseInt(e.target.value) || 0 })
                }
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </SettingsFormField>

            <SettingsFormField
              label="Lot Number Tracking"
              hint="Require lot/batch numbers for all inventory transactions"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.track_lot_numbers}
                  onChange={(e) => setPrefs({ ...prefs, track_lot_numbers: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Track lot numbers</span>
              </label>
            </SettingsFormField>

            <SettingsFormField
              label="Container Weight"
              hint="Require recording the weight of containers (tare weight) for accurate net weight calculations"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.require_container_weight}
                  onChange={(e) =>
                    setPrefs({ ...prefs, require_container_weight: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">Require container weight</span>
              </label>
            </SettingsFormField>
          </div>
        </SettingsCard>

        <SettingsSubmitButton loading={saving}>Save Inventory Preferences</SettingsSubmitButton>
      </form>

      {/* Units of Measure - Stubbed */}
      <SettingsCard
        title="Units of Measure"
        description="Base units and conversion factors. (Coming soon)"
      >
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            UoM management will be available in a future update.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Common units: kg, g, L, mL will be available by default.
          </p>
        </div>
      </SettingsCard>

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setShowCategoryModal(false)}
          onSave={async (data) => {
            if (editingCategory) {
              const result = await updateCategory(editingCategory.id, data)
              if (result.success) {
                await loadData()
                showToast('Category updated', 'success')
                setShowCategoryModal(false)
              } else {
                showToast('error' in result ? result.error : 'Failed to update category', 'error')
              }
            } else {
              const result = await createCategory(data)
              if (result.success) {
                await loadData()
                showToast('Category created', 'success')
                setShowCategoryModal(false)
              } else {
                showToast('error' in result ? result.error : 'Failed to create category', 'error')
              }
            }
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

// ─── CATEGORY MODAL ──────────────────────────────────────────────────────────

function CategoryModal({
  category,
  onClose,
  onSave,
}: {
  category: Category | null
  onClose: () => void
  onSave: (data: IngredientCategoryInput) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || '',
    is_active: category?.is_active ?? true,
    default_expiry_days: category?.default_expiry_days || 365,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...formData,
      code: formData.code || undefined,
      description: formData.description || undefined,
      default_expiry_days: formData.default_expiry_days || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {category ? 'Edit Category' : 'Add Category'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SettingsFormField label="Category Name" required>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              required
            />
          </SettingsFormField>

          <SettingsFormField label="Code (Optional)" hint="Short code for quick reference">
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
              placeholder="e.g., ACT, EMO, SURF"
            />
          </SettingsFormField>

          <SettingsFormField label="Description (Optional)">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              rows={3}
              placeholder="Brief description of this category"
            />
          </SettingsFormField>

          <SettingsFormField
            label="Default Expiry (Days)"
            hint="Default shelf life for ingredients in this category"
          >
            <input
              type="number"
              min="0"
              value={formData.default_expiry_days}
              onChange={(e) =>
                setFormData({ ...formData, default_expiry_days: parseInt(e.target.value) || 0 })
              }
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
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
              {saving ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
