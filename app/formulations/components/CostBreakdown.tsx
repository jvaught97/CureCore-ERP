'use client'

import { DollarSign, AlertCircle, Package, Beaker } from 'lucide-react'
import type { ManufacturingCostBreakdown } from '../_actions/costing'

type CostBreakdownProps = {
  costData: ManufacturingCostBreakdown | null
  loading?: boolean
}

export function CostBreakdown({ costData, loading }: CostBreakdownProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Manufacturing Cost Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!costData) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900">Cost calculation unavailable</p>
            <p className="text-sm text-amber-700">
              Please set unit size and ensure all ingredients and packaging have costs assigned.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {costData.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900">Cost Warnings</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {costData.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Cost Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Manufacturing Cost Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">
            Per unit ({costData.unit_pack_size_value}
            {costData.unit_pack_size_unit}) • Yield: {costData.process_yield_pct}%
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Ingredients Section */}
          {costData.ingredients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Beaker className="h-4 w-4 text-[#174940]" />
                <h4 className="font-semibold text-gray-900">Ingredients</h4>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingredient
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Phase
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        %
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Qty (g)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Cost/g
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {costData.ingredients.map((ing, index) => (
                      <tr key={index} className={ing.warning ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {ing.ingredient_name}
                          {ing.warning && (
                            <span className="ml-2 text-xs text-amber-600">⚠</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ing.phase}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {ing.percentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {ing.quantity_grams.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {ing.cost_per_gram !== null
                            ? formatCurrency(ing.cost_per_gram)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(ing.total_cost)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={5} className="px-4 py-3 text-sm text-gray-900">
                        Ingredients Subtotal
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(costData.total_ingredients_cost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Packaging Section */}
          {costData.packaging.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-[#174940]" />
                <h4 className="font-semibold text-gray-900">Packaging</h4>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Item
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Cost/Unit
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {costData.packaging.map((pkg, index) => (
                      <tr key={index} className={pkg.warning ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {pkg.packaging_name}
                          {pkg.warning && (
                            <span className="ml-2 text-xs text-amber-600">⚠</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {pkg.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {pkg.cost_per_unit !== null
                            ? formatCurrency(pkg.cost_per_unit)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(pkg.total_cost)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">
                        Packaging Subtotal
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(costData.total_packaging_cost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total Manufacturing Cost */}
          <div className="rounded-lg bg-[#174940] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-3">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">
                    Total Manufacturing Cost
                  </p>
                  <p className="text-xs text-white/60">Per unit production cost</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(costData.total_manufacturing_cost)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
