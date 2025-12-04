'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Mail, Shield, UserCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppNav } from '@/components/nav/AppNav'

export default function AccountProfilePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const isAdmin = profile?.role?.toLowerCase() === 'admin'

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || (!user && loading)) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-24">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            Loading profile…
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNav currentPage="dashboard" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Your Profile</h1>
          <p className="text-sm text-gray-600">
            Review the contact details tied to your account. Reach out to an administrator if something needs to be updated.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#174940]/10 text-3xl font-semibold text-[#174940]">
                  {profile?.name?.charAt(0)?.toUpperCase() ??
                    user.email?.charAt(0)?.toUpperCase() ??
                    'U'}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile?.name || 'Unnamed User'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Member since{' '}
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
              <dl className="mt-6 space-y-4 text-sm text-gray-700">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#174940]" />
                  <div>
                    <dt className="font-medium text-gray-900">Email</dt>
                    <dd>{user.email}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-[#174940]" />
                  <div>
                    <dt className="font-medium text-gray-900">Role</dt>
                    <dd className="capitalize">{profile?.role ?? 'pending'}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserCircle2 className="h-4 w-4 text-[#174940]" />
                  <div>
                    <dt className="font-medium text-gray-900">User ID</dt>
                    <dd className="text-xs text-gray-500">{user.id}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Quick Actions
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-[#174940]">
                {isAdmin && (
                  <li>
                    <Link href="/account/settings" className="hover:underline">
                      Open organisation settings
                    </Link>
                  </li>
                )}
                {isAdmin && (
                  <li>
                    <Link href="/account/invite" className="hover:underline">
                      Invite a team member
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="/crm?tab=opportunities" className="hover:underline">
                    View your pipeline
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:underline">
                    Switch accounts
                  </Link>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Support
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Need changes made to your account, or want to adjust access? Drop a note to your system administrator so they can help.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
