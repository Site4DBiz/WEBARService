'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from '@/lib/api/profiles'
import AuthForm, { AuthFormData } from '@/components/auth/AuthForm'
import SocialAuth from '@/components/auth/SocialAuth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AuthPageContent() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check if there's a redirect parameter
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

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

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      // Error is already set above
      throw err
    }
  }

  const handleSignup = async (data: AuthFormData) => {
    setError(null)

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Logo and Title */}
          <div className="text-center pt-8 pb-4 px-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">AR</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Web AR Service</h1>
            <p className="text-sm text-gray-600 mt-2">Experience AR in your browser</p>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-0">
              <TabsTrigger value="login" className="rounded-none">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <div className="px-8 pb-8">
              <TabsContent value="login" className="mt-0">
                <AuthForm mode="login" onSubmit={handleLogin} error={error} />
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                {success ? (
                  <div className="py-8 text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Account Created Successfully!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Please check your email to confirm your account.
                    </p>
                    <button
                      onClick={() => {
                        setSuccess(false)
                        setActiveTab('login')
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Go to Sign In
                    </button>
                  </div>
                ) : (
                  <AuthForm mode="signup" onSubmit={handleSignup} error={error} success={success} />
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Social Auth */}
          {!success && (
            <div className="px-8 pb-8 -mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              <div className="mt-4">
                <SocialAuth />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
