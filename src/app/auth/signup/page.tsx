'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthForm, { AuthFormData } from '@/components/auth/AuthForm'
import SocialAuth from '@/components/auth/SocialAuth'
import { createProfile } from '@/lib/api/profiles'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (data: AuthFormData) => {
    setError(null)

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setError(error.message)
        throw error
      }

      // Create user profile if signup successful and user is created
      if (authData.user) {
        const profileData = {
          id: authData.user.id,
          username: data.username || null,
          full_name: null,
          avatar_url: null,
          bio: null,
          website: null,
          is_public: true,
        }

        try {
          await createProfile(profileData)
        } catch (profileError) {
          console.error('Error creating profile:', profileError)
          // Continue even if profile creation fails - it can be created later
        }
      }

      setSuccess(true)
    } catch (err) {
      // Error is already set above
      throw err
    }
  }

  return (
    <>
      <AuthForm mode="signup" onSubmit={handleSignup} error={error} success={success} />
      {!success && (
        <div className="max-w-md mx-auto -mt-20">
          <SocialAuth />
        </div>
      )}
    </>
  )
}
