'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  User,
  Mail,
  Phone,
  Globe,
  Building,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Star,
  Eye,
  FileText,
  Activity,
  Key,
  X,
  Save,
  Edit2,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react'

interface UserProfile {
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
}

interface UserStats {
  total_contents: number
  total_views: number
  total_likes: number
  total_followers: number
  total_following: number
}

interface UserDetailProps {
  userId: string
  onClose?: () => void
  onUpdate?: () => void
}

export default function UserDetail({ userId, onClose, onUpdate }: UserDetailProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [arContents, setArContents] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'contents' | 'settings'>(
    'profile'
  )

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  async function fetchUserDetails() {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setStats(data.stats)
        setRecentActivity(data.recentActivity || [])
        setArContents(data.arContents || [])
        setApiKeys(data.apiKeys || [])
        setFormData(data.user)
      } else {
        console.error('Failed to fetch user details:', data.error)
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setEditing(false)
        onUpdate?.()
      } else {
        console.error('Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  async function toggleUserStatus() {
    if (!user) return

    const newStatus = !user.is_verified
    const confirmMessage = `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this user?`

    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: newStatus }),
      })

      if (response.ok) {
        await fetchUserDetails()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-4">
            {user.avatar_url ? (
              <div className="relative w-12 h-12">
                <Image
                  src={user.avatar_url}
                  alt={user.full_name || user.username || ''}
                  fill
                  className="rounded-full object-cover"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.full_name || user.username || 'Unnamed User'}
              </h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 inline mr-1" />
                Edit
              </button>
            )}
            <button
              onClick={toggleUserStatus}
              className={`px-3 py-2 text-sm rounded-md ${
                user.is_verified
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {user.is_verified ? (
                <>
                  <UserX className="w-4 h-4 inline mr-1" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 inline mr-1" />
                  Activate
                </>
              )}
            </button>
            <button
              onClick={() => fetchUserDetails()}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex px-6">
            {(['profile', 'activity', 'contents', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-900">
                        {stats.total_contents}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-blue-700">Contents</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <Eye className="w-8 h-8 text-green-600" />
                      <span className="text-2xl font-bold text-green-900">{stats.total_views}</span>
                    </div>
                    <p className="mt-2 text-sm text-green-700">Total Views</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <Star className="w-8 h-8 text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-900">
                        {stats.total_likes}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-yellow-700">Total Likes</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <User className="w-8 h-8 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-900">
                        {stats.total_followers}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-purple-700">Followers</p>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <User className="w-8 h-8 text-pink-600" />
                      <span className="text-2xl font-bold text-pink-900">
                        {stats.total_following}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-pink-700">Following</p>
                  </div>
                </div>
              )}

              {/* Profile Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.username || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.full_name || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email
                    </label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone
                    </label>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.phone || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Website
                    </label>
                    {editing ? (
                      <input
                        type="url"
                        value={formData.website || ''}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.website || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Building className="w-4 h-4 inline mr-1" />
                      Company
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.company || ''}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.company || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.location || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Role
                    </label>
                    {editing ? (
                      <select
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="user">User</option>
                        <option value="creator">Creator</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : user.role === 'creator'
                                ? 'bg-green-100 text-green-800'
                                : user.role === 'moderator'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    {editing ? (
                      <textarea
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-gray-900">{user.bio || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {editing && (
                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditing(false)
                        setFormData(user)
                      }}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 inline mr-1" />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Created At
                    </label>
                    <p className="text-gray-900">{new Date(user.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Last Login
                    </label>
                    <p className="text-gray-900">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subscription Tier
                    </label>
                    <p className="text-gray-900 capitalize">{user.subscription_tier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Status
                    </label>
                    <p className="text-gray-900">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_verified ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <p className="text-gray-500">No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Activity className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.activity_type}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.resource_type} •{' '}
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contents' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AR Contents</h3>
              {arContents.length === 0 ? (
                <p className="text-gray-500">No AR contents created</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {arContents.map((content) => (
                    <div
                      key={content.id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{content.title}</h4>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {content.view_count} views
                            </span>
                            <span className="flex items-center">
                              <Star className="w-4 h-4 mr-1" />
                              {content.like_count} likes
                            </span>
                            <span>
                              Created: {new Date(content.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            content.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {content.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">API Keys</h3>
              {apiKeys.length === 0 ? (
                <p className="text-gray-500">No API keys created</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Key className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{key.name}</p>
                            <p className="text-xs text-gray-500">
                              Last used:{' '}
                              {key.last_used_at
                                ? new Date(key.last_used_at).toLocaleString()
                                : 'Never'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            key.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
