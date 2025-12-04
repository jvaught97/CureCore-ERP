export type Role = 'admin' | 'ops' | 'quality' | 'finance' | 'sales' | 'crm'

type DashboardPage = 'operations' | 'commercial' | 'financial'

const DASHBOARD_ACCESS: Record<DashboardPage, Role[]> = {
  operations: ['admin', 'ops', 'quality', 'finance'],
  commercial: ['admin', 'sales', 'crm', 'finance'],
  financial: ['admin', 'finance'],
}

export function canViewDashboard(page: DashboardPage, role: Role) {
  const allowed = DASHBOARD_ACCESS[page]
  if (!allowed) return false
  return allowed.includes(role) || role === 'admin'
}
