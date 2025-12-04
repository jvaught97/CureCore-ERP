'use server'

import { createClient } from '@/app/utils/supabase/server'
import { z } from 'zod'

// =====================================================
// TYPE DEFINITIONS
// =====================================================
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  gl_account_id: string
  icon_name: string | null
  color: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  expense_number: string
  expense_date: string
  amount: number
  category_id: string
  vendor_name: string | null
  description: string
  payment_method: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer'
  check_number: string | null
  receipt_url: string | null
  notes: string | null
  is_recurring: boolean
  recurring_expense_id: string | null
  journal_entry_id: string | null
  status: 'draft' | 'posted' | 'voided'
  created_by: string
  created_at: string
  updated_at: string
  category?: ExpenseCategory
}

export interface RecurringExpense {
  id: string
  name: string
  amount: number
  category_id: string
  vendor_name: string | null
  description: string
  payment_method: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer'
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  start_date: string
  end_date: string | null
  next_run_date: string
  is_active: boolean
  last_generated_expense_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  category?: ExpenseCategory
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================
const expenseSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  amount: z.number().positive('Amount must be greater than 0'),
  category_id: z.string().uuid('Invalid category'),
  vendor_name: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  payment_method: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer']),
  check_number: z.string().optional(),
  receipt_url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  is_recurring: z.boolean(),
  recurring_config: z.object({
    name: z.string().min(1, 'Recurring expense name required'),
    frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''))
  }).optional()
})

const updateExpenseSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  category_id: z.string().uuid().optional(),
  vendor_name: z.string().optional(),
  description: z.string().min(1).optional(),
  payment_method: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer']).optional(),
  check_number: z.string().optional(),
  receipt_url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['draft', 'posted', 'voided']).optional()
})

// =====================================================
// HELPER FUNCTIONS
// =====================================================
async function getAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { user_id: user.id, supabase }
}

function generateExpenseNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `EXP-${timestamp}-${random}`
}

function calculateNextRunDate(startDate: string, frequency: RecurringExpense['frequency']): string {
  const date = new Date(startDate)

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'annually':
      date.setFullYear(date.getFullYear() + 1)
      break
  }

  return date.toISOString().split('T')[0]
}

// =====================================================
// EXPENSE CATEGORY ACTIONS
// =====================================================
export async function getExpenseCategories(): Promise<ActionResult<ExpenseCategory[]>> {
  try {
    const supabase = await createClient()

    // Temporary workaround: Use RPC function to bypass PostgREST schema cache issue
    console.log('[getExpenseCategories] Calling RPC function...')
    const { data, error } = await supabase.rpc('get_expense_categories_direct')
    console.log('[getExpenseCategories] RPC result:', { data: data?.length, error })

    if (error) {
      console.log('[getExpenseCategories] RPC failed, trying fallback...')
      // Fallback to direct query if RPC doesn't exist
      const fallbackResult = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      console.log('[getExpenseCategories] Fallback result:', { data: fallbackResult.data?.length, error: fallbackResult.error })
      if (fallbackResult.error) throw fallbackResult.error
      return { success: true, data: fallbackResult.data as ExpenseCategory[] }
    }

    console.log('[getExpenseCategories] Success! Returning', data?.length, 'categories')
    return { success: true, data: data as ExpenseCategory[] }
  } catch (err: any) {
    console.error('getExpenseCategories error:', err)
    return { success: false, error: err.message || 'Failed to fetch expense categories' }
  }
}

// =====================================================
// EXPENSE ACTIONS
// =====================================================
export async function createExpense(
  input: z.infer<typeof expenseSchema>
): Promise<ActionResult<{ id: string; expense_number: string }>> {
  try {
    const { user_id, supabase } = await getAuth()
    const validated = expenseSchema.parse(input)

    // Get category to find GL account
    const { data: category, error: catError } = await supabase
      .from('expense_categories')
      .select('gl_account_id, name')
      .eq('id', validated.category_id)
      .single()

    if (catError || !category) {
      return { success: false, error: 'Invalid expense category' }
    }

    // Get cash/bank account (code 1010)
    const { data: cashAccount, error: cashError } = await supabase
      .from('accounts')
      .select('id')
      .eq('code', '1010')
      .single()

    if (cashError || !cashAccount) {
      return { success: false, error: 'Cash account not configured. Please contact administrator.' }
    }

    // Generate expense number
    const expenseNumber = generateExpenseNumber()
    const journalNumber = `JE-${expenseNumber}`

    // 1. Create journal entry
    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: journalNumber,
        entry_date: validated.expense_date,
        description: `${category.name}: ${validated.description}`,
        reference_type: 'expense',
        status: 'posted',
        posted_at: new Date().toISOString(),
        created_by: user_id
      })
      .select()
      .single()

    if (jeError) throw jeError

    // 2. Create journal entry lines (debit expense account, credit cash account)
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert([
        {
          journal_entry_id: journalEntry.id,
          line_number: 1,
          account_id: category.gl_account_id,
          debit: validated.amount,
          credit: 0,
          memo: `${validated.vendor_name || 'Vendor'} - ${validated.payment_method}`
        },
        {
          journal_entry_id: journalEntry.id,
          line_number: 2,
          account_id: cashAccount.id,
          debit: 0,
          credit: validated.amount,
          memo: `Payment via ${validated.payment_method}${validated.check_number ? ' - Check #' + validated.check_number : ''}`
        }
      ])

    if (linesError) throw linesError

    // 3. Create expense record
    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .insert({
        expense_number: expenseNumber,
        expense_date: validated.expense_date,
        amount: validated.amount,
        category_id: validated.category_id,
        vendor_name: validated.vendor_name || null,
        description: validated.description,
        payment_method: validated.payment_method,
        check_number: validated.check_number || null,
        receipt_url: validated.receipt_url || null,
        notes: validated.notes || null,
        is_recurring: validated.is_recurring,
        journal_entry_id: journalEntry.id,
        status: 'posted',
        created_by: user_id
      })
      .select()
      .single()

    if (expError) throw expError

    // 4. If recurring, create recurring expense template
    if (validated.is_recurring && validated.recurring_config) {
      const nextRun = calculateNextRunDate(
        validated.recurring_config.start_date,
        validated.recurring_config.frequency
      )

      const { error: recError } = await supabase
        .from('recurring_expenses')
        .insert({
          name: validated.recurring_config.name,
          amount: validated.amount,
          category_id: validated.category_id,
          vendor_name: validated.vendor_name || null,
          description: validated.description,
          payment_method: validated.payment_method,
          frequency: validated.recurring_config.frequency,
          start_date: validated.recurring_config.start_date,
          end_date: validated.recurring_config.end_date || null,
          next_run_date: nextRun,
          is_active: true,
          last_generated_expense_id: expense.id,
          created_by: user_id
        })

      if (recError) throw recError
    }

    return {
      success: true,
      data: {
        id: expense.id,
        expense_number: expenseNumber
      }
    }
  } catch (err: any) {
    console.error('createExpense error:', err)
    return { success: false, error: err.message || 'Failed to create expense' }
  }
}

