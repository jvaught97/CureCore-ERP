import { z } from 'zod'

// =====================================================
// Chart of Accounts Schemas
// =====================================================
export const chartOfAccountsSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Account code is required').max(50),
  name: z.string().min(1, 'Account name is required').max(255),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
})

export type ChartOfAccountsInput = z.infer<typeof chartOfAccountsSchema>

// =====================================================
// Journal Entry Schemas
// =====================================================
export const journalEntryLineSchema = z.object({
  id: z.string().uuid().optional(),
  account_id: z.string().uuid('Account is required'),
  description: z.string().max(500).optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  department_id: z.string().uuid().nullable().optional(),
  reference_type: z.string().max(50).nullable().optional(),
  reference_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
}).refine(
  (data) => !(data.debit > 0 && data.credit > 0),
  { message: 'A line cannot have both debit and credit amounts' }
).refine(
  (data) => data.debit > 0 || data.credit > 0,
  { message: 'A line must have either a debit or credit amount' }
)

export type JournalEntryLineInput = z.infer<typeof journalEntryLineSchema>

export const createJournalEntrySchema = z.object({
  journal_number: z.string().min(1, 'Journal number is required').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  memo: z.string().max(1000).optional(),
  lines: z.array(journalEntryLineSchema).min(2, 'At least 2 lines are required'),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0)
    return Math.abs(totalDebit - totalCredit) < 0.01 // Allow for floating point precision
  },
  { message: 'Total debits must equal total credits' }
)

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>

export const updateJournalEntrySchema = z.object({
  id: z.string().uuid('Journal entry ID is required'),
  journal_number: z.string().min(1).max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memo: z.string().max(1000).optional(),
  lines: z.array(journalEntryLineSchema).min(2).optional(),
}).refine(
  (data) => {
    if (!data.lines) return true
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0)
    return Math.abs(totalDebit - totalCredit) < 0.01
  },
  { message: 'Total debits must equal total credits' }
)

export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>

export const postJournalEntrySchema = z.object({
  id: z.string().uuid('Journal entry ID is required'),
})

export type PostJournalEntryInput = z.infer<typeof postJournalEntrySchema>

export const reverseJournalEntrySchema = z.object({
  id: z.string().uuid('Journal entry ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  memo: z.string().max(1000).optional(),
})

export type ReverseJournalEntryInput = z.infer<typeof reverseJournalEntrySchema>

export const listJournalEntriesSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['draft', 'posted', 'reversed']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type ListJournalEntriesInput = z.infer<typeof listJournalEntriesSchema>

// =====================================================
// Customer Schemas
// =====================================================
export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Customer name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  billing_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shipping_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  credit_limit: z.number().min(0).default(0),
  payment_terms: z.string().default('NET_30'),
  is_active: z.boolean().default(true),
})

export type CustomerInput = z.infer<typeof customerSchema>

// =====================================================
// AR Invoice Schemas
// =====================================================
export const createARInvoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required').max(100),
  customer_id: z.string().uuid('Customer is required'),
  date_issued: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  amount_total: z.number().min(0.01, 'Invoice amount must be greater than 0'),
  memo: z.string().max(1000).optional(),
})

export type CreateARInvoiceInput = z.infer<typeof createARInvoiceSchema>

export const listARInvoicesSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['open', 'partial', 'paid', 'void']).optional(),
  customer_id: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type ListARInvoicesInput = z.infer<typeof listARInvoicesSchema>

// =====================================================
// AR Payment Schemas
// =====================================================
export const applyPaymentSchema = z.object({
  invoice_id: z.string().uuid('Invoice is required'),
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().max(255).optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).optional(),
  create_journal_entry: z.boolean().default(false),
})

export type ApplyPaymentInput = z.infer<typeof applyPaymentSchema>

export const voidInvoiceSchema = z.object({
  invoice_id: z.string().uuid('Invoice is required'),
})

export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>

