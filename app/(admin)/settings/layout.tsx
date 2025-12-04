'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldAlert, Settings, Building2, Palette, Users, Package, Cog, Store, DollarSign, Bell, Plug, Database } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { AppNav } from '@/components/nav/AppNav'

type SettingsSection = {
  key: string
  label: string
  href: string
  icon: typeof Settings
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { key: 'organization', label: 'Organization', href: '/settings/organization', icon: Building2 },
  { key: 'branding', label: 'Branding & Templates', href: '/settings/branding', icon: Palette },
  { key: 'users', label: 'Users & Roles', href: '/settings/users', icon: Users },
  { key: 'inventory', label: 'Inventory', href: '/settings/inventory', icon: Package },
  { key: 'manufacturing', label: 'Manufacturing', href: '/settings/manufacturing', icon: Cog },
  { key: 'crm', label: 'CRM', href: '/settings/crm', icon: Store },
  { key: 'finance', label: 'Finance', href: '/settings/finance', icon: DollarSign },
  { key: 'notifications', label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { key: 'integrations', label: 'Integrations', href: '/settings/integrations', icon: Plug },
  { key: 'data', label: 'Data Admin', href: '/settings/data', icon: Database },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = useMemo(() => profile?.role?.toLowerCase() === 'admin', [profile?.role])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || (!user && loading)) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-6 py-24">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174940]" />
            Loading settings…
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
              You need administrator access to modify the operating system settings. Reach out to your CureCore ERP admin if you need changes.
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNav currentPage="dashboard" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-10">
        {/* Left Navigation */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-10 space-y-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 text-[#174940]">
              <Settings className="h-5 w-5" />
              <h2 className="font-semibold text-gray-900">Settings</h2>
            </div>
            <nav className="space-y-1">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon
                const isActive = pathname === section.href
                return (
                  <Link
                    key={section.key}
                    href={section.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-[#174940] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {section.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
