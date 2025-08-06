'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@/types/database'
import { getUserRole, checkPermission } from '@/lib/api/roles'

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      try {
        const userRole = await getUserRole()
        setRole(userRole)
      } catch (error) {
        console.error('Error fetching user role:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  return { role, loading }
}

export function usePermission(resource: string, action: string) {
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUserPermission() {
      try {
        const permitted = await checkPermission(resource, action)
        setHasPermission(permitted)
      } catch (error) {
        console.error('Error checking permission:', error)
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkUserPermission()
  }, [resource, action])

  return { hasPermission, loading }
}
