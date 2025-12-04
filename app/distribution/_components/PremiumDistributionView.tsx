'use client';

import {
  Sparkles,
  ArrowUpRight,
  Download,
  TrendingUp,
  ArrowUpDown,
  Eye,
  Truck,
  Package
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

type ShipmentRow = {
  id: string;
  status: string;
  carrier: string | null;
  service: string | null;
  ship_date: string | null;
  total_cost: number | null;
  sales_order_id: string | null;
  warehouses: { name: string | null } | null;
};

interface PremiumDistributionViewProps {
  shipments: ShipmentRow[];
  loading: boolean;
  onView: (shipment: ShipmentRow) => void;
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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'ready':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
    case 'in_transit':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' };
    case 'delivered':
      return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
    case 'cancelled':
      return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
  }
};

const getAccentColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'ready':
      return 'bg-blue-400';
    case 'in_transit':
      return 'bg-amber-400';
    case 'delivered':
      return 'bg-green-400';
    case 'cancelled':
      return 'bg-red-400';
    default:
      return 'bg-gray-400';
  }
};

export function PremiumDistributionView({
  shipments,
  loading,
  onView
}: PremiumDistributionViewProps) {
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Calculate metrics
  const readyCount = shipments.filter(s => s.status === 'ready').length;
  const inTransitCount = shipments.filter(s => s.status === 'in_transit').length;
  const deliveredCount = shipments.filter(s => s.status === 'delivered').length;
  const totalFreightCost = shipments.reduce((sum, s) => sum + (s.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-4">
        {[
          { label: 'Ready to Ship', value: readyCount, helper: 'Awaiting pickup' },
          { label: 'In Transit', value: inTransitCount, helper: 'On the road' },
          { label: 'Delivered', value: deliveredCount, helper: 'Completed' },
          { label: 'Total Freight', value: formatCurrency(totalFreightCost), helper: 'All shipments' }
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
            <p className="text-lg font-semibold">Manage your outbound logistics</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Batch tracking feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              Batch tracking
            </button>
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export manifest
            </button>
            <button
              onClick={() => alert('Print labels feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Package className="w-4 h-4" />
              Print labels
            </button>
          </div>
        </div>
      </div>

      {/* Premium Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={textMuted}>Loading shipments...</div>
          </div>
        ) : shipments.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <Truck className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No shipments yet</h3>
            <p className={`${textMuted} mt-1`}>Click "New Shipment" to create one.</p>
          </div>
        ) : (
          <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${getTableHeaderBg(mode)} sticky top-0`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      <button className="flex items-center gap-2 hover:text-[#48A999] transition">
                        Shipment
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Warehouse
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Carrier/Service
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Ship Date
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Freight Cost
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  {shipments.map((shipment) => {
                    const statusColors = getStatusColor(shipment.status);
                    const accentColor = getAccentColor(shipment.status);

                    return (
                      <tr
                        key={shipment.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div className={`absolute left-0 inset-y-0 w-1 ${accentColor}`} />
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <Truck className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-medium ${textColor}`}>SH-{shipment.id.slice(0, 8)}</p>
                              {shipment.sales_order_id && (
                                <p className={`text-xs ${textLight}`}>SO: {shipment.sales_order_id.slice(0, 8)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {shipment.warehouses?.name ?? '—'}
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {shipment.carrier ?? '—'}
                          {shipment.service && (
                            <span className={textLight}> / {shipment.service}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                            {shipment.status.replace('_', ' ')}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right ${textMuted}`}>
                          {shipment.ship_date
                            ? new Date(shipment.ship_date).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className={`px-6 py-4 text-right ${textColor} font-medium`}>
                          {formatCurrency(shipment.total_cost)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => onView(shipment)}
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
