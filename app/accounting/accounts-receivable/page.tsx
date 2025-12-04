'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Download, Eye, CreditCard } from 'lucide-react'
import { fetchInvoices, fetchARAgingReport } from '../_actions/invoices'
import { InvoiceWithLines, ARAgingEntry, InvoiceStatus, AgingBucket } from '@/types/accounting'

export default function AccountsReceivablePage() {
  const [invoices, setInvoices] = useState<InvoiceWithLines[]>([])
  const [agingReport, setAgingReport] = useState<ARAgingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all')
  const [view, setView] = useState<'invoices' | 'aging'>('invoices')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [invoicesData, agingData] = await Promise.all([
        fetchInvoices({ invoice_type: 'receivable' }),
        fetchARAgingReport(),
      ])

      setInvoices(invoicesData)
      setAgingReport(agingData)
    } catch (error) {
      console.error('Error loading AR data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const totalAR = invoices.reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0)
  const overdueAR = agingReport
    .filter(entry => entry.days_overdue > 0)
    .reduce((sum, entry) => sum + entry.balance, 0)

  const agingBuckets = agingReport.reduce((buckets, entry) => {
    const bucket = entry.aging_bucket
    if (!buckets[bucket]) {
      buckets[bucket] = []
    }
    buckets[bucket].push(entry)
    return buckets
  }, {} as Record<AgingBucket, ARAgingEntry[]>)

  const bucketOrder: AgingBucket[] = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days']

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading accounts receivable...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable</h1>
          <p className="mt-1 text-sm text-gray-500">Manage customer invoices and payments</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-white transition hover:bg-[#1a5a4d]">
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total AR</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalAR)}</p>
          <p className="mt-1 text-xs text-gray-500">{invoices.length} invoices</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Current (Not Due)</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(agingBuckets['Current']?.reduce((sum, e) => sum + e.balance, 0) || 0)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {agingBuckets['Current']?.length || 0} invoices
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Overdue</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(overdueAR)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {agingReport.filter(e => e.days_overdue > 0).length} invoices
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-fit">
        <button
          onClick={() => setView('invoices')}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            view === 'invoices'
              ? 'bg-[#174940] text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setView('aging')}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            view === 'aging'
              ? 'bg-[#174940] text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Aging Report
        </button>
      </div>

      {view === 'invoices' ? (
        <>
          {/* Filters */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
                  />
                </div>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>

              <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const balance = invoice.total_amount - invoice.amount_paid
                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {invoice.customer?.name || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : invoice.status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                title="View Invoice"
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {balance > 0 && (
                                <button
                                  title="Record Payment"
                                  className="rounded p-1 text-green-400 hover:bg-green-100 hover:text-green-600"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Aging Report */}
          <div className="space-y-4">
            {bucketOrder.map((bucket) => {
              const entries = agingBuckets[bucket] || []
              const totalAmount = entries.reduce((sum, e) => sum + e.balance, 0)

              if (entries.length === 0) return null

              return (
                <div key={bucket} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">{bucket}</h2>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Invoice #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                            Days Overdue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {entries.map((entry) => (
                          <tr key={entry.invoice_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {entry.invoice_number}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {entry.customer_name || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(entry.due_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-500">
                              {entry.days_overdue > 0 ? entry.days_overdue : '—'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(entry.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
