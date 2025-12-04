'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Download,
  AlertTriangle,
  CheckSquare,
  Printer,
  Calendar,
  User
} from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'
import { getSOPById, getSOPStructuredContent, getSOPFileUrl } from '../../_actions/sops'
import type { SOPDocument, SOPStructuredContent } from '../../_types/sop'

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ExecuteSOPPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mode } = useTheme()
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const borderColor = getBorderColor(mode)
  const bgCard = getCardBackground(mode)

  const sopId = params.id as string
  const versionIdFromQuery = searchParams.get('versionId')

  const [loading, setLoading] = useState(true)
  const [sop, setSOP] = useState<SOPDocument | null>(null)
  const [structuredContent, setStructuredContent] = useState<SOPStructuredContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sopId) {
      fetchSOPData()
    }
  }, [sopId, versionIdFromQuery])

  const fetchSOPData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch SOP document
      const sopResult = await getSOPById(sopId)
      if (sopResult.success && sopResult.data) {
        setSOP(sopResult.data)

        // Determine which version to load: query param takes precedence
        const versionIdToLoad = versionIdFromQuery || sopResult.data.current_version_id

        // Fetch structured content if available
        if (versionIdToLoad) {
          const contentResult = await getSOPStructuredContent(versionIdToLoad)
          if (contentResult.success && contentResult.data) {
            setStructuredContent(contentResult.data)
          } else {
            setError(
              contentResult.error ||
              'This SOP version doesn\'t have structured content yet. It may have been created from a PDF upload only, or the content hasn\'t been added.'
            )
          }
        } else {
          setError('No version available for this SOP.')
        }
      } else {
        setError(sopResult.error || 'SOP not found')
      }
    } catch (error) {
      console.error('Error fetching SOP:', error)
      setError('An error occurred while loading the SOP')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!sop?.current_version?.file_url) return
    try {
      const result = await getSOPFileUrl(sop.current_version.file_url)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !sop || !structuredContent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <FileText className={`w-16 h-16 ${textMuted} mx-auto mb-4`} />
          <h1 className={`text-2xl font-bold ${textColor} mb-2`}>
            {error ? 'Content Not Available' : 'SOP Not Found'}
          </h1>
          <p className={`${textMuted} mb-6`}>
            {error || 'This SOP doesn\'t have structured content or doesn\'t exist.'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgCard}`}>
      {/* Header - Non-printable */}
      <div className="print:hidden sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className={textColor}>Back</span>
            </button>

            <div className="flex items-center gap-2">
              {sop.current_version?.file_url && (
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className={textColor}>Download PDF</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* SOP Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-300 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl print:bg-blue-600">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${textMuted} uppercase tracking-wider`}>
                    Standard Operating Procedure
                  </p>
                  <h1 className={`text-3xl font-bold ${textColor}`}>{sop.code}</h1>
                </div>
              </div>
              <h2 className={`text-2xl ${textColor} mt-2`}>{sop.title}</h2>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>
                Category
              </p>
              <p className={`${textColor} capitalize`}>{sop.category}</p>
            </div>

            {sop.department && (
              <div>
                <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>
                  Department
                </p>
                <p className={textColor}>{sop.department}</p>
              </div>
            )}

            {sop.current_version && (
              <>
                <div>
                  <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>
                    Version
                  </p>
                  <p className={`${textColor} font-medium`}>
                    v{sop.current_version.version_number}
                    {sop.current_version.revision_code && ` (${sop.current_version.revision_code})`}
                  </p>
                </div>

                {sop.current_version.effective_date && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>
                      Effective Date
                    </p>
                    <p className={`${textColor} flex items-center gap-1.5`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(sop.current_version.effective_date)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Structured Content Sections */}
        <div className="space-y-8">
          {structuredContent.purpose && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                1. Purpose
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.purpose }}
              />
            </section>
          )}

          {structuredContent.scope && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                2. Scope
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.scope }}
              />
            </section>
          )}

          {structuredContent.responsibilities && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                3. Responsibilities
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.responsibilities }}
              />
            </section>
          )}

          {structuredContent.definitions && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                4. Definitions
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.definitions }}
              />
            </section>
          )}

          {structuredContent.required_materials_equipment && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                5. Required Materials & Equipment
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.required_materials_equipment }}
              />
            </section>
          )}

          {/* Safety Precautions - Highlighted */}
          {structuredContent.safety_precautions && (
            <section className="operator-card operator-card-warning overflow-hidden rounded-2xl shadow-lg">
              <div className="operator-card-header px-6 py-4 border-b border-white/10">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 text-white" />
                  6. Safety Precautions
                </h3>
              </div>
              <div className="operator-card-body p-6">
                <div
                  className="text-white text-lg leading-relaxed prose prose-lg max-w-none font-medium prose-invert [&_p]:text-white [&_ol]:text-white [&_ul]:text-white [&_li]:text-white [&_strong]:text-white [&_em]:text-white"
                  dangerouslySetInnerHTML={{ __html: structuredContent.safety_precautions }}
                />
              </div>
            </section>
          )}

          {/* Procedure - Main Content Emphasized */}
          <section className="operator-card operator-card-primary overflow-hidden rounded-2xl shadow-lg">
            <div className="operator-card-header px-6 py-4 border-b border-white/10">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <CheckSquare className="w-8 h-8 text-white" />
                7. Procedure
              </h3>
            </div>
            <div className="operator-card-body p-6">
              <div
                className="text-white text-lg leading-relaxed prose prose-lg max-w-none prose-invert [&_p]:text-white [&_ol]:text-white [&_ul]:text-white [&_li]:text-white [&_strong]:text-white [&_em]:text-white [&_code]:text-white"
                dangerouslySetInnerHTML={{ __html: structuredContent.procedure }}
              />
            </div>
          </section>

          {structuredContent.quality_control_checkpoints && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                8. Quality Control Checkpoints
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.quality_control_checkpoints }}
              />
            </section>
          )}

          {structuredContent.documentation_requirements && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                9. Documentation Requirements
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.documentation_requirements }}
              />
            </section>
          )}

          {structuredContent.deviations_and_corrective_actions && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                10. Deviations & Corrective Actions
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.deviations_and_corrective_actions }}
              />
            </section>
          )}

          {structuredContent.references && (
            <section>
              <h3 className={`text-xl font-bold ${textColor} mb-3 pb-2 border-b ${borderColor}`}>
                11. References
              </h3>
              <div
                className={`${textColor} text-lg leading-relaxed prose prose-lg max-w-none`}
                dangerouslySetInnerHTML={{ __html: structuredContent.references }}
              />
            </section>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-6 border-t-2 ${borderColor}`}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {sop.current_version?.approved_by && (
              <div>
                <p className={`font-medium ${textMuted} mb-1`}>Approved By:</p>
                <p className={textColor}>
                  {sop.current_version.approved_by.full_name || sop.current_version.approved_by.email}
                </p>
                {sop.current_version.approved_at && (
                  <p className={textMuted}>{formatDate(sop.current_version.approved_at)}</p>
                )}
              </div>
            )}

            {sop.current_version?.created_by && (
              <div>
                <p className={`font-medium ${textMuted} mb-1`}>Created By:</p>
                <p className={textColor}>
                  {sop.current_version.created_by.full_name || sop.current_version.created_by.email}
                </p>
                {sop.current_version.created_at && (
                  <p className={textMuted}>{formatDate(sop.current_version.created_at)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operator Mode Card Styles */}
      <style jsx global>{`
        /* Operator Mode Theme Variables - Easy to re-skin for different clients */
        :root {
          --operator-card-primary-bg: #2563eb;
          --operator-card-primary-header: #1d4ed8;
          --operator-card-warning-bg: #d97706;
          --operator-card-warning-header: #b45309;
          --operator-card-text: #ffffff;
        }

        /* Dark mode variants */
        .dark {
          --operator-card-primary-bg: #1e40af;
          --operator-card-primary-header: #1e3a8a;
          --operator-card-warning-bg: #b45309;
          --operator-card-warning-header: #92400e;
        }

        /* Base operator card - single unified layer */
        .operator-card {
          position: relative;
        }

        /* Primary card (blue SaaS theme) */
        .operator-card-primary {
          background: var(--operator-card-primary-bg);
        }

        .operator-card-primary .operator-card-header {
          background: var(--operator-card-primary-header);
        }

        /* Warning card (orange for safety) */
        .operator-card-warning {
          background: var(--operator-card-warning-bg);
        }

        .operator-card-warning .operator-card-header {
          background: var(--operator-card-warning-header);
        }

        /* Card body inherits parent background - no extra layers */
        .operator-card-body {
          background: transparent;
        }

        @media print {
          @page {
            margin: 1cm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:border-4 {
            border-width: 4px !important;
          }

          /* Ensure colored backgrounds print correctly */
          section,
          .operator-card,
          .operator-card-header,
          .operator-card-body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
