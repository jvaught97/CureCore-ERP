'use client';

import {
  Sparkles,
  ArrowUpRight,
  Download,
  TrendingUp,
  ArrowUpDown,
  Eye,
  Trash2,
  FileText
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

type Formulation = {
  id: string;
  name: string;
  version: string;
  status: string;
  notes: string;
  steps: string;
  packaging_steps: string | null;
  unit_pack_size_value: number | null;
  unit_pack_size_unit: string | null;
  process_yield_pct: number | null;
  total_manufacturing_cost: number | null;
  created_at: string;
  created_by: string;
};

interface PremiumFormulationsViewProps {
  formulations: Formulation[];
  loading: boolean;
  onView: (formulation: Formulation) => void;
  onDelete: (formulation: Formulation) => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function PremiumFormulationsView({
  formulations,
  loading,
  onView,
  onDelete
}: PremiumFormulationsViewProps) {
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Calculate metrics
  const approvedCount = formulations.filter(f => f.status === 'approved').length;
  const draftCount = formulations.filter(f => f.status === 'draft').length;
  const avgCost = formulations.length > 0
    ? formulations.reduce((sum, f) => sum + (f.total_manufacturing_cost || 0), 0) / formulations.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-4">
        {[
          { label: 'Total Formulas', value: formulations.length, helper: 'Active library' },
          { label: 'Approved', value: approvedCount, helper: 'Production ready' },
          { label: 'Draft', value: draftCount, helper: 'In development' },
          { label: 'Avg Cost', value: formatCurrency(avgCost), helper: 'Per unit' }
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
            <p className="text-lg font-semibold">Manage your formulation library</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Batch calculate feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              Batch calculate
            </button>
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export library
            </button>
            <button
              onClick={() => alert('Duplicate feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <FileText className="w-4 h-4" />
              Duplicate
            </button>
          </div>
        </div>
      </div>

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading formulations...</div>
          </div>
        ) : formulations.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <FileText className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No formulations yet</h3>
            <p className={`${textMuted} mt-1`}>Click "New Formulation" to create one.</p>
          </div>
        ) : (
          <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${getTableHeaderBg(mode)} sticky top-0`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      <button className="flex items-center gap-2 hover:text-[#48A999] transition">
                        Name
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Version
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Mfg Cost
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
                  {formulations.map((formulation) => {
                    const isApproved = formulation.status === 'approved';

                    return (
                      <tr
                        key={formulation.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div
                            className={`absolute left-0 inset-y-0 w-1 ${
                              isApproved ? 'bg-green-400' : 'bg-gray-400'
                            }`}
                          />
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <FileText className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-medium ${textColor}`}>{formulation.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>{formulation.version}</td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                              isApproved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isApproved ? 'bg-green-500' : 'bg-gray-500'
                              }`}
                            />
                            {formulation.status}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right ${textColor} font-medium`}>
                          {formatCurrency(formulation.total_manufacturing_cost)}
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {new Date(formulation.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => onView(formulation)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(formulation);
                              }}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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
