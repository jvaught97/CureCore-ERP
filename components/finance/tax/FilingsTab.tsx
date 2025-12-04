'use client';

import { Stamp } from 'lucide-react';

type FilingsTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
};

export function FilingsTab({ showToast }: FilingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Stamp className="h-6 w-6 text-[#174940]" />
        <h2 className="text-lg font-semibold text-gray-900">Tax Filings</h2>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          Generate, file, and track monthly/quarterly/annual tax returns by jurisdiction
        </p>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <div><strong>Actions:</strong></div>
          <ul className="ml-6 list-disc space-y-1">
            <li>Generate Filing: Computes tax_transactions sum for period</li>
            <li>Mark Filed: Updates status, stores reference/confirmation</li>
            <li>Record Payment: Tracks payment amount and date</li>
            <li>Export CSV/PDF: Downloads transaction detail</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Use generateFiling, listFilings, markFiled, recordPayment,
          exportTaxReport actions.
        </p>
      </div>
    </div>
  );
}
