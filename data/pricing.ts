export type ModulePillar = 'operations' | 'commercial' | 'financial';

export interface Module {
  id: string;
  name: string;
  pillar: ModulePillar;
  description: string;
  timeSaved?: string;
  icon: string;
}

export const modules: Module[] = [
  // Operations
  { id: 'inventory', name: 'Inventory Management', pillar: 'operations', description: 'Track ingredients, packaging, and finished goods with lot traceability', timeSaved: '8 hrs/week', icon: 'package' },
  { id: 'rnd', name: 'R&D', pillar: 'operations', description: 'Manage formulation development, testing, and version control', timeSaved: '5 hrs/week', icon: 'flask' },
  { id: 'formulations', name: 'Formulations', pillar: 'operations', description: 'Build recipes with cost estimation and scaling', timeSaved: '6 hrs/week', icon: 'beaker' },
  { id: 'batches', name: 'Batch Management', pillar: 'operations', description: 'Track manufacturing from mixing to packaging', timeSaved: '10 hrs/week', icon: 'layers' },
  { id: 'packaging', name: 'Packaging', pillar: 'operations', description: 'Manage containers, labels, and assembly BOMs', timeSaved: '4 hrs/week', icon: 'box' },
  { id: 'compliance', name: 'COA & Compliance', pillar: 'operations', description: 'Generate COAs, track lot history, and maintain audit trails', timeSaved: '6 hrs/week', icon: 'shield-check' },

  // Commercial
  { id: 'crm', name: 'CRM', pillar: 'commercial', description: 'Manage leads, contacts, accounts, and opportunities', timeSaved: '7 hrs/week', icon: 'users' },
  { id: 'quotes', name: 'Quotes', pillar: 'commercial', description: 'Generate branded quotes with terms, taxes, and e-signatures', timeSaved: '5 hrs/week', icon: 'file-text' },
  { id: 'sales-orders', name: 'Sales Orders', pillar: 'commercial', description: 'Convert quotes to orders and track fulfillment', timeSaved: '4 hrs/week', icon: 'shopping-cart' },
  { id: 'distribution', name: 'Distribution', pillar: 'commercial', description: 'Manage shipments, tracking, and customer delivery', timeSaved: '3 hrs/week', icon: 'truck' },

  // Financial
  { id: 'pnl', name: 'P&L', pillar: 'financial', description: 'Real-time profit & loss by period and department', timeSaved: '4 hrs/week', icon: 'trending-up' },
  { id: 'budgeting', name: 'Budgeting', pillar: 'financial', description: 'Create budgets, track variance, and forecast', timeSaved: '5 hrs/week', icon: 'target' },
  { id: 'payroll', name: 'Payroll', pillar: 'financial', description: 'Allocate labor to cost centers and batches', timeSaved: '3 hrs/week', icon: 'dollar-sign' },
  { id: 'coa', name: 'Chart of Accounts & Journal Entries', pillar: 'financial', description: 'Full double-entry accounting with custom GL codes', timeSaved: '4 hrs/week', icon: 'book-open' },
  { id: 'ar-ap', name: 'AR/AP', pillar: 'financial', description: 'Manage invoices, bills, payments, and aging', timeSaved: '6 hrs/week', icon: 'receipt' },
  { id: 'bank-rec', name: 'Bank Reconciliation', pillar: 'financial', description: 'Import statements, match transactions, and reconcile', timeSaved: '4 hrs/week', icon: 'landmark' },
  { id: 'tax', name: 'Tax Management', pillar: 'financial', description: 'Track jurisdictions, rates, and filing deadlines', timeSaved: '2 hrs/week', icon: 'calculator' },
  { id: 'reports', name: 'Financial Reports', pillar: 'financial', description: 'P&L, Balance Sheet, Cash Flow, and custom reports', timeSaved: '3 hrs/week', icon: 'bar-chart' },
];

export interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  includedModules: string[];
  cta: string;
  popular?: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    id: 'launchpad',
    name: 'Launchpad',
    tagline: 'Core Operations',
    price: '$299',
    billing: 'per month',
    description: 'Perfect for early-stage brands launching their first products',
    features: [
      '3 team seats included',
      'Email support',
      'Standard onboarding',
      'Basic reporting',
      'Mobile app access',
    ],
    includedModules: ['inventory', 'rnd', 'formulations', 'batches', 'packaging', 'crm', 'pnl'],
    cta: 'Start Free Trial',
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'Ops + Commercial',
    price: '$599',
    billing: 'per month',
    description: 'For growing brands ready to streamline sales and distribution',
    features: [
      '10 team seats included',
      'Priority email support',
      'Dedicated onboarding',
      'Advanced reporting',
      'Mobile app access',
      'Custom fields',
    ],
    includedModules: ['inventory', 'rnd', 'formulations', 'batches', 'packaging', 'compliance', 'crm', 'quotes', 'sales-orders', 'distribution', 'pnl', 'budgeting'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Full Suite',
    price: 'Custom',
    billing: 'contact sales',
    description: 'Complete SMOS with advanced finance, compliance, and dedicated support',
    features: [
      'Unlimited seats',
      'Priority phone & email support',
      'White-glove onboarding',
      'Custom reporting & dashboards',
      'Mobile app access',
      'Custom fields & workflows',
      'SSO & advanced permissions',
      'Dedicated customer success manager',
      'API access',
    ],
    includedModules: ['inventory', 'rnd', 'formulations', 'batches', 'packaging', 'compliance', 'crm', 'quotes', 'sales-orders', 'distribution', 'pnl', 'budgeting', 'payroll', 'coa', 'ar-ap', 'bank-rec', 'tax', 'reports'],
    cta: 'Contact Sales',
  },
];

export const addOns = [
  { id: 'extra-seats', name: 'Additional Seats', price: '$25/seat/month', description: 'Add more team members beyond your plan limit' },
  { id: 'priority-support', name: 'Priority Support', price: '$199/month', description: 'Phone support, faster response times, and dedicated Slack channel' },
  { id: 'whitelabel', name: 'White-Label Quotes', price: '$99/month', description: 'Fully branded quotes and documents with your logo and colors' },
  { id: 'ai-automations', name: 'AI Automations Pack', price: '$149/month', description: 'Advanced AI workflows, custom prompts, and automation rules' },
  { id: 'analytics', name: 'Advanced Analytics', price: '$199/month', description: 'Custom dashboards, predictive forecasting, and export to BI tools' },
] as const;
