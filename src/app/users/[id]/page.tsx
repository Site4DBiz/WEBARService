'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { UserRole } from '@/types/database'
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Globe,
  Shield,
  Eye,
  Heart,
  Package,
  Activity,
  Edit,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react'

interface UserDetails {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  role: UserRole
  auth_users?: {
    email: string
    last_sign_in_at: string | null
    created_at: string
    email_confirmed_at: string | null
  }
  user_ar_contents?: Array<{
    id: string
    title: string
    is_public: boolean
    view_count: number
    created_at: string
  }>
  user_favorites?: Array<{
    id: string
    content_id: string
    created_at: string
  }>
  ar_markers?: Array<{
    id: string
    name: string
    is_public: boolean
    view_count: number
    created_at: string
  }>
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'activity' | 'settings'>(
    'overview'
  )

  const supabase = createClient()

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          auth_users:auth.users!profiles_id_fkey (
            email,
            last_sign_in_at,
            created_at,
            email_confirmed_at
          ),
          user_ar_contents (
            id,
            title,
            is_public,
            view_count,
            created_at
          ),
          user_favorites (
            id,
            content_id,
            created_at
          ),
          ar_markers (
            id,
            name,
            is_public,
            view_count,
            created_at
          )
        `
        )
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user details:', error)
        return
      }

      setUser(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'creator':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
        <p className="text-gray-600 mb-4">The requested user could not be found.</p>
        <Link
          href="/users"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Users
        </Link>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'moderator']}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-6">
            <Link
              href="/users"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.username || 'User'}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white shadow-lg">
                      <User className="w-12 h-12 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold">
                      {user.full_name || user.username || 'Unnamed User'}
                    </h1>
                    {user.username && <p className="text-white/80">@{user.username}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)}`}
                      >
                        <Shield className="w-3 h-3 inline mr-1" />
                        {user.role}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          user.is_public
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.is_public ? (
                          <>
                            <Unlock className="w-3 h-3 inline mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 inline mr-1" />
                            Private
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/users/${userId}/edit`}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit User
                </Link>
              </div>
            </div>

            <div className="border-b border-gray-200">
              <nav className="flex px-6">
                {(['overview', 'content', 'activity', 'settings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                    <dl className="space-y-3">
                      <div className="flex items-center">
                        <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {user.auth_users?.email || 'N/A'}
                          {user.auth_users?.email_confirmed_at && (
                            <span className="ml-2 text-xs text-green-600">✓ Verified</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex items-center">
                        <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {user.website ? (
                            <a
                              href={user.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {user.website}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </dd>
                      </div>
                      <div className="flex items-center">
                        <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                          <Calendar className="w-4 h-4 mr-2" />
                          Joined
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                      <div className="flex items-center">
                        <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                          <Activity className="w-4 h-4 mr-2" />
                          Last Active
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {user.auth_users?.last_sign_in_at
                            ? new Date(user.auth_users.last_sign_in_at).toLocaleDateString()
                            : 'Never'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Package className="w-8 h-8 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-900">
                            {user.user_ar_contents?.length || 0}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 mt-2">AR Contents</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Eye className="w-8 h-8 text-green-600" />
                          <span className="text-2xl font-bold text-green-900">
                            {user.ar_markers?.length || 0}
                          </span>
                        </div>
                        <p className="text-sm text-green-700 mt-2">AR Markers</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Heart className="w-8 h-8 text-red-600" />
                          <span className="text-2xl font-bold text-red-900">
                            {user.user_favorites?.length || 0}
                          </span>
                        </div>
                        <p className="text-sm text-red-700 mt-2">Favorites</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Eye className="w-8 h-8 text-purple-600" />
                          <span className="text-2xl font-bold text-purple-900">
                            {user.user_ar_contents?.reduce(
                              (sum, content) => sum + content.view_count,
                              0
                            ) || 0}
                          </span>
                        </div>
                        <p className="text-sm text-purple-700 mt-2">Total Views</p>
                      </div>
                    </div>
                  </div>

                  {user.bio && (
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bio</h3>
                      <p className="text-gray-600">{user.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'content' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Content</h3>
                  {user.user_ar_contents && user.user_ar_contents.length > 0 ? (
                    <div className="space-y-3">
                      {user.user_ar_contents.map((content) => (
                        <div key={content.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{content.title}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {content.view_count} views
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(content.created_at).toLocaleDateString()}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    content.is_public
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {content.is_public ? 'Public' : 'Private'}
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/ar-content/${content.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No content created yet</p>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Activity tracking will be available in the next update.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Settings</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Account Status</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Profile Visibility</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.is_public
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Email Verification</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Email Status</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.auth_users?.email_confirmed_at
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.auth_users?.email_confirmed_at ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
