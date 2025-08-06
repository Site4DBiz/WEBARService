import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/ar-content/upload', '/profile']

// Auth routes that should redirect to dashboard if already authenticated
const authRoutes = ['/auth/login', '/auth/signup', '/auth']

// Admin-only routes
const adminRoutes = ['/admin', '/admin/users', '/admin/settings']

// Creator routes (creator, moderator, and admin can access)
const creatorRoutes = ['/ar-content/upload', '/ar-content/manage']

// Moderator routes (moderator and admin can access)
const moderatorRoutes = ['/moderation', '/analytics']

export async function middleware(request: NextRequest) {
  // Update user's session and get the response
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Check if the route is protected or an auth route
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))
  const isCreatorRoute = creatorRoutes.some((route) => pathname.startsWith(route))
  const isModeratorRoute = moderatorRoutes.some((route) => pathname.startsWith(route))

  // Get user from the response headers (set by updateSession)
  const isAuthenticated = response.headers.get('x-user-authenticated') === 'true'

  // Redirect logic for unauthenticated users
  if (isProtectedRoute && !isAuthenticated) {
    // Redirect to login if trying to access protected route without auth
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && isAuthenticated) {
    // Redirect to dashboard if already authenticated and trying to access auth pages
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access control for authenticated users
  if (isAuthenticated && (isAdminRoute || isCreatorRoute || isModeratorRoute)) {
    // Create Supabase client to check user role
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // We don't need to set cookies here
          },
        },
      }
    )

    // Get user and their role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role

      // Check admin routes
      if (isAdminRoute && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
      }

      // Check moderator routes (moderator and admin can access)
      if (isModeratorRoute && userRole !== 'moderator' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
      }

      // Check creator routes (creator, moderator, and admin can access)
      if (
        isCreatorRoute &&
        userRole !== 'creator' &&
        userRole !== 'moderator' &&
        userRole !== 'admin'
      ) {
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     * - api routes that don't require auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
