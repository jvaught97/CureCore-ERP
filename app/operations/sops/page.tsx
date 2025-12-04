'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Search,
  Filter,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileWarning
} from 'lucide-react'
import { AppNav } from '@/components/nav/AppNav'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor,
  getTableHeaderBg,
  getTableRowHover
} from '@/lib/utils/themeUtils'
import { getSOPs } from './_actions/sops'
import type { SOPListItem, SOPCategory, SOPDocumentStatus } from './_types/sop'
import SOPDetailModal from './_components/SOPDetailModal'
import CreateSOPModal from './_components/CreateSOPModal'

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getCategoryBadgeColor = (category: SOPCategory): string => {
  const colors: Record<SOPCategory, string> = {
    manufacturing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cleaning: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    safety: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    quality: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    warehouse: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    admin: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    other: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }
  return colors[category]
}

const getStatusBadge = (status: SOPDocumentStatus): { icon: React.ReactNode; color: string; label: string } => {
  switch (status) {
    case 'active':
      return {
        icon: <CheckCircle2 className="w-3 h-3" />,
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        label: 'Active'
      }
    case 'draft':
      return {
        icon: <Clock className="w-3 h-3" />,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        label: 'Draft'
      }
    case 'inactive':
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        label: 'Inactive'
      }
  }
}

export default function SOPLibraryPage() {
  const router = useRouter()
  const { mode } = useTheme()

  const [sops, setSOPs] = useState<SOPListItem[]>([])
  const [filteredSOPs, setFilteredSOPs] = useState<SOPListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<SOPCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<SOPDocumentStatus | 'all'>('all')

  const [selectedSOPId, setSelectedSOPId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const bgClass = getBackgroundClass(mode)
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const textLight = getTextLight(mode)
  const borderColor = getBorderColor(mode)
  const bgCard = getCardBackground(mode)
  const tableHeaderBg = getTableHeaderBg(mode)
  const tableRowHover = getTableRowHover(mode)

  useEffect(() => {
    fetchSOPs()
  }, [])

  useEffect(() => {
    filterSOPs()
  }, [sops, searchTerm, categoryFilter, statusFilter])

  const fetchSOPs = async () => {
    setLoading(true)
    try {
      const result = await getSOPs()
      if (result.success && result.data) {
        setSOPs(result.data)
      } else {
        console.error('Failed to fetch SOPs:', result.error)
      }
    } catch (error) {
      console.error('Error fetching SOPs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterSOPs = () => {
    let filtered = [...sops]

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (sop) =>
          sop.code.toLowerCase().includes(search) ||
          sop.title.toLowerCase().includes(search) ||
          sop.department?.toLowerCase().includes(search)
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((sop) => sop.category === categoryFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((sop) => sop.status === statusFilter)
    }

    setFilteredSOPs(filtered)
  }

  const handleSOPClick = (sopId: string) => {
    setSelectedSOPId(sopId)
    setDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false)
    setSelectedSOPId(null)
  }

  const handleCreateSuccess = () => {
    setCreateModalOpen(false)
    fetchSOPs()
  }

  const stats = {
    total: sops.length,
    active: sops.filter((s) => s.status === 'active').length,
    draft: sops.filter((s) => s.status === 'draft').length,
    inactive: sops.filter((s) => s.status === 'inactive').length
  }

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <AnimatedBackground />
      <AppNav currentPage="sops" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${textColor}`}>SOP Library</h1>
              <p className={`text-sm ${textMuted} mt-0.5`}>
                Standard Operating Procedures and Documentation
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${bgCard} rounded-xl p-4 border ${borderColor} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textMuted}`}>Total SOPs</p>
                <p className={`text-2xl font-bold ${textColor} mt-1`}>{stats.total}</p>
              </div>
              <FileText className={`w-8 h-8 ${textMuted}`} />
            </div>
          </div>

          <div className={`${bgCard} rounded-xl p-4 border ${borderColor} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textMuted}`}>Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className={`${bgCard} rounded-xl p-4 border ${borderColor} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textMuted}`}>Draft</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.draft}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <div className={`${bgCard} rounded-xl p-4 border ${borderColor} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textMuted}`}>Inactive</p>
                <p className={`text-2xl font-bold ${textMuted} mt-1`}>{stats.inactive}</p>
              </div>
              <AlertCircle className={`w-8 h-8 ${textMuted}`} />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className={`${bgCard} rounded-xl border ${borderColor} shadow-sm p-4 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                <input
                  type="text"
                  placeholder="Search by code, title, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as SOPCategory | 'all')}
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">All Categories</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="warehouse">Warehouse</option>
                <option value="admin">Admin</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SOPDocumentStatus | 'all')}
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Create Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create New SOP
            </button>
          </div>
        </div>

        {/* SOPs Table */}
        <div className={`${bgCard} rounded-xl border ${borderColor} shadow-sm overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSOPs.length === 0 ? (
            <div className="text-center py-12">
              <FileWarning className={`w-12 h-12 ${textMuted} mx-auto mb-3`} />
              <p className={`text-lg ${textMuted}`}>No SOPs found</p>
              <p className={`text-sm ${textLight} mt-1`}>
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first SOP to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={tableHeaderBg}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Code
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Title
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Category
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Version
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Effective Date
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Owner
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${textMuted} uppercase tracking-wider`}>
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSOPs.map((sop) => {
                    const statusBadge = getStatusBadge(sop.status)
                    return (
                      <tr
                        key={sop.id}
                        onClick={() => handleSOPClick(sop.id)}
                        className={`${tableRowHover} cursor-pointer transition-colors`}
                      >
                        <td className={`px-4 py-3 ${textColor} font-medium`}>
                          {sop.code}
                        </td>
                        <td className={`px-4 py-3 ${textColor}`}>
                          <div>
                            <div className="font-medium">{sop.title}</div>
                            {sop.department && (
                              <div className={`text-xs ${textMuted} mt-0.5`}>
                                {sop.department}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(sop.category)}`}>
                            {sop.category.charAt(0).toUpperCase() + sop.category.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${textColor}`}>
                          <span className={textMuted}>-</span>
                        </td>
                        <td className={`px-4 py-3 ${textColor}`}>
                          <span className={textMuted}>-</span>
                        </td>
                        <td className={`px-4 py-3 ${textColor}`}>
                          <span className={textMuted}>-</span>
                        </td>
                        <td className={`px-4 py-3 ${textMuted} text-sm`}>
                          {formatDate(sop.updated_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {detailModalOpen && selectedSOPId && (
        <SOPDetailModal
          sopId={selectedSOPId}
          isOpen={detailModalOpen}
          onClose={handleCloseDetailModal}
          onUpdate={fetchSOPs}
        />
      )}

      {createModalOpen && (
        <CreateSOPModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
