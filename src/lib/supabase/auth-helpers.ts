import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

/**
 * Authentication helper functions for server-side operations
 */

/**
 * Gets the current user from the session
 * @returns The user object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Requires authentication for the current route
 * Redirects to login if not authenticated
 * @param redirectTo - The path to redirect to after login (default: current path)
 */
export async function requireAuth(redirectTo?: string): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    const loginUrl = redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login'
    redirect(loginUrl)
  }

  return user
}

/**
 * Signs out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
    throw error
  }

  redirect('/login')
}

/**
 * Signs in a user with email and password
 * @param email - User's email
 * @param password - User's password
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

/**
 * Signs up a new user with email and password
 * @param email - User's email
 * @param password - User's password
 * @param metadata - Additional user metadata
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { full_name?: string; username?: string }
) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

/**
 * Sends a password reset email
 * @param email - User's email
 */
export async function resetPassword(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Updates the user's password
 * @param newPassword - The new password
 */
export async function updatePassword(newPassword: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Gets the user's profile from the database
 * @param userId - The user's ID
 */
export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

/**
 * Updates the user's profile in the database
 * @param userId - The user's ID
 * @param updates - The profile updates
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string
    full_name?: string
    avatar_url?: string
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return { profile: null, error: error.message }
  }

  return { profile: data, error: null }
}
