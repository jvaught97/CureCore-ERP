'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import {
  Package,
  Search,
  Sparkles,
  ArrowUpRight,
  Calendar,
  Barcode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { AppNav } from '@/components/nav/AppNav';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor,
  getTableHeaderBg,
  getTableRowHover
} from '@/lib/utils/themeUtils';
import FinishedGoodDetailModal from './_components/FinishedGoodDetailModal';

interface FinishedGood {
  id: string;
  product_id: string | null;
  batch_id: string | null;
  batch_code: string | null;
  sku: string | null;
  product_name: string | null;
  quantity_available: number;
  quantity_allocated: number;
  unit: string;
  manufactured_date: string | null;
  expiry_date: string | null;
  lot_number: string | null;
  production_cost: number | null;
  location: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function FinishedGoodsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { mode } = useTheme();

  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [filteredGoods, setFilteredGoods] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFinishedGood, setSelectedFinishedGood] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const bgClass = getBackgroundClass(mode);
  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);
  const tableHeaderBg = getTableHeaderBg(mode);
  const tableRowHover = getTableRowHover(mode);

  useEffect(() => {
    fetchFinishedGoods();
  }, []);

  useEffect(() => {
    filterGoods();
  }, [finishedGoods, searchTerm, statusFilter]);

  const fetchFinishedGoods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finished_goods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching finished goods:', error);
        throw error;
      }

      setFinishedGoods(data || []);
    } catch (error) {
      console.error('Failed to fetch finished goods:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterGoods = () => {
    let filtered = [...finishedGoods];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (good) =>
          (good.product_name && good.product_name.toLowerCase().includes(term)) ||
          (good.batch_code && good.batch_code.toLowerCase().includes(term)) ||
          (good.sku && good.sku.toLowerCase().includes(term)) ||
          (good.lot_number && good.lot_number.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((good) => good.status === statusFilter);
    }

    setFilteredGoods(filtered);
  };

  // Calculate metrics
  const totalUnits = finishedGoods.reduce((sum, good) => sum + good.quantity_available, 0);
  const totalValue = finishedGoods.reduce(
    (sum, good) => sum + (good.production_cost || 0) * good.quantity_available,
    0
  );
  const allocatedUnits = finishedGoods.reduce((sum, good) => sum + good.quantity_allocated, 0);

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'allocated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'quarantine':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', helper: 'Show all items' },
    { value: 'available', label: 'Available', helper: 'Ready for sale' },
    { value: 'allocated', label: 'Allocated', helper: 'Reserved for orders' },
    { value: 'shipped', label: 'Shipped', helper: 'Already shipped' },
    { value: 'quarantine', label: 'Quarantine', helper: 'On hold' }
  ];

  return (
    <>
      <AppNav currentPage="finished-goods" />
      <div className={`min-h-screen ${bgClass}`}>
        <AnimatedBackground />
        <div className="relative z-10">
          {/* Premium Header */}
          <div className={`border-b ${borderColor} ${bgCard}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
                  <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">
                    Finished Goods Command
                  </p>
                </div>
                <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>
                  Finished Goods Inventory
                </h1>
                <p className={`${textMuted} text-sm md:text-base`}>
                  Track completed products ready for distribution
                </p>
              </div>
            </div>
          </div>

          {/* Hero Metrics Cards */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
            {[
              {
                label: 'Total Units',
                value: formatNumber(totalUnits),
                helper: 'In stock'
              },
              {
                label: 'Total Value',
                value: `$${formatNumber(totalValue, 2)}`,
                helper: 'Production cost'
              },
              {
                label: 'Allocated',
                value: formatNumber(allocatedUnits),
                helper: 'Reserved for orders'
              }
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
                    <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>
                      {metric.label}
                    </p>
                    <p className="text-3xl font-bold mt-2">{metric.value}</p>
                    <p className={`text-xs ${textLight} mt-1`}>{metric.helper}</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-[#48A999]" />
                </div>
              </div>
            ))}
          </div>

          {/* Action Ribbon */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <div
              className={`${bgCard} rounded-2xl border ${borderColor} p-6 ${textColor} shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}
            >
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>
                  Workflow shortcuts
                </p>
                <p className="text-lg font-semibold">Manage your finished goods</p>
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
                  onClick={() => fetchFinishedGoods()}
                  className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
                >
                  <Package className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textLight}`} />
              <input
                type="text"
                placeholder="Search by product name, batch code, SKU, or lot number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${borderColor} ${bgCard} ${textColor} placeholder:${textMuted} focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
              />
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`flex flex-col items-start px-4 py-2 rounded-full transition-all ${
                    statusFilter === option.value
                      ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg shadow-[#174940]/30'
                      : `border ${borderColor} ${textColor} hover:border-[#174940]`
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span
                    className={`text-xs ${
                      statusFilter === option.value ? 'text-white/80' : textMuted
                    }`}
                  >
                    {option.helper}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Premium Table */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className={`text-sm ${textMuted}`}>Loading finished goods...</div>
                </div>
              ) : filteredGoods.length === 0 ? (
                <div className={`text-center py-12 ${textColor}`}>
                  <Package className={`mx-auto h-16 w-16 ${textLight} mb-4 animate-pulse`} />
                  <h3 className="text-lg font-semibold mb-2">No finished goods found</h3>
                  <p className={`${textMuted} mb-6`}>
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Finished goods will appear here when batches are completed in packaging'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${tableHeaderBg} sticky top-0`}>
                      <tr>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Product
                        </th>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Batch Info
                        </th>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Quantity
                        </th>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Dates
                        </th>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Cost/Unit
                        </th>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Total Value
                        </th>
                        <th
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textColor}`}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredGoods.map((good) => {
                        const totalValue = (good.production_cost || 0) * good.quantity_available;
                        const isExpiringSoon =
                          good.expiry_date &&
                          new Date(good.expiry_date).getTime() - Date.now() <
                            30 * 24 * 60 * 60 * 1000;

                        return (
                          <tr
                            key={good.id}
                            onClick={() => {
                              setSelectedFinishedGood(good.id);
                              setDetailModalOpen(true);
                            }}
                            className={`${tableRowHover} transition-colors relative cursor-pointer`}
                          >
                            {/* Left accent bar */}
                            <td className="relative">
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1 ${
                                  good.status === 'available'
                                    ? 'bg-[#48A999]'
                                    : good.status === 'quarantine'
                                    ? 'bg-red-400'
                                    : 'bg-blue-400'
                                }`}
                              />
                              <div className="px-6 py-4 pl-8">
                                <div className="flex items-start gap-3">
                                  <Package className="w-5 h-5 text-[#48A999] mt-1" />
                                  <div>
                                    <p className={`font-medium ${textColor}`}>
                                      {good.product_name || 'Unknown Product'}
                                    </p>
                                    {good.sku && (
                                      <p className={`text-sm ${textMuted} flex items-center gap-1 mt-1`}>
                                        <Barcode className="w-3 h-3" />
                                        {good.sku}
                                      </p>
                                    )}
                                    {good.location && (
                                      <p className={`text-xs ${textLight} mt-1`}>
                                        📍 {good.location}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                {good.batch_code && (
                                  <p className={`text-sm font-medium ${textColor}`}>
                                    Batch: {good.batch_code}
                                  </p>
                                )}
                                {good.lot_number && (
                                  <p className={`text-xs ${textMuted} mt-1`}>
                                    Lot: {good.lot_number}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className={`font-medium ${textColor}`}>
                                  {formatNumber(good.quantity_available)} {good.unit}
                                </p>
                                {good.quantity_allocated > 0 && (
                                  <p className={`text-xs ${textMuted} mt-1`}>
                                    {formatNumber(good.quantity_allocated)} allocated
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                {good.manufactured_date && (
                                  <p className={`text-sm ${textColor} flex items-center gap-1`}>
                                    <Calendar className="w-3 h-3" />
                                    Mfg: {formatDate(good.manufactured_date)}
                                  </p>
                                )}
                                {good.expiry_date && (
                                  <p
                                    className={`text-xs mt-1 flex items-center gap-1 ${
                                      isExpiringSoon ? 'text-red-500' : textMuted
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    Exp: {formatDate(good.expiry_date)}
                                    {isExpiringSoon && (
                                      <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />
                                    )}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className={`px-6 py-4 ${textColor}`}>
                              ${formatNumber(good.production_cost, 4)}
                            </td>
                            <td className={`px-6 py-4 font-medium ${textColor}`}>
                              ${formatNumber(totalValue, 2)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                                  good.status
                                )}`}
                              >
                                {good.status}
                              </span>
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
      </div>

      {/* Detail Modal */}
      {detailModalOpen && selectedFinishedGood && (
        <FinishedGoodDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedFinishedGood(null);
          }}
          finishedGoodId={selectedFinishedGood}
          onUpdate={() => fetchFinishedGoods()}
        />
      )}
    </>
  );
}
