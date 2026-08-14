import type { ReactNode } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hasPermission, type PermissionCode } from '@/lib/permissions'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Scale,
  Users,
  Receipt,
  Banknote,
  BarChart3,
  Settings,
  Truck,
} from 'lucide-react'
import { SignOutButton } from './sign-out-button'
import { PermissionContextProvider } from './PermissionContext'
import { RouteGuard } from './RouteGuard'

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, permission: null },
  { href: '/pos', label: 'ขายหน้าร้าน', icon: ShoppingCart, permission: 'SALE_CREATE' as PermissionCode },
  { href: '/products', label: 'สินค้า', icon: Package, permission: 'MANAGE_PRODUCT' as PermissionCode },
  { href: '/purchases', label: 'ซื้อของเข้า', icon: Truck, permission: 'MANAGE_PRODUCT' as PermissionCode },
  { href: '/categories', label: 'หมวดหมู่', icon: Tags, permission: 'MANAGE_CATEGORY' as PermissionCode },
  { href: '/units', label: 'หน่วย', icon: Scale, permission: 'MANAGE_CATEGORY' as PermissionCode },
  { href: '/customers', label: 'ลูกค้า', icon: Users, permission: 'MANAGE_CUSTOMER' as PermissionCode },
  { href: '/invoices', label: 'บิลขาย', icon: Receipt, permission: 'SALE_CREATE' as PermissionCode },
  { href: '/cash-sessions', label: 'เงินสด', icon: Banknote, permission: 'MANAGE_SESSION' as PermissionCode },
  { href: '/reports', label: 'รายงาน', icon: BarChart3, permission: 'VIEW_REPORT' as PermissionCode },
  { href: '/users', label: 'ผู้ใช้งาน', icon: Users, permission: 'MANAGE_USER' as PermissionCode },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings, permission: 'SYSTEM_SETTING' as PermissionCode },
]

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  const permissions = session?.user?.permissions ?? []
  const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(session, item.permission))

  return (
    <PermissionContextProvider permissions={permissions}>
      <RouteGuard>
        <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="font-bold text-lg tracking-tight">POS System</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold">
              {session?.user?.name?.[0] ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session?.user?.name ?? 'ผู้ใช้'}</p>
              <p className="text-xs text-slate-400 truncate">{session?.user?.email ?? ''}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden h-14 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0">
          <span className="font-bold">POS System</span>
          <SignOutButton />
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
      </RouteGuard>
    </PermissionContextProvider>
  )
}
