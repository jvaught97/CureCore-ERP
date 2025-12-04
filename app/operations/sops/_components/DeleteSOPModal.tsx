'use client'

import { useState, useTransition } from 'react'
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'
import { deleteSOPById } from '../_actions/sops'
import type { SOPDocument } from '../_types/sop'

interface DeleteSOPModalProps {
  isOpen: boolean
  onClose: () => void
  sopDocument: SOPDocument
  onSuccess: () => void
}

export default function DeleteSOPModal({
  isOpen,
  onClose,
  sopDocument,
  onSuccess
}: DeleteSOPModalProps) {
  const { mode } = useTheme()
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const borderColor = getBorderColor(mode)
  const bgCard = getCardBackground(mode)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmationCode, setConfirmationCode] = useState('')

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (confirmationCode !== sopDocument.code) {
      setError('SOP code does not match. Please type the exact code to confirm deletion.')
      return
    }

    startTransition(async () => {
      try {
        const result = await deleteSOPById(sopDocument.id, confirmationCode)

        if (result.success) {
          onSuccess()
          onClose()
        } else {
          setError(result.error || 'Failed to delete SOP')
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div
        className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-md border ${borderColor}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${borderColor} flex items-center justify-between bg-red-50 dark:bg-red-900/20`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold text-red-600 dark:text-red-400`}>Delete SOP</h2>
              <p className={`text-sm ${textMuted}`}>This action cannot be undone</p>
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
        <form onSubmit={handleDelete} className="px-6 py-6">
          <div className="space-y-4">
            {/* Warning Message */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-medium text-red-600 dark:text-red-400 mb-2`}>
                    Warning: This will permanently delete:
                  </p>
                  <ul className={`text-sm text-red-600 dark:text-red-400 space-y-1 list-disc list-inside`}>
                    <li>The SOP document</li>
                    <li>All version history</li>
                    <li>All structured content</li>
                    <li>All associated files</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SOP Info */}
            <div className={`p-4 rounded-lg border ${borderColor}`}>
              <p className={`text-sm ${textMuted} mb-1`}>You are about to delete:</p>
              <p className={`text-lg font-bold ${textColor}`}>{sopDocument.code}</p>
              <p className={`text-sm ${textColor}`}>{sopDocument.title}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Confirmation Input */}
            <div>
              <label className={`block text-sm font-medium ${textColor} mb-2`}>
                Type <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">{sopDocument.code}</code> to confirm deletion
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="Enter SOP code"
                required
                autoFocus
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-red-500 font-mono`}
              />
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
              disabled={isPending || confirmationCode !== sopDocument.code}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isPending ? 'Deleting...' : 'Delete SOP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
