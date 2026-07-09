import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 放行静态资源
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

  // 判断是否为 Next.js 内部的预取/后台请求，这类请求坚决不能返回带有 WWW-Authenticate 的 401
  const isPrefetch =
    request.headers.get('x-middleware-prefetch') ||
    request.headers.get('x-nextjs-data') ||
    request.headers.get('next-router-prefetch') ||
    request.headers.get('rsc') === '1' ||
    request.headers.get('purpose') === 'prefetch'

  const send401 = (realm: string) => {
    if (isPrefetch) {
      // 核心修复：遇到后台加载主页数据的请求，直接掐断（返回 403），绝对不触发原生账密弹窗
      return new NextResponse('Unauthorized prefetch', { status: 403 })
    }
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
  matcher: '/:path*'
}