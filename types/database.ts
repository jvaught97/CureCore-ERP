/**
 * Supabase Database Types
 * Generated types for the ERP cost tracking system
 */

// ============================================
// SUPPLIERS
// ============================================
export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierInsert {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  status?: 'active' | 'inactive';
}

// ============================================
// INGREDIENT SUPPLIERS
// ============================================
export interface IngredientSupplier {
  id: string;
  ingredient_id: string;
  supplier_id: string;
  is_primary: boolean;
  lead_time_days: number | null;
  minimum_order_quantity: number | null;
  notes: string | null;
  created_at: string;
}

export interface IngredientSupplierInsert {
  ingredient_id: string;
  supplier_id: string;
  is_primary?: boolean;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  notes?: string;
}

// ============================================
// INGREDIENTS (Enhanced)
// ============================================
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  organic_cert: boolean | null;
  supplier_id: string | null;
  cost_per_unit: number | null;
  unit: string;
  on_hand: number;
  reorder_point: number | null;
  status: string | null;
  // New cost tracking columns
  unit_size: number | null;
  unit_measure: string | null;
  price_per_unit: number | null;
  cost_per_gram: number | null; // Computed field
  last_purchase_date: string | null;
  last_purchase_price: number | null;
  average_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface IngredientUpdate {
  name?: string;
  category?: string;
  organic_cert?: boolean;
  supplier_id?: string;
  cost_per_unit?: number;
  unit?: string;
  on_hand?: number;
  reorder_point?: number;
  status?: string;
  unit_size?: number;
  unit_measure?: string;
  price_per_unit?: number;
  last_purchase_date?: string;
  last_purchase_price?: number;
  average_cost?: number;
}

// ============================================
// FINISHED GOODS (Enhanced)
// ============================================
export interface FinishedGood {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  ingredient_cost: number | null;
  packaging_cost: number | null;
  labor_cost: number | null;
  overhead_cost: number | null;
  total_cost: number | null; // Computed field
  selling_price: number | null;
  profit_margin: number | null; // Computed field (percentage)
  created_at: string;
  updated_at: string;
}

export interface FinishedGoodUpdate {
  sku?: string;
  name?: string;
  description?: string;
  on_hand?: number;
  unit?: string;
  reorder_point?: number;
  ingredient_cost?: number;
  packaging_cost?: number;
  labor_cost?: number;
  overhead_cost?: number;
  selling_price?: number;
}

