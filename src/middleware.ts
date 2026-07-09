import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Always allow static resources
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Public paths: Creator signature page, APIs, and the new login page
  if (
    pathname.startsWith('/sign') ||
    pathname.startsWith('/api/') ||
    pathname === '/login'
  ) {
    return NextResponse.next()
  }

  // Check custom cookie instead of Basic Auth for everything else
  const authCookie = request.cookies.get('admin_auth')
  if (!authCookie || authCookie.value !== 'true') {
    // Redirect to custom login page
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
