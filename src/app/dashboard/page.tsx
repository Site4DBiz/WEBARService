import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UserProfile from '@/components/dashboard/UserProfile'
import SignOutButton from '@/components/dashboard/SignOutButton'
import { UserRole } from '@/types/database'
import { Shield, Upload, Settings, Users } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'viewer'

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800'
      case 'creator':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canCreateContent = ['admin', 'creator', 'moderator'].includes(userRole)
  const canAccessAdmin = userRole === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(userRole as UserRole)}`}
              >
                {userRole.toUpperCase()}
              </span>
            </div>
            <SignOutButton />
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">User Information</h2>
              <UserProfile user={user} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {canCreateContent && (
              <Link href="/ar-content/upload" className="block">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <Upload className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Upload Content</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">Create AR</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {canAccessAdmin && (
              <Link href="/admin" className="block">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <Shield className="h-8 w-8 text-red-500 mr-3" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Admin Panel</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">Manage</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">AR Contents</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
              </div>
            </div>
          </div>

          {userRole === 'viewer' && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Viewer Role:</strong> You can browse and view public AR content. To create
                your own AR content, please contact an administrator for creator access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
