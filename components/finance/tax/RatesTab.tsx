'use client';

import { Receipt } from 'lucide-react';

type RatesTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
};

export function RatesTab({ showToast }: RatesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-[#174940]" />
        <h2 className="text-lg font-semibold text-gray-900">Rates & Categories</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories Column */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Tax Categories</h3>
          <p className="text-sm text-gray-500">
            Manage product/service categories (e.g., TOPICAL_NONRX, FOOD_BEVERAGE)
          </p>
          <div className="mt-4 text-center text-sm text-gray-400">
            Implementation: CRUD for tax_categories table
          </div>
        </div>

        {/* Rates Column */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Tax Rates</h3>
          <p className="text-sm text-gray-500">
            Set rates by jurisdiction + category with effective date ranges
          </p>
          <div className="mt-4 text-center text-sm text-gray-400">
            Implementation: Filter/inline edit for tax_rates table
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> This tab manages categories and rates. Expand this component to
          include full CRUD operations using listTaxCategories, createOrUpdateTaxCategory,
          upsertTaxRate actions.
        </p>
      </div>
    </div>
  );
}
