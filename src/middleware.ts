import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. **强制白名单优先**：只要路径包含 sign 或者 original，绝对不管
  if (
    pathname.includes('/sign') ||
    pathname.includes('/api/sign') ||
    pathname.endsWith('/original')
  ) {
    return NextResponse.next()
  }

  // 2. **精确匹配黑名单**：只在这个名单里的才拦截
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

    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access Only"'
      }
    })
  }

  return NextResponse.next()
}

// 不使用 matcher 过滤，让中间件自己判断，防止 Next.js 隐藏的预加载请求（如 RSC）跳过白名单判断
export const config = {
  matcher: '/:path*'
}