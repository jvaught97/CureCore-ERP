'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  createARInvoiceSchema,
  listARInvoicesSchema,
  applyPaymentSchema,
  voidInvoiceSchema,
  type CreateARInvoiceInput,
  type ListARInvoicesInput,
  type ApplyPaymentInput,
  type VoidInvoiceInput,
} from '@/lib/validation/finance'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// Helper to get auth context
async function getAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { user_id: user.id, tenant_id: user.id }
}

// ─── LIST AR INVOICES ────────────────────────────────────────────────────────

export async function listARInvoices(
  input: ListARInvoicesInput
): Promise<ActionResult<{ invoices: any[]; total: number; summary: any }>> {
  try {
    const { tenant_id } = await getAuth()
    const validated = listARInvoicesSchema.parse(input)
    const supabase = await createClient()

    let query = supabase
      .from('ar_invoices')
      .select('*, customer:customers(name, email)', {
        count: 'exact',
      })
      .eq('tenant_id', tenant_id)

    // Apply filters
    if (validated.search) {
      query = query.or(
        `invoice_number.ilike.%${validated.search}%,memo.ilike.%${validated.search}%`
      )
    }

    if (validated.status) {
      query = query.eq('status', validated.status)
    }

    if (validated.customer_id) {
      query = query.eq('customer_id', validated.customer_id)
    }

    if (validated.dateFrom) {
      query = query.gte('date_issued', validated.dateFrom)
    }

    if (validated.dateTo) {
      query = query.lte('date_issued', validated.dateTo)
    }

    // Pagination
    const from = (validated.page - 1) * validated.limit
    const to = from + validated.limit - 1

    query = query
      .order('date_issued', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    // Calculate summary stats
    const { data: summaryData } = await supabase
      .from('ar_invoices')
      .select('balance_due, status, due_date')
      .eq('tenant_id', tenant_id)
      .in('status', ['open', 'partial'])

    const today = new Date()
    const next30Days = new Date()
    next30Days.setDate(today.getDate() + 30)

    const summary = {
      total_open_balance: summaryData?.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0) || 0,
      total_overdue: summaryData?.filter(inv => new Date(inv.due_date) < today).reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0) || 0,
      next_30_days: summaryData?.filter(inv => new Date(inv.due_date) <= next30Days && new Date(inv.due_date) >= today).reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0) || 0,
    }

    return {
      success: true,
      data: {
        invoices: data || [],
        total: count || 0,
        summary,
      },
    }
  } catch (err: any) {
    console.error('listARInvoices error:', err)
    return { success: false, error: err.message || 'Failed to list AR invoices' }
  }
}

// ─── GET AR INVOICE ──────────────────────────────────────────────────────────

export async function getARInvoice(id: string): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data: invoice, error: invoiceError } = await supabase
      .from('ar_invoices')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (invoiceError) throw invoiceError

    // Get payments for this invoice
    const { data: payments, error: paymentsError } = await supabase
      .from('ar_payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('tenant_id', tenant_id)
      .order('payment_date', { ascending: false })

    if (paymentsError) throw paymentsError

    return {
      success: true,
      data: {
        ...invoice,
        payments: payments || [],
      },
    }
  } catch (err: any) {
    console.error('getARInvoice error:', err)
    return { success: false, error: err.message || 'Failed to fetch AR invoice' }
  }
}

// ─── CREATE AR INVOICE ───────────────────────────────────────────────────────

