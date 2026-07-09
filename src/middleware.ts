import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 我们只对这三个准确的管理后台路径进行密码保护
  const isProtected =
    pathname === '/' ||
    pathname.startsWith('/contracts') ||
    pathname === '/api/upload' ||
    (pathname.startsWith('/api/contracts') && !pathname.endsWith('/original') && !pathname.endsWith('/download'))

  if (isProtected) {
    const basicAuth = request.headers.get('authorization')
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      if (user === 'Sofia' && pwd === '2026888') {
        return NextResponse.next()
      }
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access Only"'
      }
    })
  }

  // 其他所有路由（包括达人端的 /sign，静态资源等）都默认放行
  return NextResponse.next()
}

export const config = {
  // 只匹配明确需要拦截的路由前缀，进一步降低错误匹配风险
  matcher: [
    '/',
    '/contracts/:path*',
    '/api/upload',
    '/api/contracts/:path*'
  ]
}