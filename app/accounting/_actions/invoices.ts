'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  Invoice,
  InvoiceWithLines,
  InvoiceStatus,
  InvoiceType,
  CreateInvoiceInput,
  Payment,
  PaymentWithDetails,
  CreatePaymentInput,
  ARAgingEntry,
  APAgingEntry,
} from '@/types/accounting'

export async function fetchInvoices(filters?: {
  invoice_type?: InvoiceType
  status?: InvoiceStatus
  customer_id?: string
  vendor_id?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select(`
      *,
      lines:invoice_lines(*),
      customer:crm_accounts(id, name, email),
      taxes:invoice_taxes(*, tax_code:tax_codes(*))
    `)
    .order('invoice_date', { ascending: false })

  if (filters?.invoice_type) {
    query = query.eq('invoice_type', filters.invoice_type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }

  if (filters?.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id)
  }

  const { data, error } = await query

  if (error) throw error
  return data as InvoiceWithLines[]
}

export async function fetchInvoiceById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      lines:invoice_lines(*),
      customer:crm_accounts(id, name, email),
      taxes:invoice_taxes(*, tax_code:tax_codes(*))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as InvoiceWithLines
}

export async function createInvoice(input: CreateInvoiceInput) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Generate invoice number
  const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
    inv_type: input.invoice_type,
  })

  // Calculate totals
  const subtotal = input.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0)
  let tax_amount = 0

  if (input.tax_code_id) {
    const { data: taxCode } = await supabase
      .from('tax_codes')
      .select('rate')
      .eq('id', input.tax_code_id)
      .single()

    if (taxCode) {
      tax_amount = subtotal * taxCode.rate
    }
  }

  const total_amount = subtotal + tax_amount

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      invoice_type: input.invoice_type,
      customer_id: input.customer_id,
      vendor_id: input.vendor_id,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      subtotal,
      tax_amount,
      total_amount,
      amount_paid: 0,
      status: 'draft',
      notes: input.notes,
      terms: input.terms,
      created_by: user?.id,
    })
    .select()
    .single()

  if (invError) throw invError

  // Create invoice lines
  const lines = input.lines.map((line, index) => ({
    invoice_id: invoice.id,
    line_number: index + 1,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    amount: line.quantity * line.unit_price,
    account_id: line.account_id,
  }))

  const { error: linesError } = await supabase
    .from('invoice_lines')
    .insert(lines)

  if (linesError) throw linesError

  // Create tax record if applicable
  if (input.tax_code_id && tax_amount > 0) {
    await supabase.from('invoice_taxes').insert({
      invoice_id: invoice.id,
      tax_code_id: input.tax_code_id,
      taxable_amount: subtotal,
      tax_amount,
    })
  }

  return await fetchInvoiceById(invoice.id)
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Invoice
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()

  // Only allow deletion of draft invoices
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single()

  if (invoice?.status !== 'draft') {
    throw new Error('Can only delete draft invoices')
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}

// =====================================================
// PAYMENTS
// =====================================================

export async function fetchPayments(filters?: {
  invoice_id?: string
  start_date?: string
  end_date?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('payments')
    .select(`
      *,
      invoice:invoices(*),
      bank_account:bank_accounts(*)
    `)
    .order('payment_date', { ascending: false })

  if (filters?.invoice_id) {
    query = query.eq('invoice_id', filters.invoice_id)
  }

  if (filters?.start_date) {
    query = query.gte('payment_date', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('payment_date', filters.end_date)
  }

  const { data, error } = await query

  if (error) throw error
  return data as PaymentWithDetails[]
}

export async function createPayment(input: CreatePaymentInput) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Generate payment number
  const { data: paymentNumber } = await supabase.rpc('generate_payment_number')

  // Get invoice details
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, invoice_type')
    .eq('id', input.invoice_id)
    .single()

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  const balance = invoice.total_amount - invoice.amount_paid

  if (input.amount > balance) {
    throw new Error(`Payment amount (${input.amount}) exceeds invoice balance (${balance})`)
  }

  // Create payment
  const { data: payment, error: pmtError } = await supabase
    .from('payments')
    .insert({
      payment_number: paymentNumber,
      invoice_id: input.invoice_id,
      payment_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method,
      reference_number: input.reference_number,
      bank_account_id: input.bank_account_id,
      notes: input.notes,
      created_by: user?.id,
    })
    .select()
    .single()

  if (pmtError) throw pmtError

  // Update invoice amount_paid and status
  const new_amount_paid = invoice.amount_paid + input.amount
  const new_status: InvoiceStatus =
    new_amount_paid >= invoice.total_amount
      ? 'paid'
      : new_amount_paid > 0
      ? 'partial'
      : invoice.status === 'draft'
      ? 'draft'
      : 'sent'

  await supabase
    .from('invoices')
    .update({
      amount_paid: new_amount_paid,
      status: new_status,
    })
    .eq('id', input.invoice_id)

  // Create journal entry
  // For AR: DR: Cash, CR: Accounts Receivable
  // For AP: DR: Accounts Payable, CR: Cash
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, account_subtype')
    .in('account_subtype', ['accounts_receivable', 'accounts_payable'])

  const arAccount = accounts?.find(a => a.account_subtype === 'accounts_receivable')
  const apAccount = accounts?.find(a => a.account_subtype === 'accounts_payable')

  const { data: cashAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('code', '1110')
    .single()

  if (cashAccount && ((invoice.invoice_type === 'receivable' && arAccount) || (invoice.invoice_type === 'payable' && apAccount))) {
    const { data: entryNumber } = await supabase.rpc('generate_journal_entry_number')

    const { data: je } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: entryNumber,
        entry_date: input.payment_date,
        description: `Payment ${paymentNumber}`,
        reference_type: 'payment',
        reference_id: payment.id,
        status: 'posted',
        posted_at: new Date().toISOString(),
        created_by: user?.id,
      })
      .select()
      .single()

    if (je) {
      if (invoice.invoice_type === 'receivable') {
        // DR: Cash, CR: AR
        await supabase.from('journal_entry_lines').insert([
          { journal_entry_id: je.id, line_number: 1, account_id: cashAccount.id, debit: input.amount, credit: 0 },
          { journal_entry_id: je.id, line_number: 2, account_id: arAccount!.id, debit: 0, credit: input.amount },
        ])
      } else {
        // DR: AP, CR: Cash
        await supabase.from('journal_entry_lines').insert([
          { journal_entry_id: je.id, line_number: 1, account_id: apAccount!.id, debit: input.amount, credit: 0 },
          { journal_entry_id: je.id, line_number: 2, account_id: cashAccount.id, debit: 0, credit: input.amount },
        ])
      }
    }
  }

  return payment as Payment
}

// =====================================================
// AGING REPORTS
// =====================================================

export async function fetchARAgingReport() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ar_aging')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) throw error
  return data as ARAgingEntry[]
}

export async function fetchAPAgingReport() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ap_aging')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) throw error
  return data as APAgingEntry[]
}
