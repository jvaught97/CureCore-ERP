'use client'

import { useEffect, useState, FormEvent, ReactNode } from 'react'
import {
  Wallet,
  CalendarClock,
  AlertTriangle,
  Search,
  Eye,
  Ban,
  CheckCircle2,
  Loader2,
  Plus,
} from 'lucide-react'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import {
  listAPBills,
  getAPBill,
  createAPBill,
  scheduleAPPayment,
  recordAPPayment,
  voidAPBill,
  getAPAging,
  getVendors,
} from './actions'
import { APBill, APBillWithDetails, Vendor } from '@/types/accounting'

type BillStatus = 'draft' | 'open' | 'scheduled' | 'paid' | 'void'

type BillListItem = APBill & { vendor: { name: string; email?: string } | null }
type VendorOption = Pick<Vendor, 'id' | 'name' | 'email'>
type BillSummary = {
  total_open_balance: number
  total_overdue: number
  scheduled_this_month: number
}
type AgingBuckets = {
  current: number
  '1-30': number
  '31-60': number
  '61-90': number
  '90+': number
}

export default function AccountsPayablePage() {
  const [bills, setBills] = useState<BillListItem[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<BillSummary>({
    total_open_balance: 0,
    total_overdue: 0,
    scheduled_this_month: 0,
  })
  const [agingBuckets, setAgingBuckets] = useState<AgingBuckets | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [vendorFilter, setVendorFilter] = useState<string>('')
  const [showBillModal, setShowBillModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<APBillWithDetails | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { toasts, showToast, dismissToast } = useToast()

  const triggerReload = () => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      const billsResult = await listAPBills({
        page,
        limit: 25,
        search: search || undefined,
        status: (statusFilter || undefined) as BillStatus | undefined,
        vendor_id: vendorFilter || undefined,
      })

      if (isMounted && billsResult.success && billsResult.data) {
        const mappedBills: BillListItem[] = (billsResult.data.bills ?? []).map((bill) => {
          const candidate = bill as BillListItem & {
            amount_total?: number | string
            amount_paid?: number | string
            balance_due?: number | string
            scheduled_payment_date?: string | null
            memo?: string | null
          }

          return {
            ...candidate,
            amount_total: Number(candidate.amount_total ?? 0),
            amount_paid: Number(candidate.amount_paid ?? 0),
            balance_due: Number(candidate.balance_due ?? 0),
            scheduled_payment_date: candidate.scheduled_payment_date ?? null,
            memo: candidate.memo ?? null,
          }
        })

        setBills(mappedBills)
        setTotal(billsResult.data.total)
        setSummary(billsResult.data.summary)
      }

      const agingResult = await getAPAging()
      if (isMounted && agingResult.success && agingResult.data) {
        const buckets: AgingBuckets = {
          current: 0,
          '1-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0,
        }

        agingResult.data.forEach((entry: { aging_bucket?: string | null; balance_due?: number }) => {
          const bucket = (entry.aging_bucket ?? '').toLowerCase()
          const amount = Number(entry.balance_due ?? 0)
          if (bucket === 'current') buckets.current += amount
          else if (bucket === '1-30' || bucket === '1-30 days') buckets['1-30'] += amount
          else if (bucket === '31-60' || bucket === '31-60 days') buckets['31-60'] += amount
          else if (bucket === '61-90' || bucket === '61-90 days') buckets['61-90'] += amount
          else if (bucket === '90+' || bucket === '90+ days') buckets['90+'] += amount
        })

        setAgingBuckets(buckets)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    run().catch((error) => {
      console.error('Failed to load accounts payable data', error)
      if (isMounted) {
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [page, search, statusFilter, vendorFilter, reloadKey])

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      const result = await getVendors()
      if (isMounted && result.success && result.data) {
        setVendors(result.data)
      }
    }

    run().catch((error) => {
      console.error('Failed to load vendors', error)
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function openBill(id: string) {
    const result = await getAPBill(id)
    if (result.success && result.data) {
      setSelectedBill(result.data as APBillWithDetails)
      setShowBillModal(true)
    } else {
      showToast('error' in result ? result.error : 'Failed to load bill', 'error')
    }
  }

  async function refreshBill(id: string) {
    const detail = await getAPBill(id)
    if (detail.success && detail.data) {
      setSelectedBill(detail.data as APBillWithDetails)
    }
    triggerReload()
  }

  async function handleVoidBill(id: string) {
    if (!confirm('Void this bill? This action cannot be undone.')) return
    const result = await voidAPBill({ bill_id: id })
    if (result.success) {
      showToast('Bill voided successfully', 'success')
      triggerReload()
    } else {
      showToast('error' in result ? result.error : 'Failed to void bill', 'error')
    }
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-[#174940]" />
            Accounts Payable
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track vendor bills, manage payments, and keep cash flow predictable.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
        >
          <Plus className="h-4 w-4" />
          New Vendor Bill
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-3">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Open Payables</div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.total_open_balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Overdue Balance</div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.total_overdue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-sky-100 p-3">
              <CalendarClock className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Scheduled This Month</div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.scheduled_this_month.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aging buckets */}
      {agingBuckets && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Aging Buckets</h3>
          <div className="grid gap-4 sm:grid-cols-5">
            {(['current', '1-30', '31-60', '61-90', '90+'] as const).map((bucket) => (
              <div key={bucket}>
                <div className="text-xs font-medium text-gray-600 uppercase">
                  {bucket === 'current' ? 'Current' : bucket === '90+' ? '90+ Days' : `${bucket} Days`}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    bucket === '90+' ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  ${agingBuckets[bucket].toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by bill number or memo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
              triggerReload()
            }}
            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
            triggerReload()
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="scheduled">Scheduled</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={vendorFilter}
          onChange={(e) => {
            setVendorFilter(e.target.value)
            setPage(1)
            triggerReload()
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Vendors</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bills Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Bill #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Bill Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                      Amount
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
                <tbody>
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                        No bills match the current filters.
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {bill.bill_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{bill.vendor?.name ?? '—'}</div>
                          {bill.vendor?.email && (
                            <div className="text-xs text-gray-500">{bill.vendor.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(bill.bill_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{new Date(bill.due_date).toLocaleDateString()}</div>
                          {bill.status !== 'paid' && bill.status !== 'void' && (
                            <DueBadge dueDate={bill.due_date} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {bill.scheduled_payment_date
                            ? new Date(bill.scheduled_payment_date).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          ${bill.amount_total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          ${bill.balance_due.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={bill.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openBill(bill.id)}
                              className="rounded p-1 text-gray-600 hover:bg-gray-100"
                              title="View Bill"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {bill.status !== 'void' && bill.status !== 'paid' && (
                              <button
                                onClick={() => handleVoidBill(bill.id)}
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                title="Void Bill"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          <div>
            Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} bills
          </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const prevPage = Math.max(1, page - 1)
                    if (prevPage !== page) {
                      setLoading(true)
                      setPage(prevPage)
                    }
                  }}
                  disabled={page === 1}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    const nextPage = Math.min(totalPages, page + 1)
                    if (nextPage !== page) {
                      setLoading(true)
                      setPage(nextPage)
                    }
                  }}
                  disabled={page === totalPages}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
          </div>
        </div>
      )}
    </>
  )}
</div>

      {showBillModal && selectedBill && (
        <BillModal
          bill={selectedBill}
          onClose={() => {
            setShowBillModal(false)
            setSelectedBill(null)
          }}
          onUpdated={() => refreshBill(selectedBill.id)}
          showToast={showToast}
        />
      )}

      {showCreateModal && (
        <CreateBillModal
          vendors={vendors}
          onClose={() => setShowCreateModal(false)}
          onSuccess={async () => {
            triggerReload()
            setShowCreateModal(false)
          }}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function StatusBadge({ status }: { status: BillStatus }) {
  const styles: Record<BillStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    open: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-sky-100 text-sky-700',
    paid: 'bg-green-100 text-green-700',
    void: 'bg-red-100 text-red-600',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const due = new Date(dueDate)
  const today = new Date()
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        {Math.abs(diffDays)}d overdue
      </span>
    )
  }

  if (diffDays <= 7) {
    return (
      <span className="mt-1 inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
        Due in {diffDays}d
      </span>
    )
  }

  return null
}

function BillModal({
  bill,
  onClose,
  onUpdated,
  showToast,
}: {
  bill: APBillWithDetails
  onClose: () => void
  onUpdated: () => Promise<void>
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const toDateInput = (value?: string | null) => {
    if (!value) return new Date().toISOString().split('T')[0]
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0]
    return parsed.toISOString().split('T')[0]
  }

  const [scheduleDate, setScheduleDate] = useState(
    toDateInput(bill.scheduled_payment_date || bill.due_date)
  )
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: Number(bill.balance_due || 0),
    method: 'ach',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  })

  async function handleSchedule(e: FormEvent) {
    e.preventDefault()

    if (bill.status === 'paid' || bill.status === 'void') {
      showToast('Cannot schedule a paid or void bill', 'error')
      return
    }

    setScheduleSaving(true)
    const result = await scheduleAPPayment({
      bill_id: bill.id,
      scheduled_payment_date: scheduleDate,
    })
    setScheduleSaving(false)

    if (result.success) {
      showToast('Payment schedule updated', 'success')
      await onUpdated()
    } else {
      showToast('error' in result ? result.error : 'Failed to schedule payment', 'error')
    }
  }

  async function handlePayment(e: FormEvent) {
    e.preventDefault()
    if (paymentForm.amount <= 0) {
      showToast('Payment amount must be greater than zero', 'error')
      return
    }

    const balance = Number(bill.balance_due || 0)
    if (paymentForm.amount > balance) {
      showToast('Payment exceeds balance due', 'error')
      return
    }

    setPaymentSaving(true)
    const result = await recordAPPayment({
      bill_id: bill.id,
      amount: paymentForm.amount,
      method: paymentForm.method,
      payment_date: paymentForm.payment_date,
      reference: paymentForm.reference || undefined,
      notes: paymentForm.notes || undefined,
    })
    setPaymentSaving(false)

    if (result.success) {
      showToast('Payment recorded successfully', 'success')
      await onUpdated()
    } else {
      showToast('error' in result ? result.error : 'Failed to record payment', 'error')
    }
  }

  const balanceDue = Number(bill.balance_due || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bill {bill.bill_number}</h2>
            <p className="text-sm text-gray-600">
              {bill.vendor?.name ?? 'Unknown vendor'} •{' '}
              {new Date(bill.bill_date).toLocaleDateString()} &rarr;{' '}
              {new Date(bill.due_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <InfoTile label="Status">
              <StatusBadge status={bill.status} />
            </InfoTile>
            <InfoTile label="Amount">
              <span className="font-semibold text-gray-900">
                ${Number(bill.amount_total || 0).toFixed(2)}
              </span>
            </InfoTile>
            <InfoTile label="Paid">
              ${Number(bill.amount_paid || 0).toFixed(2)}
            </InfoTile>
            <InfoTile label="Balance Due">
              <span className="font-semibold text-gray-900">
                ${balanceDue.toFixed(2)}
              </span>
            </InfoTile>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <form onSubmit={handleSchedule} className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-sky-600" />
                <h3 className="font-semibold text-gray-900">Schedule Payment</h3>
              </div>
              <p className="text-xs text-gray-500">
                Pick a target payment date to keep cash flow aligned. You can reschedule anytime while the bill remains open.
              </p>
              <label className="text-sm font-medium text-gray-700">
                Payment date
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={scheduleSaving || bill.status === 'paid' || bill.status === 'void'}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#174940] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0f332c] disabled:opacity-60"
              >
                {scheduleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save schedule
              </button>
            </form>

            <form onSubmit={handlePayment} className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Record Payment</h3>
              </div>
              <p className="text-xs text-gray-500">
                Log a payment to update the balance and mark the bill as paid once fully settled.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Amount
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Method
                  <select
                    value={paymentForm.method}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, method: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="ach">ACH</option>
                    <option value="wire">Wire</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Payment date
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Reference
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))
                    }
                    placeholder="Optional reference"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="text-sm font-medium text-gray-700">
                Notes
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Optional payment notes"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </label>
              <button
                type="submit"
                disabled={paymentSaving || bill.status === 'paid' || bill.status === 'void'}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {paymentSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Record payment
              </button>
            </form>
          </div>

          {bill.lines && bill.lines.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Line Items</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Unit Cost</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
          {bill.lines.map((line) => (
                      <tr key={line.id} className="border-t border-gray-100">
                        <td className="px-4 py-2">{line.description || '—'}</td>
                        <td className="px-4 py-2 text-right">{Number(line.quantity || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          ${Number(line.unit_cost || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ${Number(line.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Payment History</h3>
            {bill.payments && bill.payments.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Method</th>
                      <th className="px-4 py-2 text-left">Reference</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
            {bill.payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-gray-100">
                        <td className="px-4 py-2">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 capitalize">{payment.method}</td>
                        <td className="px-4 py-2">{payment.reference || '—'}</td>
                        <td className="px-4 py-2 text-right">
                          ${Number(payment.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateBillModal({
  vendors,
  onClose,
  onSuccess,
  showToast,
}: {
  vendors: VendorOption[]
  onClose: () => void
  onSuccess: () => Promise<void>
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    bill_number: '',
    vendor_id: '',
    bill_date: today,
    due_date: today,
    amount_total: 0,
    purchase_order_id: '',
    memo: '',
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!formData.bill_number.trim()) {
      showToast('Bill number is required', 'error')
      return
    }
    if (!formData.vendor_id) {
      showToast('Please select a vendor', 'error')
      return
    }
    if (formData.amount_total <= 0) {
      showToast('Bill amount must be greater than zero', 'error')
      return
    }

    setSaving(true)
    const result = await createAPBill({
      bill_number: formData.bill_number.trim(),
      vendor_id: formData.vendor_id,
      bill_date: formData.bill_date,
      due_date: formData.due_date,
      amount_total: formData.amount_total,
      purchase_order_id: formData.purchase_order_id
        ? formData.purchase_order_id
        : undefined,
      memo: formData.memo ? formData.memo : undefined,
    })
    setSaving(false)

    if (result.success) {
      showToast('Vendor bill created', 'success')
      await onSuccess()
    } else {
      showToast('error' in result ? result.error : 'Failed to create bill', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">New Vendor Bill</h2>
          <button
            onClick={onClose}
            className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Bill number
              <input
                type="text"
                value={formData.bill_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bill_number: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Vendor
              <select
                value={formData.vendor_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, vendor_id: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Bill date
              <input
                type="date"
                value={formData.bill_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bill_date: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Due date
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={formData.amount_total}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount_total: parseFloat(e.target.value) || 0,
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Purchase Order #
              <input
                type="text"
                value={formData.purchase_order_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    purchase_order_id: e.target.value,
                  }))
                }
                placeholder="Optional PO reference"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-700">
            Memo
            <textarea
              value={formData.memo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, memo: e.target.value }))
              }
              placeholder="Optional notes about this bill"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create bill
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InfoTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{children}</div>
    </div>
  )
}
