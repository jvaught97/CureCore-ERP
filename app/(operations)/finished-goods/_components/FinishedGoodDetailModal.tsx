'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import {
  X,
  Package,
  Calendar,
  Edit,
  AlertTriangle,
  ExternalLink,
  FileText,
  TrendingUp,
  ArrowUpRight,
  MapPin,
  Box,
  Clock,
  DollarSign,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils';

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

interface Formula {
  id: string;
  name: string;
  version: string | null;
  status: string | null;
  notes: string | null;
  target_pack_size: number | null;
  target_yield_percentage: number | null;
}

interface Batch {
  id: string;
  batch_code: string;
  manufacturing_status: string | null;
  completed_at: string | null;
  actual_yield: number | null;
  total_cost: number | null;
}

interface FormulaIngredient {
  id: string;
  quantity: number;
  unit: string;
  percentage: number | null;
  ingredients: {
    name: string;
  };
}

interface FormulaPackaging {
  id: string;
  quantity: number;
  unit: string;
  packaging_items: {
    name: string;
  };
}

interface OrderFulfillment {
  id: string;
  fulfilled_at: string | null;
  promo_items_cost: number;
  packaging_cost: number;
  base_product_cost: number;
  total_cogs: number;
  sales_order_id: string | null;
  line_item_id: string | null;
}

interface FinishedGoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  finishedGoodId: string;
  onUpdate?: () => void;
}

