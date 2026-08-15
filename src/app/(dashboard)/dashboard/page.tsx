'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePermissions } from '../PermissionContext'
import {
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  ShoppingCart,
  Package,
  Tags,
  Scale,
  Banknote,
  BarChart3,
  Settings,
  UserCog,
  ArrowUpRight,
} from 'lucide-react'

interface Summary {
  totalSales: number
  cashSales: number
  creditSales: number
  invoiceCount: number
}

interface OpenSession {
  id: string
  status: string
  expectedCash: number
}

interface BestSeller {
  product?: { id: string; code: string; name: string; baseUnit?: { name: string } | null }
  totalQuantity: number
  totalAmount: number
}

interface RecentInvoice {
  id: string
  invoiceNumber: string
  type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
  total: number
  createdAt: string
  customer?: { name: string }
}

const shortcuts = [
  { href: '/pos', label: 'ขายหน้าร้าน', desc: 'เปิดหน้าจอ POS', icon: ShoppingCart, color: 'bg-emerald-600', permission: 'SALE_CREATE' },
  { href: '/products', label: 'สินค้า', desc: 'จัดการสินค้า', icon: Package, color: 'bg-blue-600', permission: 'MANAGE_PRODUCT' },
  { href: '/categories', label: 'หมวดหมู่', desc: 'หมวดหมู่สินค้า', icon: Tags, color: 'bg-amber-500', permission: 'MANAGE_CATEGORY' },
  { href: '/units', label: 'หน่วย', desc: 'หน่วยสินค้า', icon: Scale, color: 'bg-purple-600', permission: 'MANAGE_CATEGORY' },
  { href: '/customers', label: 'ลูกค้า', desc: 'ลูกค้า เครดิต หนี้', icon: Users, color: 'bg-pink-600', permission: 'MANAGE_CUSTOMER' },
  { href: '/invoices', label: 'บิลขาย', desc: 'ประวัติบิล', icon: Receipt, color: 'bg-cyan-600', permission: 'SALE_CREATE' },
  { href: '/cash-sessions', label: 'เงินสด', desc: 'เปิด/ปิดเซสชั่น', icon: Banknote, color: 'bg-indigo-600', permission: 'MANAGE_SESSION' },
  { href: '/reports', label: 'รายงาน', desc: 'ยอดขาย สต็อก', icon: BarChart3, color: 'bg-slate-700', permission: 'VIEW_REPORT' },
  { href: '/users', label: 'ผู้ใช้งาน', desc: 'พนักงานและสิทธิ์', icon: UserCog, color: 'bg-teal-600', permission: 'MANAGE_USER' },
  { href: '/settings', label: 'ตั้งค่า', desc: 'ข้อมูลร้าน', icon: Settings, color: 'bg-rose-600', permission: 'SYSTEM_SETTING' },
]

export default function DashboardPage() {
  const permissions = usePermissions()
  const today = new Date().toISOString().split('T')[0]
  const [summary, setSummary] = useState<Summary | null>(null)
  const [session, setSession] = useState<OpenSession | null>(null)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [receivables, setReceivables] = useState<{ total: number } | null>(null)
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/reports/sales-summary?from=${today}&to=${today}`).then((r) => r.json()),
      fetch('/api/cash-sessions/current').then((r) => r.json()),
      fetch('/api/reports/low-stock').then((r) => r.json()),
      fetch('/api/reports/receivables').then((r) => r.json()),
      fetch('/api/reports/best-sellers?limit=5').then((r) => r.json()),
      fetch('/api/sales/invoices?take=5').then((r) => r.json()),
    ]).then(([sum, sess, stock, rec, bests, invs]) => {
      if (cancelled) return
      if (sum.success) setSummary(sum.data)
      if (sess.success) setSession(sess.data)
      if (stock.success) setLowStockCount(stock.data.length)
      if (rec.success) setReceivables(rec.data)
      if (bests.success) setBestSellers(bests.data)
      if (invs.success) setRecentInvoices(invs.data)
    })
    return () => { cancelled = true }
  }, [today])

  function fmt(n: number | null | undefined) {
    if (n == null) return '-'
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const visibleShortcuts = shortcuts.filter((item) => permissions.includes(item.permission))

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">แดชบอร์ด</h1>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">ยอดขายวันนี้</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary ? `${fmt(summary.totalSales)} ฿` : '-'}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">บิลวันนี้</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary ? summary.invoiceCount : '-'}</p>
        </div>

        <Link href="/reports?tab=receivables" className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition block">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">ลูกหนี้ค้าง</span>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${receivables && receivables.total > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {receivables ? `${fmt(receivables.total)} ฿` : '-'}
          </p>
        </Link>

        <Link href="/reports?tab=stock" className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition block">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">สินค้าใกล้หมด</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{lowStockCount}</p>
        </Link>
      </div>

      {session && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-800">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="font-medium">เซสชั่นเงินสดเปิดอยู่</p>
            <p className="text-sm">เงินในลิ้นชักประมาณ {fmt(Number(session.expectedCash))} ฿</p>
          </div>
        </div>
      )}

      {/* Shortcuts */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">เมนูทางลัด</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {visibleShortcuts.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition flex flex-col gap-3"
              >
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-slate-900">{item.label}</h3>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">สินค้าขายดี</h2>
          {bestSellers.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="divide-y">
              {bestSellers.filter((b) => b.product).map((b) => (
                <div key={b.product!.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.product!.name}</p>
                    <p className="text-xs text-slate-500">{b.totalQuantity} {b.product!.baseUnit?.name ?? '-'}</p>
                  </div>
                  <span className="font-semibold text-slate-900">{fmt(b.totalAmount)} ฿</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">บิลล่าสุด</h2>
            <Link href="/invoices" className="text-sm font-medium text-blue-600 hover:text-blue-700">ดูทั้งหมด</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">
                      {inv.type === 'CASH' ? 'เงินสด' : inv.type === 'TRANSFER' ? 'ธนาคาร' : inv.type === 'QR' ? 'พร้อมเพย์' : 'เครดิต'} {inv.customer ? `• ${inv.customer.name}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900">{fmt(Number(inv.total))} ฿</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
