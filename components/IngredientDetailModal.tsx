'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { X, Building2, Package, DollarSign, TrendingUp, Calendar, Edit, Plus, Trash2, FileText, AlertTriangle, Minus, ArrowUp, TruckIcon, Scale } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface IngredientSupplier {
  id: string;
  supplier_id: string;
  is_primary: boolean;
  lead_time_days: number | null;
  minimum_order_quantity: number | null;
  notes: string | null;
  suppliers: Supplier;
}

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  unit_size: number;
  unit_measure: string;
  price_per_unit: number;
  total_price: number;
  received_quantity: number;
  purchase_orders: {
    po_number: string;
    order_date: string;
    status: string;
    suppliers: {
      name: string;
    };
  };
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

interface Ingredient {
  id: string;
  name: string;
  category: string;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  unit_size: number | null;
  unit_measure: string | null;
  price_per_unit: number | null;
  cost_per_gram: number | null;
  last_purchase_date: string | null;
  last_purchase_price: number | null;
  average_cost: number | null;
  cost_per_unit: number | null;
  status: string | null;
  organic_cert: boolean | null;
  coa_url: string | null;
  coa_expiration_date: string | null;
}

interface IngredientDetailModalProps {
  ingredient: Ingredient;
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

export default function IngredientDetailModal({ 
  ingredient, 
  isOpen, 
  onClose,
  onUpdate 
}: IngredientDetailModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'purchases' | 'cost'>('overview');
  const [suppliers, setSuppliers] = useState<IngredientSupplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseOrderItem[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Edit states
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingCOA, setIsEditingCOA] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStockAdjust, setShowStockAdjust] = useState(false);
  const [showReceiveShipment, setShowReceiveShipment] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [containers, setContainers] = useState<any[]>([]);
  
  // Forms
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: ingredient.name,
    category: ingredient.category,
    reorder_point: ingredient.reorder_point || 0,
    organic_cert: ingredient.organic_cert || false,
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
  
  const [coaForm, setCoaForm] = useState({
    coa_url: ingredient.coa_url || '',
    coa_expiration_date: ingredient.coa_expiration_date || '',
  });
  
  const [costForm, setCostForm] = useState({
    unit_size: ingredient.unit_size || 0,
    unit_measure: ingredient.unit_measure || 'g',
    price_per_unit: ingredient.price_per_unit || 0,
  });

  const [supplierForm, setSupplierForm] = useState({
    supplier_id: '',
    is_primary: false,
    lead_time_days: 0,
    minimum_order_quantity: 0,
    notes: '',
  });

