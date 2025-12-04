'use client'

import { useState, useTransition } from 'react'
import { X, Upload, FileText, AlertCircle, BookOpen, FileUp } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'
import { createSOPStructured } from '../_actions/sops'
import type { SOPCategory, SOPDocumentStatus } from '../_types/sop'
import {
  DEPARTMENTS,
  getProcessTypesForDepartment,
  buildSOPCode,
  type Department,
  type ProcessType
} from '../_config/sop-codes'
import RichTextEditor from '@/components/RichTextEditor'

interface CreateSOPModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type ContentMode = 'pdf' | 'structured'
type TabType = 'basic' | 'content'

export default function CreateSOPModal({ isOpen, onClose, onSuccess }: CreateSOPModalProps) {
  const { mode } = useTheme()
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const borderColor = getBorderColor(mode)
  const bgCard = getCardBackground(mode)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [contentMode, setContentMode] = useState<ContentMode>('structured')

  // Basic Information fields
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<SOPDocumentStatus>('draft')
  const [revisionCode, setRevisionCode] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [changeSummary, setChangeSummary] = useState('Initial version')

  // Structured SOP Code fields
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedProcessType, setSelectedProcessType] = useState<ProcessType | null>(null)
  const [sequenceNumber, setSequenceNumber] = useState('')
  const [availableProcessTypes, setAvailableProcessTypes] = useState<ProcessType[]>([])

  // Legacy category field (no longer used for new SOPs, but kept for compatibility)
  const [category] = useState<SOPCategory>('manufacturing')

  // Structured Content fields
  const [purpose, setPurpose] = useState('')
  const [scope, setScope] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [definitions, setDefinitions] = useState('')
  const [requiredMaterialsEquipment, setRequiredMaterialsEquipment] = useState('')
  const [safetyPrecautions, setSafetyPrecautions] = useState('')
  const [procedure, setProcedure] = useState('')
  const [qualityControlCheckpoints, setQualityControlCheckpoints] = useState('')
  const [documentationRequirements, setDocumentationRequirements] = useState('')
  const [deviationsAndCorrectiveActions, setDeviationsAndCorrectiveActions] = useState('')
  const [references, setReferences] = useState('')

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

  const handleDepartmentChange = (departmentAbbrev: string) => {
    const dept = DEPARTMENTS.find(d => d.abbrev === departmentAbbrev)
    setSelectedDepartment(dept || null)
    setSelectedProcessType(null) // Reset process type when department changes
    setAvailableProcessTypes(
      departmentAbbrev ? getProcessTypesForDepartment(departmentAbbrev) : []
    )
  }

  const handleProcessTypeChange = (processTypeAbbrev: string) => {
    const processType = availableProcessTypes.find(pt => pt.abbrev === processTypeAbbrev)
    setSelectedProcessType(processType || null)
  }

  const handleSequenceNumberChange = (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '')
    setSequenceNumber(cleaned)
  }

  // Compute the full SOP code
  const fullSOPCode = selectedDepartment && selectedProcessType && sequenceNumber
    ? buildSOPCode(selectedDepartment.abbrev, selectedProcessType.abbrev, sequenceNumber)
    : ''

  const resetForm = () => {
    setTitle('')
    setStatus('draft')
    setRevisionCode('')
    setEffectiveDate('')
    setExpiryDate('')
    setChangeSummary('Initial version')
    setFile(null)
    setSelectedDepartment(null)
    setSelectedProcessType(null)
    setSequenceNumber('')
    setAvailableProcessTypes([])
    setPurpose('')
    setScope('')
    setResponsibilities('')
    setDefinitions('')
    setRequiredMaterialsEquipment('')
    setSafetyPrecautions('')
    setProcedure('')
    setQualityControlCheckpoints('')
    setDocumentationRequirements('')
    setDeviationsAndCorrectiveActions('')
    setReferences('')
    setActiveTab('basic')
    setContentMode('structured')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate structured code fields
    if (!selectedDepartment) {
      setError('Department is required')
      return
    }
    if (!selectedProcessType) {
      setError('Process Type is required')
      return
    }
    if (!sequenceNumber) {
      setError('SOP Code number is required')
      return
    }
    if (!title) {
      setError('Title is required')
      return
    }

    // Validation based on content mode
    if (contentMode === 'structured' && !procedure) {
      setError('Procedure is required for structured content')
      return
    }

    startTransition(async () => {
      try {
        const sopData: any = {
          code: fullSOPCode,
          title,
          category,
          department: selectedDepartment.name, // Store full department name in legacy field
          status,
          department_name: selectedDepartment.name,
          department_abbrev: selectedDepartment.abbrev,
          process_type_name: selectedProcessType.name,
          process_type_abbrev: selectedProcessType.abbrev,
          sop_sequence_number: sequenceNumber,
          revision_code: revisionCode || undefined,
          effective_date: effectiveDate || undefined,
          expiry_date: expiryDate || undefined,
          change_summary: changeSummary || undefined
        }

        // Add structured content if in structured mode
        if (contentMode === 'structured') {
          sopData.structured_content = {
            purpose: purpose || undefined,
            scope: scope || undefined,
            responsibilities: responsibilities || undefined,
            definitions: definitions || undefined,
            required_materials_equipment: requiredMaterialsEquipment || undefined,
            safety_precautions: safetyPrecautions || undefined,
            procedure,
            quality_control_checkpoints: qualityControlCheckpoints || undefined,
            documentation_requirements: documentationRequirements || undefined,
            deviations_and_corrective_actions: deviationsAndCorrectiveActions || undefined,
            references: references || undefined
          }
        }

        const result = await createSOPStructured(sopData, file || undefined)

        if (result.success) {
          onSuccess()
          resetForm()
        } else {
          setError(result.error || 'Failed to create SOP')
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border ${borderColor}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-bold ${textColor}`}>Create New SOP</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${textMuted}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderColor} px-6`}>
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : `border-transparent ${textMuted} hover:text-blue-500`
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : `border-transparent ${textMuted} hover:text-blue-500`
            }`}
          >
            Content
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Structured SOP Code Section - One Line Layout */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${textColor} pb-2 border-b ${borderColor}`}>
                  SOP Code Builder
                </h3>

                {/* One-Line: Department | Process Type | SOP Code */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDepartment?.abbrev || ''}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      required
                      className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">Select...</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.abbrev} value={dept.abbrev}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Process Type */}
                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      Process Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedProcessType?.abbrev || ''}
                      onChange={(e) => handleProcessTypeChange(e.target.value)}
                      required
                      disabled={!selectedDepartment}
                      className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {selectedDepartment ? 'Select...' : 'Dept first'}
                      </option>
                      {availableProcessTypes.map((pt) => (
                        <option key={pt.abbrev} value={pt.abbrev}>
                          {pt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SOP Code Number */}
                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      SOP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sequenceNumber}
                      onChange={(e) => handleSequenceNumberChange(e.target.value)}
                      placeholder="001"
                      maxLength={3}
                      required
                      className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                {/* Full SOP Code Preview */}
                {fullSOPCode && (
                  <div className={`p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400`}>
                    <p className={`text-sm font-medium ${textMuted} mb-1`}>Full SOP Code:</p>
                    <p className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>
                      {fullSOPCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Standard Cleaning Procedure for Production Equipment"
                  required
                  className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SOPDocumentStatus)}
                  className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Version Information */}
              <div className={`pt-4 border-t ${borderColor}`}>
                <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Initial Version Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      Revision Code
                    </label>
                    <input
                      type="text"
                      value={revisionCode}
                      onChange={(e) => setRevisionCode(e.target.value)}
                      placeholder="e.g., Rev A"
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

                <div className="mt-4">
                  <label className={`block text-sm font-medium ${textColor} mb-2`}>
                    Change Summary
                  </label>
                  <textarea
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    rows={3}
                    placeholder="Describe what's in this version..."
                    className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${bgCard} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Content Mode Toggle */}
              <div className={`p-4 border ${borderColor} rounded-lg`}>
                <label className={`block text-sm font-medium ${textColor} mb-3`}>
                  Content Mode
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setContentMode('structured')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      contentMode === 'structured'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : `${borderColor} hover:border-blue-300`
                    }`}
                  >
                    <BookOpen className={`w-5 h-5 mx-auto mb-1 ${contentMode === 'structured' ? 'text-blue-600 dark:text-blue-400' : textMuted}`} />
                    <p className={`text-sm font-medium ${contentMode === 'structured' ? 'text-blue-600 dark:text-blue-400' : textColor}`}>
                      Structured Content
                    </p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      Fill out GMP fields
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentMode('pdf')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      contentMode === 'pdf'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : `${borderColor} hover:border-blue-300`
                    }`}
                  >
                    <FileUp className={`w-5 h-5 mx-auto mb-1 ${contentMode === 'pdf' ? 'text-blue-600 dark:text-blue-400' : textMuted}`} />
                    <p className={`text-sm font-medium ${contentMode === 'pdf' ? 'text-blue-600 dark:text-blue-400' : textColor}`}>
                      PDF Upload
                    </p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      Upload existing PDF
                    </p>
                  </button>
                </div>
              </div>

              {/* Structured Content Form */}
              {contentMode === 'structured' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      1. Purpose
                    </label>
                    <RichTextEditor
                      content={purpose}
                      onChange={setPurpose}
                      placeholder="What is the objective of this SOP?"
                      minHeight="120px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      2. Scope
                    </label>
                    <RichTextEditor
                      content={scope}
                      onChange={setScope}
                      placeholder="What does this SOP cover?"
                      minHeight="100px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      3. Responsibilities
                    </label>
                    <RichTextEditor
                      content={responsibilities}
                      onChange={setResponsibilities}
                      placeholder="Who is responsible for what?"
                      minHeight="120px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      4. Definitions
                    </label>
                    <RichTextEditor
                      content={definitions}
                      onChange={setDefinitions}
                      placeholder="Key terms and definitions"
                      minHeight="100px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      5. Required Materials & Equipment
                    </label>
                    <RichTextEditor
                      content={requiredMaterialsEquipment}
                      onChange={setRequiredMaterialsEquipment}
                      placeholder="What materials and equipment are needed?"
                      minHeight="150px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      6. Safety Precautions
                    </label>
                    <RichTextEditor
                      content={safetyPrecautions}
                      onChange={setSafetyPrecautions}
                      placeholder="Important safety warnings and PPE requirements"
                      minHeight="150px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      7. Procedure <span className="text-red-500">*</span>
                    </label>
                    <RichTextEditor
                      content={procedure}
                      onChange={setProcedure}
                      placeholder="Step-by-step instructions..."
                      minHeight="300px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      8. Quality Control Checkpoints
                    </label>
                    <RichTextEditor
                      content={qualityControlCheckpoints}
                      onChange={setQualityControlCheckpoints}
                      placeholder="QC checks and acceptance criteria"
                      minHeight="120px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      9. Documentation Requirements
                    </label>
                    <RichTextEditor
                      content={documentationRequirements}
                      onChange={setDocumentationRequirements}
                      placeholder="What records must be kept?"
                      minHeight="100px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      10. Deviations & Corrective Actions
                    </label>
                    <RichTextEditor
                      content={deviationsAndCorrectiveActions}
                      onChange={setDeviationsAndCorrectiveActions}
                      placeholder="How to handle deviations"
                      minHeight="120px"
                      mode={mode}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      11. References
                    </label>
                    <RichTextEditor
                      content={references}
                      onChange={setReferences}
                      placeholder="Related documents and references"
                      minHeight="100px"
                      mode={mode}
                    />
                  </div>
                </div>
              )}

              {/* PDF Upload */}
              {contentMode === 'pdf' && (
                <div>
                  <label className={`block text-sm font-medium ${textColor} mb-2`}>
                    Upload PDF Document
                  </label>
                  <div
                    className={`relative border-2 border-dashed ${borderColor} rounded-lg p-8 text-center hover:border-blue-500 transition-colors`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className={`w-12 h-12 ${textMuted} mx-auto mb-3`} />
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
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
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
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Creating...' : 'Create SOP'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
