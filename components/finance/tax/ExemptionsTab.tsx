'use client';

import { ShieldCheck } from 'lucide-react';

type ExemptionsTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
};

export function ExemptionsTab({ showToast }: ExemptionsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#174940]" />
        <h2 className="text-lg font-semibold text-gray-900">Tax Exemptions</h2>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          Manage customer exemption certificates (resale, nonprofit, etc.) with file uploads
        </p>
        <div className="mt-4 text-center text-sm text-gray-400">
          Implementation: Table with Customer, Jurisdiction, Cert #, Valid From/To, File link
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Use listExemptions, upsertExemption, getExpiringExemptions actions.
          File upload to Supabase storage.
        </p>
      </div>
    </div>
  );
}
