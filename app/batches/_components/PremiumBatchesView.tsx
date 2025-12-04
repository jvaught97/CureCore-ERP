'use client';

import {
  Sparkles,
  ArrowUpRight,
  Download,
  TrendingUp,
  ArrowUpDown,
  Eye,
  Package,
  FlaskConical
} from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor,
  getTableHeaderBg,
  getTableRowHover
} from '@/lib/utils/themeUtils';

type Batch = {
  id: string;
  batch_code: string;
  sku: string;
  formulation_id: string;
  size_liters: number;
  manufacturing_status: 'in_process' | 'completed';
  packaging_status: 'pending' | 'ready' | 'in_process' | 'completed';
  expected_yield: number;
  actual_yield: number | null;
  created_at: string;
  sent_to_packaging_at: string | null;
  formulations: {
    name: string;
    version: string;
  } | null;
};

interface PremiumBatchesViewProps {
  batches: Batch[];
  loading: boolean;
  onView: (batch: Batch) => void;
  onExport: () => void;
}

export function PremiumBatchesView({
  batches,
  loading,
  onView,
  onExport
}: PremiumBatchesViewProps) {
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Calculate metrics
  const activeBatches = batches.filter(b => b.manufacturing_status === 'in_process').length;
  const completedToday = batches.filter(b => {
    const created = new Date(b.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString() && b.manufacturing_status === 'completed';
  }).length;
  const readyForPackaging = batches.filter(b => b.packaging_status === 'ready').length;

  const getManufacturingColor = (status: string) => {
    return status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  const getManufacturingDot = (status: string) => {
    return status === 'completed' ? 'bg-green-500' : 'bg-blue-500';
  };

  const getPackagingColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_process':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPackagingDot = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'ready':
        return 'bg-yellow-500';
      case 'in_process':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-4">
        {[
          { label: 'Active Batches', value: activeBatches, helper: 'In manufacturing' },
          { label: 'Completed Today', value: completedToday, helper: 'Finished batches' },
          { label: 'Ready for Packaging', value: readyForPackaging, helper: 'Awaiting packaging' },
          { label: 'Total Batches', value: batches.length, helper: 'All time' }
        ].map((metric) => (
          <div
            key={metric.label}
            className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl`}
          >
            <div
              className={`absolute inset-0 ${
                mode === 'neon'
                  ? 'bg-gradient-to-br from-white/10 to-transparent'
                  : 'bg-gradient-to-br from-[#174940]/5 to-transparent'
              }`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>{metric.label}</p>
                <p className="text-3xl font-bold mt-2">{metric.value}</p>
                <p className={`text-xs ${textLight} mt-1`}>{metric.helper}</p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-[#48A999]" />
            </div>
          </div>
        ))}
      </div>

      {/* Action Ribbon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`${bgCard} rounded-2xl border ${borderColor} p-6 ${textColor} shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}
        >
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Workflow shortcuts</p>
            <p className="text-lg font-semibold">Manage your production pipeline</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onExport}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
            <button
              onClick={() => alert('Send to packaging feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Package className="w-4 h-4" />
              Batch send
            </button>
            <button
              onClick={() => alert('Bulk complete feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              Bulk complete
            </button>
          </div>
        </div>
      </div>

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading batches...</div>
          </div>
        ) : batches.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <FlaskConical className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No batches yet</h3>
            <p className={`${textMuted} mt-1`}>Click "New Batch" to create one.</p>
          </div>
        ) : (
          <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${getTableHeaderBg(mode)} sticky top-0`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      <button className="flex items-center gap-2 hover:text-[#48A999] transition">
                        Batch Code
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      SKU
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Formulation
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Manufacturing
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Packaging
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Created
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  {batches.map((batch) => {
                    const isCompleted = batch.manufacturing_status === 'completed';

                    return (
                      <tr
                        key={batch.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div
                            className={`absolute left-0 inset-y-0 w-1 ${
                              isCompleted ? 'bg-green-400' : 'bg-blue-400'
                            }`}
                          />
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <FlaskConical className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-medium ${textColor}`}>{batch.batch_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>{batch.sku}</td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {batch.formulations?.name} {batch.formulations?.version}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getManufacturingColor(batch.manufacturing_status)}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${getManufacturingDot(batch.manufacturing_status)}`} />
                            {batch.manufacturing_status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getPackagingColor(batch.packaging_status)}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${getPackagingDot(batch.packaging_status)}`} />
                            {batch.packaging_status}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {new Date(batch.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => onView(batch)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
