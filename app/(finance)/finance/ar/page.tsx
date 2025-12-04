'use client'

import { useEffect, useState, FormEvent } from 'react'
import {
  CreditCard,
  Search,
  DollarSign,
  Eye,
  Download,
  Ban,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  listARInvoices,
  getARInvoice,
  applyPayment,
  voidInvoice,
  getARAging,
  getCustomers,
  getCustomerDetail,
} from './actions'

type Invoice = {
  id: string
  invoice_number: string
  customer: { name: string; email: string }
  date_issued: string
  due_date: string
  amount_total: number
  amount_paid: number
  balance_due: number
  status: 'open' | 'partial' | 'paid' | 'void'
}

type Customer = {
  id: string
  name: string
  email: string
}

export default function AccountsReceivablePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState({
    total_open_balance: 0,
    total_overdue: 0,
    next_30_days: 0,
  })
  const [aging, setAging] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadData()
    loadCustomers()
    loadAging()
  }, [page, search, statusFilter, customerFilter])

  async function loadData() {
    setLoading(true)
    const result = await listARInvoices({
      page,
      limit: 25,
      search: search || undefined,
      status: statusFilter as "void" | "open" | "partial" | "paid" | undefined,
      customer_id: customerFilter || undefined,
    })

    if (result.success && result.data) {
      setInvoices(result.data.invoices)
      setTotal(result.data.total)
      setSummary(result.data.summary)
    }
    setLoading(false)
  }

  async function loadCustomers() {
    const result = await getCustomers()
    if (result.success && result.data) {
      setCustomers(result.data)
    }
  }

  async function loadAging() {
    const result = await getARAging()
    if (result.success && result.data) {
      setAging(result.data)
    }
  }

  async function handleViewInvoice(id: string) {
    const result = await getARInvoice(id)
    if (result.success && result.data) {
      setSelectedInvoice(result.data)
      setShowPaymentModal(true)
    }
  }

  async function handleVoidInvoice(id: string) {
    if (!confirm('Void this invoice? This cannot be undone.')) return

    const result = await voidInvoice({ invoice_id: id })
    if (result.success) {
      showToast('Invoice voided successfully', 'success')
      await loadData()
    } else {
      showToast('error' in result ? result.error : 'Failed to void invoice', 'error')
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      open: 'bg-blue-100 text-blue-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      void: 'bg-gray-100 text-gray-700',
    }
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  function getDaysOverdue(dueDate: string) {
    const due = new Date(dueDate)
    const today = new Date()
    const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  function getOverdueBadge(dueDate: string, status: string) {
    if (status === 'paid' || status === 'void') return null

    const days = getDaysOverdue(dueDate)
    const daysUntilDue = -days

    if (days > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" />
          {days}d overdue
        </span>
      )
    } else if (daysUntilDue <= 7) {
      return (
        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
          Due in {daysUntilDue}d
        </span>
      )
    }

    return null
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-[#174940]" />
          Accounts Receivable
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage customer invoices and payments
        </p>
      </div>

      {/* Summary Widgets */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Total Open Balance</div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.total_open_balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Total Overdue</div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.total_overdue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Next 30 Days</div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.next_30_days.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aging Report */}
      {aging && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Aging Buckets</h3>
          <div className="grid gap-4 sm:grid-cols-5">
            <div>
              <div className="text-xs font-medium text-gray-600">Current</div>
              <div className="text-lg font-semibold text-gray-900">
                ${aging.buckets.current.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">1-30 Days</div>
              <div className="text-lg font-semibold text-gray-900">
                ${aging.buckets['1-30'].toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">31-60 Days</div>
              <div className="text-lg font-semibold text-gray-900">
                ${aging.buckets['31-60'].toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">61-90 Days</div>
              <div className="text-lg font-semibold text-gray-900">
                ${aging.buckets['61-90'].toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">90+ Days</div>
              <div className="text-lg font-semibold text-red-600">
                ${aging.buckets['90+'].toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number or memo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </select>
        <select
          value={customerFilter}
          onChange={(e) => {
            setCustomerFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Issue Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Due Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.customer.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(invoice.date_issued).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-600">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </span>
                        {getOverdueBadge(invoice.due_date, invoice.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                      ${invoice.amount_total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-gray-600">
                      ${invoice.amount_paid.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-gray-900">
                      ${invoice.balance_due.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="View & Apply Payment"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {invoice.status !== 'void' &&
                          invoice.status !== 'paid' &&
                          invoice.amount_paid === 0 && (
                            <button
                              onClick={() => handleVoidInvoice(invoice.id)}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Void Invoice"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} invoices
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedInvoice(null)
          }}
          onSuccess={async () => {
            await loadData()
            await loadAging()
            setShowPaymentModal(false)
            setSelectedInvoice(null)
          }}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

// ─── PAYMENT MODAL ───────────────────────────────────────────────────────────

function PaymentModal({
  invoice,
  onClose,
  onSuccess,
  showToast,
}: {
  invoice: any
  onClose: () => void
  onSuccess: () => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    amount: parseFloat(invoice.balance_due),
    method: 'wire',
    reference: '',
    payment_date: today,
    notes: '',
    create_journal_entry: true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (formData.amount <= 0) {
      showToast('Payment amount must be greater than 0', 'error')
      return
    }

    if (formData.amount > parseFloat(invoice.balance_due)) {
      showToast('Payment amount exceeds balance due', 'error')
      return
    }

    setSaving(true)

    const result = await applyPayment({
      invoice_id: invoice.id,
      ...formData,
    })

    setSaving(false)

    if (result.success) {
      showToast('Payment applied successfully', 'success')
      onSuccess()
    } else {
      showToast('error' in result ? result.error : 'Failed to apply payment', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Invoice Details & Payment
        </h2>

        {/* Invoice Details */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-gray-600">Invoice Number</div>
              <div className="text-sm font-semibold text-gray-900">
                {invoice.invoice_number}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Customer</div>
              <div className="text-sm font-semibold text-gray-900">
                {invoice.customer.name}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Total Amount</div>
              <div className="text-sm font-semibold text-gray-900">
                ${parseFloat(invoice.amount_total).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Amount Paid</div>
              <div className="text-sm font-semibold text-gray-900">
                ${parseFloat(invoice.amount_paid).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Balance Due</div>
              <div className="text-lg font-bold text-[#174940]">
                ${parseFloat(invoice.balance_due).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Due Date</div>
              <div className="text-sm font-semibold text-gray-900">
                {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Payment History</h3>
            <div className="space-y-2">
              {invoice.payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-600">{payment.method}</span>
                    {payment.reference && (
                      <>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-gray-600">{payment.reference}</span>
                      </>
                    )}
                  </div>
                  <div className="text-gray-600">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply Payment Form */}
        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Apply Payment</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  step="0.01"
                  min="0.01"
                  max={parseFloat(invoice.balance_due)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Method *</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="ach">ACH</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reference / Check #
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Optional payment notes"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.create_journal_entry}
                  onChange={(e) =>
                    setFormData({ ...formData, create_journal_entry: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                />
                <span className="text-sm text-gray-700">
                  Create cash receipt journal entry (DR Cash, CR AR)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174940]/90 disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Apply Payment'}
              </button>
            </div>
          </form>
        )}

        {(invoice.status === 'paid' || invoice.status === 'void') && (
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
