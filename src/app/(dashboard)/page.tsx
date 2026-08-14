'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

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
  product: { id: string; code: string; name: string; baseUnit: { name: string } }
  totalQuantity: number
  totalAmount: number
}

interface RecentInvoice {
  id: string
  invoiceNumber: string
  type: 'CASH' | 'CREDIT'
  total: number
  createdAt: string
  customer?: { name: string }
}

export default function DashboardPage() {
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

  function fmt(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">แดชบอร์ด</h1>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-lg border px-4 py-2 hover:bg-slate-100"
        >
          ออกจากระบบ
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">ยอดขายวันนี้</p>
          <p className="text-xl font-bold">{summary ? `${fmt(summary.totalSales)} ฿` : '-'}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">บิลวันนี้</p>
          <p className="text-xl font-bold">{summary ? summary.invoiceCount : '-'}</p>
        </div>
        <Link href="/reports?tab=receivables" className="rounded-xl border bg-white p-4 shadow-sm hover:shadow">
          <p className="text-sm text-slate-500">ลูกหนี้ค้าง</p>
          <p className="text-xl font-bold text-red-600">{receivables ? `${fmt(receivables.total)} ฿` : '-'}</p>
        </Link>
        <Link href="/reports?tab=stock" className="rounded-xl border bg-white p-4 shadow-sm hover:shadow">
          <p className="text-sm text-slate-500">สินค้าใกล้หมด</p>
          <p className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-600' : ''}`}>{lowStockCount}</p>
        </Link>
      </div>

      {session && (
        <div className="rounded-lg border bg-green-50 p-3 text-sm text-green-800">
          เซสชั่นเงินสดเปิดอยู่ — เงินในลิ้นชักประมาณ {fmt(Number(session.expectedCash))} ฿
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/pos" className="rounded-xl border bg-slate-900 p-6 text-white shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">ขายหน้าร้าน</h2>
          <p className="text-sm text-slate-200">เปิดหน้าจอ POS สำหรับขายสินค้า</p>
        </Link>
        <Link href="/products" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">สินค้า</h2>
          <p className="text-sm text-slate-500">จัดการสินค้า หน่วย ราคา บาร์โค้ด</p>
        </Link>
        <Link href="/categories" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">หมวดหมู่</h2>
          <p className="text-sm text-slate-500">จัดการหมวดหมู่สินค้า</p>
        </Link>
        <Link href="/units" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">หน่วย</h2>
          <p className="text-sm text-slate-500">จัดการหน่วยสินค้า</p>
        </Link>
        <Link href="/customers" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">ลูกค้า</h2>
          <p className="text-sm text-slate-500">ลูกค้า เครดิต หนี้</p>
        </Link>
        <Link href="/invoices" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">บิลขาย</h2>
          <p className="text-sm text-slate-500">ประวัติบิล ชำระหนี้ ใบเสร็จ</p>
        </Link>
        <Link href="/cash-sessions" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">เงินสด</h2>
          <p className="text-sm text-slate-500">เปิด/ปิดเซสชั่นเงินสด</p>
        </Link>
        <Link href="/reports" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">รายงาน</h2>
          <p className="text-sm text-slate-500">ยอดขาย สต็อก ลูกหนี้</p>
        </Link>
        <Link href="/users" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">ผู้ใช้งาน</h2>
          <p className="text-sm text-slate-500">จัดการพนักงานและสิทธิ์</p>
        </Link>
        <Link href="/settings" className="rounded-xl border bg-white p-6 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold">ตั้งค่า</h2>
          <p className="text-sm text-slate-500">ข้อมูลร้าน ใบเสร็จ PromptPay</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded border p-4">
          <h2 className="mb-3 font-bold">สินค้าขายดี</h2>
          {bestSellers.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {bestSellers.map((b) => (
                <div key={b.product.id} className="flex justify-between text-sm">
                  <span>{b.product.name} ({b.totalQuantity} {b.product.baseUnit.name})</span>
                  <span className="font-medium">{fmt(b.totalAmount)} ฿</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">บิลล่าสุด</h2>
            <Link href="/invoices" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between text-sm">
                  <span>
                    {inv.invoiceNumber} {inv.type === 'CASH' ? 'เงินสด' : 'เครดิต'} {inv.customer ? `- ${inv.customer.name}` : ''}
                  </span>
                  <span className="font-medium">{fmt(Number(inv.total))} ฿</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
