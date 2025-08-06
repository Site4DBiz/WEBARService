'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthForm, { AuthFormData } from '@/components/auth/AuthForm'
import SocialAuth from '@/components/auth/SocialAuth'
import { useState } from 'react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (data: AuthFormData) => {
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setError(error.message)
        throw error
      }

      // If remember me is checked, set a longer session
      if (data.rememberMe) {
        // This is handled by Supabase session management
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      // Error is already set above
      throw err
    }
  }

  return (
    <>
      <AuthForm mode="login" onSubmit={handleLogin} error={error} />
      <div className="max-w-md mx-auto -mt-20">
        <SocialAuth />
      </div>
    </>
  )
}
