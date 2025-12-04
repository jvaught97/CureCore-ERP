'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  ShieldAlert,
  UserPlus,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppNav } from '@/components/nav/AppNav'

type InviteFormState = {
  firstName: string
  lastName: string
  email: string
  role: string
  permissions: string[]
}

type InviteResult = {
  tempUsername: string
  tempPassword: string
  email: string
  role: string
}

const DEFAULT_FORM: InviteFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'ops',
  permissions: ['inventory:view', 'crm:view'],
}

const ROLE_OPTIONS = [
  { value: 'ops', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Administrator' },
]

const PERMISSION_OPTIONS: Array<{ value: string; label: string; group: string }> = [
  { value: 'inventory:view', label: 'View Inventory', group: 'Operations' },
  { value: 'inventory:edit', label: 'Edit Inventory', group: 'Operations' },
  { value: 'crm:view', label: 'View CRM', group: 'Commercial' },
  { value: 'crm:edit', label: 'Edit CRM', group: 'Commercial' },
  { value: 'accounting:view', label: 'View Accounting', group: 'Finance' },
  { value: 'accounting:post', label: 'Post Journal Entries', group: 'Finance' },
  { value: 'reports:export', label: 'Export Reports', group: 'Analytics' },
]

const generateTempCredential = () =>
  Math.random().toString(36).slice(2, 10)

export default function InviteTeamMemberPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const isAdmin = useMemo(() => profile?.role?.toLowerCase() === 'admin', [profile?.role])
  const [form, setForm] = useState<InviteFormState>(DEFAULT_FORM)
  const [sendCopy, setSendCopy] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<InviteResult | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || (!user && loading)) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AppNav currentPage="dashboard" />
        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-24">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            Loading member invite…
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AppNav currentPage="dashboard" />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Admins Only</h1>
            <p className="text-sm text-gray-600">
              Only administrators can invite new teammates. If you believe this is a mistake, contact your CureCore ERP administrator.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
          >
            Return to dashboard
          </Link>
        </main>
      </div>
    )
  }

  const handleTogglePermission = (permission: string) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(permission)
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((item) => item !== permission)
          : [...prev.permissions, permission],
      }
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.email.trim()) {
      alert('Email is required to send an invite.')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      const tempUsername = `temp-${generateTempCredential()}`
      const tempPassword = generateTempCredential()
      setResult({
        tempUsername,
        tempPassword,
        email: form.email.trim(),
        role: form.role,
      })
      setSubmitting(false)
      setForm(DEFAULT_FORM)
    }, 900)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNav currentPage="dashboard" />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-3 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 text-[#174940]">
            <UserPlus className="h-6 w-6" />
            <h1 className="text-3xl font-semibold text-gray-900">Invite a Team Member</h1>
          </div>
          <p className="text-sm text-gray-600">
            Send a welcome email with temporary credentials. New users are prompted to personalise their login on first access.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                First Name
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  placeholder="Jordan"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Last Name
                <input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  placeholder="Lopez"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Work Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
                placeholder="name@company.com"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={sendCopy}
                  onChange={(event) => setSendCopy(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                />
                Email me a copy of the invitation
              </label>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Fine-Grained Permissions</span>
              <p className="text-xs text-gray-500">
                Toggle modules this teammate can access. Roles grant a baseline; use permissions to tailor further.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PERMISSION_OPTIONS.map((permission) => {
                  const checked = form.permissions.includes(permission.value)
                  return (
                    <label
                      key={permission.value}
                      className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 hover:border-[#174940]/40"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleTogglePermission(permission.value)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940] focus:ring-[#174940]"
                      />
                      <span>
                        <span className="block text-gray-900">{permission.label}</span>
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">
                          {permission.group}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c] disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invite
            </button>
          </form>

          <aside className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                What Happens Next?
              </h2>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <BadgeCheck className="mt-1 h-4 w-4 text-[#174940]" />
                  An email is sent with a temporary username & password.
                </li>
                <li className="flex gap-2">
                  <BadgeCheck className="mt-1 h-4 w-4 text-[#174940]" />
                  The teammate signs in, confirms their email, and creates a secure password.
                </li>
                <li className="flex gap-2">
                  <BadgeCheck className="mt-1 h-4 w-4 text-[#174940]" />
                  Assigned roles & permissions take effect immediately across the platform.
                </li>
              </ol>
            </div>

            {result ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <div className="flex items-center gap-2 font-semibold text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Invitation ready
                </div>
                <p className="mt-2 text-xs text-green-800">
                  Share these temporary credentials with {result.email}. Their first login will prompt them to enter their personal email and choose a password.
                </p>
                <dl className="mt-3 space-y-1 text-xs text-green-900">
                  <div className="flex justify-between">
                    <dt className="font-medium">Temp Username</dt>
                    <dd className="font-mono">{result.tempUsername}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Temp Password</dt>
                    <dd className="font-mono">{result.tempPassword}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Role</dt>
                    <dd className="capitalize">{result.role}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                <p>
                  Need to correct permissions after inviting someone? Head to{' '}
                  <Link href="/account/settings" className="font-medium text-[#174940] hover:underline">
                    Operating Settings
                  </Link>{' '}
                  to adjust roles or revoke access.
                </p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}
