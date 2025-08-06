'use client'

import { useState } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import UsersList from '@/components/admin/UsersList'
import UserDetail from '@/components/admin/UserDetail'

export default function UsersManagementPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  function handleSelectUser(user: any) {
    setSelectedUserId(user.id)
  }

  function handleCloseDetail() {
    setSelectedUserId(null)
  }

  function handleUserUpdate() {
    // This will trigger a refresh of the users list
    // The UsersList component will handle its own refresh
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UsersList onSelectUser={handleSelectUser} />
        </div>

        {selectedUserId && (
          <UserDetail
            userId={selectedUserId}
            onClose={handleCloseDetail}
            onUpdate={handleUserUpdate}
          />
        )}
      </div>
    </RoleGuard>
  )
}