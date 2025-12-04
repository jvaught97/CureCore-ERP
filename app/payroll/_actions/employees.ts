'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const BYPASS =
  (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ??
    process.env.SUPABASE_BYPASS_AUTH ??
    'true') === 'true'

const demoEmployees: Employee[] = [
  {
    id: 'demo-emp-1',
    name: 'Jordan Lee',
    email: 'jordan@curecore.demo',
    role: 'Production Lead',
    department: 'Production',
    pay_type: 'salary',
    rate: 72000,
    status: 'active',
    hire_date: '2023-04-01',
    termination_date: null,
    notes: 'Oversees batching + packaging',
    created_by: 'demo-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-emp-2',
    name: 'Mia Patel',
    email: 'mia@curecore.demo',
    role: 'R&D Chemist',
    department: 'R&D',
    pay_type: 'salary',
    rate: 85000,
    status: 'active',
    hire_date: '2022-08-15',
    termination_date: null,
    notes: 'Formulation + stability',
    created_by: 'demo-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const demoTimesheets: Timesheet[] = [
  {
    id: 'demo-ts-1',
    employee_id: 'demo-emp-1',
    date: new Date().toISOString(),
    hours_worked: 8,
    overtime_hours: 1,
    batch_id: null,
    notes: 'Batch BCH-2418 ramp',
    approved: true,
    approved_by: 'demo-user',
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-ts-2',
    employee_id: 'demo-emp-2',
    date: new Date().toISOString(),
    hours_worked: 7.5,
    overtime_hours: 0,
    batch_id: null,
    notes: 'Serum reformulation lab',
    approved: false,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  },
]

export type Employee = {
  id: string
  name: string
  email: string | null
  role: string
  department: 'R&D' | 'Production' | 'Marketing' | 'Distribution' | 'Admin' | 'Other'
  pay_type: 'hourly' | 'salary' | 'per_batch' | 'contractor'
  rate: number
  status: 'active' | 'inactive' | 'terminated'
  hire_date: string | null
  termination_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Timesheet = {
  id: string
  employee_id: string
  date: string
  hours_worked: number
  overtime_hours: number
  batch_id: string | null
  notes: string | null
  approved: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export type PayrollPeriod = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'processing' | 'closed' | 'exported'
  total_hours: number
  total_overtime_hours: number
  total_gross_pay: number
  notes: string | null
  closed_by: string | null
  closed_at: string | null
  exported_by: string | null
  exported_at: string | null
  created_by: string
  created_at: string
}

export type PayrollEntry = {
  id: string
  payroll_period_id: string
  employee_id: string
  regular_hours: number
  overtime_hours: number
  gross_pay: number
  deductions: number
  net_pay: number
  notes: string | null
  created_at: string
}

export async function fetchEmployees(): Promise<Employee[]> {
  if (BYPASS) return demoEmployees

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchActiveEmployees(): Promise<Employee[]> {
  if (BYPASS) return demoEmployees.filter((emp) => emp.status === 'active')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createEmployee(employee: {
  name: string
  email?: string | null
  role: string
  department: string
  pay_type: string
  rate: number
  hire_date?: string | null
  notes?: string | null
}): Promise<Employee> {
  if (BYPASS) {
    return {
      id: `demo-emp-${Date.now()}`,
      name: employee.name,
      email: employee.email ?? null,
      role: employee.role,
      department: employee.department as Employee['department'],
      pay_type: employee.pay_type as Employee['pay_type'],
      rate: employee.rate,
      status: 'active',
      hire_date: employee.hire_date ?? null,
      termination_date: null,
      notes: employee.notes ?? null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...employee,
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/payroll')
  return data
}

export async function updateEmployee(
  id: string,
  updates: {
    name?: string
    email?: string | null
    role?: string
    department?: string
    pay_type?: string
    rate?: number
    status?: 'active' | 'inactive' | 'terminated'
    hire_date?: string | null
    termination_date?: string | null
    notes?: string | null
  }
): Promise<Employee> {
  if (BYPASS) {
    return {
      id,
      name: updates.name ?? 'Demo Employee',
      email: updates.email ?? null,
      role: updates.role ?? 'Role',
      department: (updates.department ?? 'Production') as Employee['department'],
      pay_type: (updates.pay_type ?? 'hourly') as Employee['pay_type'],
      rate: updates.rate ?? 0,
      status: updates.status ?? 'active',
      hire_date: updates.hire_date ?? null,
      termination_date: updates.termination_date ?? null,
      notes: updates.notes ?? null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/payroll')
  return data
}

export async function deleteEmployee(id: string): Promise<void> {
  if (BYPASS) {
    return
  }

  const supabase = await createClient()
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/payroll')
}

export async function fetchTimesheets(employeeId?: string): Promise<Timesheet[]> {
  if (BYPASS) {
    if (!employeeId) return demoTimesheets
    return demoTimesheets.filter((ts) => ts.employee_id === employeeId)
  }

  const supabase = await createClient()
  let query = supabase
    .from('timesheets')
    .select('*')
    .order('date', { ascending: false })

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createTimesheet(timesheet: {
  employee_id: string
  date: string
  hours_worked: number
  overtime_hours?: number
  batch_id?: string | null
  notes?: string | null
}): Promise<Timesheet> {
  if (BYPASS) {
    return {
      id: `demo-ts-${Date.now()}`,
      employee_id: timesheet.employee_id,
      date: timesheet.date,
      hours_worked: timesheet.hours_worked,
      overtime_hours: timesheet.overtime_hours ?? 0,
      batch_id: timesheet.batch_id ?? null,
      notes: timesheet.notes ?? null,
      approved: false,
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('timesheets')
    .insert({
      ...timesheet,
      overtime_hours: timesheet.overtime_hours || 0,
      approved: false,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/payroll')
  return data
}

export async function updateTimesheet(
  id: string,
  updates: {
    date?: string
    hours_worked?: number
    overtime_hours?: number
    batch_id?: string | null
    notes?: string | null
    approved?: boolean
  }
): Promise<Timesheet> {
  if (BYPASS) {
    return {
      id,
      employee_id: 'demo-emp-1',
      date: updates.date ?? new Date().toISOString(),
      hours_worked: updates.hours_worked ?? 8,
      overtime_hours: updates.overtime_hours ?? 0,
      batch_id: updates.batch_id ?? null,
      notes: updates.notes ?? null,
      approved: updates.approved ?? false,
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const updateData: Record<string, unknown> = { ...updates }
  if (updates.approved && user) {
    updateData.approved_by = user.id
    updateData.approved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('timesheets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/payroll')
  return data
}

export async function deleteTimesheet(id: string): Promise<void> {
  if (BYPASS) {
    return
  }

  const supabase = await createClient()
  const { error } = await supabase.from('timesheets').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/payroll')
}

export async function fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
  if (BYPASS) {
    return [
      {
        id: 'demo-period',
        name: 'Jan 1 - Jan 15',
        start_date: '2025-01-01',
        end_date: '2025-01-15',
        status: 'closed',
        total_hours: 320,
        total_overtime_hours: 24,
        total_gross_pay: 18500,
        notes: null,
        closed_by: 'demo-user',
        closed_at: new Date().toISOString(),
        exported_by: null,
        exported_at: null,
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
      },
    ]
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createPayrollPeriod(period: {
  name: string
  start_date: string
  end_date: string
  notes?: string | null
}): Promise<PayrollPeriod> {
  if (BYPASS) {
    return {
      id: `demo-period-${Date.now()}`,
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      status: 'open',
      total_hours: 0,
      total_overtime_hours: 0,
      total_gross_pay: 0,
      notes: period.notes ?? null,
      closed_by: null,
      closed_at: null,
      exported_by: null,
      exported_at: null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      ...period,
      status: 'open',
      total_hours: 0,
      total_overtime_hours: 0,
      total_gross_pay: 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/payroll')
  return data
}

export async function updatePayrollPeriod(
  id: string,
  updates: {
    name?: string
    start_date?: string
    end_date?: string
    status?: 'open' | 'processing' | 'closed' | 'exported'
    notes?: string | null
  }
): Promise<PayrollPeriod> {
  if (BYPASS) {
    return {
      id,
      name: updates.name ?? 'Demo Period',
      start_date: updates.start_date ?? '2025-01-01',
      end_date: updates.end_date ?? '2025-01-15',
      status: updates.status ?? 'open',
      total_hours: 0,
      total_overtime_hours: 0,
      total_gross_pay: 0,
      notes: updates.notes ?? null,
      closed_by: null,
      closed_at: null,
      exported_by: null,
      exported_at: null,
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payroll_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/payroll')
  return data
}

export async function deletePayrollPeriod(id: string): Promise<void> {
  if (BYPASS) return

  const supabase = await createClient()
  const { error } = await supabase.from('payroll_periods').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/payroll')
}

type LaborCostSummaryRow = {
  employee_id: string
  employee_name: string
  department: string
  pay_type: string
  total_hours: number
  total_overtime: number
  estimated_cost: number
}

export async function getLaborCostSummary(): Promise<LaborCostSummaryRow[]> {
  if (BYPASS) {
    return [
      {
        employee_id: 'demo-emp-1',
        employee_name: 'Jordan Lee',
        department: 'Production',
        pay_type: 'salary',
        total_hours: 82,
        total_overtime: 6,
        estimated_cost: 3850,
      },
      {
        employee_id: 'demo-emp-2',
        employee_name: 'Mia Patel',
        department: 'R&D',
        pay_type: 'salary',
        total_hours: 76,
        total_overtime: 2,
        estimated_cost: 4200,
      },
    ]
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('labor_cost_summary')
    .select('*')
    .order('estimated_cost', { ascending: false })

  if (error) throw error
  return data || []
}
