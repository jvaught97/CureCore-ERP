'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { X, Building2, Package, DollarSign, TrendingUp, Calendar, Edit, Plus, Trash2, AlertTriangle, Minus, ArrowUp, TruckIcon, FileText } from 'lucide-react';
import PackagingCategoryFields from './PackagingCategoryFields';
import PackagingFileUpload from './PackagingFileUpload';
import PackagingFileGallery from './PackagingFileGallery';
import { PackagingFile } from '@/types/database';
import { getPackagingFiles } from '@/app/packaging/actions';

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface PackagingSupplier {
  id: string;
  supplier_id: string;
  is_primary: boolean;
  lead_time_days: number | null;
  minimum_order_quantity: number | null;
  notes: string | null;
  suppliers: Supplier;
}

interface StockAdjustment {
  id: string;
  adjustment_type: string;
  quantity: number;
  reason: string | null;
  purchase_price: number | null;
  created_at: string;
  created_by: string;
  suppliers?: {
    name: string;
  };
}

interface PackagingItem {
  id: string;
  name: string;
  category: string | null;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  cost_per_unit: number | null;
  status: string | null;
  // Category-specific fields
  label_size?: string | null;
  finish?: string | null;
  capacity?: string | null;
  neck_size?: string | null;
  color?: string | null;
  closure_type?: string | null;
  liner_type?: string | null;
  dimensions?: string | null;
  weight_capacity?: string | null;
  material?: string | null;
}