// ============================================
// PACKAGING (Enhanced)
// ============================================
export interface Packaging {
  id: string;
  name: string;
  type: string;
  size: string | null;
  material: string | null;
  on_hand: number;
  unit: string;
  reorder_point: number | null;
  unit_price: number | null;
  minimum_order_quantity: number | null;
  supplier_id: string | null;
  last_purchase_date: string | null;
  last_purchase_price: number | null;
  notes: string | null;
  // Category-specific fields
  label_size: string | null;
  finish: string | null;
  capacity: string | null;
  neck_size: string | null;
  color: string | null;
  closure_type: string | null;
  liner_type: string | null;
  dimensions: string | null;
  weight_capacity: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackagingUpdate {
  name?: string;
  type?: string;
  size?: string;
  material?: string;
  on_hand?: number;
  unit?: string;
  reorder_point?: number;
  unit_price?: number;
  minimum_order_quantity?: number;
  supplier_id?: string;
  last_purchase_date?: string;
  last_purchase_price?: number;
  notes?: string;
  // Category-specific fields
  label_size?: string;
  finish?: string;
  capacity?: string;
  neck_size?: string;
  color?: string;
  closure_type?: string;
  liner_type?: string;
  dimensions?: string;
  weight_capacity?: string;
}

// ============================================
// PACKAGING FILES
// ============================================
export interface PackagingFile {
  id: string;
  tenant_id: string;
  packaging_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_category: 'label' | 'artwork' | 'spec_sheet' | 'proof' | 'coa' | 'other';
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackagingFileInsert {
  packaging_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_category: 'label' | 'artwork' | 'spec_sheet' | 'proof' | 'coa' | 'other';
  file_size: number;
}

export interface PackagingWithFiles extends Packaging {
  packaging_files: PackagingFile[];
}

// ============================================
// PURCHASE ORDERS
// ============================================
export type PurchaseOrderStatus = 'pending' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: PurchaseOrderStatus;
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderInsert {
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  status?: PurchaseOrderStatus;
  total_amount?: number;
  notes?: string;
}

export interface PurchaseOrderUpdate {
  po_number?: string;
  supplier_id?: string;
  order_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status?: PurchaseOrderStatus;
  total_amount?: number;
  notes?: string;
}

// ============================================
// PURCHASE ORDER ITEMS
// ============================================
export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  ingredient_id: string | null;
  packaging_id: string | null;
  quantity: number;
  unit_size: number | null;
  unit_measure: string | null;
  price_per_unit: number;
  total_price: number;
  received_quantity: number;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrderItemInsert {
  purchase_order_id: string;
  ingredient_id?: string;
  packaging_id?: string;
  quantity: number;
  unit_size?: number;
  unit_measure?: string;
  price_per_unit: number;
  total_price: number;
  received_quantity?: number;
  notes?: string;
}

// ============================================
// JOINED TYPES (for queries with relations)
// ============================================
export interface IngredientWithSuppliers extends Ingredient {
  ingredient_suppliers: Array<IngredientSupplier & {
    suppliers: Supplier;
  }>;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  suppliers: Supplier;
  purchase_order_items: Array<PurchaseOrderItem & {
    ingredients?: Ingredient;
    packaging?: Packaging;
  }>;
}

export interface PurchaseOrderItemWithDetails extends PurchaseOrderItem {
  purchase_orders: PurchaseOrder & {
    suppliers: Supplier;
  };
  ingredients?: Ingredient;
  packaging?: Packaging;
}

// ============================================
// VIEW TYPES
// ============================================
export interface IngredientCostSummary {
  id: string;
  name: string;
  category: string;
  unit_size: number | null;
  unit_measure: string | null;
  price_per_unit: number | null;
  cost_per_gram: number | null;
  on_hand: number;
  inventory_value: number;
  last_purchase_date: string | null;
  last_purchase_price: number | null;
  primary_supplier_name: string | null;
  supplier_count: number;
}

// ============================================
// ENUMS & CONSTANTS
// ============================================
export const INGREDIENT_CATEGORIES = [
  'Base Ingredients',
  'Oils & Butters',
  'Cannabinoid',
  'Extracts & Actives',
  'Functional Additives',
  'Preservatives & Antioxidants',
  'Essential Oils',
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];

export const UNIT_MEASURES = ['g', 'kg', 'ml', 'l'] as const;
export type UnitMeasure = typeof UNIT_MEASURES[number];

export const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  'pending',
  'ordered',
  'received',
  'cancelled',
];

// ============================================
// UTILITY TYPES
// ============================================
export interface CostBreakdown {
  ingredient_cost: number;
  packaging_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
}

export interface ProfitAnalysis {
  total_cost: number;
  selling_price: number;
  profit: number;
  profit_margin: number; // percentage
}

// ============================================
// FORM TYPES
// ============================================
export interface IngredientCostForm {
  unit_size: number;
  unit_measure: UnitMeasure;
  price_per_unit: number;
}

export interface SupplierForm {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  notes: string;
  status: 'active' | 'inactive';
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}

// ============================================
// FILTER & SORT TYPES
// ============================================
export interface InventoryFilters {
  search?: string;
  category?: string;
  low_stock_only?: boolean;
  has_cost?: boolean;
}

export interface SupplierFilters {
  search?: string;
  status?: 'active' | 'inactive';
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}
