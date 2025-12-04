'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function AccountSettingsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const isAdmin = useMemo(() => profile?.role?.toLowerCase() === 'admin', [profile?.role])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    } else if (!loading && user && isAdmin) {
      // Redirect admins to new comprehensive settings
      router.replace('/settings/organization')
    }
  }, [loading, user, isAdmin, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#174940]" />
      </div>
    )
  }

  // Non-admin users see a simple message
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Info className="mx-auto h-12 w-12 text-[#174940]" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600">
            Contact your administrator to modify organization settings.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}
