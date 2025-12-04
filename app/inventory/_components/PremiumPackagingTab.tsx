'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Download,
  TrendingUp,
  ArrowUpDown
} from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor,
  getCardHoverBorder,
  getTableHeaderBg,
  getTableRowHover
} from '@/lib/utils/themeUtils';

interface PackagingItem {
  id: string;
  name: string;
  category: string | null;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  cost_per_unit: number | null;
  status: string | null;
}

interface PremiumPackagingTabProps {
  packaging: PackagingItem[];
  filteredPackaging: PackagingItem[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showLowStock: boolean;
  setShowLowStock: (show: boolean) => void;
  onEdit: (item: PackagingItem) => void;
  onDelete?: (item: PackagingItem) => void;
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export function PremiumPackagingTab({
  packaging,
  filteredPackaging,
  loading,
  searchTerm,
  setSearchTerm,
  showLowStock,
  setShowLowStock,
  onEdit,
  onDelete
}: PremiumPackagingTabProps) {
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);
  const bgCardHover = getCardHoverBorder(mode);

  // Calculate metrics
  const lowStockCount = packaging.filter(
    (pkg) => pkg.reorder_point && pkg.on_hand <= pkg.reorder_point
  ).length;

  const totalValue = packaging.reduce((sum, pkg) => {
    if (pkg.cost_per_unit) {
      return sum + pkg.cost_per_unit * pkg.on_hand;
    }
    return sum;
  }, 0);

  const handleEdit = (item: PackagingItem) => {
    onEdit(item);
  };

  const handleDelete = (item: PackagingItem) => {
    if (onDelete) {
      onDelete(item);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${bgCard}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Packaging Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Packaging</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Your packaging inventory at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/packaging/add')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              Add Packaging
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          { label: 'Total Packaging Items', value: packaging.length, helper: 'Active inventory' },
          { label: 'Low Stock Alerts', value: lowStockCount, helper: 'Needs reorder' },
          { label: 'Total Value', value: `$${formatNumber(totalValue, 2)}`, helper: 'Current holdings' }
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
            <p className="text-lg font-semibold">Keep your packaging inventory current</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Quick reorder feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              Quick reorder
            </button>
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
            <button
              onClick={() => setShowLowStock(!showLowStock)}
              className={`flex items-center gap-2 rounded-full border ${
                showLowStock ? 'border-[#48A999] bg-[#48A999]/10' : borderColor
              } px-4 py-2 hover:border-[#174940] transition`}
            >
              <AlertTriangle className="w-4 h-4" />
              {showLowStock ? 'Show All' : 'View low stock'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 shadow-lg`}>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textLight} w-5 h-5`} />
              <input
                type="text"
                placeholder="Search packaging..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl ${
                  mode === 'neon'
                    ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                } border focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading packaging...</div>
          </div>
        ) : filteredPackaging.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <Box className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No packaging items match that view</h3>
            <p className={`${textMuted} mt-1`}>
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding a new packaging item.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/packaging/add')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Packaging
                </button>
              </div>
            )}
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
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      On Hand
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Reorder Point
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Cost/Unit
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  {filteredPackaging.map((pkg) => {
                    const isLowStock = pkg.reorder_point && pkg.on_hand <= pkg.reorder_point;
                    const fileCount = (pkg as any).packaging_files?.length || 0;

                    return (
                      <tr
                        key={pkg.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div
                            className={`absolute left-0 inset-y-0 w-1 ${
                              isLowStock ? 'bg-amber-400' : 'bg-green-400'
                            }`}
                          />
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <Box className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-medium ${textColor}`}>{pkg.name}</p>
                              {fileCount > 0 && (
                                <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                  {fileCount} file{fileCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right ${textColor} font-medium`}>
                          {formatNumber(pkg.on_hand)} {pkg.unit}
                        </td>
                        <td className={`px-6 py-4 text-right ${textMuted}`}>
                          {pkg.reorder_point ? `${formatNumber(pkg.reorder_point)} ${pkg.unit}` : '—'}
                        </td>
                        <td className={`px-6 py-4 text-right ${textColor}`}>
                          {pkg.cost_per_unit ? `$${pkg.cost_per_unit.toFixed(4)}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                              isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLowStock ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                            />
                            {isLowStock ? 'Low Stock' : 'In Stock'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleEdit(pkg)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {onDelete && (
                              <button
                                onClick={() => handleDelete(pkg)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
