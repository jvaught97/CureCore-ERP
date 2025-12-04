/**
 * Database Helper Utilities
 * Common queries and helper functions for the ERP system
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  Ingredient,
  IngredientWithSuppliers,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  IngredientCostSummary,
} from './types/database';

const supabase = createClientComponentClient();

// ============================================
// INGREDIENT QUERIES
// ============================================

/**
 * Get all ingredients with cost information
 */
export async function getIngredientsWithCost() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  return { data, error };
}

/**
 * Get a single ingredient with all supplier relationships
 */
export async function getIngredientWithSuppliers(ingredientId: string) {
  const { data, error } = await supabase
    .from('ingredients')
    .select(`
      *,
      ingredient_suppliers (
        *,
        suppliers (
          id,
          name,
          contact_person,
          email,
          phone,
          status
        )
      )
    `)
    .eq('id', ingredientId)
    .single();

  return { data, error };
}

/**
 * Get ingredient cost summary using the view
 */
export async function getIngredientCostSummaries() {
  const { data, error } = await supabase
    .from('ingredient_cost_summary')
    .select('*')
    .order('name');

  return { data, error };
}

/**
 * Update ingredient cost information
 */
export async function updateIngredientCost(
  ingredientId: string,
  costData: {
    unit_size: number;
    unit_measure: string;
    price_per_unit: number;
  }
) {
  const { data, error } = await supabase
    .from('ingredients')
    .update(costData)
    .eq('id', ingredientId)
    .select()
    .single();

  return { data, error };
}

/**
 * Get ingredients that are low on stock
 */
export async function getLowStockIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .not('reorder_point', 'is', null)
    .filter('current_stock', 'lte', 'reorder_point')
    .order('name');

  return { data, error };
}

/**
 * Calculate total inventory value
 */
export async function calculateTotalInventoryValue() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('on_hand, cost_per_gram');

  if (error || !data) return { value: 0, error };

  const totalValue = data.reduce((sum, item) => {
    return sum + (item.on_hand * (item.cost_per_gram || 0));
  }, 0);

  return { value: totalValue, error: null };
}

// ============================================
// SUPPLIER QUERIES
// ============================================

/**
 * Get all active suppliers
 */
export async function getActiveSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('status', 'active')
    .order('name');

  return { data, error };
}

/**
 * Get supplier with all linked ingredients
 */
