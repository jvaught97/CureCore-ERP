'use server'

import { createClient } from '@/app/utils/supabase/server'
import {
  createAPBillSchema,
  listAPBillsSchema,
  scheduleAPPaymentSchema,
  recordAPPaymentSchema,
  voidAPBillSchema,
  type CreateAPBillInput,
  type ListAPBillsInput,
  type ScheduleAPPaymentInput,
  type RecordAPPaymentInput,
  type VoidAPBillInput,
} from '@/lib/validation/finance'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

async function getAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { user_id: user.id, tenant_id: user.id }
}

// ─── LIST AP BILLS ───────────────────────────────────────────────────────────

export async function listAPBills(
  input: ListAPBillsInput
): Promise<ActionResult<{ bills: any[]; total: number; summary: any }>> {
  try {
    const { tenant_id } = await getAuth()
    const validated = listAPBillsSchema.parse(input)
    const supabase = await createClient()

    let query = supabase
      .from('ap_bills')
      .select('*, vendor:vendors(name, email)', { count: 'exact' })
      .eq('tenant_id', tenant_id)

    if (validated.search) {
      query = query.or(
        `bill_number.ilike.%${validated.search}%,memo.ilike.%${validated.search}%`
      )
    }

    if (validated.status) {
      query = query.eq('status', validated.status)
    }

    if (validated.vendor_id) {
      query = query.eq('vendor_id', validated.vendor_id)
    }

    if (validated.dateFrom) {
      query = query.gte('bill_date', validated.dateFrom)
    }

    if (validated.dateTo) {
      query = query.lte('bill_date', validated.dateTo)
    }

    const from = (validated.page - 1) * validated.limit
    const to = from + validated.limit - 1

    query = query
      .order('bill_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    const { data: summaryData, error: summaryError } = await supabase
      .from('ap_bills')
      .select('balance_due, status, due_date, scheduled_payment_date')
      .eq('tenant_id', tenant_id)
      .not('status', 'in', '("void")')

    if (summaryError) throw summaryError

    const today = new Date()
    const summary = (summaryData || []).reduce(
      (acc, bill) => {
        const balance = Number(bill.balance_due || 0)
        if (['open', 'scheduled'].includes(bill.status)) {
          acc.total_open_balance += balance
        }
        if (bill.status !== 'paid' && new Date(bill.due_date) < today) {
          acc.total_overdue += balance
        }
        if (
          bill.status === 'scheduled' &&
          bill.scheduled_payment_date &&
          new Date(bill.scheduled_payment_date) >= today
        ) {
          acc.scheduled_this_month += balance
        }
        return acc
      },
      {
        total_open_balance: 0,
        total_overdue: 0,
        scheduled_this_month: 0,
      }
    )

    return {
      success: true,
      data: {
        bills: data || [],
        total: count || 0,
        summary,
      },
    }
  } catch (err: any) {
    console.error('listAPBills error:', err)
    return { success: false, error: err.message || 'Failed to list AP bills' }
  }
}

// ─── GET AP BILL DETAILS ─────────────────────────────────────────────────────

export async function getAPBill(id: string): Promise<ActionResult<any>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ap_bills')
      .select(
        `
        *,
        vendor:vendors(*),
        lines:ap_bill_lines(*),
        payments:ap_payments(*)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    console.error('getAPBill error:', err)
    return { success: false, error: err.message || 'Failed to fetch AP bill' }
  }
}

// ─── CREATE AP BILL ──────────────────────────────────────────────────────────

export async function createAPBill(
  input: CreateAPBillInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = createAPBillSchema.parse(input)
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('ap_bills')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('bill_number', validated.bill_number)
      .single()

    if (existing) {
      return { success: false, error: 'Bill number already exists' }
    }

    const { data: bill, error } = await supabase
      .from('ap_bills')
      .insert({
        tenant_id,
        bill_number: validated.bill_number,
        vendor_id: validated.vendor_id,
        bill_date: validated.bill_date,
        due_date: validated.due_date,
        status: 'open',
        amount_total: validated.amount_total,
        memo: validated.memo || null,
        purchase_order_id: validated.purchase_order_id || null,
        created_by: user_id,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, data: { id: bill.id } }
  } catch (err: any) {
    console.error('createAPBill error:', err)
    return { success: false, error: err.message || 'Failed to create AP bill' }
  }
}

// ─── SCHEDULE PAYMENT ────────────────────────────────────────────────────────

export async function scheduleAPPayment(
  input: ScheduleAPPaymentInput
): Promise<ActionResult> {
  try {
    const { tenant_id } = await getAuth()
    const validated = scheduleAPPaymentSchema.parse(input)
    const supabase = await createClient()

    const { error } = await supabase
      .from('ap_bills')
      .update({
        scheduled_payment_date: validated.scheduled_payment_date,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.bill_id)
      .eq('tenant_id', tenant_id)
      .in('status', ['open', 'scheduled'])

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('scheduleAPPayment error:', err)
    return { success: false, error: err.message || 'Failed to schedule payment' }
  }
}

// ─── RECORD PAYMENT ──────────────────────────────────────────────────────────

export async function recordAPPayment(
  input: RecordAPPaymentInput
): Promise<ActionResult> {
  try {
    const { tenant_id, user_id } = await getAuth()
    const validated = recordAPPaymentSchema.parse(input)
    const supabase = await createClient()

    const { data: bill, error: billError } = await supabase
      .from('ap_bills')
      .select('*')
      .eq('id', validated.bill_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (billError || !bill) {
      return { success: false, error: 'Bill not found' }
    }

    if (bill.status === 'void') {
      return { success: false, error: 'Cannot pay a void bill' }
    }

    if (bill.status === 'paid') {
      return { success: false, error: 'Bill is already paid' }
    }

    const balance = Number(bill.balance_due)
    if (validated.amount > balance) {
      return { success: false, error: 'Payment exceeds balance due' }
    }

    const { error: paymentError } = await supabase
      .from('ap_payments')
      .insert({
        tenant_id,
        bill_id: validated.bill_id,
        vendor_id: bill.vendor_id,
        payment_date: validated.payment_date,
        amount: validated.amount,
        method: validated.method,
        reference: validated.reference || null,
        notes: validated.notes || null,
        created_by: user_id,
      })

    if (paymentError) throw paymentError

    const newAmountPaid = Number(bill.amount_paid) + validated.amount
    const newBalance = Number(bill.amount_total) - newAmountPaid

    const { error: updateError } = await supabase
      .from('ap_bills')
      .update({
        amount_paid: newAmountPaid,
        status: newBalance <= 0 ? 'paid' : 'open',
        scheduled_payment_date: newBalance <= 0 ? null : bill.scheduled_payment_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.bill_id)
      .eq('tenant_id', tenant_id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('recordAPPayment error:', err)
    return { success: false, error: err.message || 'Failed to record payment' }
  }
}

// ─── VOID BILL ───────────────────────────────────────────────────────────────

export async function voidAPBill(input: VoidAPBillInput): Promise<ActionResult> {
  try {
    const { tenant_id } = await getAuth()
    const validated = voidAPBillSchema.parse(input)
    const supabase = await createClient()

    const { error } = await supabase
      .from('ap_bills')
      .update({
        status: 'void',
        scheduled_payment_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.bill_id)
      .eq('tenant_id', tenant_id)
      .neq('status', 'paid')

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('voidAPBill error:', err)
    return { success: false, error: err.message || 'Failed to void bill' }
  }
}

// ─── SUPPORTING LOOKUPS ──────────────────────────────────────────────────────

export async function getVendors(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, email')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getVendors error:', err)
    return { success: false, error: err.message || 'Failed to fetch vendors' }
  }
}

export async function getAPAging(): Promise<ActionResult<any[]>> {
  try {
    const { tenant_id } = await getAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ap_invoice_aging')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('due_date', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getAPAging error:', err)
    return { success: false, error: err.message || 'Failed to fetch AP aging' }
  }
}
