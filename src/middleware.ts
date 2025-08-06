import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/ar-content/upload',
  '/profile',
]

// Auth routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth',
]

export async function middleware(request: NextRequest) {
  // Update user's session and get the response
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname
  
  // Check if the route is protected or an auth route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Get user from the response headers (set by updateSession)
  const isAuthenticated = response.headers.get('x-user-authenticated') === 'true'
  
  // Redirect logic
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