export async function getSupplierWithIngredients(supplierId: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      *,
      ingredient_suppliers (
        *,
        ingredients (
          id,
          name,
          category,
          on_hand
        )
      )
    `)
    .eq('id', supplierId)
    .single();

  return { data, error };
}

/**
 * Link ingredient to supplier
 */
export async function linkIngredientToSupplier(
  ingredientId: string,
  supplierId: string,
  options?: {
    is_primary?: boolean;
    lead_time_days?: number;
    minimum_order_quantity?: number;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('ingredient_suppliers')
    .insert({
      ingredient_id: ingredientId,
      supplier_id: supplierId,
      is_primary: options?.is_primary || false,
      lead_time_days: options?.lead_time_days,
      minimum_order_quantity: options?.minimum_order_quantity,
      notes: options?.notes,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Set primary supplier for an ingredient
 */
export async function setPrimarySupplier(ingredientId: string, supplierId: string) {
  // First, unset all primary flags for this ingredient
  await supabase
    .from('ingredient_suppliers')
    .update({ is_primary: false })
    .eq('ingredient_id', ingredientId);

  // Then set the new primary
  const { data, error } = await supabase
    .from('ingredient_suppliers')
    .update({ is_primary: true })
    .eq('ingredient_id', ingredientId)
    .eq('supplier_id', supplierId)
    .select()
    .single();

  return { data, error };
}

// ============================================
// PURCHASE ORDER QUERIES
// ============================================

/**
 * Get purchase history for an ingredient
 */
export async function getIngredientPurchaseHistory(ingredientId: string) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select(`
      *,
      purchase_orders (
        po_number,
        order_date,
        expected_delivery_date,
        actual_delivery_date,
        status,
        suppliers (
          name
        )
      )
    `)
    .eq('ingredient_id', ingredientId)
    .order('created_at', { ascending: false })
    .limit(20);

  return { data, error };
}

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(
  supplierId: string,
  orderDate: string,
  items: Array<{
    ingredient_id?: string;
    packaging_id?: string;
    quantity: number;
    unit_size?: number;
    unit_measure?: string;
    price_per_unit: number;
  }>
) {
  // Generate PO number (you might want to customize this)
  const poNumber = `PO-${Date.now()}`;

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.quantity * item.price_per_unit);
  }, 0);

  // Create purchase order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_number: poNumber,
      supplier_id: supplierId,
      order_date: orderDate,
      status: 'pending',
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (poError || !po) return { data: null, error: poError };

  // Create purchase order items
  const poItems = items.map(item => ({
    purchase_order_id: po.id,
    ingredient_id: item.ingredient_id,
    packaging_id: item.packaging_id,
    quantity: item.quantity,
    unit_size: item.unit_size,
    unit_measure: item.unit_measure,
    price_per_unit: item.price_per_unit,
    total_price: item.quantity * item.price_per_unit,
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(poItems)
    .select();

  if (itemsError) return { data: null, error: itemsError };

  return { data: { ...po, items: itemsData }, error: null };
}

/**
 * Receive items from a purchase order
 */
export async function receiveOrderItem(
  itemId: string,
  receivedQuantity: number
) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .update({ received_quantity: receivedQuantity })
    .eq('id', itemId)
    .select()
    .single();

  // The trigger will automatically update the ingredient's cost information

  return { data, error };
}

/**
 * Mark purchase order as received
 */
export async function markOrderAsReceived(orderId: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({
      status: 'received',
      actual_delivery_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', orderId)
    .select()
    .single();

  return { data, error };
}

// ============================================
// FINISHED GOODS QUERIES
// ============================================

/**
 * Calculate ingredient cost for a finished good
 * Based on formulation percentages
 */
export async function calculateIngredientCostForProduct(
  formulation: Array<{ ingredient_id: string; percentage: number }>,
  batchSize: number
) {
  let totalCost = 0;

  for (const item of formulation) {
    const { data: ingredient } = await supabase
      .from('ingredients')
      .select('cost_per_gram')
      .eq('id', item.ingredient_id)
      .single();

    if (ingredient?.cost_per_gram) {
      const gramsNeeded = (batchSize * item.percentage) / 100;
      totalCost += gramsNeeded * ingredient.cost_per_gram;
    }
  }

  return totalCost;
}

/**
 * Calculate packaging cost for a finished good
 */
export async function calculatePackagingCostForProduct(productId: string) {
  const { data: packaging } = await supabase
    .from('product_packaging')
    .select(`
      quantity_per_unit,
      packaging (
        unit_price
      )
    `)
    .eq('product_id', productId);

  if (!packaging) return 0;

  const totalCost = packaging.reduce((sum, item) => {
    const unitPrice = item.packaging?.unit_price || 0;
    return sum + (item.quantity_per_unit * unitPrice);
  }, 0);

  return totalCost;
}

/**
 * Update finished good cost breakdown
 */
export async function updateFinishedGoodCosts(
  productId: string,
  costs: {
    ingredient_cost?: number;
    packaging_cost?: number;
    labor_cost?: number;
    overhead_cost?: number;
    selling_price?: number;
  }
) {
  const { data, error } = await supabase
    .from('finished_goods')
    .update(costs)
    .eq('id', productId)
    .select()
    .single();

  return { data, error };
}

// ============================================
// REPORTING QUERIES
// ============================================

/**
 * Get inventory value by category
 */
export async function getInventoryValueByCategory() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('category, on_hand, cost_per_gram');

  if (error || !data) return { data: null, error };

  const categoryValues = data.reduce((acc, item) => {
    const value = item.on_hand * (item.cost_per_gram || 0);
    acc[item.category] = (acc[item.category] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  return { data: categoryValues, error: null };
}

/**
 * Get supplier spending summary
 */
export async function getSupplierSpendingSummary(
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from('purchase_orders')
    .select(`
      supplier_id,
      total_amount,
      suppliers (
        name
      )
    `)
    .eq('status', 'received');

  if (startDate) query = query.gte('order_date', startDate);
  if (endDate) query = query.lte('order_date', endDate);

  const { data, error } = await query;

  if (error || !data) return { data: null, error };

  const spendingBySupplier = data.reduce((acc, order) => {
    const supplierName = order.suppliers?.name || 'Unknown';
    acc[supplierName] = (acc[supplierName] || 0) + (order.total_amount || 0);
    return acc;
  }, {} as Record<string, number>);

  return { data: spendingBySupplier, error: null };
}

/**
 * Get profit analysis for finished goods
 */
export async function getProductProfitAnalysis() {
  const { data, error } = await supabase
    .from('finished_goods')
    .select('sku, name, total_cost, selling_price, profit_margin, on_hand')
    .not('total_cost', 'is', null)
    .not('selling_price', 'is', null)
    .order('profit_margin', { ascending: false });

  return { data, error };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate cost per gram from unit info
 */
export function calculateCostPerGram(
  unitSize: number,
  pricePerUnit: number
): number {
  if (unitSize <= 0) return 0;
  return pricePerUnit / unitSize;
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(
  sellingPrice: number,
  totalCost: number
): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - totalCost) / sellingPrice) * 100;
}

/**
 * Generate unique PO number
 */
export function generatePONumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = Date.now().toString().slice(-4);
  return `PO-${year}${month}${day}-${time}`;
}

/**
 * Check if ingredient needs reordering
 */
export function needsReorder(
  onHand: number,
  reorderPoint: number | null
): boolean {
  if (!reorderPoint) return false;
  return onHand <= reorderPoint;
}

/**
 * Get stock status
 */
export function getStockStatus(
  onHand: number,
  reorderPoint: number | null
): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (onHand === 0) return 'out-of-stock';
  if (reorderPoint && onHand <= reorderPoint) return 'low-stock';
  return 'in-stock';
}