export async function createARInvoice(
  input: CreateARInvoiceInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = createARInvoiceSchema.parse(input)
    const supabase = await createClient()

    // Check if invoice number exists
    const { data: existing } = await supabase
      .from('ar_invoices')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('invoice_number', validated.invoice_number)
      .single()

    if (existing) {
      return { success: false, error: 'Invoice number already exists' }
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('ar_invoices')
      .insert({
        tenant_id,
        invoice_number: validated.invoice_number,
        customer_id: validated.customer_id,
        date_issued: validated.date_issued,
        due_date: validated.due_date,
        amount_total: validated.amount_total,
        memo: validated.memo || null,
        status: 'open',
        created_by: user_id,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    return { success: true, data: { id: invoice.id } }
  } catch (err: any) {
    console.error('createARInvoice error:', err)
    return { success: false, error: err.message || 'Failed to create AR invoice' }
  }
}

// ─── APPLY PAYMENT ───────────────────────────────────────────────────────────

export async function applyPayment(input: ApplyPaymentInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = applyPaymentSchema.parse(input)
    const supabase = await createClient()

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('ar_invoices')
      .select('*, customer:customers(name)')
      .eq('id', validated.invoice_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (invoiceError || !invoice) {
      return { success: false, error: 'Invoice not found' }
    }

    // Validate payment amount
    if (validated.amount > parseFloat(invoice.balance_due)) {
      return { success: false, error: 'Payment amount exceeds balance due' }
    }

    if (invoice.status === 'paid') {
      return { success: false, error: 'Invoice is already paid' }
    }

    if (invoice.status === 'void') {
      return { success: false, error: 'Cannot apply payment to voided invoice' }
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('ar_payments')
      .insert({
        tenant_id,
        invoice_id: validated.invoice_id,
        customer_id: invoice.customer_id,
        payment_date: validated.payment_date,
        amount: validated.amount,
        method: validated.method,
        reference: validated.reference || null,
        notes: validated.notes || null,
        created_by: user_id,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Update invoice amount_paid and status
    const newAmountPaid = parseFloat(invoice.amount_paid) + validated.amount
    const newBalanceDue = parseFloat(invoice.amount_total) - newAmountPaid
    let newStatus = invoice.status

    if (newBalanceDue <= 0.01) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0) {
      newStatus = 'partial'
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('ar_invoices')
      .update({
        amount_paid: newAmountPaid,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.invoice_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Create journal entry if requested
    if (validated.create_journal_entry) {
      // Find cash and AR accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name')
        .eq('tenant_id', tenant_id)
        .in('code', ['1010', '1200']) // Cash and AR accounts
        .eq('is_active', true)

      const cashAccount = accounts?.find((a) => a.code === '1010')
      const arAccount = accounts?.find((a) => a.code === '1200')

      if (cashAccount && arAccount) {
        const jeNumber = `AR-PMT-${payment.id.substring(0, 8)}`

        // Create journal entry
        const { data: je, error: jeError } = await supabase
          .from('journal_entries')
          .insert({
            tenant_id,
            journal_number: jeNumber,
            date: validated.payment_date,
            memo: `Payment from ${invoice.customer.name} - Invoice ${invoice.invoice_number}`,
            status: 'posted',
            created_by: user_id,
            posted_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (!jeError && je) {
          // Create journal entry lines
          await supabase.from('journal_entry_lines').insert([
            {
              tenant_id,
              journal_id: je.id,
              account_id: cashAccount.id,
              description: `Payment received - ${validated.method}`,
              debit: validated.amount,
              credit: 0,
              reference_type: 'ar_payment',
              reference_id: payment.id,
              sort_order: 0,
            },
            {
              tenant_id,
              journal_id: je.id,
              account_id: arAccount.id,
              description: `Payment applied to Invoice ${invoice.invoice_number}`,
              debit: 0,
              credit: validated.amount,
              reference_type: 'ar_invoice',
              reference_id: invoice.id,
              sort_order: 1,
            },
          ])
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('applyPayment error:', err)
    return { success: false, error: err.message || 'Failed to apply payment' }
  }
}

// ─── VOID INVOICE ────────────────────────────────────────────────────────────

export async function voidInvoice(input: VoidInvoiceInput): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = voidInvoiceSchema.parse(input)
    const supabase = await createClient()

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('ar_invoices')
      .select('*, ar_payments(count)')
      .eq('id', validated.invoice_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (invoiceError || !invoice) {
      return { success: false, error: 'Invoice not found' }
    }

    // Check if invoice has payments
    if (invoice.ar_payments && invoice.ar_payments[0]?.count > 0) {
      return { success: false, error: 'Cannot void invoice with payments' }
    }

    if (invoice.status === 'void') {
      return { success: false, error: 'Invoice is already void' }
    }

    // Update invoice status
    const { data: voided, error: updateError } = await supabase
      .from('ar_invoices')
      .update({
        status: 'void',
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.invoice_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('voidInvoice error:', err)
    return { success: false, error: err.message || 'Failed to void invoice' }
  }
}

// ─── GET AR AGING ────────────────────────────────────────────────────────────

export async function getARAging(): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ar_invoice_aging')
      .select('*')
      .eq('tenant_id', tenant_id)

    if (error) throw error

    // Group by aging bucket
    const aging = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    }

    data?.forEach((inv: any) => {
      aging[inv.aging_bucket as keyof typeof aging] += parseFloat(inv.balance_due)
    })

    return {
      success: true,
      data: {
        buckets: aging,
        details: data || [],
      },
    }
  } catch (err: any) {
    console.error('getARAging error:', err)
    return { success: false, error: err.message || 'Failed to fetch AR aging' }
  }
}

// ─── GET CUSTOMERS ───────────────────────────────────────────────────────────

export async function getCustomers(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getCustomers error:', err)
    return { success: false, error: err.message || 'Failed to fetch customers' }
  }
}

// ─── GET CUSTOMER DETAIL ─────────────────────────────────────────────────────

export async function getCustomerDetail(customerId: string): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('tenant_id', tenant_id)
      .single()

    if (customerError) throw customerError

    // Get open invoices
    const { data: openInvoices } = await supabase
      .from('ar_invoices')
      .select('*')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenant_id)
      .in('status', ['open', 'partial'])
      .order('due_date')

    // Get recent payments (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: recentPayments } = await supabase
      .from('ar_payments')
      .select('*, invoice:ar_invoices(invoice_number)')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenant_id)
      .gte('payment_date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('payment_date', { ascending: false })

    const totalOpenBalance = openInvoices?.reduce(
      (sum, inv) => sum + parseFloat(inv.balance_due),
      0
    ) || 0

    return {
      success: true,
      data: {
        ...customer,
        open_invoices: openInvoices || [],
        recent_payments: recentPayments || [],
        total_open_balance: totalOpenBalance,
      },
    }
  } catch (err: any) {
    console.error('getCustomerDetail error:', err)
    return { success: false, error: err.message || 'Failed to fetch customer detail' }
  }
}
