import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 仅仅针对精确的这三个后台入口进行密码拦截，其余一切不管
  if (
    pathname === '/' ||
    pathname === '/contracts' ||
    pathname.startsWith('/contracts/') ||
    pathname === '/api/upload'
  ) {
    const basicAuth = request.headers.get('authorization')
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      if (user === 'Sofia' && pwd === '2026888') {
        return NextResponse.next()
      }
    }

    // 判断是否是 Next.js 内部的预取数据请求
    const isRSCRequest = request.headers.get('RSC') === '1'
    const isPrefetch = request.headers.get('x-middleware-prefetch') || request.headers.get('x-nextjs-data') || request.headers.get('Next-Router-Prefetch')

    // 如果是预取请求，绝不能返回 401 触发原生弹窗，而是返回普通错误或者空
    if (isRSCRequest || isPrefetch) {
      return new NextResponse('Unauthorized prefetch', { status: 403 })
    }

    // 只有用户在浏览器地址栏真真正正输入这些后台地址时，才要求输入密码
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access Only"'
      }
    })
  }

  // 任何不是上述精确匹配的地址（包括 /sign/..., /api/sign..., 图片、_next 等），一律放行
  return NextResponse.next()
}

export const config = {
  // 只让中间件在特定路径生效，彻底避免拦截 /sign
  matcher: [
    '/',
    '/contracts/:path*',
    '/api/upload',
  ]
}