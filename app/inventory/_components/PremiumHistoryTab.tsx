'use client';

import { useRouter } from 'next/navigation';
import {
  History,
  Search,
  Sparkles,
  ArrowUpRight,
  Download,
  TrendingUp,
  ArrowUpDown,
  Calendar,
  Package,
  Box,
  RefreshCw
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

interface InventoryHistory {
  id: string;
  item_type: string;
  item_name: string;
  transaction_type: string;
  quantity: number;
  unit?: string;
  previous_quantity: number;
  new_quantity: number;
  employee_name: string | null;
  notes: string | null;
  created_at: string;
}

interface PremiumHistoryTabProps {
  history: InventoryHistory[];
  filteredHistory: InventoryHistory[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  historyFilter: string;
  setHistoryFilter: (filter: string) => void;
  dateRangeFilter: string;
  setDateRangeFilter: (range: string) => void;
  transactionTypeFilter: string;
  setTransactionTypeFilter: (type: string) => void;
}

export function PremiumHistoryTab({
  history,
  filteredHistory,
  loading,
  searchTerm,
  setSearchTerm,
  historyFilter,
  setHistoryFilter,
  dateRangeFilter,
  setDateRangeFilter,
  transactionTypeFilter,
  setTransactionTypeFilter
}: PremiumHistoryTabProps) {
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Calculate metrics
  const totalTransactions = history.length;

  const thisWeekCount = history.filter(h => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(h.created_at) >= weekAgo;
  }).length;

  // Find most active item
  const itemCounts: { [key: string]: number } = {};
  history.forEach(h => {
    itemCounts[h.item_name] = (itemCounts[h.item_name] || 0) + 1;
  });
  const mostActiveItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Helper functions for styling
  const getTransactionAccentColor = (transaction_type: string) => {
    const type = transaction_type.toLowerCase();
    if (type.includes('add') || type.includes('receive') || type.includes('increase')) {
      return 'bg-green-400';
    }
    if (type.includes('deduct') || type.includes('shipment') || type.includes('consumption') || type.includes('decrease')) {
      return 'bg-red-400';
    }
    if (type.includes('adjust') || type.includes('count')) {
      return 'bg-blue-400';
    }
    if (type.includes('transfer')) {
      return 'bg-purple-400';
    }
    return 'bg-gray-400';
  };

  const getTransactionBadgeColor = (transaction_type: string) => {
    const type = transaction_type.toLowerCase();
    if (type.includes('add') || type.includes('receive') || type.includes('increase')) {
      return 'bg-green-100 text-green-800';
    }
    if (type.includes('deduct') || type.includes('shipment') || type.includes('consumption') || type.includes('decrease')) {
      return 'bg-red-100 text-red-800';
    }
    if (type.includes('adjust') || type.includes('count')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (type.includes('transfer')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getItemTypeIcon = (item_type: string) => {
    return item_type === 'ingredient' ? Package : Box;
  };

  const getItemTypeBadgeColor = (item_type: string) => {
    return item_type === 'ingredient'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  // Filter options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time', helper: 'Complete history' },
    { value: 'today', label: 'Today', helper: 'Last 24 hours' },
    { value: '7days', label: 'This Week', helper: 'Last 7 days' },
    { value: '30days', label: 'This Month', helper: 'Last 30 days' },
    { value: '90days', label: 'This Quarter', helper: 'Last 90 days' }
  ];

  const itemTypeOptions = [
    { value: 'all', label: 'All Items', helper: 'Ingredients & packaging' },
    { value: 'ingredient', label: 'Ingredients', helper: 'Raw materials only' },
    { value: 'packaging', label: 'Packaging', helper: 'Packaging only' }
  ];

  const transactionTypeOptions = [
    { value: 'all', label: 'All Transactions', helper: 'Every type' },
    { value: 'add', label: 'Additions', helper: 'Increases only' },
    { value: 'deduct', label: 'Deductions', helper: 'Decreases only' },
    { value: 'adjust', label: 'Adjustments', helper: 'Corrections' }
  ];

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${bgCard}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">History Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Transaction History</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Track all inventory movements and changes</p>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          { label: 'Total Transactions', value: totalTransactions, helper: 'Recent activity' },
          { label: 'This Week', value: thisWeekCount, helper: 'Last 7 days' },
          { label: 'Most Active Item', value: mostActiveItem, helper: 'Transaction leader' }
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
            <p className="text-lg font-semibold">Review your inventory transactions</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export history
            </button>
            <button
              onClick={() => alert('Analytics feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              View analytics
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 shadow-lg`}>
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textLight} w-5 h-5`} />
                <input
                  type="text"
                  placeholder="Search by item name, employee, or notes..."
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

            {/* Date Range Filters */}
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${textLight} mb-2`}>Date Range</p>
              <div className="flex flex-wrap gap-3">
                {dateRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRangeFilter(option.value)}
                    className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                      dateRangeFilter === option.value
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

            {/* Item Type Filters */}
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${textLight} mb-2`}>Item Type</p>
              <div className="flex flex-wrap gap-3">
                {itemTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setHistoryFilter(option.value)}
                    className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                      historyFilter === option.value
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

            {/* Transaction Type Filters */}
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${textLight} mb-2`}>Transaction Type</p>
              <div className="flex flex-wrap gap-3">
                {transactionTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTransactionTypeFilter(option.value)}
                    className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                      transactionTypeFilter === option.value
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
      </div>

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading history...</div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <History className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No transaction history</h3>
            <p className={`${textMuted} mt-1`}>
              {searchTerm || dateRangeFilter !== 'all' || historyFilter !== 'all' || transactionTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Transactions will appear here as inventory changes'}
            </p>
          </div>
        ) : (
          <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${getTableHeaderBg(mode)} sticky top-0`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Date/Time
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Item
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Type
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Transaction
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Quantity
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Change
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Employee
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  {filteredHistory.map((record) => {
                    const ItemIcon = getItemTypeIcon(record.item_type);
                    const isPositive = record.quantity > 0;

                    return (
                      <tr
                        key={record.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div
                            className={`absolute left-0 inset-y-0 w-1 ${getTransactionAccentColor(record.transaction_type)}`}
                          />
                          <div className={`text-sm ${textColor}`}>
                            {new Date(record.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className={`px-6 py-4`}>
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <ItemIcon className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-medium ${textColor}`}>{record.item_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getItemTypeBadgeColor(record.item_type)}`}
                          >
                            {record.item_type === 'ingredient' ? 'Ingredient' : 'Packaging'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getTransactionBadgeColor(record.transaction_type)}`}
                          >
                            {record.transaction_type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right`}>
                          <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{record.quantity} {record.unit || ''}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right text-xs ${textMuted}`}>
                          {record.previous_quantity} → {record.new_quantity}
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {record.employee_name || 'System'}
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {record.notes || '—'}
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
