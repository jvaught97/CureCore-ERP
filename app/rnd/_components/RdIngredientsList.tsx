'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { deleteRDIngredient } from '../_actions'
import { RdIngredientModal } from './RdIngredientModal'

export type RdIngredient = {
  id: string
  name: string
  description?: string | null
  category?: string | null
  on_hand: number
  unit: string
  reorder_point?: number | null
  cost_per_gram?: number | null
  status?: string | null
  organic_cert?: boolean | null
  coa_url?: string | null
  coa_expiration_date?: string | null
  unit_size?: number | null
  unit_measure?: string | null
  price_per_unit?: number | null
  last_purchase_price?: number | null
  last_purchase_date?: string | null
  supplier_id?: string | null
  suppliers?: { id: string; name: string } | null
  created_at: string
}

type RdIngredientsListProps = {
  ingredients: RdIngredient[]
  onRefresh: () => void
}

export function RdIngredientsList({ ingredients, onRefresh }: RdIngredientsListProps) {
  const [editingIngredient, setEditingIngredient] = useState<RdIngredient | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return

    setDeletingId(id)
    try {
      await deleteRDIngredient(id)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete ingredient:', error)
      alert('Failed to delete ingredient. It may be used in formulas.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleModalClose = () => {
    setEditingIngredient(null)
    setIsCreating(false)
    onRefresh()
  }

  if (ingredients.length === 0 && !isCreating) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No R&D Ingredients Yet</h3>
        <p className="mt-2 text-sm text-gray-600">
          Create your first R&D ingredient to start building formulas.
        </p>
        <button
          onClick={() => setIsCreating(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add R&D Ingredient
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">R&D Ingredients</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-1.5 text-sm font-medium text-[#174940] hover:bg-[#174940]/5"
        >
          <Plus className="h-4 w-4" />
          Add Ingredient
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                On Hand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Total Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Cost/Gram
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {ingredients.map((ingredient) => {
              const totalValue = ingredient.on_hand * (ingredient.cost_per_gram ?? 0)
              const isLowStock = ingredient.reorder_point && ingredient.on_hand <= ingredient.reorder_point

              return (
                <tr key={ingredient.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {ingredient.name}
                      {ingredient.organic_cert && (
                        <span className="text-xs text-green-600">🌿</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {ingredient.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ingredient.description || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {ingredient.unit || 'g'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    <span className={isLowStock ? 'font-semibold text-red-600' : ''}>
                      {ingredient.on_hand}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {totalValue > 0 ? `$${totalValue.toFixed(2)}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {ingredient.cost_per_gram ? `$${ingredient.cost_per_gram.toFixed(4)}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingIngredient(ingredient)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ingredient.id)}
                        disabled={deletingId === ingredient.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deletingId === ingredient.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {(isCreating || editingIngredient) && (
        <RdIngredientModal
          ingredient={editingIngredient}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
