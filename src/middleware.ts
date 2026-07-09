import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 定义需要保护的路径：
  // 1. 主页 (/)
  // 2. /contracts 及其子路由
  // 3. /api/upload 和 /api/contracts (但不能拦截 /api/sign 因为达人需要它)
  const isProtectedPath =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/contracts') ||
    request.nextUrl.pathname === '/api/upload' ||
    (request.nextUrl.pathname.startsWith('/api/contracts') && !request.nextUrl.pathname.endsWith('/original'))

  // /api/contracts/[id]/original 必须允许外部访问，因为达人的 PDF iframe 预览依赖这个接口
  if (request.nextUrl.pathname.startsWith('/api/contracts') && request.nextUrl.pathname.endsWith('/original')) {
    return NextResponse.next()
  }

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

  // 其他路径（比如 /sign/[token] 和 /api/sign/[token]）正常放行
  return NextResponse.next()
}

export const config = {
  // 必须把需要放行的页面从 matcher 中排除，因为 matcher 会拦截页面的首次 HTML 请求
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - sign (达人签名页面)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!sign|_next/static|_next/image|favicon.ico).*)',
  ]
}