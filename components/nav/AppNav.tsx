'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  CircleUserRound,
  Settings as SettingsIcon,
  UserPlus,
  Sun,
  Moon,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { canViewDashboard, Role } from '@/lib/roles'
import { useTheme } from '@/lib/context/ThemeContext'

type NavGroupKey = 'operations' | 'commercial' | 'finance'
type NavLinkKey = 'dashboard'

export type AppNavKey =
  | 'dashboard'
  | 'inventory'
  | 'rnd'
  | 'formulations'
  | 'batches'
  | 'packaging'
  | 'finished-goods'
  | 'sops'
  | 'crm'
  | 'sales-orders'
  | 'distribution'
  | 'pnl'
  | 'budgeting'
  | 'payroll'
  | 'accounting'
  | 'chart-of-accounts'
  | 'journal-entries'
  | 'accounts-receivable'
  | 'accounts-payable'
  | 'bank-reconciliation'
  | 'tax-management'
  | 'financial-reports'
  | 'dashboard-operations'
  | 'dashboard-commercial'
  | 'dashboard-financial'

type NavItem = {
  key: AppNavKey
  label: string
  href: string
  featureFlag?: keyof FeatureFlags
  requiredRoles?: Role[]
}

type FeatureFlags = {
  crm: boolean
  distribution: boolean
}

type NavGroup = {
  key: NavGroupKey
  label: string
  items: NavItem[]
}

type NavLink = {
  key: NavLinkKey
  label: string
  href: string
  requiredRoles?: Role[]
}

type AppNavProps = {
  currentPage?: AppNavKey
}

const NAV_LINKS: NavLink[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', requiredRoles: ['admin', 'ops', 'quality', 'finance', 'sales', 'crm'] },
]

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { key: 'inventory', label: 'Inventory', href: '/inventory', requiredRoles: ['admin', 'ops'] },
      { key: 'rnd', label: 'R&D', href: '/rnd', requiredRoles: ['admin', 'ops'] },
      { key: 'formulations', label: 'Formulations', href: '/formulations', requiredRoles: ['admin', 'ops'] },
      { key: 'batches', label: 'Batches', href: '/batches', requiredRoles: ['admin', 'ops'] },
      { key: 'packaging', label: 'Packaging', href: '/packaging', requiredRoles: ['admin', 'ops'] },
      { key: 'finished-goods', label: 'Finished Goods', href: '/finished-goods', requiredRoles: ['admin', 'ops'] },
      { key: 'sops', label: 'SOP Library', href: '/operations/sops', requiredRoles: ['admin', 'ops', 'quality'] },
    ],
  },
  {
    key: 'commercial',
    label: 'Commercial',
    items: [
      { key: 'crm', label: 'CRM', href: '/crm', featureFlag: 'crm', requiredRoles: ['admin', 'sales'] },
      { key: 'sales-orders', label: 'Sales Orders', href: '/sales-orders', requiredRoles: ['admin', 'sales'] },
      { key: 'distribution', label: 'Distribution', href: '/distribution', featureFlag: 'distribution', requiredRoles: ['admin', 'ops'] },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { key: 'pnl', label: 'P&L', href: '/pnl', requiredRoles: ['admin', 'finance'] },
      { key: 'budgeting', label: 'Budgeting', href: '/budgeting', requiredRoles: ['admin', 'finance'] },
      { key: 'payroll', label: 'Payroll', href: '/payroll', requiredRoles: ['admin', 'finance'] },
      { key: 'accounting', label: 'Accounting', href: '/accounting', requiredRoles: ['admin', 'finance'] },
      { key: 'chart-of-accounts', label: 'Chart of Accounts', href: '/accounting/chart-of-accounts', requiredRoles: ['admin', 'finance'] },
      { key: 'journal-entries', label: 'Journal Entries', href: '/accounting/journal-entries', requiredRoles: ['admin', 'finance'] },
      { key: 'accounts-receivable', label: 'Accounts Receivable', href: '/accounting/accounts-receivable', requiredRoles: ['admin', 'finance'] },
      { key: 'accounts-payable', label: 'Accounts Payable', href: '/accounting/accounts-payable', requiredRoles: ['admin', 'finance'] },
      { key: 'bank-reconciliation', label: 'Bank Reconciliation', href: '/finance/reconciliation', requiredRoles: ['admin', 'finance'] },
      { key: 'tax-management', label: 'Tax Management', href: '/accounting/tax-management', requiredRoles: ['admin', 'finance'] },
      { key: 'financial-reports', label: 'Financial Reports', href: '/accounting/reports', requiredRoles: ['admin', 'finance'] },
    ],
  },
]

