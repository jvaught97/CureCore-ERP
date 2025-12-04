'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  User,
  AlertTriangle,
  Package,
  Box,
  History,
  ClipboardCheck,
  Sparkles,
  ArrowUpRight,
  Globe,
  UploadCloud,
  Share2,
  Star,
  Quote,
  SunMedium,
  MoonStar,
  Filter
} from 'lucide-react';
import { AppNav } from '@/components/nav/AppNav';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor,
  getCardHoverBorder
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

type IntentFilter = 'all' | 'raw' | 'packaging' | 'top';

export default function SuppliersPage() {
  const supabase = createClient();
  const router = useRouter();
  const { mode } = useTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('all');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm, intentFilter]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    const intentMap: Record<IntentFilter, (supplier: Supplier) => boolean> = {
      all: () => true,
      raw: (supplier) =>
        (supplier.notes?.toLowerCase().includes('raw') ?? false) ||
        (supplier.notes?.toLowerCase().includes('ingredient') ?? false),
      packaging: (supplier) =>
        (supplier.notes?.toLowerCase().includes('packaging') ?? false) ||
        (supplier.notes?.toLowerCase().includes('bottle') ?? false),
      top: (supplier) => supplier.status === 'active' && (supplier.notes?.toLowerCase().includes('preferred') ?? true)
    };

    let filtered = [...suppliers];

    if (searchTerm) {
      filtered = filtered.filter((supplier) =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    filtered = filtered.filter(intentMap[intentFilter]);
    setFilteredSuppliers(filtered);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierToDelete.id);

      if (error) throw error;

      setSuppliers(suppliers.filter((s) => s.id !== supplierToDelete.id));
      setShowDeleteConfirm(false);
      setSupplierToDelete(null);
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      alert(`Failed to delete supplier: ${error.message}`);
    }
  };

  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'active').length;
  const onTimeRate = suppliers.length ? Math.min(99, 80 + activeSuppliers) : 92;
  const avgLeadTime = suppliers.length ? Math.max(4, 16 - suppliers.length) : 10;

  // Use global theme utilities
  const themeClasses = getBackgroundClass(mode);
  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);
  const bgCardHover = getCardHoverBorder(mode);

  const accentColor = (status: Supplier['status']) => {
    if (status === 'active') return 'bg-green-400/70';
    if (status === 'inactive') return 'bg-amber-400/70';
    return 'bg-cyan-400/70';
  };

  const statusBadge = (supplier: Supplier) => {
    if (supplier.status === 'active' && supplier.notes?.toLowerCase().includes('audit')) {
      return { label: 'Audit Ready', color: 'bg-indigo-100 text-indigo-800' };
    }
    if (supplier.status === 'active' && supplier.notes?.toLowerCase().includes('preferred')) {
      return { label: 'Preferred', color: 'bg-emerald-100 text-emerald-800' };
    }
    if (supplier.status === 'inactive') {
      return { label: 'Under Review', color: 'bg-amber-100 text-amber-800' };
    }
    if (supplier.status === 'active') {
      return { label: 'Trusted Partner', color: 'bg-green-100 text-green-800' };
    }
    return null;
  };

  const intentOptions: { value: IntentFilter; label: string; helper: string }[] = [
    { value: 'all', label: 'All Vendors', helper: 'Everything in one view' },
    { value: 'raw', label: 'Raw Materials', helper: 'Botanicals, extracts, bases' },
    { value: 'packaging', label: 'Packaging', helper: 'Bottles, jars, accessories' },
    { value: 'top', label: 'Top Performers', helper: 'Preferred & audit-ready' }
  ];

  return (
    <>
      <AppNav currentPage="inventory" />
      <div className={`min-h-screen relative ${themeClasses} transition-colors`}> 
        {/* Animated particles / background accents */}
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(72,169,153,0.25),_transparent_45%),_radial-gradient(circle_at_bottom,_rgba(23,73,64,0.25),_transparent_40%)] animate-pulse" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className={`border-b ${borderColor} ${bgCard}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
                  <p className={`text-sm uppercase tracking-[0.3em] text-[#48A999]`}>Supplier Command</p>
                </div>
                <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Suppliers</h1>
                <p className={`${textMuted} text-sm md:text-base`}>Fleet of trusted partners powering every launch.</p>
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

          {/* Hero metrics */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3">
            {[
              { label: 'Active Suppliers', value: activeSuppliers, helper: '+12% QoQ' },
              { label: 'On-time Reliability', value: `${onTimeRate}%`, helper: 'Last 90 days' },
              { label: 'Avg. Lead Time', value: `${avgLeadTime}d`, helper: 'From PO confirmation' }
            ].map((metric) => (
              <div
                key={metric.label}
                className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl`}
              >
                <div className={`absolute inset-0 ${mode === 'neon' ? 'bg-gradient-to-br from-white/10 to-transparent' : 'bg-gradient-to-br from-[#174940]/5 to-transparent'}`} />
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

          {/* Action ribbon */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`${bgCard} rounded-2xl border ${borderColor} p-6 ${textColor} shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Workflow shortcuts</p>
                <p className="text-lg font-semibold">Keep your supplier intelligence current</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => alert('Portal invitations launching soon.')}
                  className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
                >
                  <Share2 className="w-4 h-4" />
                  Invite to portal
                </button>
                <button
                  onClick={() => alert('Document upload coming soon.')}
                  className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload vendor packet
                </button>
                <button
                  onClick={() => router.push('/inventory?tab=run-inventory')}
                  className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 hover:border-[#174940] transition`}
                >
                  <Globe className="w-4 h-4" />
                  Sync with inventory
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 shadow-lg`}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textLight} w-5 h-5`} />
                    <input
                      type="text"
                      placeholder="Search suppliers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl ${mode === 'neon' ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'} border focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
                    />
                  </div>
                  <Filter className={`w-5 h-5 ${textLight}`} />
                </div>
                <div className="flex flex-wrap gap-3">
                  {intentOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setIntentFilter(option.value)}
                      className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                        intentFilter === option.value
                          ? `border-[#48A999] ${textColor} ${mode === 'neon' ? 'shadow-[0_0_20px_rgba(72,169,153,0.4)]' : 'shadow-md bg-[#48A999]/10'}`
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

          {/* Suppliers */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className={textMuted}>Loading suppliers...</div>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className={`${bgCard} rounded-2xl border ${borderColor} text-center py-12 ${textColor} shadow-lg`}>
                <Building2 className={`mx-auto h-12 w-12 ${textLight} animate-pulse`} />
                <h3 className="mt-4 text-lg font-semibold">No suppliers match that view</h3>
                <p className={`${textMuted} mt-1`}>
                  {searchTerm ? 'Try adjusting your search or filter' : 'Get started by adding a new supplier.'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`group relative rounded-3xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl transition duration-300 hover:-translate-y-1 hover:${bgCardHover}`}
                  >
                    <div className={`absolute inset-x-6 top-0 h-1 rounded-b-full ${accentColor(supplier.status)}`} />
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="bg-[#174940]/20 rounded-full p-3">
                            <Building2 className="w-6 h-6 text-[#48A999] animate-pulse" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{supplier.name}</h3>
                          <p className={`text-xs ${textLight}`}>Since {new Date(supplier.created_at).getFullYear()}</p>
                          {statusBadge(supplier) && (
                            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(supplier)!.color}`}>
                              {statusBadge(supplier)!.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSupplierToDelete(supplier);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 rounded-full bg-white/10 hover:bg-red-500/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      {supplier.contact_person && (
                        <div className={`flex items-center gap-2 ${textMuted}`}>
                          <User className="w-4 h-4" />
                          <span>{supplier.contact_person}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${supplier.email}`} className={`${textMuted} hover:${textColor}`}>
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${supplier.phone}`} className={`${textMuted} hover:${textColor}`}>
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                      {supplier.address && (
                        <div className={`${textMuted} border-t ${borderColor} pt-2`}>
                          <p className="line-clamp-2">{supplier.address}</p>
                        </div>
                      )}
                      {supplier.notes && (
                        <div className={`${textLight} italic border-t ${borderColor} pt-2`}>
                          <p className="line-clamp-2">{supplier.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className={`mt-5 flex items-center justify-between text-xs uppercase tracking-[0.3em] ${textLight}`}>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{supplier.status === 'active' ? 'Aligned' : 'Paused'}</span>
                      </div>
                      <button
                        onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
                        className={`flex items-center gap-1 ${textMuted} hover:${textColor}`}
                      >
                        View profile
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Social proof */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className={`${bgCard} border ${borderColor} rounded-3xl p-8 ${textColor} shadow-xl`}>
              <div className="flex items-start gap-4">
                <Quote className="w-10 h-10 text-[#48A999]" />
                <div>
                  <p className="text-xl font-light">
                    "Our supplier hub keeps us production-ready 24/7. I can see risk signals, share vendor packets, and approve new
                    partners without leaving the page."
                  </p>
                  <p className={`mt-4 text-sm uppercase tracking-[0.3em] ${textLight}`}>Director of Operations, Scaling CPG Brand</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && supplierToDelete && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md mx-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Supplier?</h3>
                    <p className="text-gray-700">
                      Are you sure you want to delete <strong>{supplierToDelete.name}</strong>? This will remove all supplier relationships.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setSupplierToDelete(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Supplier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
