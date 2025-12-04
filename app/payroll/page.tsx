'use client'

import { useEffect, useState } from 'react'
import { AppNav } from '@/components/nav/AppNav'
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  fetchTimesheets,
  createTimesheet,
  deleteTimesheet,
  getLaborCostSummary,
  type Employee,
  type Timesheet,
} from './_actions/employees'
import { Plus, Trash2, Eye, Edit, X, Save, Clock } from 'lucide-react'

const DEPARTMENTS = ['R&D', 'Production', 'Marketing', 'Distribution', 'Admin', 'Other'] as const
const PAY_TYPES = ['hourly', 'salary', 'per_batch', 'contractor'] as const

type View = 'employees' | 'timesheets' | 'labor-costs'

export default function PayrollPage() {
  const [view, setView] = useState<View>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [laborCosts, setLaborCosts] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [loading, setLoading] = useState(false)

  // Employee form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formDepartment, setFormDepartment] = useState<string>(DEPARTMENTS[0])
  const [formPayType, setFormPayType] = useState<string>(PAY_TYPES[0])
  const [formRate, setFormRate] = useState('')
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'terminated'>('active')
  const [formHireDate, setFormHireDate] = useState('')
  const [formTerminationDate, setFormTerminationDate] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Timesheet form state
  const [showAddTimesheet, setShowAddTimesheet] = useState(false)
  const [tsEmployeeId, setTsEmployeeId] = useState('')
  const [tsDate, setTsDate] = useState('')
  const [tsHours, setTsHours] = useState('')
  const [tsOvertime, setTsOvertime] = useState('')
  const [tsNotes, setTsNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [view])

  async function loadData() {
    try {
      setLoading(true)
      if (view === 'employees') {
        const data = await fetchEmployees()
        setEmployees(data)
      } else if (view === 'timesheets') {
        const [empData, tsData] = await Promise.all([fetchEmployees(), fetchTimesheets()])
        setEmployees(empData)
        setTimesheets(tsData)
      } else if (view === 'labor-costs') {
        const data = await getLaborCostSummary()
        setLaborCosts(data)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      alert('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function handleNew() {
    setFormName('')
    setFormEmail('')
    setFormRole('')
    setFormDepartment(DEPARTMENTS[0])
    setFormPayType(PAY_TYPES[0])
    setFormRate('')
    setFormStatus('active')
    setFormHireDate('')
    setFormTerminationDate('')
    setFormNotes('')
    setSelectedEmployee(null)
    setMode('form')
  }

  function handleEdit(employee: Employee) {
    setFormName(employee.name)
    setFormEmail(employee.email || '')
    setFormRole(employee.role)
    setFormDepartment(employee.department)
    setFormPayType(employee.pay_type)
    setFormRate(employee.rate.toString())
    setFormStatus(employee.status)
    setFormHireDate(employee.hire_date || '')
    setFormTerminationDate(employee.termination_date || '')
    setFormNotes(employee.notes || '')
    setSelectedEmployee(employee)
    setMode('form')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName || !formRole || !formRate) {
      alert('Please fill in required fields')
      return
    }

    try {
      setLoading(true)
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, {
          name: formName,
          email: formEmail || null,
          role: formRole,
          department: formDepartment as any,
          pay_type: formPayType as any,
          rate: parseFloat(formRate),
          status: formStatus,
          hire_date: formHireDate || null,
          termination_date: formTerminationDate || null,
          notes: formNotes || null,
        })
      } else {
        await createEmployee({
          name: formName,
          email: formEmail || null,
          role: formRole,
          department: formDepartment,
          pay_type: formPayType,
          rate: parseFloat(formRate),
          hire_date: formHireDate || null,
          notes: formNotes || null,
        })
      }
      await loadData()
      setMode('list')
      setSelectedEmployee(null)
    } catch (err) {
      console.error('Failed to save employee:', err)
      alert('Failed to save employee')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(employee: Employee) {
    const confirmed = window.confirm(
      `Are you sure you want to delete employee "${employee.name}"? This will also delete all associated timesheets. This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      setLoading(true)
      await deleteEmployee(employee.id)
      await loadData()
      if (selectedEmployee?.id === employee.id) {
        setMode('list')
        setSelectedEmployee(null)
      }
    } catch (err) {
      console.error('Failed to delete employee:', err)
      alert('Failed to delete employee')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTimesheet() {
    if (!tsEmployeeId || !tsDate || !tsHours) {
      alert('Please fill in employee, date, and hours')
      return
    }

    try {
      setLoading(true)
      await createTimesheet({
        employee_id: tsEmployeeId,
        date: tsDate,
        hours_worked: parseFloat(tsHours),
        overtime_hours: parseFloat(tsOvertime) || 0,
        notes: tsNotes || null,
      })
      await loadData()
      setShowAddTimesheet(false)
      setTsEmployeeId('')
      setTsDate('')
      setTsHours('')
      setTsOvertime('')
      setTsNotes('')
    } catch (err) {
      console.error('Failed to add timesheet:', err)
      alert('Failed to add timesheet')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTimesheet(timesheet: Timesheet) {
    const confirmed = window.confirm('Delete this timesheet entry?')
    if (!confirmed) return

    try {
      setLoading(true)
      await deleteTimesheet(timesheet.id)
      await loadData()
    } catch (err) {
      console.error('Failed to delete timesheet:', err)
      alert('Failed to delete timesheet')
    } finally {
      setLoading(false)
    }
  }

  function getEmployeeName(employeeId: string): string {
    return employees.find((e) => e.id === employeeId)?.name || 'Unknown'
  }

  return (
    <>
      <AppNav currentPage="payroll" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          {view === 'employees' && mode === 'list' && (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-white hover:bg-[#1a5c50]"
            >
              <Plus className="h-5 w-5" />
              New Employee
            </button>
          )}
          {view === 'employees' && mode === 'form' && (
            <button
              onClick={() => {
                setMode('list')
                setSelectedEmployee(null)
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <X className="h-5 w-5" />
              Back to List
            </button>
          )}
          {view === 'timesheets' && (
            <button
              onClick={() => setShowAddTimesheet(!showAddTimesheet)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Timesheet
            </button>
          )}
        </div>

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => {
              setView('employees')
              setMode('list')
            }}
            className={`px-4 py-2 text-sm font-semibold ${
              view === 'employees'
                ? 'border-b-2 border-[#174940] text-[#174940]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setView('timesheets')}
            className={`px-4 py-2 text-sm font-semibold ${
              view === 'timesheets'
                ? 'border-b-2 border-[#174940] text-[#174940]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Timesheets
          </button>
          <button
            onClick={() => setView('labor-costs')}
            className={`px-4 py-2 text-sm font-semibold ${
              view === 'labor-costs'
                ? 'border-b-2 border-[#174940] text-[#174940]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Labor Costs
          </button>
        </div>

        {view === 'employees' && mode === 'list' && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading && employees.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No employees yet. Click "New Employee" to add one.
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Pay Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rate</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{employee.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.pay_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${employee.rate.toFixed(2)}
                        {employee.pay_type === 'hourly' ? '/hr' : employee.pay_type === 'salary' ? '/yr' : ''}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            employee.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : employee.status === 'inactive'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="rounded p-1 text-gray-600 hover:bg-gray-50"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {view === 'employees' && mode === 'form' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {selectedEmployee ? 'Edit Employee' : 'New Employee'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Role *</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Department *</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Pay Type *</label>
                  <select
                    value={formPayType}
                    onChange={(e) => setFormPayType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  >
                    {PAY_TYPES.map((p) => (
                      <option key={p} value={p}>
                        {p === 'per_batch' ? 'per batch' : p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Rate * {formPayType === 'hourly' ? '($/hr)' : formPayType === 'salary' ? '($/yr)' : '($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Hire Date</label>
                  <input
                    type="date"
                    value={formHireDate}
                    onChange={(e) => setFormHireDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Termination Date</label>
                  <input
                    type="date"
                    value={formTerminationDate}
                    onChange={(e) => setFormTerminationDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-white hover:bg-[#1a5c50] disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  Save Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('list')
                    setSelectedEmployee(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'timesheets' && (
          <div className="space-y-4">
            {showAddTimesheet && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Add Timesheet Entry</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-900">Employee</label>
                    <select
                      value={tsEmployeeId}
                      onChange={(e) => setTsEmployeeId(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                      required
                    >
                      <option value="">Select employee...</option>
                      {employees
                        .filter((e) => e.status === 'active')
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-900">Date</label>
                    <input
                      type="date"
                      value={tsDate}
                      onChange={(e) => setTsDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-900">Regular Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tsHours}
                      onChange={(e) => setTsHours(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-900">Overtime Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tsOvertime}
                      onChange={(e) => setTsOvertime(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-900">Notes</label>
                    <input
                      type="text"
                      value={tsNotes}
                      onChange={(e) => setTsNotes(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleAddTimesheet}
                    disabled={loading}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddTimesheet(false)}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {loading && timesheets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : timesheets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No timesheet entries yet. Click "Add Timesheet" to create one.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Regular Hours</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Overtime</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Approved</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {timesheets.map((ts) => (
                      <tr key={ts.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{getEmployeeName(ts.employee_id)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(ts.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ts.hours_worked.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ts.overtime_hours.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              ts.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {ts.approved ? 'Yes' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteTimesheet(ts)}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {view === 'labor-costs' && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading && laborCosts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : laborCosts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No labor cost data available yet. Add employees and timesheets to see cost analysis.
              </div>
            ) : (
              <>
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Labor Cost Summary (Current Month)
                  </h3>
                </div>
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Pay Type</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total Hours</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Overtime</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {laborCosts.map((cost) => (
                      <tr key={cost.employee_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cost.employee_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cost.department}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cost.pay_type}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {parseFloat(cost.total_hours).toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {parseFloat(cost.total_overtime).toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          ${parseFloat(cost.estimated_cost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Total Estimated Cost:
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        ${laborCosts.reduce((sum, c) => sum + parseFloat(c.estimated_cost), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        )}
      </main>
    </>
  )
}