// Number formatting helper
const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Date formatting helper
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function FinishedGoodDetailModal({
  isOpen,
  onClose,
  finishedGoodId,
  onUpdate
}: FinishedGoodDetailModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const { mode } = useTheme();

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  const [activeTab, setActiveTab] = useState<'overview' | 'recipe' | 'batch' | 'allocation' | 'history'>('overview');
  const [loading, setLoading] = useState(true);
  const [finishedGood, setFinishedGood] = useState<FinishedGood | null>(null);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [formulaIngredients, setFormulaIngredients] = useState<FormulaIngredient[]>([]);
  const [formulaPackaging, setFormulaPackaging] = useState<FormulaPackaging[]>([]);
  const [orderFulfillments, setOrderFulfillments] = useState<OrderFulfillment[]>([]);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && finishedGoodId) {
      fetchFinishedGoodDetails();
    }
  }, [isOpen, finishedGoodId]);

  const fetchFinishedGoodDetails = async () => {
    try {
      setLoading(true);

      // Fetch main finished good with formula and batch joins
      const { data: fgData, error: fgError } = await supabase
        .from('finished_goods')
        .select(`
          *,
          formulas:product_id (
            id, name, version, status, notes,
            target_pack_size, target_yield_percentage
          ),
          batches:batch_id (
            id, batch_code, manufacturing_status,
            completed_at, actual_yield, total_cost
          )
        `)
        .eq('id', finishedGoodId)
        .single();

      if (fgError) {
        console.error('Supabase error:', fgError);
        throw fgError;
      }

      setFinishedGood(fgData);

      // Handle formula data (might be null or array)
      if (fgData.formulas) {
        setFormula(Array.isArray(fgData.formulas) ? fgData.formulas[0] : fgData.formulas as unknown as Formula);
      }

      // Handle batch data (might be null or array)
      if (fgData.batches) {
        setBatch(Array.isArray(fgData.batches) ? fgData.batches[0] : fgData.batches as unknown as Batch);
      }

      setEditForm({
        location: fgData.location || '',
        notes: fgData.notes || ''
      });

      // Fetch formula ingredients if we have a product_id
      if (fgData.product_id) {
        const { data: ingredients, error: ingError } = await supabase
          .from('formula_ingredients')
          .select('*, ingredients(name)')
          .eq('formula_id', fgData.product_id);

        if (!ingError && ingredients) {
          setFormulaIngredients(ingredients as unknown as FormulaIngredient[]);
        }

        const { data: packaging, error: pkgError } = await supabase
          .from('formula_packaging')
          .select('*, packaging_items(name)')
          .eq('formula_id', fgData.product_id);

        if (!pkgError && packaging) {
          setFormulaPackaging(packaging as unknown as FormulaPackaging[]);
        }
      }

      // Fetch order fulfillment records
      const { data: orders, error: ordError } = await supabase
        .from('order_fulfillment_details')
        .select('*')
        .eq('finished_good_id', finishedGoodId);

      if (!ordError && orders) {
        setOrderFulfillments(orders);
      }

    } catch (error) {
      console.error('Error fetching finished good details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!finishedGood) return;

    try {
      const { error } = await supabase
        .from('finished_goods')
        .update({
          location: editForm.location,
          notes: editForm.notes
        })
        .eq('id', finishedGood.id);

      if (error) throw error;

      setIsEditMode(false);
      await fetchFinishedGoodDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating finished good:', error);
      alert('Failed to update finished good');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!finishedGood) return;

    try {
      const { error } = await supabase
        .from('finished_goods')
        .update({ status: newStatus })
        .eq('id', finishedGood.id);

      if (error) throw error;

      await fetchFinishedGoodDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  if (!isOpen) return null;

  // Calculate metrics
  const daysUntilExpiry = finishedGood?.expiry_date
    ? Math.ceil((new Date(finishedGood.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const totalValue = (finishedGood?.production_cost || 0) * (finishedGood?.quantity_available || 0);
  const allocationPercentage = finishedGood
    ? ((finishedGood.quantity_allocated / (finishedGood.quantity_available + finishedGood.quantity_allocated)) * 100) || 0
    : 0;

  // Status badge color helper
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`relative w-full h-full max-w-7xl max-h-[90vh] m-4 ${bgCard} rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-[#48A999]" />
              <div>
                <h2 className={`text-2xl font-semibold ${textColor}`}>
                  {finishedGood?.product_name || 'Finished Good'}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className={`text-sm ${textMuted}`}>
                    SKU: {finishedGood?.sku || 'N/A'}
                  </p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      finishedGood ? getStatusBadgeColor(finishedGood.status) : ''
                    }`}
                  >
                    {finishedGood?.status || 'unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {finishedGood?.batch_id && (
              <button
                onClick={() => router.push(`/batches/${finishedGood.batch_id}`)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} ${textColor} hover:border-[#174940] transition`}
                title="View Batch"
              >
                <ExternalLink className="w-4 h-4" />
                View Batch
              </button>
            )}

            {isEditMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-4 py-2 rounded-full shadow-lg hover:scale-[1.02] transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setEditForm({
                      location: finishedGood?.location || '',
                      notes: finishedGood?.notes || ''
                    });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} ${textColor} hover:border-red-500 transition`}
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditMode(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} ${textColor} hover:border-[#174940] transition`}
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warning Banners */}
        {daysUntilExpiry !== null && daysUntilExpiry < 30 && daysUntilExpiry > 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 m-4 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Expiring Soon</p>
              <p className="text-sm">This product expires in {daysUntilExpiry} days</p>
            </div>
          </div>
        )}
        {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Expired</p>
              <p className="text-sm">This product expired on {formatDate(finishedGood?.expiry_date || '')}</p>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className={`w-64 border-r ${borderColor} p-4 space-y-2 overflow-y-auto`}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg'
                  : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800`
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('recipe')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'recipe'
                  ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg'
                  : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800`
              }`}
            >
              <Box className="w-5 h-5" />
              <span className="font-medium">Recipe & Packaging</span>
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'batch'
                  ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg'
                  : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800`
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Batch Details</span>
            </button>

            <button
              onClick={() => setActiveTab('allocation')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'allocation'
                  ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg'
                  : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800`
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Allocation & Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg'
                  : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800`
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">Stock History</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`text-sm ${textMuted}`}>Loading details...</div>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && finishedGood && (
                  <div className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className={`rounded-2xl border ${borderColor} p-4 ${bgCard} shadow-lg`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm uppercase tracking-wider ${textMuted}`}>Available</p>
                            <p className={`text-2xl font-bold ${textColor} mt-1`}>
                              {formatNumber(finishedGood.quantity_available)}
                            </p>
                            <p className={`text-xs ${textLight} mt-1`}>{finishedGood.unit}</p>
                          </div>
                          <Package className="w-8 h-8 text-[#48A999]" />
                        </div>
                      </div>

                      <div className={`rounded-2xl border ${borderColor} p-4 ${bgCard} shadow-lg`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm uppercase tracking-wider ${textMuted}`}>Allocated</p>
                            <p className={`text-2xl font-bold ${textColor} mt-1`}>
                              {formatNumber(finishedGood.quantity_allocated)}
                            </p>
                            <p className={`text-xs ${textLight} mt-1`}>{finishedGood.unit}</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>

                      <div className={`rounded-2xl border ${borderColor} p-4 ${bgCard} shadow-lg`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm uppercase tracking-wider ${textMuted}`}>Total Value</p>
                            <p className={`text-2xl font-bold ${textColor} mt-1`}>
                              ${formatNumber(totalValue, 2)}
                            </p>
                            <p className={`text-xs ${textLight} mt-1`}>Current value</p>
                          </div>
                          <DollarSign className="w-8 h-8 text-green-500" />
                        </div>
                      </div>

                      {daysUntilExpiry !== null && (
                        <div className={`rounded-2xl border ${borderColor} p-4 ${bgCard} shadow-lg`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm uppercase tracking-wider ${textMuted}`}>Days to Expiry</p>
                              <p className={`text-2xl font-bold ${textColor} mt-1`}>
                                {daysUntilExpiry > 0 ? daysUntilExpiry : 'Expired'}
                              </p>
                              <p className={`text-xs ${textLight} mt-1`}>
                                {daysUntilExpiry > 0 ? 'days remaining' : 'past expiration'}
                              </p>
                            </div>
                            <Clock className={`w-8 h-8 ${daysUntilExpiry < 30 ? 'text-red-500' : 'text-gray-400'}`} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Product Details</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className={`text-sm ${textMuted}`}>Batch Code</p>
                          <p className={`text-base font-medium ${textColor}`}>{finishedGood.batch_code || 'N/A'}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Lot Number</p>
                          <p className={`text-base font-medium ${textColor}`}>{finishedGood.lot_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Location</p>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={editForm.location}
                              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                              className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
                            />
                          ) : (
                            <p className={`text-base font-medium ${textColor}`}>{finishedGood.location || 'Not specified'}</p>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Unit</p>
                          <p className={`text-base font-medium ${textColor}`}>{finishedGood.unit}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Production Cost per Unit</p>
                          <p className={`text-base font-medium ${textColor}`}>${formatNumber(finishedGood.production_cost, 4)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Dates Section */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
                        <Calendar className="w-5 h-5" />
                        Important Dates
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className={`text-sm ${textMuted}`}>Manufactured Date</p>
                          <p className={`text-base font-medium ${textColor}`}>{formatDate(finishedGood.manufactured_date)}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Expiry Date</p>
                          <p className={`text-base font-medium ${textColor}`}>{formatDate(finishedGood.expiry_date)}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Created Date</p>
                          <p className={`text-base font-medium ${textColor}`}>{formatDate(finishedGood.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Notes</h3>
                      {isEditMode ? (
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          rows={4}
                          className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
                          placeholder="Add notes about this finished good..."
                        />
                      ) : (
                        <p className={`${textColor} ${!finishedGood.notes ? 'italic text-gray-400' : ''}`}>
                          {finishedGood.notes || 'No notes added yet'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recipe & Packaging Tab */}
                {activeTab === 'recipe' && (
                  <div className="space-y-6">
                    {/* Formula Info */}
                    {formula && (
                      <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                        <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Formula Information</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className={`text-sm ${textMuted}`}>Formula Name</p>
                            <p className={`text-base font-medium ${textColor}`}>{formula.name}</p>
                          </div>
                          <div>
                            <p className={`text-sm ${textMuted}`}>Version</p>
                            <p className={`text-base font-medium ${textColor}`}>{formula.version || 'N/A'}</p>
                          </div>
                          <div>
                            <p className={`text-sm ${textMuted}`}>Target Pack Size</p>
                            <p className={`text-base font-medium ${textColor}`}>{formula.target_pack_size || 'N/A'}</p>
                          </div>
                          <div>
                            <p className={`text-sm ${textMuted}`}>Target Yield %</p>
                            <p className={`text-base font-medium ${textColor}`}>{formula.target_yield_percentage || 'N/A'}%</p>
                          </div>
                        </div>
                        {formula.notes && (
                          <div className="mt-4">
                            <p className={`text-sm ${textMuted}`}>Formula Notes</p>
                            <p className={`text-base ${textColor} mt-1`}>{formula.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recipe Composition */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Recipe Composition</h3>
                      {formulaIngredients.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className={`border-b ${borderColor}`}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Ingredient</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Quantity</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Unit</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Percentage</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${borderColor}`}>
                              {formulaIngredients.map((ing) => (
                                <tr key={ing.id}>
                                  <td className={`px-4 py-3 ${textColor}`}>{ing.ingredients.name}</td>
                                  <td className={`px-4 py-3 ${textColor}`}>{formatNumber(ing.quantity, 2)}</td>
                                  <td className={`px-4 py-3 ${textMuted}`}>{ing.unit}</td>
                                  <td className={`px-4 py-3 ${textColor}`}>{formatNumber(ing.percentage, 2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={`${textMuted} italic`}>No recipe composition data available</p>
                      )}
                    </div>

                    {/* Packaging Requirements */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Packaging Requirements</h3>
                      {formulaPackaging.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className={`border-b ${borderColor}`}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Packaging Item</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Quantity</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Unit</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${borderColor}`}>
                              {formulaPackaging.map((pkg) => (
                                <tr key={pkg.id}>
                                  <td className={`px-4 py-3 ${textColor}`}>{pkg.packaging_items.name}</td>
                                  <td className={`px-4 py-3 ${textColor}`}>{formatNumber(pkg.quantity, 2)}</td>
                                  <td className={`px-4 py-3 ${textMuted}`}>{pkg.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={`${textMuted} italic`}>No packaging requirements data available</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Batch Details Tab */}
                {activeTab === 'batch' && (
                  <div className="space-y-6">
                    {batch ? (
                      <>
                        <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                          <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Batch Information</h3>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className={`text-sm ${textMuted}`}>Batch Code</p>
                              <p className={`text-base font-medium ${textColor}`}>{batch.batch_code}</p>
                            </div>
                            <div>
                              <p className={`text-sm ${textMuted}`}>Manufacturing Status</p>
                              <p className={`text-base font-medium ${textColor}`}>{batch.manufacturing_status || 'N/A'}</p>
                            </div>
                            <div>
                              <p className={`text-sm ${textMuted}`}>Completed Date</p>
                              <p className={`text-base font-medium ${textColor}`}>{formatDate(batch.completed_at)}</p>
                            </div>
                            <div>
                              <p className={`text-sm ${textMuted}`}>Actual Yield</p>
                              <p className={`text-base font-medium ${textColor}`}>{formatNumber(batch.actual_yield, 2)}</p>
                            </div>
                            <div>
                              <p className={`text-sm ${textMuted}`}>Total Batch Cost</p>
                              <p className={`text-base font-medium ${textColor}`}>${formatNumber(batch.total_cost, 2)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => router.push(`/batches/${batch.id}`)}
                            className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg hover:scale-[1.02] transition"
                          >
                            <ExternalLink className="w-5 h-5" />
                            View Full Batch Details
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className={`${textMuted} italic`}>No batch information available</p>
                    )}
                  </div>
                )}

                {/* Allocation & Orders Tab */}
                {activeTab === 'allocation' && finishedGood && (
                  <div className="space-y-6">
                    {/* Allocation Summary */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Allocation Summary</h3>
                      <div className="grid gap-4 md:grid-cols-3 mb-4">
                        <div>
                          <p className={`text-sm ${textMuted}`}>Total Allocated</p>
                          <p className={`text-2xl font-bold ${textColor}`}>{formatNumber(finishedGood.quantity_allocated)}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Available for Allocation</p>
                          <p className={`text-2xl font-bold ${textColor}`}>{formatNumber(finishedGood.quantity_available)}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${textMuted}`}>Allocation %</p>
                          <p className={`text-2xl font-bold ${textColor}`}>{formatNumber(allocationPercentage, 1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            allocationPercentage > 80 ? 'bg-red-500' : allocationPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(allocationPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Orders Usage */}
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Order Usage History</h3>
                      {orderFulfillments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className={`border-b ${borderColor}`}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Fulfilled Date</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Base Cost</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Promo Items</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Packaging</th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor}`}>Total COGS</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${borderColor}`}>
                              {orderFulfillments.map((order) => (
                                <tr key={order.id}>
                                  <td className={`px-4 py-3 ${textColor}`}>{formatDate(order.fulfilled_at)}</td>
                                  <td className={`px-4 py-3 ${textColor}`}>${formatNumber(order.base_product_cost, 2)}</td>
                                  <td className={`px-4 py-3 ${textMuted}`}>${formatNumber(order.promo_items_cost, 2)}</td>
                                  <td className={`px-4 py-3 ${textMuted}`}>${formatNumber(order.packaging_cost, 2)}</td>
                                  <td className={`px-4 py-3 font-medium ${textColor}`}>${formatNumber(order.total_cogs, 2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={`${textMuted} italic`}>This finished good has not been used in any orders yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Stock History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <div className={`rounded-2xl border ${borderColor} p-6 ${bgCard} shadow-lg`}>
                      <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Stock Movement History</h3>
                      <p className={`${textMuted} italic`}>Stock history tracking coming soon</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
