'use client'

import { useEffect, useState } from 'react'
import { Users as UsersIcon, UserPlus, Edit2, Trash2, Power, Search, Shield } from 'lucide-react'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { getUsers, inviteUser, updateUserRole, updateUserStatus, updateUserPermissions, getUserPermissions, deleteUser } from './actions'
import type { InviteUserInput, UpdateUserPermissionsInput } from '@/lib/validation/settings'

type User = {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'pending' | 'disabled'
  last_login_at?: string
  created_at: string
}

const MODULES = ['inventory', 'formulations', 'manufacturing', 'crm', 'finance', 'reports', 'settings'] as const

type ModuleName = typeof MODULES[number]

type ModulePermission = {
  module: ModuleName
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_export: boolean
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const result = await getUsers()
    if (result.success && result.data) {
      setUsers(result.data)
    }
    setLoading(false)
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleInviteUser(input: InviteUserInput) {
    const result = await inviteUser(input)
    if (result.success) {
      showToast(`Invitation sent to ${input.email}`, 'success')
      setShowInviteModal(false)
      loadUsers()
    } else {
      showToast('error' in result ? result.error : 'Failed to invite user', 'error')
    }
  }

  async function handleEditUser(user: User) {
    setEditingUser(user)

    // Load permissions for user
    const result = await getUserPermissions(user.id)
    if (result.success && result.data) {
      // Create full permissions array with defaults
      const userPerms = MODULES.map((module) => {
        const existing = result.data?.find((p: any) => p.module === module)
        return existing || {
          module,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_export: false,
        }
      })
      setPermissions(userPerms)
    }

    setShowEditModal(true)
  }

  async function handleUpdateUser() {
    if (!editingUser) return

    // Update permissions
    const permsResult = await updateUserPermissions({
      userId: editingUser.id,
      permissions,
    })

    if (permsResult.success) {
      showToast('User permissions updated', 'success')
      setShowEditModal(false)
      setEditingUser(null)
      loadUsers()
    } else {
      showToast(permsResult.error || 'Failed to update permissions', 'error')
    }
  }

  async function handleToggleStatus(user: User) {
    const newStatus = user.status === 'active' ? 'disabled' : 'active'
    const result = await updateUserStatus({
      userId: user.id,
      status: newStatus,
    })

    if (result.success) {
      showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success')
      loadUsers()
    } else {
      showToast('error' in result ? result.error : 'Failed to update status', 'error')
    }
  }

  async function handleDeleteUser(user: User) {
    const confirmText = prompt(
      `Type "${user.name}" to confirm deletion. This cannot be undone.`
    )
    if (confirmText !== user.name) {
      showToast('Deletion cancelled', 'info')
      return
    }

    const result = await deleteUser({
      userId: user.id,
      confirmText,
    })

    if (result.success) {
      showToast('User deleted', 'success')
      loadUsers()
    } else {
      showToast('error' in result ? result.error : 'Failed to delete user', 'error')
    }
  }

  function updatePermission(module: string, field: keyof ModulePermission, value: boolean) {
    setPermissions((prev) =>
      prev.map((p) => (p.module === module ? { ...p, [field]: value } : p))
    )
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 text-[#174940]">
          <UsersIcon className="h-6 w-6" />
          <h1 className="text-3xl font-semibold text-gray-900">Users & Roles</h1>
        </div>
        <p className="text-sm text-gray-600">
          Manage team members, roles, and granular permissions.
        </p>
      </header>

      <SettingsCard title="Team Members">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="ops">Operations</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
            </select>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Date Invited</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {user.role === 'admin' && <Shield className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : user.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="Edit permissions"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`rounded p-1 hover:bg-gray-100 ${
                            user.status === 'active' ? 'text-orange-600' : 'text-green-600'
                          }`}
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SettingsCard>

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteUser}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          permissions={permissions}
          onClose={() => {
            setShowEditModal(false)
            setEditingUser(null)
          }}
          onUpdatePermission={updatePermission}
          onSave={handleUpdateUser}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function InviteUserModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (input: InviteUserInput) => void
}) {
  const [form, setForm] = useState<InviteUserInput>({
    name: '',
    email: '',
    role: 'ops',
    message: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Invite Team Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SettingsFormField label="Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </SettingsFormField>

          <SettingsFormField label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </SettingsFormField>

          <SettingsFormField label="Role" required>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="ops">Operations</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
            </select>
          </SettingsFormField>

          <SettingsFormField label="Welcome Message (Optional)">
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Add a personal welcome message..."
            />
          </SettingsFormField>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditUserModal({
  user,
  permissions,
  onClose,
  onUpdatePermission,
  onSave,
}: {
  user: User
  permissions: ModulePermission[]
  onClose: () => void
  onUpdatePermission: (module: string, field: keyof ModulePermission, value: boolean) => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Edit Permissions: {user.name}
        </h2>

        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            <strong>Role:</strong> {user.role} | <strong>Status:</strong> {user.status}
          </p>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Module Permissions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Module</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">View</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Create</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Edit</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Delete</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {permissions.map((perm) => (
                  <tr key={perm.module} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium capitalize text-gray-900">{perm.module}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_view}
                        onChange={(e) => onUpdatePermission(perm.module, 'can_view', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_create}
                        onChange={(e) => onUpdatePermission(perm.module, 'can_create', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_edit}
                        onChange={(e) => onUpdatePermission(perm.module, 'can_edit', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_delete}
                        onChange={(e) => onUpdatePermission(perm.module, 'can_delete', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_export}
                        onChange={(e) => onUpdatePermission(perm.module, 'can_export', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#174940]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded-md bg-[#174940] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f332c]"
          >
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  )
}
