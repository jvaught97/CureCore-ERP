'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Package, Search, Plus, AlertTriangle, TrendingDown, Filter, ChevronDown, History, Box, ClipboardCheck, Building2, Camera, Scale, TrendingUp, Gift, Layers } from 'lucide-react';
import IngredientDetailModal from '@/components/IngredientDetailModal';
import PackagingDetailModal from '@/components/PackagingDetailModal';
import PremiumRunInventoryCount from '@/components/PremiumRunInventoryCount';
import ReceivingScanTab from '@/components/inventory/ReceivingScanTab';
import { AppNav } from '@/components/nav/AppNav';
import { inventoryDemoData } from '@/data/inventoryDemo';
import { PremiumSuppliersTab } from './_components/PremiumSuppliersTab';
import { PremiumIngredientsTab } from './_components/PremiumIngredientsTab';
import { PremiumPackagingTab } from './_components/PremiumPackagingTab';
import { PremiumContainersTab } from './_components/PremiumContainersTab';
import { PremiumHistoryTab } from './_components/PremiumHistoryTab';
import { PremiumPromoKittingTab } from './_components/PremiumPromoKittingTab';
import { PremiumPackagingSuppliesTab } from './_components/PremiumPackagingSuppliesTab';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useTheme } from '@/lib/context/ThemeContext';
import { getBackgroundClass, getTextColor, getTextMuted, getCardBackground, getBorderColor } from '@/lib/utils/themeUtils';

type TabType = 'ingredients' | 'packaging' | 'containers' | 'receiving' | 'suppliers' | 'history' | 'run-inventory' | 'promo-kitting' | 'packaging-supplies';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  cost_per_gram: number | null;
  status: string | null;
  organic_cert: boolean | null;
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
}

interface InventoryHistory {
  id: string;
  item_type: string;
  item_name: string;
  transaction_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  employee_name: string | null;
  notes: string | null;
  created_at: string;
}

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

interface PromoKittingItem {
  id: string;
  name: string;
  category: string;
  on_hand: number;
  unit: string;
  cost_per_unit: number | null;
  reorder_point: number | null;
  sku: string | null;
  status: string | null;
}

interface PackagingSupply {
  id: string;
  name: string;
  category: string;
  on_hand: number;
  unit: string;
  cost_per_unit: number | null;
  reorder_point: number | null;
  sku: string | null;
  size_spec: string | null;
  status: string | null;
}

const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

function RunInventoryView() {
  const [selectedType, setSelectedType] = useState<'ingredients' | 'packaging'>('ingredients');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Select Inventory Type to Count</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedType('ingredients')}
            className={`flex-1 px-6 py-4 rounded-lg font-medium transition-colors ${
              selectedType === 'ingredients'
                ? 'bg-[#174940] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Count Ingredients
          </button>
          <button
            onClick={() => setSelectedType('packaging')}
            className={`flex-1 px-6 py-4 rounded-lg font-medium transition-colors ${
              selectedType === 'packaging'
                ? 'bg-[#174940] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Count Packaging
          </button>
        </div>
      </div>
      <PremiumRunInventoryCount type={selectedType} />
    </div>
  );
}

