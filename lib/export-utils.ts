// lib/export-utils.ts
import * as XLSX from 'xlsx'

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  // Create a new workbook
  const wb = XLSX.utils.book_new()
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data)
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportInventoryToExcel(ingredients: any[], finishedGoods: any[]) {
  const wb = XLSX.utils.book_new()
  
  // Format ingredients data
  const ingredientsData = ingredients.map(ing => ({
    'Name': ing.name,
    'Category': ing.category,
    'On-Hand': ing.on_hand,
    'Unit': ing.unit,
    'Reorder Point': ing.reorder_point,
    'Status': ing.on_hand < ing.reorder_point ? 'Low Stock' : 'OK'
  }))
  
  // Format finished goods data
  const finishedData = finishedGoods.map(fg => ({
    'SKU': fg.sku,
    'Name': fg.name,
    'On-Hand': fg.on_hand,
    'Reorder Point': fg.reorder_point,
    'Status': fg.on_hand < fg.reorder_point ? 'Low Stock' : 'OK'
  }))
  
  // Create worksheets
  const wsIngredients = XLSX.utils.json_to_sheet(ingredientsData)
  const wsFinished = XLSX.utils.json_to_sheet(finishedData)
  
  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, wsIngredients, 'Ingredients')
  XLSX.utils.book_append_sheet(wb, wsFinished, 'Finished Goods')
  
  // Generate filename with current date
  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Inventory_Report_${date}.xlsx`)
}

export function exportBatchesToExcel(batches: any[]) {
  const batchesData = batches.map(batch => ({
    'Batch Code': batch.batch_code,
    'SKU': batch.sku,
    'Formulation': `${batch.formulations?.name || ''} ${batch.formulations?.version || ''}`.trim(),
    'Size (L)': batch.size_liters,
    'Expected Yield': batch.expected_yield,
    'Actual Yield': batch.actual_yield || '-',
    'Status': batch.status,
    'Created': new Date(batch.created_at).toLocaleDateString(),
    'Completed': batch.completed_at ? new Date(batch.completed_at).toLocaleDateString() : '-'
  }))
  
  const date = new Date().toISOString().split('T')[0]
  exportToExcel(batchesData, `Batches_Report_${date}`, 'Batches')
}

export function exportStockHistoryToExcel(history: any[]) {
  const historyData = history.map(adj => ({
    'Date': new Date(adj.created_at).toLocaleString(),
    'Item': adj.ingredient_name || adj.finished_good_name || 'Unknown',
    'Type': adj.item_type.replace('_', ' '),
    'Change': adj.qty_change,
    'Reason': adj.reason,
    'Adjusted By': adj.users?.name || 'Unknown'
  }))
  
  const date = new Date().toISOString().split('T')[0]
  exportToExcel(historyData, `Stock_Adjustments_${date}`, 'Stock History')
}