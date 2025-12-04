'use client';

import { FileSpreadsheet } from 'lucide-react';

type ProductMappingTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
};

export function ProductMappingTab({ showToast }: ProductMappingTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-6 w-6 text-[#174940]" />
        <h2 className="text-lg font-semibold text-gray-900">Product Mapping</h2>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          Map products/SKUs to tax categories. Supports search, inline edit, and bulk updates.
        </p>
        <div className="mt-4 text-center text-sm text-gray-400">
          Implementation: List products with current category; inline change with effective date
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Use mapProductToTaxCategory and listProductMappings actions.
          Requires products table reference.
        </p>
      </div>
    </div>
  );
}