export default function InventoryPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return (
      tab === 'packaging' ||
      tab === 'containers' ||
      tab === 'receiving' ||
      tab === 'suppliers' ||
      tab === 'history' ||
      tab === 'run-inventory' ||
      tab === 'promo-kitting' ||
      tab === 'packaging-supplies'
    )
      ? tab as TabType
      : 'ingredients';
  });
  
  // Ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  
  // Packaging state
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);
  const [filteredPackaging, setFilteredPackaging] = useState<PackagingItem[]>([]);

  // Containers state
  const [containers, setContainers] = useState<Container[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<Container[]>([]);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);

  // History state
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<InventoryHistory[]>([]);

  // Promo/Kitting state
  const [promoKittingItems, setPromoKittingItems] = useState<PromoKittingItem[]>([]);
  const [filteredPromoKittingItems, setFilteredPromoKittingItems] = useState<PromoKittingItem[]>([]);

  // Packaging Supplies state
  const [packagingSupplies, setPackagingSupplies] = useState<PackagingSupply[]>([]);
  const [filteredPackagingSupplies, setFilteredPackagingSupplies] = useState<PackagingSupply[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all'); // 'all', 'ingredient', 'packaging'
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // For promo/kitting and packaging supplies
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Packaging detail state
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingItem | null>(null);
  const [showPackagingDetailModal, setShowPackagingDetailModal] = useState(false);

  const ingredientCategories = [
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
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    filterData();
  }, [ingredients, packaging, containers, suppliers, history, promoKittingItems, packagingSupplies, searchTerm, selectedCategory, showLowStock, historyFilter, statusFilter, dateRangeFilter, transactionTypeFilter, categoryFilter]);

  const loadDemoData = () => {
    if (activeTab === 'ingredients') {
      setIngredients(inventoryDemoData.ingredients as unknown as Ingredient[]);
    } else if (activeTab === 'packaging') {
      setPackaging(inventoryDemoData.packaging as unknown as PackagingItem[]);
    } else if (activeTab === 'containers') {
      setContainers(inventoryDemoData.containers as unknown as Container[]);
    } else if (activeTab === 'history') {
      setHistory(inventoryDemoData.history as unknown as InventoryHistory[]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always use database - bypass auth is disabled
      // Force database mode regardless of environment variable
      const useDemoData = false;

      if (useDemoData) {
        loadDemoData();
        return;
      }

      // Get current user for logging and potential future filtering
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('🔍 [INVENTORY] Fetching data for tab:', activeTab);
      console.log('🔍 [INVENTORY] User state:', user);

      if (activeTab === 'ingredients') {
        const { data, error } = await supabase
          .from('ingredients')
          .select('*')
          .order('name');
        console.log('📦 [INVENTORY] Ingredients query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] Ingredients error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setIngredients(data || []);
      } else if (activeTab === 'packaging') {
        const { data, error } = await supabase
          .from('packaging')
          .select('*, packaging_files(id)')
          .order('name');
        console.log('📦 [INVENTORY] Packaging query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] Packaging error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setPackaging(data || []);
      } else if (activeTab === 'containers') {
        const { data, error } = await supabase
          .from('inventory_containers')
          .select(`
            *,
            item_master!inner(id, name, sku),
            item_lots!inner(lot_number, expiry_date)
          `)
          .order('created_at', { ascending: false });
        console.log('📦 [INVENTORY] Containers query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] Containers error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setContainers((data as Container[]) || []);
      } else if (activeTab === 'history') {
        const { data, error } = await supabase
          .from('inventory_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        console.log('📦 [INVENTORY] History query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] History error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setHistory(data || []);
      } else if (activeTab === 'suppliers') {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');
        console.log('📦 [INVENTORY] Suppliers query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] Suppliers error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setSuppliers(data || []);
      } else if (activeTab === 'promo-kitting') {
        const { data, error } = await supabase
          .from('promo_kitting_items')
          .select('*')
          .order('name');
        console.log('📦 [INVENTORY] Promo/Kitting query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] Promo/Kitting error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setPromoKittingItems(data || []);
      } else if (activeTab === 'packaging-supplies') {
        const { data, error } = await supabase
          .from('packaging_supplies')
          .select('*')
          .order('name');
        console.log('📦 [INVENTORY] Packaging Supplies query result:', { data, error });
        if (error) {
          console.error('❌ [INVENTORY] Packaging Supplies error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        setPackagingSupplies(data || []);
      }
      console.log('✅ [INVENTORY] Data fetched successfully');
    } catch (error) {
      console.error('❌ [INVENTORY] Error fetching data:', error);
      console.error('❌ [INVENTORY] Error type:', typeof error);
      console.error('❌ [INVENTORY] Error keys:', error ? Object.keys(error) : 'null');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) {
        console.error('❌ [INVENTORY] Error deleting supplier:', error);
        alert(`Error deleting supplier: ${error.message}`);
        return;
      }

      // Update local state to remove the deleted supplier
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      setFilteredSuppliers(prev => prev.filter(s => s.id !== supplierId));
      console.log('✅ [INVENTORY] Supplier deleted successfully');
    } catch (err) {
      console.error('❌ [INVENTORY] Unexpected error deleting supplier:', err);
      alert('An unexpected error occurred while deleting the supplier');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (activeTab === 'ingredients') {
      let filtered = [...ingredients];

      if (searchTerm) {
        filtered = filtered.filter(ing =>
          ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (ing.category && ing.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      if (selectedCategory !== 'all') {
        filtered = filtered.filter(ing => ing.category === selectedCategory);
      }

      if (showLowStock) {
        filtered = filtered.filter(ing => 
          ing.reorder_point && ing.on_hand <= ing.reorder_point
        );
      }

      setFilteredIngredients(filtered);
    } else if (activeTab === 'packaging') {
      let filtered = [...packaging];

      if (searchTerm) {
        filtered = filtered.filter(pkg =>
          pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (showLowStock) {
        filtered = filtered.filter(pkg => 
          pkg.reorder_point && pkg.on_hand <= pkg.reorder_point
        );
      }

      setFilteredPackaging(filtered);
    } else if (activeTab === 'containers') {
      let filtered = [...containers];

      if (searchTerm) {
        filtered = filtered.filter(c =>
          c.container_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.item_master.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.label && c.label.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }

      setFilteredContainers(filtered);
    } else if (activeTab === 'suppliers') {
      let filtered = [...suppliers];

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(s =>
          s.name.toLowerCase().includes(term) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(term)) ||
          (s.email && s.email.toLowerCase().includes(term))
        );
      }

      setFilteredSuppliers(filtered);
    } else if (activeTab === 'history') {
      let filtered = [...history];

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((h) =>
          h.item_name.toLowerCase().includes(term) ||
          (h.employee_name?.toLowerCase().includes(term) ?? false) ||
          (h.notes?.toLowerCase().includes(term) ?? false)
        );
      }

      // Item type filter
      if (historyFilter !== 'all') {
        filtered = filtered.filter(h => h.item_type === historyFilter);
      }

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();

        switch (dateRangeFilter) {
          case 'today':
            cutoffDate.setHours(0, 0, 0, 0);
            break;
          case '7days':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case '90days':
            cutoffDate.setDate(now.getDate() - 90);
            break;
        }

        if (dateRangeFilter !== 'all') {
          filtered = filtered.filter(h => new Date(h.created_at) >= cutoffDate);
        }
      }

      // Transaction type filter
      if (transactionTypeFilter !== 'all') {
        const filterType = transactionTypeFilter.toLowerCase();
        filtered = filtered.filter(h => {
          const txType = h.transaction_type.toLowerCase();
          if (filterType === 'add') {
            return txType.includes('add') || txType.includes('receive') || txType.includes('increase');
          }
          if (filterType === 'deduct') {
            return txType.includes('deduct') || txType.includes('shipment') || txType.includes('consumption') || txType.includes('decrease');
          }
          if (filterType === 'adjust') {
            return txType.includes('adjust') || txType.includes('count');
          }
          return true;
        });
      }

      setFilteredHistory(filtered);
    } else if (activeTab === 'promo-kitting') {
      let filtered = [...promoKittingItems];

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
          item.name.toLowerCase().includes(term) ||
          (item.sku && item.sku.toLowerCase().includes(term)) ||
          (item.category && item.category.toLowerCase().includes(term))
        );
      }

      // Category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(item => item.category === categoryFilter);
      }

      setFilteredPromoKittingItems(filtered);
    } else if (activeTab === 'packaging-supplies') {
      let filtered = [...packagingSupplies];

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
          item.name.toLowerCase().includes(term) ||
          (item.sku && item.sku.toLowerCase().includes(term)) ||
          (item.size_spec && item.size_spec.toLowerCase().includes(term)) ||
          (item.category && item.category.toLowerCase().includes(term))
        );
      }

      // Category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(item => item.category === categoryFilter);
      }

      setFilteredPackagingSupplies(filtered);
    }
  };

  const lowStockIngredientsCount = ingredients.filter(ing => 
    ing.reorder_point && ing.on_hand <= ing.reorder_point
  ).length;

  const lowStockPackagingCount = packaging.filter(pkg => 
    pkg.reorder_point && pkg.on_hand <= pkg.reorder_point
  ).length;

  const totalInventoryValue = ingredients.reduce((sum, ing) =>
    sum + (ing.on_hand * (ing.cost_per_gram || 0)), 0
  );

  const totalPackagingValue = packaging.reduce((sum, pkg) =>
    sum + (pkg.on_hand * (pkg.cost_per_unit || 0)), 0
  );

  const containersNeedingCount = containers.filter(c => 
    !c.last_weighed_at ||
    (new Date().getTime() - new Date(c.last_weighed_at).getTime()) > 30 * 24 * 60 * 60 * 1000
  ).length;

  const bgClass = getBackgroundClass(mode);
  const textColor = getTextColor(mode);
  const textMuted = getTextMuted(mode);
  const cardBg = getCardBackground(mode);
  const borderColor = getBorderColor(mode);

  return (
    <>
      <AppNav currentPage="inventory" />
      <div className={`min-h-screen ${bgClass}`}>
        {/* Header */}
        <div className={`${cardBg} border-b ${borderColor}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className={`text-3xl font-bold ${textColor}`}>Inventory Management</h1>
                <p className={`${textMuted} mt-1`}>Track and manage your inventory</p>
              </div>
              
              {activeTab !== 'history' && activeTab !== 'run-inventory' && activeTab !== 'receiving' && (
                <a
                  href={
                    activeTab === 'ingredients' ? '/inventory/add' :
                    activeTab === 'packaging' ? '/packaging/add' :
                    activeTab === 'containers' ? '/inventory/containers/new' :
                    activeTab === 'suppliers' ? '/suppliers/add' :
                    '/inventory/add'
                  }
                  className="flex items-center gap-2 bg-[#174940] text-white px-6 py-3 rounded-lg hover:bg-[#0f332c] transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add {activeTab === 'ingredients'
                    ? 'Ingredient'
                    : activeTab === 'packaging'
                    ? 'Packaging'
                    : activeTab === 'containers'
                    ? 'Container'
                    : 'Supplier'}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              <button
                onClick={() => {
                  setActiveTab('ingredients');
                  router.push('/inventory?tab=ingredients');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ingredients'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Ingredients
                  {lowStockIngredientsCount > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {lowStockIngredientsCount}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('packaging');
                  router.push('/inventory?tab=packaging');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'packaging'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  Packaging
                  {lowStockPackagingCount > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {lowStockPackagingCount}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('containers');
                  router.push('/inventory?tab=containers');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'containers'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Containers
                  {containersNeedingCount > 0 && (
                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {containersNeedingCount}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('suppliers');
                  router.push('/inventory?tab=suppliers');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'suppliers'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Suppliers
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  router.push('/inventory?tab=history');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  History
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('receiving');
                  router.push('/inventory?tab=receiving');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'receiving'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Receiving/Scan
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('run-inventory');
                  router.push('/inventory?tab=run-inventory');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'run-inventory'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Run Inventory
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('promo-kitting');
                  router.push('/inventory?tab=promo-kitting');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'promo-kitting'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Promo/Kitting
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('packaging-supplies');
                  router.push('/inventory?tab=packaging-supplies');
                }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'packaging-supplies'
                    ? 'border-[#174940] text-[#174940]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Packaging Supplies
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Premium Ingredients Tab with Animated Background */}
        {activeTab === 'ingredients' && (
          <>
            <AnimatedBackground />
            <div className="relative z-10">
              <PremiumIngredientsTab
                ingredients={ingredients}
                filteredIngredients={filteredIngredients}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                onEdit={(ingredient) => {
                  setSelectedIngredient(ingredient);
                  setShowDetailModal(true);
                }}
              />
            </div>
          </>
        )}

        {/* Premium Packaging Tab with Animated Background */}
        {activeTab === 'packaging' && (
          <>
            <AnimatedBackground />
            <div className="relative z-10">
              <PremiumPackagingTab
                packaging={packaging}
                filteredPackaging={filteredPackaging}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showLowStock={showLowStock}
                setShowLowStock={setShowLowStock}
                onEdit={(pkg) => {
                  setSelectedPackaging(pkg);
                  setShowPackagingDetailModal(true);
                }}
              />
            </div>
          </>
        )}

        {/* Premium Containers Tab with Animated Background */}
        {activeTab === 'containers' && (
          <>
            <AnimatedBackground />
            <div className="relative z-10">
              <PremiumContainersTab
                containers={containers}
                filteredContainers={filteredContainers}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            </div>
          </>
        )}

        {/* Stats Cards for other tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'ingredients' && null /* Handled by PremiumIngredientsTab */}
          {activeTab === 'packaging' && null /* Handled by PremiumPackagingTab */}
          {activeTab === 'containers' && null /* Handled by PremiumContainersTab */}

          {/* Filters - Only show for non-premium tabs */}
          {activeTab !== 'ingredients' && activeTab !== 'packaging' && activeTab !== 'containers' && activeTab !== 'suppliers' && activeTab !== 'history' && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent"
                  />
                </div>

              {activeTab === 'containers' && (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174940] focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="backstock">Backstock</option>
                    <option value="active">Active (In Use)</option>
                    <option value="quarantine">Quarantine</option>
                    <option value="empty">Empty</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              )}
              </div>
            </div>
          )}

          {/* Content Tables - Ingredients, Packaging, and Containers handled by Premium components */}

          {/* Premium History Tab with Animated Background */}
          {activeTab === 'history' && (
            <>
              <AnimatedBackground />
              <div className="relative z-10">
                <PremiumHistoryTab
                  history={history}
                  filteredHistory={filteredHistory}
                  loading={loading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  historyFilter={historyFilter}
                  setHistoryFilter={setHistoryFilter}
                  dateRangeFilter={dateRangeFilter}
                  setDateRangeFilter={setDateRangeFilter}
                  transactionTypeFilter={transactionTypeFilter}
                  setTransactionTypeFilter={setTransactionTypeFilter}
                />
              </div>
            </>
          )}

          {/* Premium Suppliers Tab with Animated Background */}
          {activeTab === 'suppliers' && (
            <>
              <AnimatedBackground />
              <div className="relative z-10">
                <PremiumSuppliersTab
                  suppliers={suppliers}
                  filteredSuppliers={filteredSuppliers}
                  loading={loading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onEdit={(supplier) => {
                    router.push(`/suppliers/${supplier.id}`);
                  }}
                  onDelete={(supplier) => {
                    if (confirm(`Delete supplier ${supplier.name}?`)) {
                      handleDeleteSupplier(supplier.id);
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Premium Receiving Tab with Animated Background */}
          {activeTab === 'receiving' && (
            <>
              <AnimatedBackground />
              <div className="relative z-10">
                <ReceivingScanTab />
              </div>
            </>
          )}

          {/* Premium Run Inventory Tab with Animated Background */}
          {activeTab === 'run-inventory' && (
            <>
              <AnimatedBackground />
              <div className="relative z-10">
                <RunInventoryView />
              </div>
            </>
          )}

          {/* Premium Promo/Kitting Tab with Animated Background */}
          {activeTab === 'promo-kitting' && (
            <>
              <AnimatedBackground />
              <div className="relative z-10">
                <PremiumPromoKittingTab
                  items={promoKittingItems}
                  filteredItems={filteredPromoKittingItems}
                  loading={loading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  onAdd={() => alert('Add Promo/Kitting item feature coming soon')}
                  onEdit={(item) => alert(`Edit ${item.name} - Feature coming soon`)}
                  onDelete={(item) => {
                    if (confirm(`Delete ${item.name}?`)) {
                      alert('Delete feature coming soon');
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Premium Packaging Supplies Tab with Animated Background */}
          {activeTab === 'packaging-supplies' && (
            <>
              <AnimatedBackground />
              <div className="relative z-10">
                <PremiumPackagingSuppliesTab
                  items={packagingSupplies}
                  filteredItems={filteredPackagingSupplies}
                  loading={loading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  onAdd={() => alert('Add Packaging Supply feature coming soon')}
                  onEdit={(item) => alert(`Edit ${item.name} - Feature coming soon`)}
                  onDelete={(item) => {
                    if (confirm(`Delete ${item.name}?`)) {
                      alert('Delete feature coming soon');
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>

        {selectedIngredient && (
          <IngredientDetailModal
            ingredient={selectedIngredient}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedIngredient(null);
            }}
            onUpdate={() => {
              fetchData();
            }}
          />
        )}

        {selectedPackaging && (
          <PackagingDetailModal
            packaging={selectedPackaging}
            isOpen={showPackagingDetailModal}
            onClose={() => {
              setShowPackagingDetailModal(false);
              setSelectedPackaging(null);
            }}
            onUpdate={() => {
              fetchData();
            }}
          />
        )}
      </div>
    </>
  );
}
