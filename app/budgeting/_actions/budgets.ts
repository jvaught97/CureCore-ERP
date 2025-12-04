'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type Budget = {
  id: string
  name: string
  fiscal_year: number
  status: 'draft' | 'active' | 'archived'
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type BudgetLine = {
  id: string
  budget_id: string
  department: 'R&D' | 'Production' | 'Marketing' | 'Distribution' | 'Admin' | 'Other'
  category: 'Labor' | 'Ingredients' | 'Packaging' | 'Marketing' | 'Equipment' | 'Overhead' | 'Other'
  product_line: string | null
  month: string
  amount: number
  notes: string | null
  created_at: string
}

export type BudgetWithLines = Budget & {
  budget_lines: BudgetLine[]
}

export async function fetchBudgets(): Promise<Budget[]> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return [
      {
        id: 'demo-budget',
        name: 'FY25 Operating Plan',
        fiscal_year: new Date().getFullYear(),
        status: 'draft',
        notes: 'Demo dataset for budgeting module',
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('fiscal_year', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchBudgetWithLines(id: string): Promise<BudgetWithLines | null> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return {
      id,
      name: 'FY25 Operating Plan',
      fiscal_year: new Date().getFullYear(),
      status: 'draft',
      notes: 'Demo dataset for budgeting module',
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      budget_lines: [
        {
          id: 'demo-line-1',
          budget_id: id,
          department: 'Marketing',
          category: 'Marketing',
          product_line: 'Retail Launch',
          month: `${new Date().getFullYear()}-01-01`,
          amount: 25000,
          notes: 'Paid media + creator kits',
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-line-2',
          budget_id: id,
          department: 'R&D',
          category: 'Labor',
          product_line: 'Serum Refresh',
          month: `${new Date().getFullYear()}-02-01`,
          amount: 12000,
          notes: 'Formulation + stability testing',
          created_at: new Date().toISOString(),
        },
      ],
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budgets')
    .select(`
      *,
      budget_lines (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createBudget(
  name: string,
  fiscal_year: number,
  notes: string | null
): Promise<Budget> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return {
      id: `demo-budget-${Date.now()}`,
      name,
      fiscal_year,
      notes,
      status: 'draft',
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      name,
      fiscal_year,
      notes,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/budgeting')
  return data
}

export async function updateBudget(
  id: string,
  updates: {
    name?: string
    fiscal_year?: number
    status?: 'draft' | 'active' | 'archived'
    notes?: string | null
  }
): Promise<Budget> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return {
      id,
      name: updates.name ?? 'Demo Budget',
      fiscal_year: updates.fiscal_year ?? new Date().getFullYear(),
      status: updates.status ?? 'draft',
      notes: updates.notes ?? null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budgets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/budgeting')
  return data
}

export async function deleteBudget(id: string): Promise<void> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return
  }

  const supabase = await createClient()
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/budgeting')
}

export async function createBudgetLine(line: {
  budget_id: string
  department: string
  category: string
  product_line?: string | null
  month: string
  amount: number
  notes?: string | null
}): Promise<BudgetLine> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return {
      id: `demo-line-${Date.now()}`,
      budget_id: line.budget_id,
      department: line.department as BudgetLine['department'],
      category: line.category as BudgetLine['category'],
      product_line: line.product_line ?? null,
      month: line.month,
      amount: line.amount,
      notes: line.notes ?? null,
      created_at: new Date().toISOString(),
    }
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_lines')
    .insert(line)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/budgeting')
  return data
}

export async function updateBudgetLine(
  id: string,
  updates: {
    department?: string
    category?: string
    product_line?: string | null
    month?: string
    amount?: number
    notes?: string | null
  }
): Promise<BudgetLine> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return {
      id,
      budget_id: 'demo-budget',
      department: (updates.department ?? 'Marketing') as BudgetLine['department'],
      category: (updates.category ?? 'Marketing') as BudgetLine['category'],
      product_line: updates.product_line ?? null,
      month: updates.month ?? `${new Date().getFullYear()}-01-01`,
      amount: updates.amount ?? 0,
      notes: updates.notes ?? null,
      created_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_lines')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/budgeting')
  return data
}

export async function deleteBudgetLine(id: string): Promise<void> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    return
  }

  const supabase = await createClient()
  const { error } = await supabase.from('budget_lines').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/budgeting')
}

export async function getBudgetSummary(budget_id: string): Promise<{
  totalByDepartment: Record<string, number>
  totalByCategory: Record<string, number>
  grandTotal: number
}> {
  const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'
  if (bypass) {
    const lines = [
      { department: 'Marketing', category: 'Marketing', amount: 25000 },
      { department: 'R&D', category: 'Labor', amount: 12000 },
      { department: 'Production', category: 'Equipment', amount: 7800 },
    ]
    const totals: Record<string, number> = {}
    const categories: Record<string, number> = {}
    let grand = 0
    lines.forEach((line) => {
      totals[line.department] = (totals[line.department] || 0) + line.amount
      categories[line.category] = (categories[line.category] || 0) + line.amount
      grand += line.amount
    })
    return { totalByDepartment: totals, totalByCategory: categories, grandTotal: grand }
  }

  const supabase = await createClient()
  const { data: lines, error } = await supabase
    .from('budget_lines')
    .select('department, category, amount')
    .eq('budget_id', budget_id)

  if (error) throw error

  const totalByDepartment: Record<string, number> = {}
  const totalByCategory: Record<string, number> = {}
  let grandTotal = 0

  lines?.forEach((line) => {
    totalByDepartment[line.department] = (totalByDepartment[line.department] || 0) + parseFloat(line.amount as any)
    totalByCategory[line.category] = (totalByCategory[line.category] || 0) + parseFloat(line.amount as any)
    grandTotal += parseFloat(line.amount as any)
  })

  return { totalByDepartment, totalByCategory, grandTotal }
}
