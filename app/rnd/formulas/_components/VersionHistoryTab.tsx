'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, CheckCircle2, Loader2 } from 'lucide-react'
import { getFormulaVersions } from '@/app/rnd/_actions'

type FormulaVersion = {
  id: string
  name: string
  version: string
  version_major: number
  version_minor: number
  is_locked: boolean
  parent_version_id: string | null
  created_at: string
  notes: string | null
}

type VersionHistoryTabProps = {
  formulaName: string
  currentFormulaId: string
}

export function VersionHistoryTab({ formulaName, currentFormulaId }: VersionHistoryTabProps) {
  const router = useRouter()
  const [versions, setVersions] = useState<FormulaVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getFormulaVersions(formulaName)
        setVersions(data as FormulaVersion[])
      } catch (err) {
        console.error('Failed to load formula versions:', err)
        setError('Failed to load version history. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (formulaName) {
      load()
    }
  }, [formulaName])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin text-[#174940]" />
          Loading version history...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-600">No version history available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
        <p className="mt-1 text-sm text-gray-600">
          All versions of &quot;{formulaName}&quot; formula family
        </p>
      </div>

      <div className="space-y-3">
        {versions.map((version) => {
          const isCurrent = version.id === currentFormulaId

          return (
            <div
              key={version.id}
              className={`flex items-center justify-between rounded-lg border p-4 transition ${
                isCurrent
                  ? 'border-[#174940] bg-[#174940]/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    isCurrent ? 'bg-[#174940] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {version.version}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isCurrent && <CheckCircle2 className="h-4 w-4 text-[#174940]" />}
                    <span className="text-sm font-medium text-gray-900">
                      {isCurrent ? 'Current Version' : 'Previous Version'}
                    </span>
                    {version.is_locked && (
                      <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        <Lock className="h-3 w-3" />
                        Locked
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Created {new Date(version.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {version.notes && (
                    <div className="mt-2 text-xs text-gray-600 line-clamp-2">{version.notes}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isCurrent && (
                  <button
                    onClick={() => router.push(`/rnd/formulas/${version.id}`)}
                    className="inline-flex items-center gap-2 rounded-md border border-[#174940] px-3 py-2 text-sm font-medium text-[#174940] hover:bg-[#174940]/5"
                  >
                    View Version
                  </button>
                )}
                {isCurrent && (
                  <span className="text-xs font-medium text-[#174940]">Viewing now</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {versions.length > 1 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <p className="font-semibold">Version Control Tips:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Locked versions are read-only and preserve historical formulas</li>
            <li>Click &quot;View Version&quot; to see older formulas</li>
            <li>Create a new version from any formula to continue development</li>
          </ul>
        </div>
      )}
    </div>
  )
}
