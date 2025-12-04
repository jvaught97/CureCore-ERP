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
  Package,
  Layers
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

interface PackagingSupply {
  id: string;
  name: string;
  category: string;
  on_hand: number;
  unit: string;
  cost_per_unit: number | null;
  reorder_point: number | null;
  sku: string | null;
  size_spec: string | null;
  status: string | null;
}

interface PremiumPackagingSuppliesTabProps {
  items: PackagingSupply[];
  filteredItems: PackagingSupply[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  onAdd: () => void;
  onEdit: (item: PackagingSupply) => void;
  onDelete?: (item: PackagingSupply) => void;
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export function PremiumPackagingSuppliesTab({
  items,
  filteredItems,
  loading,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  onAdd,
  onEdit,
  onDelete
}: PremiumPackagingSuppliesTabProps) {
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);
  const tableHeaderBg = getTableHeaderBg(mode);
  const tableRowHover = getTableRowHover(mode);

  // Calculate metrics
  const lowStockCount = items.filter(
    (item) => item.reorder_point && item.on_hand < item.reorder_point
  ).length;

  const totalValue = items.reduce((sum, item) => {
    if (item.cost_per_unit) {
      return sum + item.cost_per_unit * item.on_hand;
    }
    return sum;
  }, 0);

  const categoryOptions = [
    { value: 'all', label: 'All Supplies', helper: 'Complete catalog' },
    { value: 'box', label: 'Boxes', helper: 'Shipping boxes' },
    { value: 'filler', label: 'Fillers', helper: 'Tissue paper, peanuts' },
    { value: 'cushioning', label: 'Cushioning', helper: 'Bubble wrap, foam' },
    { value: 'tape', label: 'Tape & Labels', helper: 'Adhesives, stickers' },
    { value: 'label', label: 'Labels', helper: 'Shipping labels' }
  ];

  const getCategoryBadgeColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'box':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'filler':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'cushioning':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'tape':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'label':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Packaging Supplies Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Packaging Supplies</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Track boxes, fillers, and shipping materials</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAdd}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              Add Supply
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          { label: 'Total Supplies', value: items.length, helper: 'Active inventory' },
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
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-6 ${textColor} shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Workflow shortcuts</p>
            <p className="text-lg font-semibold">Manage your packaging inventory</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export list
            </button>
            <button
              onClick={() => alert('Bulk import feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Package className="w-4 h-4" />
              Bulk import
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textLight}`} />
          <input
            type="text"
            placeholder="Search by name, SKU, size spec..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${borderColor} ${bgCard} ${textColor} placeholder:${textMuted} focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3">
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setCategoryFilter(option.value)}
              className={`flex flex-col items-start px-4 py-2 rounded-full transition-all ${
                categoryFilter === option.value
                  ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg shadow-[#174940]/30'
                  : `border ${borderColor} ${textColor} hover:border-[#174940]`
              }`}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className={`text-xs ${categoryFilter === option.value ? 'text-white/80' : textMuted}`}>
                {option.helper}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className={`text-sm ${textMuted}`}>Loading supplies...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={`text-center py-12 ${textColor}`}>
              <Box className={`mx-auto h-16 w-16 ${textLight} mb-4 animate-pulse`} />
              <h3 className="text-lg font-semibold mb-2">No supplies found</h3>
              <p className={`${textMuted} mb-6`}>
                {searchTerm || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first packaging supply'}
              </p>
              <button
                onClick={onAdd}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} ${textColor} hover:border-[#174940] transition`}
              >
                <Plus className="h-4 w-4" />
                Add First Supply
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${tableHeaderBg} sticky top-0`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Item
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Category
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      SKU
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Size/Spec
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      On Hand
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Cost/Unit
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Total Value
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => {
                    const isLowStock = item.reorder_point && item.on_hand < item.reorder_point;
                    const totalValue = item.cost_per_unit ? item.cost_per_unit * item.on_hand : 0;

                    return (
                      <tr
                        key={item.id}
                        className={`${tableRowHover} transition-colors relative`}
                      >
                        {/* Left accent bar */}
                        <td className="relative">
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1 ${
                              isLowStock ? 'bg-red-400' : 'bg-[#48A999]'
                            }`}
                          />
                          <div className="px-6 py-4 pl-8">
                            <div className="flex items-center gap-3">
                              <Box className="w-5 h-5 text-[#48A999]" />
                              <div>
                                <p className={`font-medium ${textColor}`}>{item.name}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeColor(
                              item.category
                            )}`}
                          >
                            {item.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {item.sku || '-'}
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {item.size_spec || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isLowStock ? 'text-red-500' : textColor}`}>
                              {formatNumber(item.on_hand)} {item.unit}
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="w-4 h-4 text-red-500" title="Low stock" />
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          ${formatNumber(item.cost_per_unit, 4)}
                        </td>
                        <td className={`px-6 py-4 font-medium ${textColor}`}>
                          ${formatNumber(totalValue, 2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              item.status === 'active'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {item.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onEdit(item)}
                              className={`p-2 rounded-lg ${bgCard} border ${borderColor} hover:border-[#48A999] transition`}
                              title="Edit supply"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {onDelete && (
                              <button
                                onClick={() => onDelete(item)}
                                className={`p-2 rounded-lg ${bgCard} border ${borderColor} hover:border-red-500 transition`}
                                title="Delete supply"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
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
          )}
        </div>
      </div>
    </div>
  );
}
