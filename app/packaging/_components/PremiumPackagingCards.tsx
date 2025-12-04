'use client';

import {
  Sparkles,
  ArrowUpRight,
  Download,
  Package,
  ArrowUpDown,
  PlayCircle,
  Eye
} from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils';

type Batch = {
  id: string;
  batch_code: string;
  sku: string;
  formulation_id: string;
  size_liters: number;
  manufacturing_status: string;
  packaging_status: string;
  units_produced: number | null;
  storage_location: string | null;
  packaging_notes: string | null;
  expected_yield: number;
  sent_to_packaging_at: string;
  formulations: {
    name: string;
    version: string;
    packaging_steps: string | null;
  };
};

interface PremiumPackagingCardsProps {
  batches: Batch[];
  loading: boolean;
  onStartBatch: (batch: Batch) => void;
  onViewBatch: (batch: Batch) => void;
}

export function PremiumPackagingCards({
  batches,
  loading,
  onStartBatch,
  onViewBatch
}: PremiumPackagingCardsProps) {
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Calculate metrics
  const readyCount = batches.filter(b => b.packaging_status === 'ready').length;
  const inProcessCount = batches.filter(b => b.packaging_status === 'in_process').length;
  const totalExpectedUnits = batches.reduce((sum, b) => sum + b.expected_yield, 0);

  const getStatusColor = (status: string) => {
    if (status === 'ready') {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', accent: 'bg-yellow-400' };
    }
    return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', accent: 'bg-blue-400' };
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          { label: 'Ready to Start', value: readyCount, helper: 'Awaiting packaging' },
          { label: 'In Progress', value: inProcessCount, helper: 'Currently working' },
          { label: 'Expected Units', value: totalExpectedUnits, helper: 'Total yield' }
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
            <p className="text-lg font-semibold">Manage your packaging pipeline</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Sort by priority feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by priority
            </button>
            <button
              onClick={() => alert('Export queue feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export queue
            </button>
          </div>
        </div>
      </div>

      {/* Premium Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading batches...</div>
          </div>
        ) : batches.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-16 ${textColor} shadow-lg`}
          >
            <Package className={`mx-auto h-16 w-16 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-xl font-semibold">No batches ready for packaging</h3>
            <p className={`${textMuted} mt-2`}>
              Batches will appear here when sent from manufacturing
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {batches.map((batch) => {
              const statusColors = getStatusColor(batch.packaging_status);
              const isReady = batch.packaging_status === 'ready';

              return (
                <div
                  key={batch.id}
                  className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} shadow-xl hover:shadow-2xl transition-all duration-300 group`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 inset-y-0 w-1.5 ${statusColors.accent}`} />

                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 ${
                      mode === 'neon'
                        ? 'bg-gradient-to-br from-white/5 to-transparent'
                        : 'bg-gradient-to-br from-[#174940]/3 to-transparent'
                    }`}
                  />

                  <div className="relative p-8">
                    <div className="flex items-start justify-between">
                      {/* Left content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="bg-[#174940]/10 rounded-full p-3">
                            <Package className="w-6 h-6 text-[#48A999]" />
                          </div>
                          <div>
                            <h3 className={`text-2xl font-bold ${textColor}`}>
                              {batch.batch_code}
                            </h3>
                            <p className={`${textMuted} text-sm mt-0.5`}>
                              {batch.formulations?.name} {batch.formulations?.version}
                            </p>
                          </div>
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${statusColors.bg} ${statusColors.text}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${statusColors.dot} animate-pulse`} />
                            {isReady ? 'Ready to Start' : 'In Progress'}
                          </div>
                        </div>

                        {/* Batch details */}
                        <div className="grid grid-cols-3 gap-6 mt-6">
                          <div>
                            <p className={`text-xs uppercase tracking-wider ${textLight} mb-1`}>SKU</p>
                            <p className={`font-semibold ${textColor}`}>{batch.sku}</p>
                          </div>
                          <div>
                            <p className={`text-xs uppercase tracking-wider ${textLight} mb-1`}>Expected Units</p>
                            <p className={`font-semibold ${textColor}`}>{batch.expected_yield}</p>
                          </div>
                          <div>
                            <p className={`text-xs uppercase tracking-wider ${textLight} mb-1`}>Sent to Packaging</p>
                            <p className={`font-semibold ${textColor}`}>
                              {new Date(batch.sent_to_packaging_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Additional info */}
                        <div className="mt-4 flex items-center gap-4 text-sm">
                          <div className={`flex items-center gap-2 ${textMuted}`}>
                            <div className="bg-[#48A999]/10 rounded px-2 py-1">
                              <span className="text-[#48A999] font-medium">{batch.size_liters}L</span>
                            </div>
                            <span>Batch Size</span>
                          </div>
                        </div>
                      </div>

                      {/* Right action buttons */}
                      <div className="flex flex-col gap-3 ml-6">
                        {isReady ? (
                          <button
                            onClick={() => onStartBatch(batch)}
                            className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.05] transition-transform"
                          >
                            <PlayCircle className="w-5 h-5" />
                            Start Packaging
                          </button>
                        ) : (
                          <button
                            onClick={() => onViewBatch(batch)}
                            className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.05] transition-transform"
                          >
                            <Eye className="w-5 h-5" />
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
