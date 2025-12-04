'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Printer, Save, AlertCircle, CheckCircle, Sparkles, ArrowUpRight, ClipboardList } from 'lucide-react';
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

interface InventoryItem {
  id: string;
  name: string;
  category?: string | null;
  on_hand: number;
  unit: string;
  physical_count?: number;
  variance?: number;
}

interface PremiumRunInventoryCountProps {
  type: 'ingredients' | 'packaging';
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export default function PremiumRunInventoryCount({ type }: PremiumRunInventoryCountProps) {
  const supabase = createClient();
  const { mode } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const textLight = getTextLight(mode);
  const borderColor = getBorderColor(mode);
  const bgCard = getCardBackground(mode);

  useEffect(() => {
    fetchItems();
    getCurrentUser();
  }, [type]);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const tableName = type === 'ingredients' ? 'ingredients' : 'packaging';
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('name');

      if (error) throw error;

      const itemsWithCounts = (data || []).map(item => ({
        ...item,
        physical_count: undefined,
        variance: undefined
      }));

      setItems(itemsWithCounts);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalCountChange = (itemId: string, value: string) => {
    const physicalCount = value === '' ? undefined : parseFloat(value);

    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const variance = physicalCount !== undefined ? physicalCount - item.on_hand : undefined;
          return { ...item, physical_count: physicalCount, variance };
        }
        return item;
      })
    );
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=600,width=800');

      if (printWindow) {
        printWindow.document.write('<html><head><title>Inventory Count Sheet</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 10px; }
          .meta { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .signature-section { margin-top: 40px; }
          .signature-line { margin-top: 60px; border-top: 1px solid #000; width: 300px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleSubmit = async () => {
    const itemsToAdjust = items.filter(item =>
      item.physical_count !== undefined && item.variance !== 0
    );

    if (itemsToAdjust.length === 0) {
      alert('No changes detected. Please enter physical counts that differ from system quantities.');
      return;
    }

    const confirmed = confirm(
      `You are about to adjust ${itemsToAdjust.length} items. This will create ${itemsToAdjust.length} inventory adjustments and update stock levels. Continue?`
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const tableName = type === 'ingredients' ? 'ingredients' : 'packaging';
      const countSessionId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Create inventory count session record
      const { error: sessionError } = await supabase
        .from('inventory_count_sessions')
        .insert({
          id: countSessionId,
          count_type: type,
          counted_by: currentUser?.id,
          counted_by_email: currentUser?.email,
          items_counted: itemsToAdjust.length,
          completed_at: timestamp,
        });

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to create count session');
      }

      // Process each adjustment
      for (const item of itemsToAdjust) {
        // Create inventory history record
        await supabase.from('inventory_history').insert({
          item_id: item.id,
          item_type: type === 'ingredients' ? 'ingredient' : 'packaging',
          item_name: item.name,
          transaction_type: 'physical_count',
          quantity: Math.abs(item.variance!),
          unit: item.unit,
          previous_quantity: item.on_hand,
          new_quantity: item.physical_count!,
          employee_name: currentUser?.email || 'Unknown',
          notes: `Physical count adjustment. Variance: ${item.variance! > 0 ? '+' : ''}${formatNumber(item.variance!, 2)} ${item.unit}`,
        });

        // Update actual inventory
        await supabase
          .from(tableName)
          .update({ on_hand: item.physical_count! })
          .eq('id', item.id);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        window.location.href = '/inventory?tab=' + type;
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting inventory count:', error);
      alert(`Failed to submit inventory count: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const itemsWithVariance = items.filter(item => item.variance !== undefined && item.variance !== 0);
  const totalVarianceValue = itemsWithVariance.reduce((sum, item) => {
    const costPerUnit = type === 'ingredients'
      ? (item as any).cost_per_gram
      : (item as any).cost_per_unit;
    return sum + ((item.variance || 0) * (costPerUnit || 0));
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={textMuted}>Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-50">
          <CheckCircle className="w-6 h-6" />
          <span className="font-medium">Inventory count submitted successfully!</span>
        </div>
      )}

      {/* Premium Header */}
      <div className={`${bgCard} rounded-2xl border ${borderColor} p-8 shadow-xl`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Count Session</p>
            </div>
            <h2 className={`text-3xl font-bold ${textColor}`}>
              Run {type === 'ingredients' ? 'Ingredients' : 'Packaging'} Count
            </h2>
            <p className={`${textMuted} mt-2`}>
              Enter physical counts to compare with system quantities
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:scale-[1.02] transition"
          >
            <Printer className="w-5 h-5" />
            Print Count Sheet
          </button>
        </div>
      </div>

      {/* Hero Metrics Cards */}
      {itemsWithVariance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl`}
          >
            <div
              className={`absolute inset-0 ${
                mode === 'neon'
                  ? 'bg-gradient-to-br from-blue-500/10 to-transparent'
                  : 'bg-gradient-to-br from-blue-500/5 to-transparent'
              }`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Items to Adjust</p>
                <p className="text-3xl font-bold mt-2">{itemsWithVariance.length}</p>
                <p className={`text-xs ${textLight} mt-1`}>Variance detected</p>
              </div>
              <ClipboardList className="w-6 h-6 text-blue-500" />
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl`}
          >
            <div
              className={`absolute inset-0 ${
                mode === 'neon'
                  ? `bg-gradient-to-br ${totalVarianceValue >= 0 ? 'from-green-500/10' : 'from-red-500/10'} to-transparent`
                  : `bg-gradient-to-br ${totalVarianceValue >= 0 ? 'from-green-500/5' : 'from-red-500/5'} to-transparent`
              }`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Total Variance Value</p>
                <p className={`text-3xl font-bold mt-2 ${totalVarianceValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${formatNumber(Math.abs(totalVarianceValue), 2)}
                </p>
                <p className={`text-xs ${textLight} mt-1`}>
                  {totalVarianceValue >= 0 ? 'Overage' : 'Shortage'}
                </p>
              </div>
              <ArrowUpRight className={`w-6 h-6 ${totalVarianceValue >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgCard} p-6 ${textColor} shadow-xl`}
          >
            <div
              className={`absolute inset-0 ${
                mode === 'neon'
                  ? 'bg-gradient-to-br from-purple-500/10 to-transparent'
                  : 'bg-gradient-to-br from-purple-500/5 to-transparent'
              }`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${textLight}`}>Total Items</p>
                <p className="text-3xl font-bold mt-2">{items.length}</p>
                <p className={`text-xs ${textLight} mt-1`}>In inventory</p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Premium Table */}
      <div className={`${bgCard} rounded-2xl border ${borderColor} shadow-xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${getTableHeaderBg(mode)} sticky top-0`}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                  Item Name
                </th>
                {type === 'ingredients' && (
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                    Category
                  </th>
                )}
                <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                  System Qty
                </th>
                <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                  Physical Count
                </th>
                <th className={`px-6 py-4 text-right text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                  Variance
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderColor}`}>
              {items.map((item) => {
                const hasVariance = item.variance !== undefined && item.variance !== 0;

                return (
                  <tr
                    key={item.id}
                    className={`${getTableRowHover(mode)} ${hasVariance ? 'bg-yellow-50/30' : ''} transition-all duration-200`}
                  >
                    <td className={`px-6 py-4 font-medium ${textColor}`}>
                      {item.name}
                    </td>
                    {type === 'ingredients' && (
                      <td className={`px-6 py-4 ${textMuted}`}>
                        {item.category || '—'}
                      </td>
                    )}
                    <td className={`px-6 py-4 text-right ${textColor} font-medium`}>
                      {formatNumber(item.on_hand, 2)} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Enter count"
                        value={item.physical_count !== undefined ? item.physical_count : ''}
                        onChange={(e) => handlePhysicalCountChange(item.id, e.target.value)}
                        className={`w-32 px-3 py-2 rounded-lg text-right ${
                          mode === 'neon'
                            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50'
                            : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                        } border focus:outline-none focus:ring-2 focus:ring-[#48A999]`}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.variance !== undefined && (
                        <span className={`text-sm font-bold ${
                          item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : textMuted
                        }`}>
                          {item.variance > 0 ? '+' : ''}{formatNumber(item.variance, 2)} {item.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Section */}
      <div className={`${bgCard} rounded-2xl border ${borderColor} p-6 shadow-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span className={`text-sm ${textColor}`}>
              This will adjust inventory levels for <strong>{itemsWithVariance.length} items</strong> and create an audit trail.
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || itemsWithVariance.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Submitting...' : `Submit Count (${itemsWithVariance.length} changes)`}
          </button>
        </div>
      </div>

      {/* Hidden Print Content */}
      <div ref={printRef} style={{ display: 'none' }}>
        <h1>{type === 'ingredients' ? 'Ingredients' : 'Packaging'} Inventory Count Sheet</h1>
        <div className="meta">
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Time: {new Date().toLocaleTimeString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              {type === 'ingredients' && <th>Category</th>}
              <th>Unit</th>
              <th>System Qty</th>
              <th>Physical Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                {type === 'ingredients' && <td>{item.category || '-'}</td>}
                <td>{item.unit}</td>
                <td>{formatNumber(item.on_hand, 2)}</td>
                <td style={{ borderBottom: '1px solid #000', minWidth: '100px' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="signature-section">
          <p><strong>Counted By:</strong> _________________________________</p>
          <p><strong>Date:</strong> _________________________________</p>
          <div className="signature-line"></div>
          <p style={{ textAlign: 'center', marginTop: '5px' }}>Signature</p>
        </div>
      </div>
    </div>
  );
}
