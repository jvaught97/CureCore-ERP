'use client'

import { useEffect, useState } from 'react'
import { AppNav } from '@/components/nav/AppNav'
import {
  fetchBudgets,
  fetchBudgetWithLines,
  createBudget,
  updateBudget,
  deleteBudget,
  createBudgetLine,
  updateBudgetLine,
  deleteBudgetLine,
  getBudgetSummary,
  type Budget,
  type BudgetLine,
  type BudgetWithLines,
} from './_actions/budgets'
import { Plus, Trash2, Eye, Edit, X, Save } from 'lucide-react'

const DEPARTMENTS = ['R&D', 'Production', 'Marketing', 'Distribution', 'Admin', 'Other'] as const
const CATEGORIES = ['Labor', 'Ingredients', 'Packaging', 'Marketing', 'Equipment', 'Overhead', 'Other'] as const

export default function BudgetingPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithLines | null>(null)
  const [mode, setMode] = useState<'list' | 'view' | 'edit'>('list')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{
    totalByDepartment: Record<string, number>
    totalByCategory: Record<string, number>
    grandTotal: number
  } | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formFiscalYear, setFormFiscalYear] = useState(new Date().getFullYear())
  const [formStatus, setFormStatus] = useState<'draft' | 'active' | 'archived'>('draft')
  const [formNotes, setFormNotes] = useState('')

  // Budget line form state
  const [showAddLine, setShowAddLine] = useState(false)
  const [lineDepartment, setLineDepartment] = useState<string>(DEPARTMENTS[0])
  const [lineCategory, setLineCategory] = useState<string>(CATEGORIES[0])
  const [lineProductLine, setLineProductLine] = useState('')
  const [lineMonth, setLineMonth] = useState('')
  const [lineAmount, setLineAmount] = useState('')
  const [lineNotes, setLineNotes] = useState('')

  useEffect(() => {
    loadBudgets()
  }, [])

  async function loadBudgets() {
    try {
      setLoading(true)
      const data = await fetchBudgets()
      setBudgets(data)
    } catch (err) {
      console.error('Failed to load budgets:', err)
      alert('Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  async function loadBudgetDetails(id: string) {
    try {
      setLoading(true)
      const data = await fetchBudgetWithLines(id)
      setSelectedBudget(data)
      if (data) {
        const summaryData = await getBudgetSummary(id)
        setSummary(summaryData)
      }
    } catch (err) {
      console.error('Failed to load budget details:', err)
      alert('Failed to load budget details')
    } finally {
      setLoading(false)
    }
  }

  function handleView(budget: Budget) {
    setSelectedBudget(null)
    setSummary(null)
    loadBudgetDetails(budget.id)
    setMode('view')
  }

  function handleEdit(budget: Budget) {
    setFormName(budget.name)
    setFormFiscalYear(budget.fiscal_year)
    setFormStatus(budget.status)
    setFormNotes(budget.notes || '')
    setSelectedBudget(null)
    setSummary(null)
    loadBudgetDetails(budget.id)
    setMode('edit')
  }

  function handleNew() {
    setFormName('')
    setFormFiscalYear(new Date().getFullYear())
    setFormStatus('draft')
    setFormNotes('')
    setSelectedBudget(null)
    setSummary(null)
    setMode('edit')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      if (selectedBudget) {
        await updateBudget(selectedBudget.id, {
          name: formName,
          fiscal_year: formFiscalYear,
          status: formStatus,
          notes: formNotes || null,
        })
      } else {
        await createBudget(formName, formFiscalYear, formNotes || null)
      }
      await loadBudgets()
      setMode('list')
      setSelectedBudget(null)
    } catch (err) {
      console.error('Failed to save budget:', err)
      alert('Failed to save budget')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(budget: Budget) {
    const confirmed = window.confirm(
      `Are you sure you want to delete budget "${budget.name}"? This will also delete all budget lines. This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      setLoading(true)
      await deleteBudget(budget.id)
      await loadBudgets()
      if (selectedBudget?.id === budget.id) {
        setMode('list')
        setSelectedBudget(null)
      }
    } catch (err) {
      console.error('Failed to delete budget:', err)
      alert('Failed to delete budget')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddLine() {
    if (!selectedBudget) return
    if (!lineMonth || !lineAmount) {
      alert('Please fill in month and amount')
      return
    }

    try {
      setLoading(true)
      await createBudgetLine({
        budget_id: selectedBudget.id,
        department: lineDepartment,
        category: lineCategory,
        product_line: lineProductLine || null,
        month: lineMonth,
        amount: parseFloat(lineAmount),
        notes: lineNotes || null,
      })
      await loadBudgetDetails(selectedBudget.id)
      setShowAddLine(false)
      setLineDepartment(DEPARTMENTS[0])
      setLineCategory(CATEGORIES[0])
      setLineProductLine('')
      setLineMonth('')
      setLineAmount('')
      setLineNotes('')
    } catch (err) {
      console.error('Failed to add budget line:', err)
      alert('Failed to add budget line')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteLine(line: BudgetLine) {
    if (!selectedBudget) return
    const confirmed = window.confirm('Delete this budget line?')
    if (!confirmed) return

    try {
      setLoading(true)
      await deleteBudgetLine(line.id)
      await loadBudgetDetails(selectedBudget.id)
    } catch (err) {
      console.error('Failed to delete line:', err)
      alert('Failed to delete line')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AppNav currentPage="budgeting" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Budgeting</h1>
          {mode === 'list' && (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-white hover:bg-[#1a5c50]"
            >
              <Plus className="h-5 w-5" />
              New Budget
            </button>
          )}
          {mode !== 'list' && (
            <button
              onClick={() => {
                setMode('list')
                setSelectedBudget(null)
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <X className="h-5 w-5" />
              Back to List
            </button>
          )}
        </div>

        {mode === 'list' && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading && budgets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : budgets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No budgets yet. Click "New Budget" to create one.
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fiscal Year</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {budgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{budget.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{budget.fiscal_year}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            budget.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : budget.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {budget.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(budget.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(budget)}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50"
                            title="View"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(budget)}
                            className="rounded p-1 text-gray-600 hover:bg-gray-50"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(budget)}
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

        {mode === 'edit' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {selectedBudget ? 'Edit Budget' : 'New Budget'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">Budget Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Fiscal Year</label>
                  <input
                    type="number"
                    value={formFiscalYear}
                    onChange={(e) => setFormFiscalYear(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'draft' | 'active' | 'archived')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
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
                  Save Budget
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('list')
                    setSelectedBudget(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>

            {selectedBudget && (
              <div className="mt-8 border-t pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Budget Lines</h3>
                  <button
                    onClick={() => setShowAddLine(!showAddLine)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Line
                  </button>
                </div>

                {showAddLine && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">New Budget Line</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-900">Department</label>
                        <select
                          value={lineDepartment}
                          onChange={(e) => setLineDepartment(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-900">Category</label>
                        <select
                          value={lineCategory}
                          onChange={(e) => setLineCategory(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-900">Product Line (optional)</label>
                        <input
                          type="text"
                          value={lineProductLine}
                          onChange={(e) => setLineProductLine(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-900">Month</label>
                        <input
                          type="month"
                          value={lineMonth}
                          onChange={(e) => setLineMonth(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-900">Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={lineAmount}
                          onChange={(e) => setLineAmount(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-900">Notes (optional)</label>
                        <input
                          type="text"
                          value={lineNotes}
                          onChange={(e) => setLineNotes(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleAddLine}
                        disabled={loading}
                        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddLine(false)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {selectedBudget.budget_lines.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No budget lines yet. Click "Add Line" to create one.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-900">Month</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-900">Department</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-900">Category</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-900">Product Line</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-900">Amount</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBudget.budget_lines.map((line) => (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">
                              {new Date(line.month).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                              })}
                            </td>
                            <td className="px-3 py-2 text-gray-900">{line.department}</td>
                            <td className="px-3 py-2 text-gray-900">{line.category}</td>
                            <td className="px-3 py-2 text-gray-500">{line.product_line || '-'}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              ${parseFloat(line.amount as any).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleDeleteLine(line)}
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'view' && selectedBudget && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedBudget.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(selectedBudget)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedBudget)}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Fiscal Year:</span>{' '}
                  <span className="text-gray-900">{selectedBudget.fiscal_year}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>{' '}
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedBudget.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : selectedBudget.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedBudget.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created:</span>{' '}
                  <span className="text-gray-900">
                    {new Date(selectedBudget.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {selectedBudget.notes && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="mt-1 text-sm text-gray-600">{selectedBudget.notes}</p>
                </div>
              )}
            </div>

            {summary && (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Total Budget</h3>
                  <p className="text-2xl font-bold text-gray-900">${summary.grandTotal.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">By Department</h3>
                  <div className="space-y-1 text-xs">
                    {Object.entries(summary.totalByDepartment).map(([dept, total]) => (
                      <div key={dept} className="flex justify-between">
                        <span className="text-gray-600">{dept}:</span>
                        <span className="font-medium text-gray-900">${total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">By Category</h3>
                  <div className="space-y-1 text-xs">
                    {Object.entries(summary.totalByCategory).map(([cat, total]) => (
                      <div key={cat} className="flex justify-between">
                        <span className="text-gray-600">{cat}:</span>
                        <span className="font-medium text-gray-900">${total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Budget Lines</h3>
              {selectedBudget.budget_lines.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No budget lines yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Month</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Department</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Product Line</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedBudget.budget_lines.map((line) => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            {new Date(line.month).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-900">{line.department}</td>
                          <td className="px-4 py-3 text-gray-900">{line.category}</td>
                          <td className="px-4 py-3 text-gray-500">{line.product_line || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            ${parseFloat(line.amount as any).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
