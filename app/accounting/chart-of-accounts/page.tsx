'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Power, PowerOff } from 'lucide-react'
import { fetchAccountBalances, toggleAccountActive } from '../_actions/accounts'
import { AccountWithBalance, AccountType } from '@/types/accounting'

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    try {
      const balances = await fetchAccountBalances()
      setAccounts(balances as AccountWithBalance[])
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      await toggleAccountActive(id, !currentStatus)
      await loadAccounts()
    } catch (error) {
      console.error('Error toggling account:', error)
      alert('Failed to update account status')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || account.account_type === filterType

    const matchesActive = showInactive || account.is_active

    return matchesSearch && matchesType && matchesActive
  })

  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.account_type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(account)
    return groups
  }, {} as Record<string, AccountWithBalance[]>)

  const accountTypeLabels: Record<AccountType, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expenses',
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading chart of accounts...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your accounting accounts and balances</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-white transition hover:bg-[#1a5a4d]">
          <Plus className="h-4 w-4" />
          New Account
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AccountType | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
          >
            <option value="all">All Types</option>
            <option value="asset">Assets</option>
            <option value="liability">Liabilities</option>
            <option value="equity">Equity</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expenses</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
            />
            Show Inactive
          </label>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([type, accountList]) => (
          <div key={type} className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {accountTypeLabels[type as AccountType]}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Account Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Subtype
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
                  {accountList.map((account) => (
                    <tr
                      key={account.id}
                      className={`${
                        !account.is_active ? 'bg-gray-50 text-gray-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {account.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {account.name}
                        {account.is_system_account && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {account.account_subtype || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {account.is_active ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="Edit Account"
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {!account.is_system_account && (
                            <button
                              onClick={() => handleToggleActive(account.id, account.is_active)}
                              title={account.is_active ? 'Deactivate Account' : 'Activate Account'}
                              className={`rounded p-1 ${
                                account.is_active
                                  ? 'text-orange-400 hover:bg-orange-100 hover:text-orange-600'
                                  : 'text-green-400 hover:bg-green-100 hover:text-green-600'
                              }`}
                            >
                              {account.is_active ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No accounts found matching your filters.</p>
        </div>
      )}
    </div>
  )
}
