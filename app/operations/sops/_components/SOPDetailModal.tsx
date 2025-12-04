'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  X,
  FileText,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  Edit,
  History,
  BookOpen,
  Eye,
  FileDown,
  Loader2,
  Trash2,
  Save
} from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getTextColor,
  getTextMuted,
  getTextLight,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'
import {
  getSOPById,
  getSOPVersions,
  getSOPFileUrl,
  getSOPStructuredContent,
  generateSOPPDFAction,
  updateSOPVersionStatus,
  updateSOP
} from '../_actions/sops'
import type { SOPDocument, SOPVersion, SOPStructuredContent, SOPVersionStatus } from '../_types/sop'
import AddVersionModal from './AddVersionModal'
import DeleteSOPModal from './DeleteSOPModal'
import HTMLContentDisplay from '@/components/HTMLContentDisplay'

interface SOPDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sopId: string
  onUpdate?: () => void
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'under_review':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'obsolete':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'inactive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }
}

export default function SOPDetailModal({
  isOpen,
  onClose,
  sopId,
  onUpdate
}: SOPDetailModalProps) {
  const { mode } = useTheme()
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const textLight = getTextLight(mode)
  const borderColor = getBorderColor(mode)
  const bgCard = getCardBackground(mode)

  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'versions'>('overview')
  const [loading, setLoading] = useState(true)
  const [sop, setSOP] = useState<SOPDocument | null>(null)
  const [versions, setVersions] = useState<SOPVersion[]>([])
  const [structuredContent, setStructuredContent] = useState<SOPStructuredContent | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [addVersionModalOpen, setAddVersionModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [editedStatus, setEditedStatus] = useState<'active' | 'inactive' | 'draft'>('active')
  const [editedEffectiveDate, setEditedEffectiveDate] = useState('')
  const [editedReviewDate, setEditedReviewDate] = useState('')
  const [editedPreparedBy, setEditedPreparedBy] = useState('')
  const [editedApprovedBy, setEditedApprovedBy] = useState('')

  useEffect(() => {
    if (isOpen && sopId) {
      fetchSOPDetails()
      fetchVersions()
    }
  }, [isOpen, sopId])

  useEffect(() => {
    if (activeTab === 'content') {
      // Use selected version or fallback to current version
      const versionToLoad = selectedVersionId || sop?.current_version_id
      if (versionToLoad) {
        // Clear old content before fetching new version
        setStructuredContent(null)
        fetchStructuredContent(versionToLoad)
      }
    }
  }, [activeTab, selectedVersionId, sop?.current_version_id])

  const fetchSOPDetails = async () => {
    setLoading(true)
    try {
      const result = await getSOPById(sopId)
      if (result.success && result.data) {
        setSOP(result.data)
      }
    } catch (error) {
      console.error('Error fetching SOP:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVersions = async () => {
    try {
      const result = await getSOPVersions(sopId)
      if (result.success && result.data) {
        setVersions(result.data)
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    }
  }

  const fetchStructuredContent = async (versionId: string) => {
    setLoadingContent(true)
    try {
      const result = await getSOPStructuredContent(versionId)
      if (result.success && result.data) {
        setStructuredContent(result.data)
      } else {
        setStructuredContent(null)
      }
    } catch (error) {
      console.error('Error fetching structured content:', error)
      setStructuredContent(null)
    } finally {
      setLoadingContent(false)
    }
  }

  const handleDownloadPDF = async (fileUrl: string) => {
    try {
      const result = await getSOPFileUrl(fileUrl)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const handleGeneratePDF = async () => {
    const versionToUse = selectedVersionId || sop?.current_version_id
    if (!versionToUse) return

    setIsGeneratingPDF(true)
    setActionMessage(null)

    try {
      const result = await generateSOPPDFAction(sopId, versionToUse)
      if (result.success) {
        setActionMessage({ type: 'success', text: 'PDF generated successfully!' })
        fetchSOPDetails()
        fetchVersions()
        setTimeout(() => setActionMessage(null), 5000)
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to generate PDF' })
      }
    } catch (error: any) {
      setActionMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleStatusChange = async (versionId: string, newStatus: SOPVersionStatus) => {
    setActionMessage(null)
    startTransition(async () => {
      const result = await updateSOPVersionStatus(versionId, newStatus)
      if (result.success) {
        setActionMessage({ type: 'success', text: `Status updated to ${newStatus}` })
        fetchSOPDetails()
        fetchVersions()
        onUpdate?.()
        setTimeout(() => setActionMessage(null), 3000)
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to update status' })
      }
    })
  }

  const handleAddVersionSuccess = () => {
    setAddVersionModalOpen(false)
    fetchSOPDetails()
    fetchVersions()
    onUpdate?.()
  }

  const handleViewOperatorMode = () => {
    const versionToUse = selectedVersionId || sop?.current_version_id
    // Pass version ID as query parameter
    const url = versionToUse
      ? `/operations/sops/${sopId}/execute?versionId=${versionToUse}`
      : `/operations/sops/${sopId}/execute`
    window.open(url, '_blank')
  }

  const handleEditMetadata = () => {
    if (sop) {
      setEditedStatus(sop.status)
      setEditedEffectiveDate(sop.current_version?.effective_date || '')
      setEditedReviewDate(sop.review_date || '')
      setEditedPreparedBy(sop.prepared_by || '')
      setEditedApprovedBy(sop.current_version?.approved_by?.full_name || sop.current_version?.approved_by?.email || '')
      setIsEditingMetadata(true)
    }
  }

  const handleSaveMetadata = async () => {
    if (!sop) return

    setActionMessage(null)
    startTransition(async () => {
      // Update SOP document fields
      const sopUpdateData: any = {
        status: editedStatus
      }

      // Add optional fields if they exist
      if (editedReviewDate) sopUpdateData.review_date = editedReviewDate
      if (editedPreparedBy) sopUpdateData.prepared_by = editedPreparedBy

      const result = await updateSOP(sop.id, sopUpdateData)

      // Also update version effective date if changed and version exists
      if (sop.current_version_id && editedEffectiveDate !== sop.current_version?.effective_date) {
        await updateSOPVersionStatus(sop.current_version_id, sop.current_version?.status || 'draft')
        // Note: We'd need a separate function to update version dates, for now this updates the status
      }

      if (result.success) {
        setActionMessage({ type: 'success', text: 'SOP metadata updated successfully' })
        setIsEditingMetadata(false)
        fetchSOPDetails()
        onUpdate?.()
        setTimeout(() => setActionMessage(null), 3000)
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to update SOP' })
      }
    })
  }

  const handleCancelEdit = () => {
    setIsEditingMetadata(false)
    if (sop) {
      setEditedStatus(sop.status)
      setEditedEffectiveDate(sop.current_version?.effective_date || '')
      setEditedReviewDate(sop.review_date || '')
      setEditedPreparedBy(sop.prepared_by || '')
      setEditedApprovedBy(sop.current_version?.approved_by?.full_name || sop.current_version?.approved_by?.email || '')
    }
  }

  const handleDeleteSuccess = () => {
    setActionMessage({ type: 'success', text: 'SOP deleted successfully' })
    setTimeout(() => {
      onClose()
      onUpdate?.()
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div
          className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border ${borderColor}`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${borderColor} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textColor}`}>
                  {loading ? 'Loading...' : sop?.code}
                </h2>
                <p className={`text-sm ${textMuted}`}>{loading ? '' : sop?.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${textMuted}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Message */}
          {actionMessage && (
            <div className={`mx-6 mt-4 p-3 rounded-lg border ${
              actionMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}>
              <p className="text-sm">{actionMessage.text}</p>
            </div>
          )}

          {/* Tabs */}
          <div className={`px-6 border-b ${borderColor} flex gap-4`}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : `border-transparent ${textMuted} hover:text-blue-600`
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'content'
                  ? 'border-blue-600 text-blue-600'
                  : `border-transparent ${textMuted} hover:text-blue-600`
              }`}
            >
              Structured Content
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'versions'
                  ? 'border-blue-600 text-blue-600'
                  : `border-transparent ${textMuted} hover:text-blue-600`
              }`}
            >
              Version History
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && sop && (
                  <div className="space-y-6">
                    {/* Metadata Panel with Edit/Delete */}
                    <div className={`p-6 rounded-xl border ${borderColor} ${bgCard}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${textColor}`}>SOP Metadata</h3>
                        <div className="flex gap-2">
                          {isEditingMetadata ? (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isPending}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${borderColor} ${textColor} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm disabled:opacity-50`}
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveMetadata}
                                disabled={isPending}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                              >
                                <Save className="w-4 h-4" />
                                {isPending ? 'Saving...' : 'Save Changes'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleEditMetadata}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Status */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Status
                          </label>
                          <div className="mt-1">
                            {isEditingMetadata ? (
                              <select
                                value={editedStatus}
                                onChange={(e) => setEditedStatus(e.target.value as 'active' | 'inactive' | 'draft')}
                                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="draft">Draft</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${getStatusBadge(sop.status)}`}
                              >
                                {sop.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {sop.status === 'inactive' && <AlertCircle className="w-3.5 h-3.5" />}
                                {sop.status.charAt(0).toUpperCase() + sop.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Category */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Category
                          </label>
                          <p className={`mt-1 ${textColor} capitalize`}>{sop.category}</p>
                        </div>

                        {/* Effective Date */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Effective Date
                          </label>
                          {isEditingMetadata ? (
                            <input
                              type="date"
                              value={editedEffectiveDate}
                              onChange={(e) => setEditedEffectiveDate(e.target.value)}
                              className={`w-full mt-1 px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                          ) : (
                            <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                              <Calendar className="w-4 h-4" />
                              {formatDate(sop.current_version?.effective_date)}
                            </p>
                          )}
                        </div>

                        {/* Review Date */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Review Date
                          </label>
                          {isEditingMetadata ? (
                            <input
                              type="date"
                              value={editedReviewDate}
                              onChange={(e) => setEditedReviewDate(e.target.value)}
                              className={`w-full mt-1 px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                          ) : (
                            <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                              <Calendar className="w-4 h-4" />
                              {formatDate(sop.review_date)}
                            </p>
                          )}
                        </div>

                        {/* Prepared By */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Prepared By
                          </label>
                          {isEditingMetadata ? (
                            <input
                              type="text"
                              value={editedPreparedBy}
                              onChange={(e) => setEditedPreparedBy(e.target.value)}
                              placeholder="Enter name"
                              className={`w-full mt-1 px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                          ) : (
                            <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                              <User className="w-4 h-4" />
                              {sop.prepared_by || '-'}
                            </p>
                          )}
                        </div>

                        {/* Approved By */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Approved By
                          </label>
                          {isEditingMetadata ? (
                            <input
                              type="text"
                              value={editedApprovedBy}
                              onChange={(e) => setEditedApprovedBy(e.target.value)}
                              placeholder="Enter name"
                              className={`w-full mt-1 px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                          ) : (
                            <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                              <User className="w-4 h-4" />
                              {sop.current_version?.approved_by?.full_name || sop.current_version?.approved_by?.email || '-'}
                            </p>
                          )}
                        </div>

                        {/* Department */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Department
                          </label>
                          <p className={`mt-1 ${textColor}`}>{sop.department || '-'}</p>
                        </div>

                        {/* Owner */}
                        <div>
                          <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                            Owner
                          </label>
                          <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                            <User className="w-4 h-4" />
                            {sop.owner?.full_name || sop.owner?.email || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Version */}
                    {sop.current_version && (
                      <div className={`p-4 rounded-xl border ${borderColor} ${bgCard}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-lg font-semibold ${textColor}`}>Current Version</h3>
                          <div className="flex gap-2">
                            {/* Status Change Dropdown */}
                            <select
                              value={sop.current_version.status}
                              onChange={(e) => handleStatusChange(sop.current_version!.id, e.target.value as SOPVersionStatus)}
                              disabled={isPending}
                              className={`px-3 py-1.5 rounded-lg border ${borderColor} ${bgCard} ${textColor} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                            >
                              <option value="draft">Draft</option>
                              <option value="under_review">Under Review</option>
                              <option value="approved">Approved</option>
                              <option value="obsolete">Obsolete</option>
                            </select>

                            {sop.current_version.file_url && (
                              <button
                                onClick={() => handleDownloadPDF(sop.current_version!.file_url!)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                              >
                                <Download className="w-4 h-4" />
                                Download PDF
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                              Version
                            </label>
                            <p className={`mt-1 ${textColor} font-medium`}>
                              v{sop.current_version.version_number}
                              {sop.current_version.revision_code &&
                                ` (${sop.current_version.revision_code})`}
                            </p>
                          </div>

                          <div>
                            <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                              Status
                            </label>
                            <div className="mt-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(sop.current_version.status)}`}
                              >
                                {sop.current_version.status === 'under_review' ? 'Under Review' :
                                  sop.current_version.status.charAt(0).toUpperCase() +
                                  sop.current_version.status.slice(1)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                              Effective Date
                            </label>
                            <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(sop.current_version.effective_date)}
                            </p>
                          </div>

                          {sop.current_version.expiry_date && (
                            <div>
                              <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                Expiry Date
                              </label>
                              <p className={`mt-1 ${textColor} flex items-center gap-1.5`}>
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(sop.current_version.expiry_date)}
                              </p>
                            </div>
                          )}

                          {sop.current_version.approved_by && (
                            <div>
                              <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                Approved By
                              </label>
                              <p className={`mt-1 ${textColor}`}>
                                {sop.current_version.approved_by.full_name ||
                                  sop.current_version.approved_by.email}
                              </p>
                            </div>
                          )}

                          {sop.current_version.approved_at && (
                            <div>
                              <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                Approved On
                              </label>
                              <p className={`mt-1 ${textColor}`}>
                                {formatDate(sop.current_version.approved_at)}
                              </p>
                            </div>
                          )}
                        </div>

                        {sop.current_version.change_summary && (
                          <div className="mt-4">
                            <label className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                              Change Summary
                            </label>
                            <p className={`mt-1 ${textColor}`}>{sop.current_version.change_summary}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleViewOperatorMode}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Operator Mode
                      </button>

                      {structuredContent && (
                        <button
                          onClick={handleGeneratePDF}
                          disabled={isGeneratingPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingPDF ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                          {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
                        </button>
                      )}

                      <button
                        onClick={() => setAddVersionModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Version
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'content' && (
                  <div className="space-y-6">
                    {/* Version Selector */}
                    {versions.length > 0 && (
                      <div className={`p-4 rounded-xl border ${borderColor} ${bgCard} flex items-center justify-between`}>
                        <label className={`text-sm font-medium ${textColor}`}>
                          Select Version to View:
                        </label>
                        <select
                          value={selectedVersionId || sop?.current_version_id || ''}
                          onChange={(e) => setSelectedVersionId(e.target.value)}
                          className={`px-4 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                          {versions.map((version) => (
                            <option key={version.id} value={version.id}>
                              v{version.version_number}
                              {version.revision_code && ` (${version.revision_code})`}
                              {version.id === sop?.current_version_id && ' - Current'}
                              {' - '}
                              {version.status === 'under_review' ? 'Under Review' :
                                version.status.charAt(0).toUpperCase() + version.status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {loadingContent ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : structuredContent ? (
                      <div key={selectedVersionId || sop?.current_version_id} className="space-y-4">
                        {structuredContent.purpose && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>1. Purpose</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.purpose}</p>
                          </div>
                        )}

                        {structuredContent.scope && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>2. Scope</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.scope}</p>
                          </div>
                        )}

                        {structuredContent.responsibilities && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>3. Responsibilities</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.responsibilities}</p>
                          </div>
                        )}

                        {structuredContent.definitions && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>4. Definitions</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.definitions}</p>
                          </div>
                        )}

                        {structuredContent.required_materials_equipment && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>5. Required Materials & Equipment</h4>
                            <HTMLContentDisplay content={structuredContent.required_materials_equipment} />
                          </div>
                        )}

                        {structuredContent.safety_precautions && (
                          <div className={`p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20`}>
                            <h4 className={`text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-2`}>
                              <AlertCircle className="w-4 h-4" />
                              6. Safety Precautions
                            </h4>
                            <HTMLContentDisplay content={structuredContent.safety_precautions} className="prose-p:text-yellow-800 dark:prose-p:text-yellow-200 prose-li:text-yellow-800 dark:prose-li:text-yellow-200" />
                          </div>
                        )}

                        <div className={`p-4 rounded-xl border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20`}>
                          <h4 className={`text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2`}>7. Procedure</h4>
                          <HTMLContentDisplay content={structuredContent.procedure} className="prose-p:text-blue-900 dark:prose-p:text-blue-100 prose-li:text-blue-900 dark:prose-li:text-blue-100" />
                        </div>

                        {structuredContent.quality_control_checkpoints && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>8. Quality Control Checkpoints</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.quality_control_checkpoints}</p>
                          </div>
                        )}

                        {structuredContent.documentation_requirements && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>9. Documentation Requirements</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.documentation_requirements}</p>
                          </div>
                        )}

                        {structuredContent.deviations_and_corrective_actions && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>10. Deviations & Corrective Actions</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.deviations_and_corrective_actions}</p>
                          </div>
                        )}

                        {structuredContent.references && (
                          <div className={`p-4 rounded-xl border ${borderColor}`}>
                            <h4 className={`text-sm font-semibold ${textColor} mb-2`}>11. References</h4>
                            <p className={`${textColor} whitespace-pre-wrap`}>{structuredContent.references}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className={`w-12 h-12 ${textMuted} mx-auto mb-3`} />
                        <p className={`text-lg ${textMuted}`}>No structured content available</p>
                        <p className={`text-sm ${textMuted} mt-2`}>This SOP was created with a PDF upload only</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'versions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${textColor}`}>
                        Version History ({versions.length})
                      </h3>
                      <button
                        onClick={() => setAddVersionModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Version
                      </button>
                    </div>

                    {versions.length === 0 ? (
                      <div className="text-center py-12">
                        <History className={`w-12 h-12 ${textMuted} mx-auto mb-3`} />
                        <p className={`text-lg ${textMuted}`}>No version history</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {versions.map((version) => (
                          <div
                            key={version.id}
                            className={`p-4 rounded-xl border ${borderColor} ${bgCard} hover:border-blue-500 transition-colors`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className={`text-lg font-semibold ${textColor}`}>
                                    v{version.version_number}
                                    {version.revision_code && ` (${version.revision_code})`}
                                  </h4>
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(version.status)}`}
                                  >
                                    {version.status === 'under_review' ? 'Under Review' :
                                      version.status.charAt(0).toUpperCase() + version.status.slice(1)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                  {version.created_by && (
                                    <div className={textMuted}>
                                      <span className="font-medium">Created by:</span>{' '}
                                      {version.created_by.full_name || version.created_by.email}
                                    </div>
                                  )}
                                  {version.created_at && (
                                    <div className={textMuted}>
                                      <span className="font-medium">Prepared on:</span>{' '}
                                      {formatDate(version.created_at)}
                                    </div>
                                  )}
                                  {version.approved_by && (
                                    <div className={textMuted}>
                                      <span className="font-medium">Approved by:</span>{' '}
                                      {version.approved_by.full_name || version.approved_by.email}
                                    </div>
                                  )}
                                  {version.approved_at && (
                                    <div className={textMuted}>
                                      <span className="font-medium">Approved on:</span>{' '}
                                      {formatDate(version.approved_at)}
                                    </div>
                                  )}
                                  {version.effective_date && (
                                    <div className={textMuted}>
                                      <span className="font-medium">Effective date:</span>{' '}
                                      {formatDate(version.effective_date)}
                                    </div>
                                  )}
                                  {version.expiry_date && (
                                    <div className={textMuted}>
                                      <span className="font-medium">Expiry date:</span>{' '}
                                      {formatDate(version.expiry_date)}
                                    </div>
                                  )}
                                </div>

                                {version.change_summary && (
                                  <p className={`mt-2 text-sm ${textColor}`}>{version.change_summary}</p>
                                )}
                              </div>

                              {version.file_url && (
                                <button
                                  onClick={() => handleDownloadPDF(version.file_url!)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  PDF
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Version Modal */}
      {addVersionModalOpen && sop && (
        <AddVersionModal
          isOpen={addVersionModalOpen}
          onClose={() => setAddVersionModalOpen(false)}
          sopDocument={sop}
          onSuccess={handleAddVersionSuccess}
        />
      )}

      {/* Delete SOP Modal */}
      {deleteModalOpen && sop && (
        <DeleteSOPModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          sopDocument={sop}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
