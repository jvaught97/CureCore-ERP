'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  AlertCircle,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { fetchDashboardKPIs } from './_actions/reports'
import { fetchARAgingReport, fetchAPAgingReport } from './_actions/invoices'
import { fetchJournalEntries } from './_actions/journal-entries'
import { AccountingDashboardKPIs, ARAgingEntry, APAgingEntry, JournalEntryWithLines } from '@/types/accounting'

export default function AccountingDashboard() {
  const router = useRouter()
  const [kpis, setKPIs] = useState<AccountingDashboardKPIs | null>(null)
  const [arAging, setARAging] = useState<ARAgingEntry[]>([])
  const [apAging, setAPAging] = useState<APAgingEntry[]>([])
  const [recentEntries, setRecentEntries] = useState<JournalEntryWithLines[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [kpisData, arData, apData, entriesData] = await Promise.all([
          fetchDashboardKPIs(),
          fetchARAgingReport(),
          fetchAPAgingReport(),
          fetchJournalEntries({ status: 'posted' }),
        ])

        setKPIs(kpisData)
        setARAging(arData)
        setAPAging(apData)
        setRecentEntries(entriesData.slice(0, 10))
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  const arOverdue = arAging.filter(entry => entry.days_overdue > 0 && entry.balance > 0)
  const apOverdue = apAging.filter(entry => entry.days_overdue > 0 && entry.balance > 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounting Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Financial overview and key metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Cash Balance</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(kpis?.cash_balance || 0)}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Accounts Receivable</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(kpis?.accounts_receivable_total || 0)}
              </p>
              {arOverdue.length > 0 && (
                <p className="mt-1 text-xs text-red-600">{arOverdue.length} overdue</p>
              )}
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Accounts Payable</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(kpis?.accounts_payable_total || 0)}
              </p>
              {apOverdue.length > 0 && (
                <p className="mt-1 text-xs text-red-600">{apOverdue.length} overdue</p>
              )}
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Ratio</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {kpis?.current_ratio.toFixed(2) || '0.00'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {(kpis?.current_ratio || 0) >= 1.5 ? '✓ Healthy' : '⚠ Low'}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <PieChart className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-500">Gross Margin</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPercent(kpis?.gross_margin_pct || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-500">Net Income (MTD)</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(kpis?.net_income_mtd || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-500">Net Income (YTD)</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(kpis?.net_income_ytd || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => router.push('/accounting/expenses/new')}
            className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-[#174940] hover:shadow-md"
          >
            <FileText className="h-5 w-5 text-[#174940]" />
            <div>
              <p className="font-medium text-gray-900">Record Expense</p>
              <p className="text-xs text-gray-500">Cash, card, or check</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/accounting/accounts-receivable')}
            className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-[#174940] hover:shadow-md"
          >
            <CreditCard className="h-5 w-5 text-[#174940]" />
            <div>
              <p className="font-medium text-gray-900">Create Invoice</p>
              <p className="text-xs text-gray-500">Bill a customer</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/accounting/accounts-payable')}
            className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-[#174940] hover:shadow-md"
          >
            <FileText className="h-5 w-5 text-[#174940]" />
            <div>
              <p className="font-medium text-gray-900">Record Bill</p>
              <p className="text-xs text-gray-500">Enter vendor bill</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/accounting/reports')}
            className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4 text-left transition hover:border-[#174940] hover:shadow-md"
          >
            <BarChart3 className="h-5 w-5 text-[#174940]" />
            <div>
              <p className="font-medium text-gray-900">View Reports</p>
              <p className="text-xs text-gray-500">Financial statements</p>
            </div>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(arOverdue.length > 0 || apOverdue.length > 0) && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Attention Required</h3>
              <ul className="mt-2 space-y-1 text-sm text-orange-800">
                {arOverdue.length > 0 && (
                  <li>
                    {arOverdue.length} overdue customer invoice{arOverdue.length > 1 ? 's' : ''} totaling{' '}
                    {formatCurrency(arOverdue.reduce((sum, e) => sum + e.balance, 0))}
                  </li>
                )}
                {apOverdue.length > 0 && (
                  <li>
                    {apOverdue.length} overdue vendor bill{apOverdue.length > 1 ? 's' : ''} totaling{' '}
                    {formatCurrency(apOverdue.reduce((sum, e) => sum + e.balance, 0))}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recent Journal Entries */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Journal Entries</h2>
            <button
              onClick={() => router.push('/accounting/journal-entries')}
              className="text-sm font-medium text-[#174940] hover:underline"
            >
              View All
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Entry #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    No journal entries yet
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry) => {
                  const totalAmount = entry.lines?.reduce((sum, line) => sum + line.debit, 0) || 0
                  return (
                    <tr
                      key={entry.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/accounting/journal-entries/${entry.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {entry.entry_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(entry.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.description}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
