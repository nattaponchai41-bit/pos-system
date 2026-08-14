'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePermissions } from './PermissionContext'

const ROUTE_PERMISSIONS: { pattern: RegExp; code: string | string[] }[] = [
  { pattern: /^\/pos(\/.*)?$/, code: 'SALE_CREATE' },
  { pattern: /^\/products(\/.*)?$/, code: 'MANAGE_PRODUCT' },
  { pattern: /^\/purchases(\/.*)?$/, code: 'MANAGE_PRODUCT' },
  { pattern: /^\/categories(\/.*)?$/, code: 'MANAGE_CATEGORY' },
  { pattern: /^\/units(\/.*)?$/, code: 'MANAGE_CATEGORY' },
  { pattern: /^\/customers(\/.*)?$/, code: 'MANAGE_CUSTOMER' },
  { pattern: /^\/invoices(\/.*)?$/, code: 'SALE_CREATE' },
  { pattern: /^\/cash-sessions(\/.*)?$/, code: 'MANAGE_SESSION' },
  { pattern: /^\/reports(\/.*)?$/, code: 'VIEW_REPORT' },
  { pattern: /^\/users(\/.*)?$/, code: 'MANAGE_USER' },
  { pattern: /^\/settings(\/.*)?$/, code: 'SYSTEM_SETTING' },
]

function isRouteAllowed(pathname: string, permissions: string[]) {
  if (pathname === '/dashboard' || pathname === '/') return true

  const required = ROUTE_PERMISSIONS.find(({ pattern }) => pattern.test(pathname))?.code
  if (!required) return true

  const codes = Array.isArray(required) ? required : [required]
  return codes.some((code) => permissions.includes(code))
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const permissions = usePermissions()
  const allowed = isRouteAllowed(pathname || '/', permissions)

  useEffect(() => {
    if (!allowed) {
      router.replace('/dashboard')
    }
  }, [allowed, router])

  if (!allowed) {
    return null
  }

  return <>{children}</>
}