// =====================================================
// AP Bill Schemas
// =====================================================
export const createAPBillSchema = z.object({
  bill_number: z.string().min(1, 'Bill number is required').max(100),
  vendor_id: z.string().uuid('Vendor is required'),
  bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  amount_total: z.number().min(0.01, 'Bill amount must be greater than 0'),
  purchase_order_id: z.string().uuid().nullable().optional(),
  memo: z.string().max(1000).optional(),
})

export type CreateAPBillInput = z.infer<typeof createAPBillSchema>

export const listAPBillsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['draft', 'open', 'scheduled', 'paid', 'void']).optional(),
  vendor_id: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type ListAPBillsInput = z.infer<typeof listAPBillsSchema>

export const scheduleAPPaymentSchema = z.object({
  bill_id: z.string().uuid('Bill ID is required'),
  scheduled_payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

export type ScheduleAPPaymentInput = z.infer<typeof scheduleAPPaymentSchema>

export const recordAPPaymentSchema = z.object({
  bill_id: z.string().uuid('Bill ID is required'),
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  method: z.string().min(1, 'Payment method is required'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
})

export type RecordAPPaymentInput = z.infer<typeof recordAPPaymentSchema>

export const voidAPBillSchema = z.object({
  bill_id: z.string().uuid('Bill ID is required'),
})

export type VoidAPBillInput = z.infer<typeof voidAPBillSchema>

// =====================================================
// Bank Reconciliation Schemas
// =====================================================
export const createBankStatementSchema = z.object({
  bankAccountId: z.string().uuid('Bank account is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format'),
  startingBalance: z.number().finite(),
  endingBalance: z.number().finite(),
}).refine(
  (value) => new Date(value.startDate) <= new Date(value.endDate),
  { message: 'Start date must be before end date', path: ['endDate'] }
)

export type CreateBankStatementInput = z.infer<typeof createBankStatementSchema>

export const createReconciliationSchema = z.object({
  statementId: z.string().uuid('Statement is required'),
})

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>

export const smartMatchSchema = z.object({
  reconciliationId: z.string().uuid('Reconciliation is required'),
})

export type SmartMatchInput = z.infer<typeof smartMatchSchema>

export const recalcReconciliationSchema = z.object({
  reconciliationId: z.string().uuid('Reconciliation is required'),
})

export type RecalcReconciliationInput = z.infer<typeof recalcReconciliationSchema>

export const manualMatchSchema = z.object({
  reconciliationId: z.string().uuid('Reconciliation is required'),
  statementLineId: z.string().uuid('Statement line is required'),
  ledgerEntryId: z.string().uuid('Ledger entry is required'),
  ledgerEntryType: z.enum(['je_line', 'ar_payment', 'ap_payment']),
  action: z.enum(['match', 'unmatch']).default('match'),
})

export type ManualMatchInput = z.infer<typeof manualMatchSchema>

export const markClearedSchema = z.object({
  statementLineId: z.string().uuid('Statement line is required'),
  cleared: z.boolean(),
})

export type MarkClearedInput = z.infer<typeof markClearedSchema>

export const bankAdjustmentSchema = z.object({
  reconciliationId: z.string().uuid('Reconciliation is required'),
  type: z.enum(['fee', 'interest']),
  amount: z.number().positive('Amount must be greater than zero'),
  memo: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

export type BankAdjustmentInput = z.infer<typeof bankAdjustmentSchema>

export const finalizeReconciliationSchema = z.object({
  reconciliationId: z.string().uuid('Reconciliation is required'),
})

export type FinalizeReconciliationInput = z.infer<typeof finalizeReconciliationSchema>

export const listReconciliationsSchema = z.object({
  bankAccountId: z.string().uuid().optional(),
  status: z.enum(['draft', 'finalized']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type ListReconciliationsInput = z.infer<typeof listReconciliationsSchema>

export const getReconciliationSchema = z.object({
  reconciliationId: z.string().uuid('Reconciliation is required'),
})

export type GetReconciliationInput = z.infer<typeof getReconciliationSchema>
