import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 始终放行静态资源
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 达人端路由和接口：完全开放，不需要任何密码
  if (
    pathname.startsWith('/sign') ||
    pathname.startsWith('/api/sign')
  ) {
    return NextResponse.next()
  }

  // PDF 预览接口：达人 iframe 需要用，完全开放
  if (pathname.startsWith('/api/contracts') && pathname.endsWith('/original')) {
    return NextResponse.next()
  }

  // 拦截 Next.js 预取请求，避免静默触发原生的浏览器弹窗
  const isPrefetch =
    request.headers.get('x-middleware-prefetch') ||
    request.headers.get('x-nextjs-data') ||
    request.headers.get('next-router-prefetch') ||
    request.headers.get('rsc') === '1' ||
    request.headers.get('purpose') === 'prefetch'

  // 获取管理员账号密码
  const basicAuth = request.headers.get('authorization')
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const decoded = atob(authValue).split(':')
    const user = decoded[0]
    const pwd = decoded[1]
    if (user === 'Sofia' && pwd === '2026888') {
      return NextResponse.next()
    }
  }

  // 预取请求不能触发原生弹窗
  if (isPrefetch) {
    return new NextResponse('Unauthorized prefetch', { status: 403 })
  }

  // 其余所有页面（主页、合同管理等）仅限管理员
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin Access"' }
  })
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}