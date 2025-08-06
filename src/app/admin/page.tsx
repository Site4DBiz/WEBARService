'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { UserRole } from '@/types/database'
import {
  getUsersByRole,
  assignRole,
  getPermissions,
  getRoleAssignments,
  Permission,
} from '@/lib/api/roles'
import {
  Users,
  Shield,
  Settings,
  Activity,
  UserCheck,
  UserX,
  ChevronDown,
  Check,
  X,
} from 'lucide-react'

interface User {
  id: string
  username: string | null
  full_name: string | null
  role: UserRole
  created_at: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'logs'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole])

  async function fetchUsers() {
    setLoading(true)
    try {
      if (selectedRole === 'all') {
        const allRoles: UserRole[] = ['admin', 'creator', 'viewer', 'moderator']
        const allUsers = await Promise.all(allRoles.map((role) => getUsersByRole(role)))
        setUsers(allUsers.flat())
      } else {
        const roleUsers = await getUsersByRole(selectedRole)
        setUsers(roleUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const result = await assignRole(userId, newRole, 'Changed by admin')
    if (result.success) {
      await fetchUsers()
    } else {
      alert(result.error || 'Failed to update role')
    }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow-lg rounded-lg">
            <div className="border-b border-gray-200">
              <div className="px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">Manage users, roles, and permissions</p>
              </div>

              <div className="flex px-6">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="inline-block w-4 h-4 mr-2" />
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`ml-8 px-4 py-2 border-b-2 font-medium text-sm ${
                    activeTab === 'permissions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Shield className="inline-block w-4 h-4 mr-2" />
                  Permissions
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`ml-8 px-4 py-2 border-b-2 font-medium text-sm ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Activity className="inline-block w-4 h-4 mr-2" />
                  Activity Logs
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'users' && (
                <div>
                  <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Filter by role:</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="creator">Creator</option>
                        <option value="viewer">Viewer</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Current Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.full_name || user.username || 'Unnamed User'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.username && `@${user.username}`}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    user.role === 'admin'
                                      ? 'bg-red-100 text-red-800'
                                      : user.role === 'moderator'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : user.role === 'creator'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(user.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <select
                                  value={user.role}
                                  onChange={(e) =>
                                    handleRoleChange(user.id, e.target.value as UserRole)
                                  }
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="creator">Creator</option>
                                  <option value="moderator">Moderator</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'permissions' && <PermissionsTab />}

              {activeTab === 'logs' && <ActivityLogsTab />}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

function PermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const data = await getPermissions()
        setPermissions(data)
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPermissions()
  }, [])

  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = {}
      }
      if (!acc[perm.resource][perm.action]) {
        acc[perm.resource][perm.action] = []
      }
      acc[perm.resource][perm.action].push(perm.role)
      return acc
    },
    {} as Record<string, Record<string, UserRole[]>>
  )

  if (loading) {
    return <div className="text-center py-8">Loading permissions...</div>
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h2>
      <div className="space-y-4">
        {Object.entries(groupedPermissions).map(([resource, actions]) => (
          <div key={resource} className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2 capitalize">{resource}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(actions).map(([action, roles]) => (
                <div key={action} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600 capitalize">{action}</span>
                  <div className="flex space-x-1">
                    {roles.map((role) => (
                      <span
                        key={role}
                        className={`px-2 py-1 text-xs rounded ${
                          role === 'admin'
                            ? 'bg-red-100 text-red-700'
                            : role === 'moderator'
                              ? 'bg-yellow-100 text-yellow-700'
                              : role === 'creator'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityLogsTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Activity logging will be available in the next update.
        </p>
      </div>
    </div>
  )
}
