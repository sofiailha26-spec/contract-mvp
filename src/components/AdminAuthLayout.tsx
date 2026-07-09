'use client'

import { useState, useEffect } from 'react'

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const auth = sessionStorage.getItem('adminAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    } else {
      // 若无认证，直接跳转到首页
      window.location.href = '/'
    }
  }, [])

  if (!mounted) return null
  if (!isAuthenticated) return null // 跳转中

  return <>{children}</>
}