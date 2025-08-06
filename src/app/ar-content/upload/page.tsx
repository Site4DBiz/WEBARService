import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database, UserRole } from '@/types/database'
import ARContentUpload from '@/components/ar/ARContentUpload'

export default async function UploadPage() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const allowedRoles: UserRole[] = ['admin', 'creator', 'moderator']

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/dashboard?error=insufficient_permissions')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <ARContentUpload />
      </div>
    </div>
  )
}
