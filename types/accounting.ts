// =====================================================
// CureCore ERP: Accounting & Bookkeeping Type Definitions
// =====================================================

// =====================================================
// CHART OF ACCOUNTS
// =====================================================
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type AccountSubtype =
  | 'header'
  | 'current_asset'
  | 'fixed_asset'
  | 'accounts_receivable'
  | 'inventory'
  | 'current_liability'
  | 'long_term_liability'
  | 'accounts_payable'
  | 'equity'
  | 'retained_earnings'
  | 'current_earnings'
  | 'sales'
  | 'other_income'
  | 'cogs'
  | 'operating'
  | 'other';

export interface Account {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  account_subtype?: AccountSubtype;
  parent_id?: string;
  description?: string;
  is_active: boolean;
  is_system_account: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  total_debits: number;
  total_credits: number;
  balance: number;
}

// =====================================================
// JOURNAL ENTRIES
// =====================================================
export type JournalEntryStatus = 'draft' | 'posted' | 'voided' | 'reversed';
export type JournalEntryReferenceType =
  | 'batch'
  | 'sales_order'
  | 'manual'
  | 'payroll'
  | 'invoice'
  | 'payment'
  | 'adjustment';

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type?: JournalEntryReferenceType;
  reference_id?: string;
  status: JournalEntryStatus;
  posted_at?: string;
  voided_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  line_number: number;
  account_id: string;
  debit: number;
  credit: number;
  memo?: string;
  created_at: string;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: (JournalEntryLine & { account?: Account })[];
}

export interface GeneralLedgerEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  entry_description: string;
  reference_type?: string;
  reference_id?: string;
  entry_status: JournalEntryStatus;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  memo?: string;
  created_at: string;
}

// =====================================================
// INVOICES (AR/AP)
// =====================================================
export type InvoiceType = 'receivable' | 'payable';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  customer_id?: string;
  vendor_id?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  status: InvoiceStatus;
  sales_order_id?: string;
  purchase_order_id?: string;
  notes?: string;
  terms?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  account_id?: string;
  created_at: string;
}

export interface InvoiceWithLines extends Invoice {
  lines: (InvoiceLine & { account?: Account })[];
  customer?: { id: string; name: string; email?: string };
  taxes?: InvoiceTax[];
}