const DEFAULT_FLAGS: FeatureFlags = {
  crm: true,
  distribution: true,
}

export function AppNav({ currentPage }: AppNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const { mode, setMode } = useTheme()
  const role = (profile?.role?.toLowerCase() ?? 'ops') as Role
  const featureFlags = useMemo<FeatureFlags>(() => DEFAULT_FLAGS, [])

  const [openGroup, setOpenGroup] = useState<NavGroupKey | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const hasRole = useCallback((required?: Role[]) => {
    if (!required || required.length === 0) return true
    return required.includes(role) || role === 'admin'
  }, [role])

  const accessibleLinks = useMemo(() => {
    return NAV_LINKS.filter((link) => hasRole(link.requiredRoles))
  }, [hasRole])

  const accessibleGroups = useMemo(() => {
    const canUseFeature = (flag?: keyof FeatureFlags) => {
      if (!flag) return true
      return featureFlags[flag]
    }

    return NAV_GROUPS.map((group) => {
      const items = group.items.filter((item) => {
        if (!canUseFeature(item.featureFlag) || !hasRole(item.requiredRoles)) return false
        return true
      })
      return { ...group, items }
    }).filter((group) => group.items.length > 0)
  }, [featureFlags, hasRole])

  const flattenedItems = useMemo(
    () => [...accessibleLinks, ...accessibleGroups.flatMap((group) => group.items)],
    [accessibleLinks, accessibleGroups]
  )

  const normalizedPath = useMemo(() => {
    if (!pathname) return '/'
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return pathname.slice(0, -1)
    }
    return pathname
  }, [pathname])

  const matchedItem = useMemo(() => {
    let best: NavItem | undefined
    for (const item of flattenedItems) {
      if (item.href === '/') {
        if (normalizedPath === '/' && (!best || best.href.length < 1)) {
          best = item
        }
        continue
      }
      if (
        normalizedPath === item.href ||
        normalizedPath.startsWith(`${item.href}/`)
      ) {
        if (!best || item.href.length > best.href.length) {
          best = item
        }
      }
    }
    return best
  }, [flattenedItems, normalizedPath])

  const activeItemKey: AppNavKey | undefined = matchedItem?.key ?? currentPage

  const activeGroupKey = accessibleGroups.find((group) =>
    group.items.some((item) => item.key === activeItemKey),
  )?.key

  const isDashboardActive = activeItemKey === 'dashboard' || activeItemKey?.startsWith('dashboard-')

  const handleNavigate = (href: string) => {
    router.push(href)
    setOpenGroup(null)
  }

  const openWithCancel = useCallback((group: NavGroupKey) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpenGroup(group)
  }, [])

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setOpenGroup(null)
      closeTimer.current = null
    }, 250)
  }, [])

  const userInitials = useMemo(() => {
    const name = profile?.name || profile?.email || 'User'
    const matches = name.match(/\b\w/g) || []
    return matches.join('').slice(0, 2).toUpperCase()
  }, [profile])

  const mockNotifications = useMemo(
    () => [
      { id: '1', title: 'New lead assigned', time: '2h ago' },
      { id: '2', title: 'Quote CC-102 accepted', time: 'Yesterday' },
    ],
    []
  )

  return (
    <nav className="bg-[#174940] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <button
          onClick={() => handleNavigate('/')}
          className="text-xl font-bold text-white hover:text-white/80 transition"
        >
          CureCore
        </button>
        <div className="flex items-center gap-6">
          {accessibleLinks.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => handleNavigate(link.href)}
              className={`relative inline-flex items-center gap-1 text-sm font-semibold transition ${
                isDashboardActive ? 'text-white' : 'text-white/80 hover:text-white'
              } ${isDashboardActive ? 'after:absolute after:left-0 after:bottom-[-10px] after:h-0.5 after:w-full after:bg-emerald-300 after:rounded-full' : ''}`}
            >
              {link.label}
            </button>
          ))}
          {accessibleGroups.map((group) => {
            const isActive = activeGroupKey === group.key
            const isOpen = openGroup === group.key
            return (
              <div
                key={group.key}
                className="relative"
                onMouseEnter={() => openWithCancel(group.key)}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => (isOpen ? setOpenGroup(null) : openWithCancel(group.key))}
                  className={`relative inline-flex items-center gap-1 text-sm font-semibold transition ${
                    isActive ? 'text-white' : 'text-white/80 hover:text-white'
                  } ${isActive ? 'after:absolute after:left-0 after:bottom-[-10px] after:h-0.5 after:w-full after:bg-emerald-300 after:rounded-full' : isOpen ? 'after:absolute after:left-0 after:bottom-[-10px] after:h-0.5 after:w-full after:bg-white/40 after:rounded-full' : ''}`}
                >
                  {group.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg z-50"
                    onMouseEnter={() => openWithCancel(group.key)}
                    onMouseLeave={scheduleClose}
                  >
                    <ul className="py-2 text-sm">
                      {group.items.map((item) => {
                        const itemActive = item.key === activeItemKey
                        return (
                          <li key={item.key}>
                            <button
                              onClick={() => handleNavigate(item.href)}
                              className={`block w-full px-4 py-2 text-left transition ${
                                itemActive ? 'bg-[#174940] text-white' : 'hover:bg-gray-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`rounded-full p-1.5 transition ${
                  mode === 'light' ? 'bg-white text-[#174940]' : 'text-white/70 hover:text-white'
                }`}
                title="Light mode"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`rounded-full p-1.5 transition ${
                  mode === 'dark' ? 'bg-white text-[#174940]' : 'text-white/70 hover:text-white'
                }`}
                title="Dark mode"
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('neon')}
                className={`rounded-full p-1.5 transition ${
                  mode === 'neon' ? 'bg-[#48A999] text-white' : 'text-white/70 hover:text-white'
                }`}
                title="Neon mode"
              >
                <Zap className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications((prev) => !prev)
                  setShowProfileMenu(false)
                }}
                className="relative rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-haspopup="true"
                aria-expanded={showNotifications}
              >
                <Bell className="h-5 w-5" />
                {mockNotifications.length > 0 && (
                  <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                )}
                <span className="sr-only">View notifications</span>
              </button>
              {showNotifications && (
                <div
                  className="absolute right-0 mt-3 w-72 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-xl"
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {mockNotifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500">You’re all caught up.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100 text-sm">
                        {mockNotifications.map((notification) => (
                          <li key={notification.id} className="px-4 py-3">
                            <p className="font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500">{notification.time}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev)
                  setShowNotifications(false)
                }}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-haspopup="true"
                aria-expanded={showProfileMenu}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#174940]">
                  {userInitials || <CircleUserRound className="h-5 w-5" />}
                </span>
                <div className="hidden text-left sm:flex sm:flex-col">
                  <span className="text-xs text-white/70">Signed in as</span>
                  <span className="text-sm text-white">
                    {profile?.name || profile?.email || 'Profile'}
                  </span>
                </div>
                <ChevronDown className={`hidden h-4 w-4 sm:block ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-3 w-56 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-xl"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.name || 'Your profile'}
                    </p>
                    <p className="text-xs text-gray-500">{profile?.email}</p>
                  </div>
                  <ul className="py-1 text-sm">
                    <li>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/account/profile')
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-100"
                      >
                        <CircleUserRound className="h-4 w-4" />
                        View Profile
                      </button>
                    </li>
                    {profile?.role?.toLowerCase() === 'admin' && (
                      <li>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            router.push('/account/invite')
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-100"
                        >
                          <UserPlus className="h-4 w-4" />
                          Invite Team Member
                        </button>
                      </li>
                    )}
                    {profile?.role?.toLowerCase() === 'admin' && (
                      <li>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            router.push('/account/settings')
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-100"
                        >
                          <SettingsIcon className="h-4 w-4" />
                          Settings
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          signOut().catch((err) => console.error('Sign out failed', err))
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
