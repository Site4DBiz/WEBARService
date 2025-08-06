import { User } from '@supabase/supabase-js'

interface UserProfileProps {
  user: User
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <p className="mt-1 text-sm text-gray-900">{user.email}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">User ID</label>
        <p className="mt-1 text-sm text-gray-900 font-mono">{user.id}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Account Created</label>
        <p className="mt-1 text-sm text-gray-900">
          {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Last Sign In</label>
        <p className="mt-1 text-sm text-gray-900">
          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
        </p>
      </div>
    </div>
  )
}
