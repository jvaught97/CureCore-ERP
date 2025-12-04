// Sample data for marketing dashboard previews

export const operationsDashboard = {
  inventoryAlerts: [
    { ingredient: 'Hyaluronic Acid (1%)', current: 245, reorderPoint: 500, unit: 'g', status: 'low' },
    { ingredient: 'Vitamin C (L-Ascorbic)', current: 89, reorderPoint: 200, unit: 'g', status: 'critical' },
    { ingredient: 'Niacinamide', current: 1240, reorderPoint: 500, unit: 'g', status: 'ok' },
  ],

  activeBatches: [
    { id: 'B-2847', formula: 'Hydrating Serum v2.1', stage: 'Mixing', progress: 65, dueDate: '2025-01-15' },
    { id: 'B-2848', formula: 'Vitamin C Cream v1.8', stage: 'Packaging', progress: 90, dueDate: '2025-01-12' },
    { id: 'B-2849', formula: 'Night Repair Oil v3.0', stage: 'Quality Check', progress: 45, dueDate: '2025-01-18' },
  ],

  formulationVersions: [
    { name: 'Hydrating Serum', versions: 3, latestVersion: 'v2.1', status: 'Active', unitCost: 4.23 },
    { name: 'Vitamin C Cream', versions: 2, latestVersion: 'v1.8', status: 'Active', unitCost: 6.78 },
    { name: 'Retinol Night Serum', versions: 5, latestVersion: 'v3.2', status: 'Development', unitCost: 8.45 },
  ],

  packagingReadiness: {
    ready: 847,
    lowStock: 34,
    outOfStock: 5,
  },

  coaStats: {
    pending: 3,
    approved: 142,
    thisMonth: 18,
  },

  batchesByStage: [
    { stage: 'Planning', count: 5 },
    { stage: 'Mixing', count: 8 },
    { stage: 'Quality Check', count: 3 },
    { stage: 'Packaging', count: 6 },
    { stage: 'Complete', count: 142 },
  ],
};

export const commercialDashboard = {
  pipeline: {
    leads: { count: 47, value: 234500 },
    opportunities: { count: 23, value: 487200 },
    quotes: { count: 12, value: 156800 },
    salesOrders: { count: 8, value: 98400 },
  },

  recentOpportunities: [
    { name: 'Wellness Corp - Q1 Order', stage: 'Negotiation', value: 45000, probability: 75, owner: 'Sarah Chen' },
    { name: 'Spa Collective - Bulk Purchase', stage: 'Proposal', value: 28500, probability: 50, owner: 'Marcus Rodriguez' },
    { name: 'Retail Chain Expansion', stage: 'Qualified', value: 156000, probability: 25, owner: 'Jennifer Wu' },
  ],

  quoteStatus: [
    { status: 'Draft', count: 5 },
    { status: 'Sent', count: 12 },
    { status: 'Viewed', count: 8 },
    { status: 'Accepted', count: 6 },
    { status: 'Rejected', count: 2 },
  ],

  topAccounts: [
    { name: 'Wellness Corp', revenue: 124500, orders: 18, lastOrder: '2025-01-08' },
    { name: 'Spa Collective', revenue: 89200, orders: 12, lastOrder: '2025-01-05' },
    { name: 'Natural Beauty Co', revenue: 67800, orders: 9, lastOrder: '2024-12-28' },
  ],

  distributionQueue: [
    { order: 'SO-1847', customer: 'Wellness Corp', units: 1200, shipDate: '2025-01-14', status: 'Ready' },
    { order: 'SO-1848', customer: 'Spa Collective', units: 480, shipDate: '2025-01-16', status: 'Picking' },
    { order: 'SO-1849', customer: 'Natural Beauty Co', units: 800, shipDate: '2025-01-18', status: 'Pending' },
  ],

  followUps: [
    { account: 'Wellness Corp', task: 'Send Q2 catalog', dueDate: '2025-01-12', owner: 'Sarah Chen' },
    { account: 'Retail Chain', task: 'Schedule product demo', dueDate: '2025-01-15', owner: 'Marcus Rodriguez' },
    { account: 'Spa Collective', task: 'Follow up on quote #Q-2847', dueDate: '2025-01-10', owner: 'Jennifer Wu' },
  ],
};

export const financialDashboard = {
  pnl: {
    revenue: 487200,
    cogs: 195000,
    grossProfit: 292200,
    grossMargin: 60,
    operatingExpenses: 156000,
    netIncome: 136200,
    netMargin: 28,
  },

  budgetVariance: [
    { department: 'R&D', budget: 45000, actual: 42300, variance: -6 },
    { department: 'Manufacturing', budget: 125000, actual: 134500, variance: 8 },
    { department: 'Sales & Marketing', budget: 67000, actual: 59800, variance: -11 },
    { department: 'Operations', budget: 38000, actual: 41200, variance: 8 },
  ],

  arAging: {
    current: 124500,
    days30: 45200,
    days60: 12800,
    days90: 4500,
    over90: 1200,
  },

  apAging: {
    current: 67800,
    days30: 23400,
    days60: 8900,
    days90: 2100,
    over90: 0,
  },

  cashFlow: {
    beginning: 245000,
    inflows: 156800,
    outflows: 124300,
    ending: 277500,
  },

  cashRunway: {
    current: 277500,
    monthlyBurn: 45000,
    runwayMonths: 6.2,
  },

  bankRecStatus: {
    lastReconciled: '2024-12-31',
    pending: 12,
    matched: 156,
    discrepancies: 2,
  },

  taxCalendar: [
    { type: 'Sales Tax - CA', dueDate: '2025-01-31', amount: 4567, status: 'Pending' },
    { type: 'Payroll Tax - Federal', dueDate: '2025-02-15', amount: 8934, status: 'Scheduled' },
    { type: 'Income Tax - Estimated', dueDate: '2025-04-15', amount: 12500, status: 'Upcoming' },
  ],

  revenueByMonth: [
    { month: 'Jul', revenue: 342000 },
    { month: 'Aug', revenue: 378500 },
    { month: 'Sep', revenue: 412000 },
    { month: 'Oct', revenue: 445600 },
    { month: 'Nov', revenue: 421300 },
    { month: 'Dec', revenue: 487200 },
  ],
};

export const chartColors = {
  primary: '#174940',
  secondary: '#2D6A5F',
  accent: '#48A999',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#64748b',
} as const;
