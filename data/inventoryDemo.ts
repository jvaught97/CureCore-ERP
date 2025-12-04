type DemoIngredient = {
  id: string
  name: string
  category: string
  on_hand: number
  unit: string
  reorder_point: number
  cost_per_gram: number
  status: string
  organic_cert: boolean
}

type DemoPackaging = {
  id: string
  name: string
  category: string
  on_hand: number
  unit: string
  reorder_point: number
  cost_per_unit: number
  status: string
  packaging_files: Array<{ id: string }>
}

type DemoContainer = {
  id: string
  container_code: string
  label: string | null
  status: 'backstock' | 'active' | 'quarantine' | 'empty'
  location: string | null
  tare_weight: number
  tare_unit: string
  current_net_weight: number
  last_weighed_at: string
  item_master: {
    id: string
    name: string
    sku: string
  }
  item_lots: {
    lot_number: string
    expiry_date: string | null
  }
}

type DemoHistory = {
  id: string
  item_type: 'ingredient' | 'packaging'
  item_name: string
  transaction_type: string
  quantity: number
  previous_quantity: number
  new_quantity: number
  employee_name: string
  notes: string | null
  created_at: string
}

export const inventoryDemoData = {
  ingredients: [
    {
      id: 'ing-demo-001',
      name: 'Hyaluronic Acid 1%',
      category: 'Base Ingredients',
      on_hand: 2450,
      unit: 'g',
      reorder_point: 750,
      cost_per_gram: 0.023,
      status: 'active',
      organic_cert: false,
    },
    {
      id: 'ing-demo-002',
      name: 'Vitamin C (L-Ascorbic)',
      category: 'Extracts and Actives',
      on_hand: 680,
      unit: 'g',
      reorder_point: 500,
      cost_per_gram: 0.064,
      status: 'active',
      organic_cert: false,
    },
    {
      id: 'ing-demo-003',
      name: 'Niacinamide',
      category: 'Functional Additives',
      on_hand: 3240,
      unit: 'g',
      reorder_point: 900,
      cost_per_gram: 0.031,
      status: 'active',
      organic_cert: false,
    },
  ] as DemoIngredient[],
  packaging: [
    {
      id: 'pkg-demo-001',
      name: '2oz Frosted Dropper Bottle',
      category: 'Bottles',
      on_hand: 4200,
      unit: 'units',
      reorder_point: 1500,
      cost_per_unit: 0.74,
      status: 'active',
      packaging_files: [{ id: 'file-1' }],
    },
    {
      id: 'pkg-demo-002',
      name: 'Pump Closure – Matte Black',
      category: 'Caps',
      on_hand: 1800,
      unit: 'units',
      reorder_point: 1200,
      cost_per_unit: 0.42,
      status: 'active',
      packaging_files: [],
    },
    {
      id: 'pkg-demo-003',
      name: 'Unit Carton – 2oz Serum',
      category: 'Boxes',
      on_hand: 950,
      unit: 'units',
      reorder_point: 2000,
      cost_per_unit: 0.31,
      status: 'active',
      packaging_files: [{ id: 'file-2' }, { id: 'file-3' }],
    },
  ] as DemoPackaging[],
  containers: [
    {
      id: 'cnt-demo-001',
      container_code: 'CNT-2025-001',
      label: 'HA Lot A',
      status: 'active',
      location: 'WH-01 Rack B',
      tare_weight: 120,
      tare_unit: 'g',
      current_net_weight: 825,
      last_weighed_at: new Date().toISOString(),
      item_master: { id: 'ing-demo-001', name: 'Hyaluronic Acid 1%', sku: 'HA-100' },
      item_lots: { lot_number: 'HA-2412-A', expiry_date: '2026-01-14' },
    },
    {
      id: 'cnt-demo-002',
      container_code: 'CNT-2025-004',
      label: null,
      status: 'backstock',
      location: 'WH-02 Floor',
      tare_weight: 135,
      tare_unit: 'g',
      current_net_weight: 1420,
      last_weighed_at: new Date().toISOString(),
      item_master: { id: 'ing-demo-002', name: 'Vitamin C', sku: 'VC-275' },
      item_lots: { lot_number: 'VC-2411-B', expiry_date: '2025-11-01' },
    },
  ] as DemoContainer[],
  history: [
    {
      id: 'hist-demo-001',
      item_type: 'ingredient',
      item_name: 'Hyaluronic Acid 1%',
      transaction_type: 'physical_count',
      quantity: 100,
      previous_quantity: 2300,
      new_quantity: 2400,
      employee_name: 'sarah@curecore.dev',
      notes: 'Cycle count adjustment',
      created_at: new Date().toISOString(),
    },
    {
      id: 'hist-demo-002',
      item_type: 'packaging',
      item_name: 'Unit Carton – 2oz Serum',
      transaction_type: 'deduct',
      quantity: 250,
      previous_quantity: 1200,
      new_quantity: 950,
      employee_name: 'ops@curecore.dev',
      notes: 'Batch BCH-2417 consumption',
      created_at: new Date().toISOString(),
    },
  ] as DemoHistory[],
}
