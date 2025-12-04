'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Star,
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

interface Ingredient {
  id: string;
  name: string;
  category: string;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  cost_per_gram: number | null;
  status: string | null;
  organic_cert: boolean | null;
}

interface PremiumIngredientsTabProps {
  ingredients: Ingredient[];
  filteredIngredients: Ingredient[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  onEdit: (ingredient: Ingredient) => void;
  onDelete?: (ingredient: Ingredient) => void;
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export function PremiumIngredientsTab({
  ingredients,
  filteredIngredients,
  loading,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  onEdit,
  onDelete
}: PremiumIngredientsTabProps) {
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);
  const bgCardHover = getCardHoverBorder(mode);

  // Calculate metrics
  const lowStockCount = ingredients.filter(
    (ing) => ing.reorder_point && ing.on_hand < ing.reorder_point
  ).length;

  const totalValue = ingredients.reduce((sum, ing) => {
    if (ing.cost_per_gram) {
      return sum + ing.cost_per_gram * ing.on_hand;
    }
    return sum;
  }, 0);

  const categoryOptions = [
    { value: 'all', label: 'All Ingredients', helper: 'Complete catalog' },
    { value: 'Oils and Butters', label: 'Oils & Butters', helper: 'Carrier oils, bases' },
    { value: 'Cannabinoids', label: 'Cannabinoids', helper: 'CBD, CBG, isolates' },
    { value: 'Extracts and Actives', label: 'Actives', helper: 'Botanicals, extracts' },
    { value: 'Functional Additives', label: 'Functional', helper: 'Preservatives, emulsifiers' },
    { value: 'Base Ingredients', label: 'Bases', helper: 'Foundational materials' },
    { value: 'Essential Oils', label: 'Essential Oils', helper: 'Aromatics & fragrances' }
  ];

  const handleEdit = (ingredient: Ingredient) => {
    onEdit(ingredient);
  };

  const handleDelete = (ingredient: Ingredient) => {
    if (onDelete) {
      onDelete(ingredient);
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
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Ingredient Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Ingredients</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Your formulation arsenal at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/inventory')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              Add Ingredient
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          { label: 'Total Ingredients', value: ingredients.length, helper: 'Active inventory' },
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
            <p className="text-lg font-semibold">Keep your ingredient intelligence current</p>
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
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <AlertTriangle className="w-4 h-4" />
              View low stock
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 shadow-lg`}>
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textLight} w-5 h-5`} />
                <input
                  type="text"
                  placeholder="Search ingredients..."
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

            {/* Smart Category Filter Buttons */}
            <div className="flex flex-wrap gap-3">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedCategory(option.value)}
                  className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                    selectedCategory === option.value
                      ? `border-[#48A999] ${textColor} ${
                          mode === 'neon'
                            ? 'shadow-[0_0_20px_rgba(72,169,153,0.4)]'
                            : 'shadow-md bg-[#48A999]/10'
                        }`
                      : `${borderColor} ${textMuted} hover:border-[#174940]`
                  }`}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className={`text-xs ${textLight}`}>{option.helper}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading ingredients...</div>
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <Package className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No ingredients match that view</h3>
            <p className={`${textMuted} mt-1`}>
              {searchTerm ? 'Try adjusting your search or filter' : 'Get started by adding a new ingredient.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/inventory')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Ingredient
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
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Category
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      On Hand
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
                  {filteredIngredients.map((ingredient) => (
                    <tr
                      key={ingredient.id}
                      className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                    >
                      {/* Left accent bar */}
                      <td className="relative px-6 py-4">
                        <div
                          className={`absolute left-0 inset-y-0 w-1 ${
                            ingredient.on_hand < (ingredient.reorder_point || 0)
                              ? 'bg-amber-400'
                              : 'bg-green-400'
                          }`}
                        />
                        <div className="flex items-center gap-3">
                          <div className="bg-[#174940]/10 rounded-full p-2">
                            <Package className="w-4 h-4 text-[#48A999]" />
                          </div>
                          <div>
                            <p className={`font-medium ${textColor}`}>{ingredient.name}</p>
                            {ingredient.organic_cert && (
                              <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                Organic
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${textMuted}`}>{ingredient.category}</td>
                      <td className={`px-6 py-4 text-right ${textColor} font-medium`}>
                        {formatNumber(ingredient.on_hand)} {ingredient.unit}
                      </td>
                      <td className={`px-6 py-4 text-right ${textColor}`}>
                        {ingredient.cost_per_gram ? `$${ingredient.cost_per_gram.toFixed(4)}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            ingredient.on_hand < (ingredient.reorder_point || 0)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              ingredient.on_hand < (ingredient.reorder_point || 0)
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                          />
                          {ingredient.on_hand < (ingredient.reorder_point || 0) ? 'Low Stock' : 'In Stock'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleEdit(ingredient)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {onDelete && (
                            <button
                              onClick={() => handleDelete(ingredient)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
