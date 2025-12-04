'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scale,
  Search,
  Plus,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Download,
  ArrowUpDown,
  Package,
  TrendingUp,
  Filter
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

interface Container {
  id: string;
  container_code: string;
  label: string | null;
  status: 'backstock' | 'active' | 'quarantine' | 'empty' | string;
  location: string | null;
  tare_weight: number;
  tare_unit: string;
  current_net_weight: number | null;
  last_weighed_at: string | null;
  item_master: {
    id: string;
    name: string;
    sku: string;
  };
  item_lots: {
    lot_number: string;
    expiry_date: string | null;
  };
}

interface PremiumContainersTabProps {
  containers: Container[];
  filteredContainers: Container[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export function PremiumContainersTab({
  containers,
  filteredContainers,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter
}: PremiumContainersTabProps) {
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);
  const bgCardHover = getCardHoverBorder(mode);

  // Calculate metrics
  const backstockCount = containers.filter(c => c.status === 'backstock').length;
  const activeCount = containers.filter(c => c.status === 'active').length;

  const containersNeedingCount = containers.filter(c =>
    !c.last_weighed_at ||
    (new Date().getTime() - new Date(c.last_weighed_at).getTime()) > 30 * 24 * 60 * 60 * 1000
  ).length;

  const avgFillPercent = containers.length > 0
    ? containers.reduce((sum, c) => {
        if (c.current_net_weight && c.tare_weight) {
          return sum + ((c.current_net_weight / (c.current_net_weight + c.tare_weight)) * 100);
        }
        return sum;
      }, 0) / containers.length
    : 0;

  const statusOptions = [
    { value: 'all', label: 'All Statuses', helper: 'Complete catalog' },
    { value: 'backstock', label: 'Backstock', helper: 'Storage containers' },
    { value: 'active', label: 'Active', helper: 'In use' },
    { value: 'quarantine', label: 'Quarantine', helper: 'On hold' },
    { value: 'empty', label: 'Empty', helper: 'Available' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backstock':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'quarantine':
        return 'bg-yellow-100 text-yellow-800';
      case 'empty':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'backstock':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'quarantine':
        return 'bg-yellow-500';
      case 'empty':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
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
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Container Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Containers</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Your container tracking at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/inventory/containers/new')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              Add Container
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-4">
        {[
          { label: 'Total Containers', value: containers.length, helper: 'Active tracking' },
          { label: 'Backstock', value: backstockCount, helper: 'In storage' },
          { label: 'Active (In Use)', value: activeCount, helper: 'Currently used' },
          { label: 'Needs Count', value: containersNeedingCount, helper: 'Requires weighing' }
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
            <p className="text-lg font-semibold">Manage your container operations</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Scan container feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Scale className="w-4 h-4" />
              Scan container
            </button>
            <button
              onClick={() => alert('Weigh tare feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              Weigh tare
            </button>
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export data
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
                  placeholder="Search containers..."
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

            {/* Smart Status Filter Buttons */}
            <div className="flex flex-wrap gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                    statusFilter === option.value
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

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading containers...</div>
          </div>
        ) : filteredContainers.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <Scale className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No containers match that view</h3>
            <p className={`${textMuted} mt-1`}>
              {searchTerm ? 'Try adjusting your search or filter' : 'Get started by adding a new container.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/inventory/containers/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Container
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
                        Container
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Item
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Lot
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Weight
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Location
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Last Weighed
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  {filteredContainers.map((container) => {
                    const needsCount = !container.last_weighed_at ||
                      (new Date().getTime() - new Date(container.last_weighed_at).getTime()) > 30 * 24 * 60 * 60 * 1000;

                    return (
                      <tr
                        key={container.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div
                            className={`absolute left-0 inset-y-0 w-1 ${
                              needsCount ? 'bg-amber-400' : getStatusDotColor(container.status).replace('bg-', 'bg-')
                            }`}
                          />
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <Scale className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-bold ${textColor}`}>{container.container_code}</p>
                              {container.label && (
                                <p className={`text-xs ${textLight}`}>{container.label}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {container.item_master?.name}
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {container.item_lots?.lot_number}
                        </td>
                        <td className={`px-6 py-4 text-right`}>
                          <span className={`font-semibold ${textColor}`}>
                            {formatNumber(container.current_net_weight || 0, 2)} {container.tare_unit}
                          </span>
                          <div className={`text-xs ${textLight}`}>
                            Tare: {formatNumber(container.tare_weight, 2)} {container.tare_unit}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {container.location || '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(container.status)}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(container.status)}`} />
                            {container.status.charAt(0).toUpperCase() + container.status.slice(1)}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {container.last_weighed_at
                            ? new Date(container.last_weighed_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => router.push(`/inventory/containers/${container.id}`)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-xs font-medium px-3"
                              title="View"
                            >
                              View
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