// =====================================================
// ACCOUNTS PAYABLE
// =====================================================
export interface Vendor {
  id: string;
  tenant_id?: string;
  name: string;
  email?: string;
  phone?: string;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type APBillStatus = 'draft' | 'open' | 'scheduled' | 'paid' | 'void';

export interface APBill {
  id: string;
  tenant_id?: string;
  bill_number: string;
  vendor_id: string;
  bill_date: string;
  due_date: string;
  status: APBillStatus;
  amount_total: number;
  amount_paid: number;
  balance_due: number;
  purchase_order_id?: string | null;
  scheduled_payment_date?: string | null;
  memo?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface APBillLine {
  id: string;
  tenant_id?: string;
  bill_id: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  account_id?: string | null;
  created_at: string;
}

export interface APBillWithDetails extends APBill {
  vendor?: Vendor;
  lines?: APBillLine[];
  payments?: APPayment[];
}

export interface APPayment {
  id: string;
  tenant_id?: string;
  bill_id: string;
  vendor_id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  created_by?: string;
  created_at: string;
}

// =====================================================
// PAYMENTS
// =====================================================
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method?: PaymentMethod;
  reference_number?: string;
  bank_account_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithDetails extends Payment {
  invoice?: Invoice;
  bank_account?: BankAccount;
}

// =====================================================
// BANK ACCOUNTS & TRANSACTIONS
// =====================================================
export type BankAccountType = 'checking' | 'savings' | 'credit_card' | 'other';
export type BankTransactionType = 'debit' | 'credit';

export interface BankAccount {
  id: string;
  account_name: string;
  account_number?: string;
  bank_name?: string;
  routing_number?: string;
  account_type?: BankAccountType;
  gl_account_id?: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountWithGLAccount extends BankAccount {
  gl_account?: Account;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  amount: number;
  description?: string;
  reference_number?: string;
  transaction_type?: BankTransactionType;
  is_reconciled: boolean;
  reconciled_at?: string;
  matched_journal_entry_id?: string;
  imported_from?: string;
  imported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransactionWithDetails extends BankTransaction {
  bank_account?: BankAccount;
  matched_journal_entry?: JournalEntry;
}

// =====================================================
// TAX MANAGEMENT
// =====================================================
export interface TaxCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  rate: number;
  jurisdiction?: string;
  gl_account_id?: string;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxCodeWithAccount extends TaxCode {
  gl_account?: Account;
}

export interface InvoiceTax {
  id: string;
  invoice_id: string;
  tax_code_id: string;
  taxable_amount: number;
  tax_amount: number;
  created_at: string;
  tax_code?: TaxCode;
}

// =====================================================
// AGING REPORTS
// =====================================================
export type AgingBucket = 'Paid' | 'Current' | '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';

export interface ARAgingEntry {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name?: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  days_overdue: number;
  aging_bucket: AgingBucket;
}

export interface APAgingEntry {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  vendor_id?: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  days_overdue: number;
  aging_bucket: AgingBucket;
}

// =====================================================
// FINANCIAL REPORTS
// =====================================================
export interface TrialBalanceEntry {
  code: string;
  name: string;
  account_type: AccountType;
  debit_balance: number;
  credit_balance: number;
}

export interface BalanceSheetData {
  assets: {
    current_assets: { code: string; name: string; balance: number }[];
    fixed_assets: { code: string; name: string; balance: number }[];
    total: number;
  };
  liabilities: {
    current_liabilities: { code: string; name: string; balance: number }[];
    long_term_liabilities: { code: string; name: string; balance: number }[];
    total: number;
  };
  equity: {
    items: { code: string; name: string; balance: number }[];
    total: number;
  };
  as_of_date: string;
}

export interface ProfitAndLossData {
  revenue: {
    items: { code: string; name: string; amount: number }[];
    total: number;
  };
  cogs: {
    items: { code: string; name: string; amount: number }[];
    total: number;
  };
  gross_profit: number;
  gross_margin_pct: number;
  operating_expenses: {
    items: { code: string; name: string; amount: number }[];
    total: number;
  };
  operating_income: number;
  other_income: {
    items: { code: string; name: string; amount: number }[];
    total: number;
  };
  other_expenses: {
    items: { code: string; name: string; amount: number }[];
    total: number;
  };
  net_income: number;
  period_start: string;
  period_end: string;
}

export interface CashFlowData {
  operating_activities: {
    items: { description: string; amount: number }[];
    total: number;
  };
  investing_activities: {
    items: { description: string; amount: number }[];
    total: number;
  };
  financing_activities: {
    items: { description: string; amount: number }[];
    total: number;
  };
  net_change_in_cash: number;
  beginning_cash: number;
  ending_cash: number;
  period_start: string;
  period_end: string;
}

// =====================================================
// DASHBOARD KPIs
// =====================================================
export interface AccountingDashboardKPIs {
  cash_balance: number;
  accounts_receivable_total: number;
  accounts_payable_total: number;
  current_ratio: number;
  quick_ratio: number;
  net_income_mtd: number;
  net_income_ytd: number;
  gross_margin_pct: number;
  ar_days_outstanding: number;
  ap_days_outstanding: number;
}

// =====================================================
// FORM INPUTS
// =====================================================
export interface CreateJournalEntryInput {
  entry_date: string;
  description: string;
  reference_type?: JournalEntryReferenceType;
  reference_id?: string;
  lines: {
    account_id: string;
    debit?: number;
    credit?: number;
    memo?: string;
  }[];
}

// =====================================================
// BANK RECONCILIATION
// =====================================================
export type BankReconciliationStatus = 'draft' | 'finalized';

export type BankLedgerEntryType = 'je_line' | 'ar_payment' | 'ap_payment';

export interface BankAccount {
  id: string;
  tenant_id?: string;
  name: string;
  bank_name?: string | null;
  account_number?: string | null;
  gl_account_id: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface BankStatement {
  id: string;
  tenant_id?: string;
  bank_account_id: string;
  start_date: string;
  end_date: string;
  starting_balance: number;
  ending_balance: number;
  imported_by: string;
  imported_at: string;
  created_at: string;
  updated_at?: string;
}

export interface BankStatementLine {
  id: string;
  tenant_id?: string;
  statement_id: string;
  date: string;
  description?: string | null;
  amount: number;
  type?: string | null;
  reference?: string | null;
  matched_ledger_id?: string | null;
  cleared: boolean;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankReconciliation {
  id: string;
  tenant_id?: string;
  bank_account_id: string;
  statement_id: string;
  reconciled_by?: string | null;
  reconciled_at?: string | null;
  ending_balance_per_bank: number;
  ending_balance_per_books: number;
  difference: number;
  status: BankReconciliationStatus;
  created_at: string;
  updated_at: string;
}

export interface BankReconciliationLine {
  id: string;
  tenant_id?: string;
  reconciliation_id: string;
  statement_line_id?: string | null;
  ledger_entry_id?: string | null;
  ledger_entry_type?: BankLedgerEntryType | null;
  matched_at: string;
  matched_by: string;
  auto_matched: boolean;
  created_at: string;
}

export interface BankLedgerCandidate {
  id: string;
  type: BankLedgerEntryType;
  date: string;
  amount: number;
  description: string;
  reference?: string;
  sourceId?: string;
  linkedIds?: string[];
}

export interface CreateInvoiceInput {
  invoice_type: InvoiceType;
  customer_id?: string;
  vendor_id?: string;
  invoice_date: string;
  due_date: string;
  lines: {
    description: string;
    quantity: number;
    unit_price: number;
    account_id?: string;
  }[];
  tax_code_id?: string;
  notes?: string;
  terms?: string;
}

export interface CreatePaymentInput {
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method?: PaymentMethod;
  reference_number?: string;
  bank_account_id?: string;
  notes?: string;
}

export interface CreateBankTransactionInput {
  bank_account_id: string;
  transaction_date: string;
  amount: number;
  description?: string;
  reference_number?: string;
  transaction_type: BankTransactionType;
}

// =====================================================
// AUTOMATION
// =====================================================
export interface BatchCompletionAccountingData {
  batch_id: string;
  formulation_id: string;
  batch_size: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
}

export interface SalesOrderAccountingData {
  sales_order_id: string;
  customer_id: string;
  order_total: number;
  tax_amount: number;
  cogs: number;
  line_items: {
    sku_id: string;
    quantity: number;
    unit_price: number;
    unit_cost: number;
  }[];
}

// =====================================================
// COST VISIBILITY
// =====================================================
export interface ProductCostBreakdown {
  sku_id: string;
  sku_name: string;
  formulation_id: string;
  direct_material_cost: number;
  direct_labor_cost: number;
  packaging_cost: number;
  overhead_cost: number;
  total_cost_per_unit: number;
  selling_price: number;
  gross_margin: number;
  gross_margin_pct: number;
}

export interface ProfitabilityAnalysis {
  by_formula: {
    formulation_id: string;
    formulation_name: string;
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
    units_sold: number;
  }[];
  by_customer: {
    customer_id: string;
    customer_name: string;
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
  }[];
  by_channel: {
    channel: string;
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
  }[];
}
