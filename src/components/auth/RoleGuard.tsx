'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/database'
import { getUserRole, hasRole, checkPermission } from '@/lib/api/roles'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  requiredPermission?: {
    resource: string
    action: string
  }
  fallback?: ReactNode
  redirectTo?: string
}

export function RoleGuard({
  children,
  allowedRoles,
  requiredPermission,
  fallback,
  redirectTo = '/dashboard',
}: RoleGuardProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuthorization() {
      try {
        const userRole = await getUserRole()

        if (!userRole) {
          setIsAuthorized(false)
          if (redirectTo) {
            router.push(redirectTo)
          }
          return
        }

        let authorized = true

        if (allowedRoles && allowedRoles.length > 0) {
          authorized = hasRole(userRole, allowedRoles)
        }

        if (authorized && requiredPermission) {
          authorized = await checkPermission(requiredPermission.resource, requiredPermission.action)
        }

        setIsAuthorized(authorized)

        if (!authorized && redirectTo) {
          router.push(redirectTo)
        }
      } catch (error) {
        console.error('Error checking authorization:', error)
        setIsAuthorized(false)
        if (redirectTo) {
          router.push(redirectTo)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuthorization()
  }, [allowedRoles, requiredPermission, redirectTo, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    )
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
      </div>
    )
  }

  return <>{children}</>
}

interface ConditionalRenderProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  requiredPermission?: {
    resource: string
    action: string
  }
  fallback?: ReactNode
}

export function ConditionalRender({
  children,
  allowedRoles,
  requiredPermission,
  fallback = null,
}: ConditionalRenderProps) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuthorization() {
      try {
        const userRole = await getUserRole()

        if (!userRole) {
          setIsAuthorized(false)
          return
        }

        let authorized = true

        if (allowedRoles && allowedRoles.length > 0) {
          authorized = hasRole(userRole, allowedRoles)
        }

        if (authorized && requiredPermission) {
          authorized = await checkPermission(requiredPermission.resource, requiredPermission.action)
        }

        setIsAuthorized(authorized)
      } catch (error) {
        console.error('Error checking authorization:', error)
        setIsAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuthorization()
  }, [allowedRoles, requiredPermission])

  if (loading) {
    return null
  }

  return <>{isAuthorized ? children : fallback}</>
}
