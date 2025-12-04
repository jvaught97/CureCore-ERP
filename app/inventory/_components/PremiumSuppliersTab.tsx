'use client';

import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Sparkles,
  ArrowUpRight,
  Download,
  TrendingUp,
  ArrowUpDown
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

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | null;
  created_at: string;
}

interface PremiumSuppliersTabProps {
  suppliers: Supplier[];
  filteredSuppliers: Supplier[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete?: (supplier: Supplier) => void;
}

export function PremiumSuppliersTab({
  suppliers,
  filteredSuppliers,
  loading,
  searchTerm,
  setSearchTerm,
  onEdit,
  onDelete
}: PremiumSuppliersTabProps) {
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  // Calculate metrics
  const activeCount = suppliers.filter(s => s.status === 'active').length;
  const totalContacts = suppliers.filter(s => s.email || s.phone).length;

  const handleEdit = (supplier: Supplier) => {
    onEdit(supplier);
  };

  const handleDelete = (supplier: Supplier) => {
    if (onDelete) {
      onDelete(supplier);
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
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Supplier Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Suppliers</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Your supplier network and relationships</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/suppliers/add')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
        {[
          { label: 'Total Suppliers', value: suppliers.length, helper: 'In network' },
          { label: 'Active Suppliers', value: activeCount, helper: 'Currently working' },
          { label: 'With Contacts', value: totalContacts, helper: 'Email or phone' }
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
            <p className="text-lg font-semibold">Manage your supplier relationships</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Export feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <Download className="w-4 h-4" />
              Export suppliers
            </button>
            <button
              onClick={() => alert('Bulk import feature coming soon')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
            >
              <TrendingUp className="w-4 h-4" />
              Bulk import
            </button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 shadow-lg`}>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textLight} w-5 h-5`} />
              <input
                type="text"
                placeholder="Search suppliers..."
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
            <div className={textMuted}>Loading suppliers...</div>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div
            className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}
          >
            <Building2 className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
            <h3 className="mt-4 text-lg font-semibold">No suppliers yet</h3>
            <p className={`${textMuted} mt-1`}>
              {searchTerm ? 'Try adjusting your search' : "Click 'Add Supplier' to create one."}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/suppliers/add')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Supplier
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
                        Supplier Name
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Contact
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      Email
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
                  {filteredSuppliers.map((supplier) => {
                    const isActive = supplier.status === 'active';

                    return (
                      <tr
                        key={supplier.id}
                        className={`group ${getTableRowHover(mode)} transition-all duration-200`}
                      >
                        {/* Left accent bar */}
                        <td className="relative px-6 py-4">
                          <div
                            className={`absolute left-0 inset-y-0 w-1 ${
                              isActive ? 'bg-green-400' : 'bg-gray-400'
                            }`}
                          />
                          <div className="flex items-center gap-3">
                            <div className="bg-[#174940]/10 rounded-full p-2">
                              <Building2 className="w-4 h-4 text-[#48A999]" />
                            </div>
                            <div>
                              <p className={`font-medium ${textColor}`}>{supplier.name}</p>
                              {supplier.phone && (
                                <p className={`text-xs ${textLight} mt-0.5`}>{supplier.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textMuted}`}>
                          {supplier.contact_person || '—'}
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {supplier.email || '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                              isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-green-500' : 'bg-gray-500'
                              }`}
                            />
                            {isActive ? 'Active' : 'Inactive'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleEdit(supplier)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {onDelete && (
                              <button
                                onClick={() => handleDelete(supplier)}
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
