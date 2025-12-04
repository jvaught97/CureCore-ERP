'use client'

import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import { createRDIngredient, updateRDIngredient, type RdIngredientDraft } from '../_actions'
import type { RdIngredient } from './RdIngredientsList'
import { createClient } from '@/app/utils/supabase/client'

type RdIngredientModalProps = {
  ingredient?: RdIngredient | null
  onClose: () => void
}

const units = ['g', 'kg', 'ml', 'L', 'oz', 'lb', 'units']

const InfoBubble = ({ hint }: { hint: string }) => {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-500"
        aria-label={hint}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {visible && (
        <span className="absolute left-1/2 top-full z-10 mt-2 w-max max-w-xs -translate-x-1/2 rounded-md bg-gray-900 px-3 py-1 text-xs text-white shadow-lg">
          {hint}
        </span>
      )}
    </span>
  )
}

export function RdIngredientModal({ ingredient, onClose }: RdIngredientModalProps) {
  const supabase = createClient()

  // Basic info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [supplierId, setSupplierId] = useState('')

  // Inventory
  const [onHand, setOnHand] = useState('0')
  const [unit, setUnit] = useState('g')
  const [reorderPoint, setReorderPoint] = useState('')

  // Pricing
  const [unitSize, setUnitSize] = useState('')
  const [unitMeasure, setUnitMeasure] = useState('g')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [costPerGram, setCostPerGram] = useState('')

  // Organic certification
  const [organicCert, setOrganicCert] = useState(false)
  const [coaFile, setCoaFile] = useState<File | null>(null)
  const [coaExpiration, setCoaExpiration] = useState('')

  // Supplier management
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load suppliers
    const loadSuppliers = async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name')

      if (!error && data) {
        setSuppliers(data)
      }
    }

    loadSuppliers()
  }, [supabase])

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name)
      setDescription(ingredient.description || '')
      setCategory(ingredient.category || '')
      setOnHand(ingredient.on_hand?.toString() || '0')
      setUnit(ingredient.unit || 'g')
      setReorderPoint(ingredient.reorder_point?.toString() || '')
      setCostPerGram(ingredient.cost_per_gram?.toString() || '')
      setUnitSize(ingredient.unit_size?.toString() || '')
      setUnitMeasure(ingredient.unit_measure || 'g')
      setPricePerUnit(ingredient.price_per_unit?.toString() || '')
      setSupplierId(ingredient.supplier_id || '')
      setOrganicCert(ingredient.organic_cert || false)
      setCoaExpiration(ingredient.coa_expiration_date || '')
    }
  }, [ingredient])

  // Auto-calculate cost per gram
  useEffect(() => {
    if (!unitSize || !pricePerUnit) {
      return
    }

    const size = parseFloat(unitSize)
    const price = parseFloat(pricePerUnit)

    if (!size || !price) {
      return
    }

    let sizeInGrams = size

    switch (unitMeasure) {
      case 'kg':
        sizeInGrams = size * 1000
        break
      case 'L':
        sizeInGrams = size * 1000
        break
      case 'oz':
        sizeInGrams = size * 28.3495
        break
      case 'lb':
        sizeInGrams = size * 453.592
        break
      default:
        sizeInGrams = size
    }

    if (sizeInGrams === 0) {
      return
    }

    const calculated = price / sizeInGrams
    setCostPerGram(calculated.toFixed(6))
  }, [unitSize, pricePerUnit, unitMeasure])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    try {
      let coaUrl: string | null = null

      // Upload COA file if provided and organic cert is checked
      if (coaFile && organicCert) {
        const filePath = `coa/${Date.now()}-${coaFile.name.replace(/\s+/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('ingredient-coa')
          .upload(filePath, coaFile, {
            upsert: true,
            contentType: coaFile.type || 'application/pdf',
          })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('ingredient-coa').getPublicUrl(filePath)
        coaUrl = publicUrl
      }

      const draft: RdIngredientDraft = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        onHand: onHand ? parseFloat(onHand) : 0,
        unit: unit || 'g',
        reorderPoint: reorderPoint ? parseFloat(reorderPoint) : undefined,
        costPerGram: costPerGram ? parseFloat(costPerGram) : undefined,
        status: 'active',
        organicCert: organicCert,
        coaUrl: organicCert ? coaUrl : undefined,
        coaExpirationDate: organicCert && coaExpiration ? coaExpiration : undefined,
        unitSize: unitSize ? parseFloat(unitSize) : undefined,
        unitMeasure: unitMeasure || undefined,
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : undefined,
        lastPurchasePrice: pricePerUnit ? parseFloat(pricePerUnit) : undefined,
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        supplierId: supplierId || null,
      }

      if (ingredient) {
        await updateRDIngredient(ingredient.id, draft)
      } else {
        await createRDIngredient(draft)
      }

      onClose()
    } catch (err) {
      console.error('Failed to save ingredient:', err)
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to save ingredient. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between sticky top-0 bg-white pb-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {ingredient ? 'Edit R&D Ingredient' : 'Add R&D Ingredient'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Ingredient Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  placeholder="e.g., Shea Butter, Vitamin E Oil"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>Category</span>
                  <InfoBubble hint="Organize ingredients by type for better reporting and re-ordering" />
                </label>
                <input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Sweetener, Protein, Fat, Preservative"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  placeholder="Brief description of the ingredient"
                />
              </div>

              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                  Supplier
                </label>
                <select
                  id="supplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                >
                  <option value="">Select a supplier (optional)</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={organicCert}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setOrganicCert(checked)
                      if (!checked) {
                        setCoaFile(null)
                        setCoaExpiration('')
                      }
                    }}
                    className="w-4 h-4 text-[#174940] border-gray-300 rounded focus:ring-[#174940]"
                  />
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <span>🌿 Organic Certified</span>
                    <InfoBubble hint="Track organic certification and expiration dates for compliance" />
                  </span>
                </label>
              </div>

              {organicCert && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <label htmlFor="coaFile" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span>Upload COA (optional)</span>
                      <InfoBubble hint="Store certificate for easy access during audits" />
                    </label>
                    <input
                      id="coaFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCoaFile(e.target.files?.[0] || null)}
                      className="mt-1 w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#174940] file:text-white hover:file:bg-[#0f332c]"
                    />
                    {coaFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: <span className="font-medium">{coaFile.name}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="coaExpiration" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span>COA Expiration Date</span>
                      <InfoBubble hint="Get alerts before certificates expire" />
                    </label>
                    <input
                      id="coaExpiration"
                      type="date"
                      value={coaExpiration}
                      onChange={(e) => setCoaExpiration(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="unitSize" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>Purchase Amount</span>
                  <InfoBubble hint="Size of the package you purchase" />
                </label>
                <div className="flex gap-2">
                  <input
                    id="unitSize"
                    type="number"
                    step="0.01"
                    value={unitSize}
                    onChange={(e) => setUnitSize(e.target.value)}
                    placeholder="1000"
                    className="flex-1 mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                  <select
                    value={unitMeasure}
                    onChange={(e) => setUnitMeasure(e.target.value)}
                    className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pricePerUnit" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>Purchase Price</span>
                  <InfoBubble hint="Total price for the package" />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-gray-600 font-semibold">
                    $
                  </span>
                  <input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    placeholder="50.00"
                    className="mt-1 w-full pl-8 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="costPerGram" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>Cost Per Gram (Auto-calculated)</span>
                  <InfoBubble hint="Automatically calculated from amount and price" />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-gray-600 font-semibold">
                    $
                  </span>
                  <input
                    id="costPerGram"
                    type="text"
                    value={costPerGram}
                    readOnly
                    placeholder="0.000000"
                    className="mt-1 w-full pl-8 pr-4 py-2 rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-900 font-semibold"
                  />
                </div>
                {costPerGram && (
                  <p className="text-xs text-green-700 mt-1 font-semibold">
                    ✓ Calculated: ${costPerGram} per gram
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onHand" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>Current On Hand</span>
                  <InfoBubble hint="Current stock quantity" />
                </label>
                <div className="flex gap-2">
                  <input
                    id="onHand"
                    type="number"
                    step="0.01"
                    value={onHand}
                    onChange={(e) => setOnHand(e.target.value)}
                    placeholder="0"
                    className="flex-1 mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="reorderPoint" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>Reorder Point</span>
                  <InfoBubble hint="Get alerts when stock falls below this level" />
                </label>
                <input
                  id="reorderPoint"
                  type="number"
                  step="0.01"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  placeholder="100"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#174940] text-white rounded-lg font-semibold hover:bg-[#133c35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : ingredient ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
