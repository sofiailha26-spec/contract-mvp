import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 完全放行 /sign 和相关 API，以及 Next.js 静态文件
  if (
    pathname.startsWith('/sign') ||
    pathname.startsWith('/api/sign') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.endsWith('/original')
  ) {
    return NextResponse.next()
  }

  // Next.js App Router 中，后台的预取请求经常带有 x-nextjs-data 头
  // 我们需要确保当达人页面预取主页信息时，不要返回 401 触发原生弹窗
  // 相反，我们可以返回一个普通的 401 状态但不带 WWW-Authenticate 头，或者直接在预取时放行
  const isPrefetch = request.headers.get('x-middleware-prefetch') || request.headers.get('x-nextjs-data')

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

    // 如果这是一个预加载请求，返回 404 或者空数据，防止触发浏览器的账密弹窗
    if (isPrefetch) {
      return new NextResponse(null, { status: 404 })
    }

    // 只有在用户直接访问管理页面时，才发送 WWW-Authenticate 头
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