import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SystemStatus from '@/components/admin/SystemStatus'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function SystemStatusPage() {
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

  // Only allow admin users to view system status
  if (userRole !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <SystemStatus />
        </div>
      </div>
    </div>
  )
}