interface PackagingDetailModalProps {
  packaging: PackagingItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Number formatting helper function
const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export default function PackagingDetailModal({
  packaging,
  isOpen,
  onClose,
  onUpdate
}: PackagingDetailModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'history' | 'cost' | 'files'>('overview');
  const [suppliers, setSuppliers] = useState<PackagingSupplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [packagingFiles, setPackagingFiles] = useState<PackagingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Edit states
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStockAdjust, setShowStockAdjust] = useState(false);
  const [showReceiveShipment, setShowReceiveShipment] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  // Forms
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: packaging.name,
    category: packaging.category || '',
    reorder_point: packaging.reorder_point || 0,
    unit: packaging.unit,
    status: packaging.status || 'active',
    // Category-specific fields
    label_size: packaging.label_size || '',
    finish: packaging.finish || '',
    capacity: packaging.capacity || '',
    neck_size: packaging.neck_size || '',
    color: packaging.color || '',
    closure_type: packaging.closure_type || '',
    liner_type: packaging.liner_type || '',
    dimensions: packaging.dimensions || '',
    weight_capacity: packaging.weight_capacity || '',
    material: packaging.material || '',
  });

  const [stockAdjustForm, setStockAdjustForm] = useState({
    adjustment_type: 'add' as 'add' | 'remove',
    quantity: 0,
    reason: '',
  });

  const [shipmentForm, setShipmentForm] = useState({
    supplier_id: '',
    quantity: 0,
    purchase_price: 0,
    reason: '',
  });

  const [costForm, setCostForm] = useState({
    cost_per_unit: packaging.cost_per_unit || 0,
  });

  const [supplierForm, setSupplierForm] = useState({
    supplier_id: '',
    is_primary: false,
    lead_time_days: 0,
    minimum_order_quantity: 0,
    notes: '',
  });

  const categories = ['Bottles', 'Caps', 'Labels', 'Seals', 'Boxes', 'Other'];

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
      fetchFiles();
      getCurrentUser();
      setBasicInfoForm({
        name: packaging.name,
        category: packaging.category || '',
        reorder_point: packaging.reorder_point || 0,
        unit: packaging.unit,
        status: packaging.status || 'active',
        label_size: packaging.label_size || '',
        finish: packaging.finish || '',
        capacity: packaging.capacity || '',
        neck_size: packaging.neck_size || '',
        color: packaging.color || '',
        closure_type: packaging.closure_type || '',
        liner_type: packaging.liner_type || '',
        dimensions: packaging.dimensions || '',
        weight_capacity: packaging.weight_capacity || '',
        material: packaging.material || '',
      });
      setCostForm({
        cost_per_unit: packaging.cost_per_unit || 0,
      });
    }
  }, [isOpen, packaging.id]);

  const getCurrentUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    } catch (err) {
      console.error('Error getting user:', err);
    }
  };

  const fetchFiles = async () => {
    try {
      const result = await getPackagingFiles(packaging.id);
      if (result.data) {
        setPackagingFiles(result.data);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  const handleCategoryFieldChange = (field: string, value: string) => {
    setBasicInfoForm({ ...basicInfoForm, [field]: value });
  };

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // Fetch all suppliers for dropdown
      const { data: allSuppliersData } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, email, phone')
        .order('name');

      if (allSuppliersData) setAllSuppliers(allSuppliersData);

      // Fetch linked suppliers (if you have a packaging_suppliers table)
      const { data: supplierData } = await supabase
        .from('packaging_suppliers')
        .select(`
          *,
          suppliers (
            id,
            name,
            contact_person,
            email,
            phone
          )
        `)
        .eq('packaging_id', packaging.id)
        .order('is_primary', { ascending: false });

      if (supplierData) setSuppliers(supplierData);

      // Fetch stock adjustments for packaging
      const { data: adjustmentsData } = await supabase
        .from('packaging_stock_adjustments')
        .select(`
          *,
          suppliers (
            name
          )
        `)
        .eq('packaging_id', packaging.id)
        .order('created_at', { ascending: false });

      if (adjustmentsData) setStockAdjustments(adjustmentsData);
    } catch (error) {
      console.error('Error fetching packaging details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBasicInfo = async () => {
    try {
      const { error } = await supabase
        .from('packaging')
        .update({
          name: basicInfoForm.name,
          category: basicInfoForm.category || null,
          reorder_point: basicInfoForm.reorder_point || null,
          unit: basicInfoForm.unit,
          status: basicInfoForm.status,
          // Category-specific fields
          label_size: basicInfoForm.label_size || null,
          finish: basicInfoForm.finish || null,
          capacity: basicInfoForm.capacity || null,
          neck_size: basicInfoForm.neck_size || null,
          color: basicInfoForm.color || null,
          closure_type: basicInfoForm.closure_type || null,
          liner_type: basicInfoForm.liner_type || null,
          dimensions: basicInfoForm.dimensions || null,
          weight_capacity: basicInfoForm.weight_capacity || null,
          material: basicInfoForm.material || null,
        })
        .eq('id', packaging.id);

      if (error) throw error;

      setIsEditingBasicInfo(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating basic info:', error);
      alert('Failed to update packaging information');
    }
  };

  const handleStockAdjustment = async () => {
    if (stockAdjustForm.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    try {
      const adjustmentAmount = stockAdjustForm.adjustment_type === 'add'
        ? stockAdjustForm.quantity
        : -stockAdjustForm.quantity;

      // Create inventory history record
      const { error: historyError } = await supabase
        .from('inventory_history')
        .insert({
          item_id: packaging.id,
          item_type: 'packaging',
          item_name: packaging.name,
          transaction_type: stockAdjustForm.adjustment_type === 'add' ? 'adjustment_in' : 'adjustment_out',
          quantity: stockAdjustForm.quantity,
          unit: packaging.unit || 'units',
          previous_quantity: packaging.on_hand,
          new_quantity: packaging.on_hand + adjustmentAmount,
          employee_name: 'System', // TODO: Get from auth context
          notes: stockAdjustForm.reason || 'Manual stock adjustment',
        });

      if (historyError) {
        console.error('History error:', historyError);
        throw new Error(historyError.message || 'Failed to create inventory history record');
      }

      // Update packaging stock
      const { error: updateError } = await supabase
        .from('packaging')
        .update({
          on_hand: packaging.on_hand + adjustmentAmount,
        })
        .eq('id', packaging.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message || 'Failed to update packaging stock');
      }

      alert('Stock adjusted successfully');
      setShowStockAdjust(false);
      setStockAdjustForm({ adjustment_type: 'add', quantity: 0, reason: '' });
      onUpdate();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(`Failed to adjust stock: ${error?.message || 'Unknown error occurred'}`);
    }
  };

  const handleReceiveShipment = async () => {
    if (shipmentForm.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (!shipmentForm.supplier_id) {
      alert('Please select a supplier');
      return;
    }

    try {
      // Create stock adjustment record
      const { error: adjustError } = await supabase
        .from('packaging_stock_adjustments')
        .insert({
          packaging_id: packaging.id,
          adjustment_type: 'receive_shipment',
          quantity: shipmentForm.quantity,
          reason: shipmentForm.reason || 'Received shipment',
          supplier_id: shipmentForm.supplier_id,
          purchase_price: shipmentForm.purchase_price || null,
          created_by: currentUserId,
        });

      if (adjustError) throw adjustError;

      // Update packaging stock
      const { error: updateError } = await supabase
        .from('packaging')
        .update({
          on_hand: packaging.on_hand + shipmentForm.quantity,
        })
        .eq('id', packaging.id);

      if (updateError) throw updateError;

      alert('Shipment received successfully');
      setShowReceiveShipment(false);
      setShipmentForm({ supplier_id: '', quantity: 0, purchase_price: 0, reason: '' });
      onUpdate();
    } catch (error: any) {
      console.error('Error receiving shipment:', error);
      alert(`Failed to receive shipment: ${error.message}`);
    }
  };

  const handleUpdateCost = async () => {
    try {
      const { error } = await supabase
        .from('packaging')
        .update({
          cost_per_unit: costForm.cost_per_unit,
        })
        .eq('id', packaging.id);

      if (error) throw error;

      setIsEditingCost(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating cost:', error);
      alert('Failed to update cost information');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('packaging')
        .delete()
        .eq('id', packaging.id);

      if (error) throw error;

      alert('Packaging deleted successfully');
      onClose();
      onUpdate();
      setTimeout(() => {
        window.location.href = '/inventory?tab=packaging';
      }, 100);
    } catch (error: any) {
      console.error('Error deleting packaging:', error);
      alert(`Failed to delete packaging: ${error.message}`);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!supplierForm.supplier_id) {
      alert('Please select a supplier');
      return;
    }

    try {
      const { error } = await supabase
        .from('packaging_suppliers')
        .insert({
          packaging_id: packaging.id,
          supplier_id: supplierForm.supplier_id,
          is_primary: supplierForm.is_primary,
          lead_time_days: supplierForm.lead_time_days || null,
          minimum_order_quantity: supplierForm.minimum_order_quantity || null,
          notes: supplierForm.notes || null,
        });

      if (error) throw error;

      alert('Supplier linked successfully');
      setShowAddSupplier(false);
      setSupplierForm({
        supplier_id: '',
        is_primary: false,
        lead_time_days: 0,
        minimum_order_quantity: 0,
        notes: '',
      });
      fetchDetails();
    } catch (error: any) {
      console.error('Error linking supplier:', error);
      alert(`Failed to link supplier: ${error.message}`);
    }
  };

  const inventoryValue = (packaging.on_hand * (packaging.cost_per_unit || 0)).toFixed(2);
  const isLowStock = packaging.reorder_point && packaging.on_hand <= packaging.reorder_point;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#174940] text-white p-6 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{packaging.name}</h2>
            <div className="flex gap-4 mt-3">
              {packaging.category && (
                <span className="px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm font-semibold text-gray-900">
                  {packaging.category}
                </span>
              )}
              <span className="px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm font-semibold text-gray-900">
                Stock: {formatNumber(packaging.on_hand)} {packaging.unit}
              </span>
              {isLowStock && (
                <span className="px-3 py-1 bg-red-300 rounded-full text-sm font-semibold text-red-900">
                  ⚠️ Low Stock
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-white hover:bg-red-500 rounded-lg transition-colors"
              title="Delete Packaging"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Packaging?</h3>
                  <p className="text-gray-700">
                    Are you sure you want to delete <strong>{packaging.name}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Packaging
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stock Adjustment Dialog */}
        {showStockAdjust && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Adjust Stock</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Action</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStockAdjustForm({ ...stockAdjustForm, adjustment_type: 'add' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${
                        stockAdjustForm.adjustment_type === 'add'
                          ? 'bg-green-100 text-green-800 border-2 border-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add Stock
                    </button>
                    <button
                      onClick={() => setStockAdjustForm({ ...stockAdjustForm, adjustment_type: 'remove' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${
                        stockAdjustForm.adjustment_type === 'remove'
                          ? 'bg-red-100 text-red-800 border-2 border-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      Remove Stock
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Quantity ({packaging.unit})</label>
                  <input
                    type="number"
                    step="1"
                    value={stockAdjustForm.quantity}
                    onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={stockAdjustForm.reason}
                    onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, reason: e.target.value })}
                    placeholder="e.g., Used in production, Damaged goods"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-semibold text-gray-900">
                    <strong>Current Stock:</strong> {formatNumber(packaging.on_hand)} {packaging.unit}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    <strong>New Stock:</strong> {formatNumber(packaging.on_hand + (stockAdjustForm.adjustment_type === 'add' ? stockAdjustForm.quantity : -stockAdjustForm.quantity))} {packaging.unit}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowStockAdjust(false);
                    setStockAdjustForm({ adjustment_type: 'add', quantity: 0, reason: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockAdjustment}
                  className="px-4 py-2 bg-[#174940] text-white rounded-lg hover:bg-[#0f332c]"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receive Shipment Dialog */}
        {showReceiveShipment && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Receive Shipment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Supplier</label>
                  <select
                    value={shipmentForm.supplier_id}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  >
                    <option value="">Select supplier...</option>
                    {allSuppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Quantity Received ({packaging.unit})</label>
                  <input
                    type="number"
                    step="1"
                    value={shipmentForm.quantity}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Purchase Price (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={shipmentForm.purchase_price}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, purchase_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={shipmentForm.reason}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, reason: e.target.value })}
                    placeholder="e.g., PO #12345"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-semibold text-gray-900">
                    <strong>Current Stock:</strong> {formatNumber(packaging.on_hand)} {packaging.unit}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    <strong>New Stock:</strong> {formatNumber(packaging.on_hand + shipmentForm.quantity)} {packaging.unit}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowReceiveShipment(false);
                    setShipmentForm({ supplier_id: '', quantity: 0, purchase_price: 0, reason: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveShipment}
                  className="px-4 py-2 bg-[#174940] text-white rounded-lg hover:bg-[#0f332c]"
                >
                  Receive Shipment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Supplier Dialog */}
        {showAddSupplier && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Link Supplier</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Supplier *</label>
                  <select
                    value={supplierForm.supplier_id}
                    onChange={(e) => {
                      if (e.target.value === 'add_new') {
                        window.open('/suppliers/add', '_blank');
                      } else {
                        setSupplierForm({ ...supplierForm, supplier_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  >
                    <option value="">Select supplier...</option>
                    {allSuppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                    <option value="add_new" className="font-semibold text-[#174940]">+ Add New Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supplierForm.is_primary}
                      onChange={(e) => setSupplierForm({ ...supplierForm, is_primary: e.target.checked })}
                      className="w-4 h-4 text-[#174940] rounded focus:ring-[#174940]"
                    />
                    <span className="text-sm font-semibold text-gray-900">Set as primary supplier</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Lead Time (days)</label>
                  <input
                    type="number"
                    step="1"
                    value={supplierForm.lead_time_days}
                    onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Minimum Order Quantity</label>
                  <input
                    type="number"
                    step="1"
                    value={supplierForm.minimum_order_quantity}
                    onChange={(e) => setSupplierForm({ ...supplierForm, minimum_order_quantity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Notes</label>
                  <textarea
                    value={supplierForm.notes}
                    onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional notes about this supplier relationship..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowAddSupplier(false);
                    setSupplierForm({
                      supplier_id: '',
                      is_primary: false,
                      lead_time_days: 0,
                      minimum_order_quantity: 0,
                      notes: '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="px-4 py-2 bg-[#174940] text-white rounded-lg hover:bg-[#0f332c]"
                >
                  Link Supplier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            {[
              { key: 'overview', label: 'Overview', icon: Package },
              { key: 'cost', label: 'Cost Analysis', icon: DollarSign },
              { key: 'suppliers', label: 'Suppliers', icon: Building2 },
              { key: 'history', label: 'Stock History', icon: Calendar },
              { key: 'files', label: `Files & Specs ${packagingFiles.length > 0 ? `(${packagingFiles.length})` : ''}`, icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === key
                    ? 'text-[#174940] border-b-2 border-[#174940]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stock Management Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Quick Actions</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowStockAdjust(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        <ArrowUp className="w-4 h-4" />
                        Adjust Stock
                      </button>
                      <button
                        onClick={() => setShowReceiveShipment(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        <TruckIcon className="w-4 h-4" />
                        Receive Shipment
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-gray-900">Basic Information</h3>
                        {!isEditingBasicInfo && (
                          <button
                            onClick={() => setIsEditingBasicInfo(true)}
                            className="text-sm text-[#174940] hover:underline font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {isEditingBasicInfo ? (
                        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Name</label>
                            <input
                              type="text"
                              value={basicInfoForm.name}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, name: e.target.value })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Category</label>
                            <select
                              value={basicInfoForm.category}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, category: e.target.value })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            >
                              <option value="">Select category...</option>
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Reorder Point ({packaging.unit})</label>
                            <input
                              type="number"
                              value={basicInfoForm.reorder_point}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, reorder_point: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Status</label>
                            <select
                              value={basicInfoForm.status}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, status: e.target.value })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="discontinued">Discontinued</option>
                            </select>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleUpdateBasicInfo}
                              className="px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#0f332c]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingBasicInfo(false)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {packaging.category && (
                            <div>
                              <label className="text-sm font-medium text-gray-700">Category</label>
                              <p className="font-semibold text-gray-900">{packaging.category}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-gray-700">Current Stock</label>
                            <p className="font-semibold text-gray-900">{formatNumber(packaging.on_hand)} {packaging.unit}</p>
                          </div>
                          {packaging.reorder_point && (
                            <div>
                              <label className="text-sm font-medium text-gray-700">Reorder Point</label>
                              <p className="font-semibold text-gray-900">{formatNumber(packaging.reorder_point)} {packaging.unit}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <p className="font-semibold text-gray-900 capitalize">{packaging.status || 'active'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900">Cost Summary</h3>
                      <div className="space-y-3">
                        {packaging.cost_per_unit ? (
                          <>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Cost per Unit</label>
                              <p className="font-semibold text-lg text-gray-900">${formatNumber(packaging.cost_per_unit, 2)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Inventory Value</label>
                              <p className="font-semibold text-green-600">${formatNumber(parseFloat(inventoryValue), 2)}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-amber-600 text-sm">No cost information available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Analysis Tab */}
              {activeTab === 'cost' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg text-gray-900">Cost Information</h3>
                    {!isEditingCost && (
                      <button
                        onClick={() => {
                          setCostForm({
                            cost_per_unit: packaging.cost_per_unit || 0,
                          });
                          setIsEditingCost(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#0f332c]"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Cost
                      </button>
                    )}
                  </div>

                  {isEditingCost ? (
                    <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Update Cost Information</h4>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">Cost per Unit ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={costForm.cost_per_unit}
                          onChange={(e) => setCostForm({ ...costForm, cost_per_unit: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleUpdateCost}
                          className="px-6 py-2 bg-[#174940] text-white rounded hover:bg-[#0f332c]"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditingCost(false)}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-[#174940] to-[#0f332c] text-white p-6 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5" />
                          <p className="text-sm opacity-90">Cost per Unit</p>
                        </div>
                        <p className="text-3xl font-bold">
                          {packaging.cost_per_unit ? `$${formatNumber(packaging.cost_per_unit, 2)}` : 'N/A'}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5" />
                          <p className="text-sm opacity-90">Inventory Value</p>
                        </div>
                        <p className="text-3xl font-bold">${formatNumber(parseFloat(inventoryValue), 2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Suppliers Tab */}
              {activeTab === 'suppliers' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-900">Suppliers</h3>
                    <button
                      onClick={() => setShowAddSupplier(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#0f332c]"
                    >
                      <Plus className="w-4 h-4" />
                      Add Supplier
                    </button>
                  </div>

                  {suppliers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No suppliers linked to this packaging</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {suppliers.map((supplier) => (
                        <div key={supplier.id} className="border rounded-lg p-4 hover:border-[#174940] transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{supplier.suppliers.name}</h4>
                                {supplier.is_primary && (
                                  <span className="px-2 py-0.5 bg-[#174940] text-white text-xs rounded-full">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
                                {supplier.suppliers.contact_person && (
                                  <div>
                                    <span className="font-medium text-gray-900">Contact:</span> {supplier.suppliers.contact_person}
                                  </div>
                                )}
                                {supplier.suppliers.email && (
                                  <div>
                                    <span className="font-medium text-gray-900">Email:</span> {supplier.suppliers.email}
                                  </div>
                                )}
                                {supplier.suppliers.phone && (
                                  <div>
                                    <span className="font-medium text-gray-900">Phone:</span> {supplier.suppliers.phone}
                                  </div>
                                )}
                                {supplier.lead_time_days && (
                                  <div>
                                    <span className="font-medium text-gray-900">Lead Time:</span> {supplier.lead_time_days} days
                                  </div>
                                )}
                                {supplier.minimum_order_quantity && (
                                  <div>
                                    <span className="font-medium text-gray-900">MOQ:</span> {formatNumber(supplier.minimum_order_quantity)}
                                  </div>
                                )}
                              </div>
                              {supplier.notes && (
                                <p className="mt-2 text-sm text-gray-700 italic">{supplier.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stock History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">Stock Adjustment History</h3>

                  {stockAdjustments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No stock adjustments recorded</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Supplier</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Quantity</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {stockAdjustments.map((adj) => (
                            <tr key={adj.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {new Date(adj.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
                                  adj.adjustment_type === 'receive_shipment'
                                    ? 'bg-green-100 text-green-800'
                                    : adj.adjustment_type === 'add'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {adj.adjustment_type === 'receive_shipment' && <TruckIcon className="w-3 h-3" />}
                                  {adj.adjustment_type === 'add' && <Plus className="w-3 h-3" />}
                                  {adj.adjustment_type === 'remove' && <Minus className="w-3 h-3" />}
                                  {adj.adjustment_type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {adj.suppliers?.name || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                {adj.adjustment_type === 'remove' ? '-' : '+'}{formatNumber(adj.quantity)} {packaging.unit}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-700">
                                {adj.purchase_price ? `$${formatNumber(adj.purchase_price, 2)}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {adj.reason || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Files & Specifications Tab */}
              {activeTab === 'files' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">Product Specifications</h3>
                    {packaging.category ? (
                      <PackagingCategoryFields
                        category={packaging.category}
                        values={basicInfoForm}
                        onChange={handleCategoryFieldChange}
                        disabled={!isEditingBasicInfo}
                      />
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          No category selected. Select a category to add product specifications.
                        </p>
                      </div>
                    )}
                    {packaging.category && isEditingBasicInfo && (
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setIsEditingBasicInfo(false);
                            // Reset form
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateBasicInfo}
                          className="px-4 py-2 bg-[#174940] text-white rounded-lg hover:bg-[#0f332c]"
                        >
                          Save Specifications
                        </button>
                      </div>
                    )}
                    {packaging.category && !isEditingBasicInfo && (
                      <div className="mt-4">
                        <button
                          onClick={() => setIsEditingBasicInfo(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Specifications
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">Files & Documents</h3>

                    <div className="mb-6">
                      <PackagingFileUpload
                        packagingId={packaging.id}
                        onUploadComplete={fetchFiles}
                      />
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Uploaded Files</h4>
                      <PackagingFileGallery
                        files={packagingFiles}
                        onFileDeleted={fetchFiles}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