  const categories = [
    'Base Ingredients',
    'Oils and Butters',
    'Cannabinoids',
    'Extracts and Actives',
    'Functional Additives',
    'Essential Oils',
    'Preservatives',
    'Antioxidants'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
      getCurrentUser();
      setCoaForm({
        coa_url: ingredient.coa_url || '',
        coa_expiration_date: ingredient.coa_expiration_date || '',
      });
      setBasicInfoForm({
        name: ingredient.name,
        category: ingredient.category,
        reorder_point: ingredient.reorder_point || 0,
        organic_cert: ingredient.organic_cert || false,
      });
    }
  }, [isOpen, ingredient.id]);

  useEffect(() => {
    if (ingredient?.id && isOpen) {
      fetchContainers();
    }
  }, [ingredient?.id, isOpen]);

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

  const fetchContainers = async () => {
    const { data, error } = await supabase
      .from('inventory_containers')
      .select('*')
      .eq('item_id', ingredient.id)
      .not('status', 'in', '("archived")')
      .order('status');

    if (error) {
      console.error('Error fetching containers:', error);
      setContainers([]);
      return;
    }

    setContainers(data || []);
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

      // Fetch linked suppliers
      const { data: supplierData } = await supabase
        .from('ingredient_suppliers')
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
        .eq('ingredient_id', ingredient.id)
        .order('is_primary', { ascending: false });

      if (supplierData) setSuppliers(supplierData);

      // Fetch stock adjustments
      const { data: adjustmentsData } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          suppliers (
            name
          )
        `)
        .eq('ingredient_id', ingredient.id)
        .order('created_at', { ascending: false });

      if (adjustmentsData) setStockAdjustments(adjustmentsData);

      // Fetch purchase history
      const { data: purchaseData } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          purchase_orders (
            po_number,
            order_date,
            status,
            suppliers (
              name
            )
          )
        `)
        .eq('ingredient_id', ingredient.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (purchaseData) setPurchaseHistory(purchaseData);
    } catch (error) {
      console.error('Error fetching ingredient details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBasicInfo = async () => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .update({
          name: basicInfoForm.name,
          category: basicInfoForm.category,
          reorder_point: basicInfoForm.reorder_point || null,
          organic_cert: basicInfoForm.organic_cert,
        })
        .eq('id', ingredient.id);

      if (error) throw error;
      
      setIsEditingBasicInfo(false);
      onUpdate();
      window.location.reload();
    } catch (error) {
      console.error('Error updating basic info:', error);
      alert('Failed to update ingredient information');
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

      // Create stock adjustment record
      const { error: adjustError } = await supabase
        .from('stock_adjustments')
        .insert({
          ingredient_id: ingredient.id,
          adjustment_type: stockAdjustForm.adjustment_type,
          quantity: stockAdjustForm.quantity,
          reason: stockAdjustForm.reason || null,
          created_by: currentUserId,
        });

      if (adjustError) throw adjustError;

      // Update ingredient stock
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          on_hand: ingredient.on_hand + adjustmentAmount,
        })
        .eq('id', ingredient.id);

      if (updateError) throw updateError;

      alert('Stock adjusted successfully');
      setShowStockAdjust(false);
      setStockAdjustForm({ adjustment_type: 'add', quantity: 0, reason: '' });
      onUpdate();
      window.location.reload();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(`Failed to adjust stock: ${error.message}`);
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
        .from('stock_adjustments')
        .insert({
          ingredient_id: ingredient.id,
          adjustment_type: 'receive_shipment',
          quantity: shipmentForm.quantity,
          reason: shipmentForm.reason || 'Received shipment',
          supplier_id: shipmentForm.supplier_id,
          purchase_price: shipmentForm.purchase_price || null,
          created_by: currentUserId,
        });

      if (adjustError) throw adjustError;

      // Update ingredient stock and purchase info
      const updateData: any = {
        on_hand: ingredient.on_hand + shipmentForm.quantity,
        last_purchase_date: new Date().toISOString().split('T')[0],
      };

      if (shipmentForm.purchase_price > 0) {
        updateData.last_purchase_price = shipmentForm.purchase_price;
      }

      const { error: updateError } = await supabase
        .from('ingredients')
        .update(updateData)
        .eq('id', ingredient.id);

      if (updateError) throw updateError;

      alert('Shipment received successfully');
      setShowReceiveShipment(false);
      setShipmentForm({ supplier_id: '', quantity: 0, purchase_price: 0, reason: '' });
      onUpdate();
      window.location.reload();
    } catch (error: any) {
      console.error('Error receiving shipment:', error);
      alert(`Failed to receive shipment: ${error.message}`);
    }
  };

  const handleUpdateCost = async () => {
    try {
      let calculatedCostPerGram = 0;
      
      if (costForm.unit_size > 0 && costForm.price_per_unit > 0) {
        let amountInGrams = costForm.unit_size;
        
        switch (costForm.unit_measure) {
          case 'kg':
            amountInGrams = costForm.unit_size * 1000;
            break;
          case 'ml':
            amountInGrams = costForm.unit_size;
            break;
          case 'l':
            amountInGrams = costForm.unit_size * 1000;
            break;
          case 'oz':
            amountInGrams = costForm.unit_size * 28.3495;
            break;
          case 'lb':
            amountInGrams = costForm.unit_size * 453.592;
            break;
          default:
            amountInGrams = costForm.unit_size;
        }
        
        calculatedCostPerGram = costForm.price_per_unit / amountInGrams;
      }

      const { error } = await supabase
        .from('ingredients')
        .update({
          unit_size: costForm.unit_size,
          unit_measure: costForm.unit_measure,
          price_per_unit: costForm.price_per_unit,
          cost_per_gram: calculatedCostPerGram,
        })
        .eq('id', ingredient.id);

      if (error) throw error;
      
      setIsEditingCost(false);
      onUpdate();
      window.location.reload();
    } catch (error) {
      console.error('Error updating cost:', error);
      alert('Failed to update cost information');
    }
  };

  const handleUpdateCOA = async () => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .update({
          coa_url: coaForm.coa_url || null,
          coa_expiration_date: coaForm.coa_expiration_date || null,
        })
        .eq('id', ingredient.id);

      if (error) throw error;
      
      setIsEditingCOA(false);
      onUpdate();
      alert('COA information updated successfully');
    } catch (error) {
      console.error('Error updating COA:', error);
      alert('Failed to update COA information');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', ingredient.id);

      if (error) throw error;

      alert('Ingredient deleted successfully');
      setShowDeleteConfirm(false);
      onClose();
      // Call onUpdate to refresh the parent component's data
      onUpdate();
      // Force a full page reload to ensure the list refreshes
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error: any) {
      console.error('Error deleting ingredient:', error);
      alert(`Failed to delete ingredient: ${error.message}`);
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
        .from('ingredient_suppliers')
        .insert({
          ingredient_id: ingredient.id,
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

  const isCoaExpired = ingredient.coa_expiration_date && new Date(ingredient.coa_expiration_date) < new Date();
  const isCoaExpiringSoon = ingredient.coa_expiration_date && !isCoaExpired && 
    new Date(ingredient.coa_expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const inventoryValue = (ingredient.on_hand * (ingredient.cost_per_gram || 0)).toFixed(2);
  const costPerGram = ingredient.cost_per_gram || 
    (costForm.unit_size > 0 ? costForm.price_per_unit / costForm.unit_size : 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#174940] text-white p-6 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{ingredient.name}</h2>
            <div className="flex gap-4 mt-3">
              <span className="px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm font-semibold text-gray-900">
                {ingredient.category}
              </span>
              <span className="px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm font-semibold text-gray-900">
                Stock: {formatNumber(ingredient.on_hand)} {ingredient.unit}
              </span>
              {ingredient.organic_cert && (
                <span className="px-3 py-1 bg-green-300 rounded-full text-sm font-semibold text-green-900">
                  🌿 Organic
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-white hover:bg-red-500 rounded-lg transition-colors"
              title="Delete Ingredient"
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
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Ingredient?</h3>
                  <p className="text-gray-700">
                    Are you sure you want to delete <strong>{ingredient.name}</strong>? This action cannot be undone.
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
                  Delete Ingredient
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
                  <label className="block text-sm font-medium text-gray-900 mb-2">Action</label>
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">Quantity (grams)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockAdjustForm.quantity}
                    onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={stockAdjustForm.reason}
                    onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, reason: e.target.value })}
                    placeholder="e.g., Used in production, Damaged goods"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-gray-900">
                    <strong>Current Stock:</strong> {formatNumber(ingredient.on_hand)}g
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>New Stock:</strong> {formatNumber(ingredient.on_hand + (stockAdjustForm.adjustment_type === 'add' ? stockAdjustForm.quantity : -stockAdjustForm.quantity))}g
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">Supplier</label>
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">Quantity Received (grams)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={shipmentForm.quantity}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Purchase Price (optional)</label>
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={shipmentForm.reason}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, reason: e.target.value })}
                    placeholder="e.g., PO #12345"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#174940] text-gray-900"
                  />
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-gray-900">
                    <strong>Current Stock:</strong> {formatNumber(ingredient.on_hand)}g
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>New Stock:</strong> {formatNumber(ingredient.on_hand + shipmentForm.quantity)}g
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
              { key: 'purchases', label: 'Stock History', icon: Calendar },
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
                            <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
                            <input
                              type="text"
                              value={basicInfoForm.name}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, name: e.target.value })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                            <select
                              value={basicInfoForm.category}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, category: e.target.value })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Reorder Point (grams)</label>
                            <input
                              type="number"
                              value={basicInfoForm.reorder_point}
                              onChange={(e) => setBasicInfoForm({ ...basicInfoForm, reorder_point: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={basicInfoForm.organic_cert}
                                onChange={(e) => setBasicInfoForm({ ...basicInfoForm, organic_cert: e.target.checked })}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-gray-900">Organic Certified</span>
                            </label>
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
                          <div>
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <p className="font-medium text-gray-900">{ingredient.category}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Current Stock</label>
                            <p className="font-medium text-gray-900">{formatNumber(ingredient.on_hand)} {ingredient.unit}</p>
                          </div>
                          {ingredient.reorder_point && (
                            <div>
                              <label className="text-sm font-medium text-gray-700">Reorder Point</label>
                              <p className="font-medium text-gray-900">{formatNumber(ingredient.reorder_point)} {ingredient.unit}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900">Cost Summary</h3>
                      <div className="space-y-3">
                        {ingredient.cost_per_gram ? (
                          <>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Cost per Gram</label>
                              <p className="font-medium text-lg text-gray-900">${formatNumber(ingredient.cost_per_gram, 4)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Inventory Value</label>
                              <p className="font-medium text-green-600">${formatNumber(parseFloat(inventoryValue), 2)}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-amber-600 text-sm">No cost information available</p>
                        )}
                        {ingredient.last_purchase_date && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Last Purchase</label>
                            <p className="font-medium text-gray-900">{new Date(ingredient.last_purchase_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COA Section */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">Certificate of Analysis (COA)</h3>
                      {!isEditingCOA && (
                        <button
                          onClick={() => setIsEditingCOA(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#174940] text-white rounded hover:bg-[#0f332c]"
                        >
                          <Edit className="w-4 h-4" />
                          Edit COA
                        </button>
                      )}
                    </div>

                    {isEditingCOA ? (
                      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">COA URL/Link</label>
                          <input
                            type="text"
                            value={coaForm.coa_url}
                            onChange={(e) => setCoaForm({ ...coaForm, coa_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">COA Expiration Date</label>
                          <input
                            type="date"
                            value={coaForm.coa_expiration_date}
                            onChange={(e) => setCoaForm({ ...coaForm, coa_expiration_date: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleUpdateCOA}
                            className="px-4 py-2 bg-[#174940] text-white rounded hover:bg-[#0f332c]"
                          >
                            Save COA Info
                          </button>
                          <button
                            onClick={() => setIsEditingCOA(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ingredient.coa_url ? (
                          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <FileText className="w-5 h-5 text-[#174940] flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <a href={ingredient.coa_url} target="_blank" rel="noopener noreferrer" className="text-[#174940] hover:underline font-medium">View Certificate of Analysis</a>
                              {ingredient.coa_expiration_date && (
                                <div className="mt-1">
                                  <span className="text-sm font-medium text-gray-700">Expires: </span>
                                  <span className={`text-sm font-medium ${isCoaExpired ? 'text-red-600' : isCoaExpiringSoon ? 'text-amber-600' : 'text-gray-900'}`}>
                                    {new Date(ingredient.coa_expiration_date).toLocaleDateString()}
                                    {isCoaExpired && ' (EXPIRED)'}
                                    {isCoaExpiringSoon && ' (Expiring Soon)'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <span className="text-sm text-amber-800 font-medium">No COA on file</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Physical Containers
                    </h3>
                    
                    {containers.length === 0 ? (
                      <p className="text-gray-500 text-sm">No containers tracked yet</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-green-50 p-3 rounded">
                            <p className="text-gray-600">Backstock</p>
                            <p className="text-xl font-bold text-green-900">
                              {containers.filter(c => c.status === 'backstock').length}
                            </p>
                            <p className="text-gray-600 text-xs">
                              {containers
                                .filter(c => c.status === 'backstock')
                                .reduce((sum, c) => sum + (c.current_net_weight || 0), 0)
                                .toFixed(2)}{' '}
                              {ingredient.unit}
                            </p>
                          </div>
                          
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-gray-600">Active</p>
                            <p className="text-xl font-bold text-blue-900">
                              {containers.filter(c => c.status === 'active').length}
                            </p>
                            <p className="text-gray-600 text-xs">
                              {containers
                                .filter(c => c.status === 'active')
                                .reduce((sum, c) => sum + (c.current_net_weight || 0), 0)
                                .toFixed(2)}{' '}
                              {ingredient.unit}
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => router.push(`/inventory?tab=containers&item_id=${ingredient.id}`)}
                          className="text-[#174940] hover:text-[#0f332c] text-sm font-medium flex items-center gap-1"
                        >
                          View All Containers →
                        </button>
                      </div>
                    )}
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
                            unit_size: ingredient.unit_size || 0,
                            unit_measure: ingredient.unit_measure || 'g',
                            price_per_unit: ingredient.price_per_unit || 0,
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
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Unit Size</label>
                          <input
                            type="number"
                            step="0.01"
                            value={costForm.unit_size}
                            onChange={(e) => setCostForm({ ...costForm, unit_size: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Unit Measure</label>
                          <select
                            value={costForm.unit_measure}
                            onChange={(e) => setCostForm({ ...costForm, unit_measure: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                          >
                            <option value="g">Grams (g)</option>
                            <option value="kg">Kilograms (kg)</option>
                            <option value="ml">Milliliters (ml)</option>
                            <option value="l">Liters (l)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Price per Unit</label>
                          <input
                            type="number"
                            step="0.01"
                            value={costForm.price_per_unit}
                            onChange={(e) => setCostForm({ ...costForm, price_per_unit: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#174940] text-gray-900"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded border-2 border-[#174940]">
                        <p className="text-sm font-medium text-gray-700 mb-1">Calculated Cost per Gram</p>
                        <p className="text-2xl font-bold text-[#174940]">
                          ${formatNumber(costPerGram, 4)}
                        </p>
                      </div>

                      <div className="flex gap-3">
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
                          <p className="text-sm opacity-90">Cost per Gram</p>
                        </div>
                        <p className="text-3xl font-bold">
                          {ingredient.cost_per_gram ? `$${formatNumber(ingredient.cost_per_gram, 4)}` : 'N/A'}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5" />
                          <p className="text-sm opacity-90">Inventory Value</p>
                        </div>
                        <p className="text-3xl font-bold">${formatNumber(parseFloat(inventoryValue), 2)}</p>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Purchase Unit</p>
                        <p className="text-xl font-semibold text-gray-900">
                          {ingredient.unit_size ? `${formatNumber(ingredient.unit_size, 2)} ${ingredient.unit_measure}` : 'Not set'}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Price per Unit</p>
                        <p className="text-xl font-semibold text-gray-900">
                          {ingredient.price_per_unit ? `$${formatNumber(ingredient.price_per_unit, 2)}` : 'Not set'}
                        </p>
                      </div>

                      {ingredient.last_purchase_date && (
                        <>
                          <div className="bg-gray-50 p-6 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">Last Purchase Date</p>
                            <p className="text-xl font-semibold text-gray-900">
                              {new Date(ingredient.last_purchase_date).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="bg-gray-50 p-6 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">Last Purchase Price</p>
                            <p className="text-xl font-semibold text-gray-900">
                              ${formatNumber(ingredient.last_purchase_price || 0, 2)}
                            </p>
                          </div>
                        </>
                      )}
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
                      <p>No suppliers linked to this ingredient</p>
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
              {activeTab === 'purchases' && (
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
                                {adj.adjustment_type === 'remove' ? '-' : '+'}{formatNumber(adj.quantity)}g
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
