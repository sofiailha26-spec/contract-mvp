import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 始终放行静态资源，防止任何误拦截
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 获取当前携带的账号密码
  const basicAuth = request.headers.get('authorization')
  let user = '', pwd = ''
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const decoded = atob(authValue).split(':')
    user = decoded[0]
    pwd = decoded[1]
  }

  // 定义两套权限
  const isAdmin = user === 'Sofia' && pwd === '2026888'
  const isCreator = user === 'colla' && pwd === 'market'

  // 定义路由归属
  const isCreatorRoute = pathname.startsWith('/sign') || pathname.startsWith('/api/sign')
  const isSharedRoute = pathname.startsWith('/api/contracts') && pathname.endsWith('/original')

  const send401 = (realm: string) => {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${realm}"` }
    })
  }

  // 1. 达人端页面
  if (isCreatorRoute) {
    if (isAdmin || isCreator) return NextResponse.next()
    return send401('Creator Access')
  }

  // 2. 共享接口（如 PDF 预览 iframe，管理员和达人都需要看）
  if (isSharedRoute) {
    if (isAdmin || isCreator) return NextResponse.next()
    return send401('Document Access')
  }

  // 3. 其他所有页面（即主页、合同管理面板等），默认仅限管理员
  if (isAdmin) {
    return NextResponse.next()
  }
  return send401('Admin Access')
}

export const config = {
  // 我们只显式地匹配动态路由，以防止静态文件误入中间件
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}