export async function getExpenses(filters?: {
  start_date?: string
  end_date?: string
  category_id?: string
  status?: 'draft' | 'posted' | 'voided'
}): Promise<ActionResult<Expense[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(*)
      `)
      .order('expense_date', { ascending: false })

    if (filters?.start_date) {
      query = query.gte('expense_date', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('expense_date', filters.end_date)
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data as Expense[] }
  } catch (err: any) {
    console.error('getExpenses error:', err)
    return { success: false, error: err.message || 'Failed to fetch expenses' }
  }
}

export async function getExpenseById(id: string): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return { success: false, error: 'Expense not found' }

    return { success: true, data: data as Expense }
  } catch (err: any) {
    console.error('getExpenseById error:', err)
    return { success: false, error: err.message || 'Failed to fetch expense' }
  }
}

export async function updateExpense(
  id: string,
  input: z.infer<typeof updateExpenseSchema>
): Promise<ActionResult> {
  try {
    const { user_id, supabase } = await getAuth()
    const validated = updateExpenseSchema.parse(input)

    // Check if user owns this expense
    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('created_by, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Expense not found' }
    }

    if (existing.created_by !== user_id) {
      return { success: false, error: 'You can only edit your own expenses' }
    }

    if (existing.status === 'voided') {
      return { success: false, error: 'Cannot edit a voided expense' }
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('updateExpense error:', err)
    return { success: false, error: err.message || 'Failed to update expense' }
  }
}

export async function voidExpense(id: string): Promise<ActionResult> {
  try {
    const { user_id, supabase } = await getAuth()

    // Check if user owns this expense
    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('created_by, status, journal_entry_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Expense not found' }
    }

    if (existing.created_by !== user_id) {
      return { success: false, error: 'You can only void your own expenses' }
    }

    if (existing.status === 'voided') {
      return { success: false, error: 'Expense is already voided' }
    }

    // Void the expense
    const { error: voidError } = await supabase
      .from('expenses')
      .update({
        status: 'voided',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (voidError) throw voidError

    // Void the journal entry
    if (existing.journal_entry_id) {
      await supabase
        .from('journal_entries')
        .update({
          status: 'voided',
          voided_at: new Date().toISOString()
        })
        .eq('id', existing.journal_entry_id)
    }

    return { success: true }
  } catch (err: any) {
    console.error('voidExpense error:', err)
    return { success: false, error: err.message || 'Failed to void expense' }
  }
}

// =====================================================
// RECURRING EXPENSE ACTIONS
// =====================================================
export async function getRecurringExpenses(): Promise<ActionResult<RecurringExpense[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('recurring_expenses')
      .select(`
        *,
        category:expense_categories(*)
      `)
      .order('next_run_date', { ascending: true })

    if (error) throw error

    return { success: true, data: data as RecurringExpense[] }
  } catch (err: any) {
    console.error('getRecurringExpenses error:', err)
    return { success: false, error: err.message || 'Failed to fetch recurring expenses' }
  }
}

export async function toggleRecurringExpense(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const { user_id, supabase } = await getAuth()

    const { data: existing, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Recurring expense not found' }
    }

    if (existing.created_by !== user_id) {
      return { success: false, error: 'You can only modify your own recurring expenses' }
    }

    const { error: updateError } = await supabase
      .from('recurring_expenses')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('toggleRecurringExpense error:', err)
    return { success: false, error: err.message || 'Failed to toggle recurring expense' }
  }
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult> {
  try {
    const { user_id, supabase } = await getAuth()

    const { data: existing, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Recurring expense not found' }
    }

    if (existing.created_by !== user_id) {
      return { success: false, error: 'You can only delete your own recurring expenses' }
    }

    const { error: deleteError } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return { success: true }
  } catch (err: any) {
    console.error('deleteRecurringExpense error:', err)
    return { success: false, error: err.message || 'Failed to delete recurring expense' }
  }
}
