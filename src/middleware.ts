import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. 如果达人通过 /sign 访问，直接放行，完全不往下走
  if (pathname.startsWith('/sign') || pathname.startsWith('/api/sign')) {
    return NextResponse.next()
  }

  // 2. 如果是达人需要用到的 PDF 预览接口，直接放行
  if (pathname.startsWith('/api/contracts') && pathname.endsWith('/original')) {
    return NextResponse.next()
  }

  // 3. 所有静态文件、图片、favicon、Next.js 内部组件全都放行
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // 包含点的通常是静态文件如 .css, .js, .png
  ) {
    return NextResponse.next()
  }

  // 4. 其他路径（主要是主页 / 和 /contracts，也就是管理后台）才要求密码
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

// 彻底去掉 matcher 限制，让中间件处理所有请求，由上方代码自己精准判断
export const config = {
  matcher: '/:path*',
}