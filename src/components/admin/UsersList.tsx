'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  Download,
  RefreshCw,
  Shield,
  Star,
  Calendar,
  Mail,
  Globe,
  Building
} from 'lucide-react'

interface User {
  id: string
  username: string | null
  full_name: string | null
  email: string
  avatar_url: string | null
  bio: string | null
  website: string | null
  company: string | null
  location: string | null
  phone: string | null
  is_public: boolean
  is_verified: boolean
  role: string
  subscription_tier: string
  preferences: any
  social_links: any
  created_at: string
  updated_at: string
  last_login_at: string | null
  stats?: {
    contentCount: number
    totalViews: number
    totalLikes: number
    followerCount: number
    followingCount: number
  }
}

interface UsersListProps {
  onSelectUser?: (user: User) => void
}

export default function UsersList({ onSelectUser }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const limit = 10

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm, roleFilter, statusFilter, sortBy, sortOrder])

  async function fetchUsers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
        setTotalUsers(data.pagination.total)
      } else {
        console.error('Failed to fetch users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkAction(action: 'activate' | 'deactivate' | 'delete') {
    if (selectedUsers.length === 0) {
      alert('Please select users to perform this action')
      return
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedUsers.length} user(s)?`
    if (!confirm(confirmMessage)) return

    try {
      if (action === 'delete') {
        const response = await fetch(`/api/users?ids=${selectedUsers.join(',')}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await fetchUsers()
          setSelectedUsers([])
        }
      } else {
        const updates = {
          is_verified: action === 'activate'
        }
        
        for (const userId of selectedUsers) {
          await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, updates })
          })
        }
        
        await fetchUsers()
        setSelectedUsers([])
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  function toggleUserSelection(userId: string) {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  function toggleAllUsers() {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(user => user.id))
    }
  }

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  async function exportUsers() {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        limit: '10000'
      })

      const response = await fetch(`/api/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        const csv = convertToCSV(data.users)
        downloadCSV(csv, 'users-export.csv')
      }
    } catch (error) {
      console.error('Error exporting users:', error)
    }
  }

  function convertToCSV(users: User[]) {
    const headers = ['ID', 'Username', 'Full Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login']
    const rows = users.map(user => [
      user.id,
      user.username || '',
      user.full_name || '',
      user.email,
      user.role,
      user.is_verified ? 'Active' : 'Inactive',
      new Date(user.created_at).toLocaleDateString(),
      user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Users Management</h2>
            <p className="mt-1 text-sm text-gray-600">
              Total: {totalUsers} users • Page {currentPage} of {totalPages}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchUsers()}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportUsers}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="creator">Creator</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedUsers.length} selected
            </span>
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <UserCheck className="w-4 h-4 inline mr-1" />
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              <UserX className="w-4 h-4 inline mr-1" />
              Deactivate
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={toggleAllUsers}
                  className="rounded border-gray-300"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('full_name')}
              >
                User
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('role')}
              >
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                Joined
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_login_at')}
              >
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || user.username || ''}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || user.username || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'creator' ? 'bg-green-100 text-green-800' :
                        user.role === 'moderator' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      {user.is_verified && (
                        <UserCheck className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 mr-1 text-yellow-400" />
                        {user.stats?.totalLikes || 0}
                      </div>
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1 text-blue-400" />
                        {user.stats?.totalViews || 0}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1 text-purple-400" />
                        {user.stats?.followerCount || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onSelectUser?.(user)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectUser?.(user)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalUsers)} of {totalUsers} users
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const page = i + 1
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 border rounded-md text-sm ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          })}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}