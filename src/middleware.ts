import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 显式声明需要验证的路由前缀
  const pathname = request.nextUrl.pathname

  const isProtectedPath =
    pathname === '/' ||
    pathname.startsWith('/contracts') ||
    pathname === '/api/upload' ||
    (pathname.startsWith('/api/contracts') && !pathname.endsWith('/original'))

  if (isProtectedPath) {
    const basicAuth = request.headers.get('authorization')

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')

      // 配置您要求的账号和密码
      if (user === 'Sofia' && pwd === '2026888') {
        return NextResponse.next()
      }
    }

    // 如果未验证或密码错误，要求输入基础认证
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access Only"'
      }
    })
  }

  // 其他路径（如 /sign 和 /api/sign）全部放行
  return NextResponse.next()
}

export const config = {
  // 限制 matcher 防止性能浪费和误伤其它 Next.js 内置路由
  matcher: [
    '/',
    '/contracts/:path*',
    '/api/upload',
    '/api/contracts/:path*'
  ]
}