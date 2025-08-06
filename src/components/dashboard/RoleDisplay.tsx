'use client'

import { useRole } from '@/hooks/use-role'
import { ConditionalRender } from '@/components/auth/RoleGuard'
import { Shield, User, UserCog, Eye, AlertCircle } from 'lucide-react'
import { UserRole } from '@/types/database'
import Link from 'next/link'

export function RoleDisplay() {
  const { role, loading } = useRole()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }

  const getRoleInfo = (userRole: UserRole | null) => {
    switch (userRole) {
      case 'admin':
        return {
          icon: <Shield className="w-5 h-5" />,
          label: 'Administrator',
          color: 'text-red-600 bg-red-50',
          borderColor: 'border-red-200',
          description: 'Full system access and user management',
        }
      case 'moderator':
        return {
          icon: <UserCog className="w-5 h-5" />,
          label: 'Moderator',
          color: 'text-blue-600 bg-blue-50',
          borderColor: 'border-blue-200',
          description: 'Content moderation and analytics access',
        }
      case 'creator':
        return {
          icon: <User className="w-5 h-5" />,
          label: 'Creator',
          color: 'text-green-600 bg-green-50',
          borderColor: 'border-green-200',
          description: 'Create and manage AR content',
        }
      case 'viewer':
        return {
          icon: <Eye className="w-5 h-5" />,
          label: 'Viewer',
          color: 'text-gray-600 bg-gray-50',
          borderColor: 'border-gray-200',
          description: 'View public content only',
        }
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          label: 'Unknown',
          color: 'text-gray-400 bg-gray-50',
          borderColor: 'border-gray-200',
          description: 'Role not assigned',
        }
    }
  }

  const roleInfo = getRoleInfo(role)

  return (
    <div className={`rounded-lg border-2 ${roleInfo.borderColor} ${roleInfo.color} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {roleInfo.icon}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide">{roleInfo.label}</h3>
            <p className="text-xs mt-1 opacity-80">{roleInfo.description}</p>
          </div>
        </div>

        <ConditionalRender allowedRoles={['admin']}>
          <Link
            href="/admin"
            className="px-3 py-1 bg-white bg-opacity-80 rounded-md text-xs font-medium hover:bg-opacity-100 transition-colors"
          >
            Admin Panel
          </Link>
        </ConditionalRender>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white bg-opacity-50 rounded px-2 py-1">
          <span className="font-medium">Permissions:</span>
        </div>
        <div className="bg-white bg-opacity-50 rounded px-2 py-1">
          {role === 'admin' && 'All'}
          {role === 'moderator' && 'Moderate, Analytics'}
          {role === 'creator' && 'Create Content'}
          {role === 'viewer' && 'View Only'}
        </div>
      </div>
    </div>
  )
}

export function RoleBasedQuickActions() {
  const { role } = useRole()

  return (
    <div className="space-y-2">
      <ConditionalRender allowedRoles={['creator', 'moderator', 'admin']}>
        <Link
          href="/ar-content/upload"
          className="block w-full text-left px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <User className="inline-block w-4 h-4 mr-2" />
          Upload AR Content
        </Link>
      </ConditionalRender>

      <ConditionalRender allowedRoles={['moderator', 'admin']}>
        <Link
          href="/moderation"
          className="block w-full text-left px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          <UserCog className="inline-block w-4 h-4 mr-2" />
          Moderation Queue
        </Link>
      </ConditionalRender>

      <ConditionalRender allowedRoles={['admin']}>
        <Link
          href="/admin"
          className="block w-full text-left px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Shield className="inline-block w-4 h-4 mr-2" />
          Admin Dashboard
        </Link>
      </ConditionalRender>

      <ConditionalRender allowedRoles={['moderator', 'admin']}>
        <Link
          href="/analytics"
          className="block w-full text-left px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Eye className="inline-block w-4 h-4 mr-2" />
          View Analytics
        </Link>
      </ConditionalRender>
    </div>
  )
}