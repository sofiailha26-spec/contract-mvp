import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 最严格的白名单：任何含有 sign 的路由或者 original 预览，都不受任何限制
  if (
    pathname.includes('/sign') ||
    pathname.includes('sign') ||
    pathname.endsWith('/original') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 预取请求不要弹框
  const isPrefetch = request.headers.get('x-middleware-prefetch') || request.headers.get('x-nextjs-data')

  // 剩下的就是我们的后台页面： '/' 和 '/contracts...' 和 '/api/upload'
  const isProtected =
    pathname === '/' ||
    pathname.startsWith('/contracts') ||
    pathname === '/api/upload' ||
    (pathname.startsWith('/api/contracts') && !pathname.endsWith('/download'))

  if (isProtected) {
    const basicAuth = request.headers.get('authorization')
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      if (user === 'Sofia' && pwd === '2026888') {
        return NextResponse.next()
      }
    }

    if (isPrefetch) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access Only"'
      }
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*'
}