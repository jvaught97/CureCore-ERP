'use client'

import { useState, useTransition } from 'react'
import { X, Upload, FileText, AlertCircle } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'
import { createSOPVersion } from '../_actions/sops'
import type { SOPDocument } from '../_types/sop'

interface AddVersionModalProps {
  isOpen: boolean
  onClose: () => void
  sopDocument: SOPDocument
  onSuccess: () => void
}

export default function AddVersionModal({
  isOpen,
  onClose,
  sopDocument,
  onSuccess
}: AddVersionModalProps) {
  const { mode } = useTheme()
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const borderColor = getBorderColor(mode)
  const bgCard = getCardBackground(mode)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  // Form fields
  const [revisionCode, setRevisionCode] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [changeSummary, setChangeSummary] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!changeSummary) {
      setError('Change summary is required')
      return
    }

    startTransition(async () => {
      try {
        const versionData = {
          sop_document_id: sopDocument.id,
          revision_code: revisionCode || undefined,
          effective_date: effectiveDate || undefined,
          expiry_date: expiryDate || undefined,
          change_summary: changeSummary
        }

        const result = await createSOPVersion(versionData, file || undefined)

        if (result.success) {
          onSuccess()
          // Reset form
          setRevisionCode('')
          setEffectiveDate('')
          setExpiryDate('')
          setChangeSummary('')
          setFile(null)
        } else {
          setError(result.error || 'Failed to create version')
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div
        className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border ${borderColor}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textColor}`}>Add New Version</h2>
              <p className={`text-sm ${textMuted}`}>
                {sopDocument.code} - {sopDocument.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${textMuted}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Current Version Info */}
            {sopDocument.current_version && (
              <div className={`p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border ${borderColor}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Current Version</p>
                <p className={`text-lg font-semibold ${textColor}`}>
                  v{sopDocument.current_version.version_number}
                  {sopDocument.current_version.revision_code &&
                    ` (${sopDocument.current_version.revision_code})`}
                </p>
                <p className={`text-sm ${textMuted} mt-1`}>
                  Next version will be v{sopDocument.current_version.version_number + 1}
                </p>
              </div>
            )}

            {/* Version Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>
                  Revision Code
                </label>
                <input
                  type="text"
                  value={revisionCode}
                  onChange={(e) => setRevisionCode(e.target.value)}
                  placeholder="e.g., Rev B"
                  className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${textColor} mb-2`}>
                Change Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                rows={4}
                required
                placeholder="Describe the changes in this version..."
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className={`text-xs ${textMuted} mt-1`}>
                Explain what changed from the previous version
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className={`block text-sm font-medium ${textColor} mb-2`}>
                Upload PDF Document
              </label>
              <div
                className={`relative border-2 border-dashed ${borderColor} rounded-lg p-6 text-center hover:border-blue-500 transition-colors`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className={`w-8 h-8 ${textMuted} mx-auto mb-2`} />
                {file ? (
                  <div>
                    <p className={`text-sm ${textColor} font-medium`}>{file.name}</p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className={`text-sm ${textColor}`}>
                      Click to upload or drag and drop
                    </p>
                    <p className={`text-xs ${textMuted} mt-1`}>PDF only, max 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className={`p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800`}>
              <p className={`text-sm ${textColor}`}>
                <strong>Note:</strong> Creating a new version will mark the current version as
                "superseded" and set this new version as the current one.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={`px-4 py-2 rounded-lg border ${borderColor} ${textColor} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creating Version...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
