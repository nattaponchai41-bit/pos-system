'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Calendar, Package, Users, Search, TrendingUp } from 'lucide-react'

interface SalesSummary {
  from: string
  to: string
  totalSales: number
  totalCost: number
  profit: number
  marginPercent: number
  cashSales: number
  cashCost: number
  cashProfit: number
  transferSales: number
  transferCost: number
  transferProfit: number
  qrSales: number
  qrCost: number
  qrProfit: number
  creditSales: number
  creditCost: number
  creditProfit: number
  invoiceCount: number
  itemCount: number
}

interface LowStockProduct {
  id: string
  code: string
  name: string
  stock: number
  minStock: number
  baseUnit: { name: string }
}

interface ReceivableCustomer {
  id: string
  code: string
  name: string
  outstandingDebt: number
  saleInvoices: { id: string; invoiceNumber: string; total: number; paidAmount: number; createdAt: string }[]
}

interface ReceivablesReport {
  total: number
  customers: ReceivableCustomer[]
}

interface BestSeller {
  product: {
    id: string
    code: string
    name: string
    category?: { name: string } | null
    baseUnit?: { name: string } | null
  }
  totalQuantity: number
  totalAmount: number
  totalCost: number
  profit: number
  marginPercent: number
}

function fmt(n: number | null | undefined) {
  if (n == null) return '-'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([])
  const [receivables, setReceivables] = useState<ReceivablesReport | null>(null)
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [bsFrom, setBsFrom] = useState(today)
  const [bsTo, setBsTo] = useState(today)
  const [activeTab, setActiveTab] = useState<'sales' | 'stock' | 'receivables' | 'bestSellers'>('sales')

  useEffect(() => {
    loadSales()
    loadLowStock()
    loadReceivables()
    loadBestSellers()
  }, [])

  function loadSales() {
    fetch(`/api/reports/sales-summary?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((json) => json.success && setSummary(json.data))
  }

  function loadLowStock() {
    fetch('/api/reports/low-stock')
      .then((r) => r.json())
      .then((json) => json.success && setLowStock(json.data))
  }

  function loadReceivables() {
    fetch('/api/reports/receivables')
      .then((r) => r.json())
      .then((json) => json.success && setReceivables(json.data))
  }

  function loadBestSellers() {
    fetch(`/api/reports/best-sellers?limit=50&from=${bsFrom}&to=${bsTo}`)
      .then((r) => r.json())
      .then((json) => json.success && setBestSellers(json.data))
  }

  const tabs = [
    { key: 'sales', label: 'ยอดขาย', icon: BarChart3 },
    { key: 'bestSellers', label: 'สินค้าขายดี', icon: TrendingUp },
    { key: 'stock', label: 'สินค้าใกล้หมด', icon: Package },
    { key: 'receivables', label: 'ลูกหนี้', icon: Users },
  ] as const

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">รายงาน</h1>
        <p className="text-sm text-slate-500">สรุปยอดขาย สต็อก และลูกหนี้</p>
      </div>

      <section className="rounded-xl border bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </section>

      {activeTab === 'sales' && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">ยอดขายตามช่วงเวลา</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
            <button
              onClick={loadSales}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              ดู
            </button>
          </div>

          {summary && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-slate-500">กำไรรวม</p>
                  <p className="text-xl font-bold text-emerald-700">{fmt(summary.profit)} ฿</p>
                  <p className="text-xs text-emerald-600 mt-1">{fmt(summary.marginPercent)}% margin</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">ยอดขายรวม</p>
                  <p className="text-xl font-bold text-slate-900">{fmt(summary.totalSales)} ฿</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">ต้นทุนรวม</p>
                  <p className="text-xl font-bold text-slate-900">{fmt(summary.totalCost)} ฿</p>
                </div>
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm text-slate-500">เงินสด</p>
                  <p className="text-xl font-bold text-green-700">{fmt(summary.cashSales)} ฿</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-4">
                  <p className="text-sm text-slate-500">ธนาคาร</p>
                  <p className="text-xl font-bold text-indigo-700">{fmt(summary.transferSales)} ฿</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-4">
                  <p className="text-sm text-slate-500">พร้อมเพย์</p>
                  <p className="text-xl font-bold text-purple-700">{fmt(summary.qrSales)} ฿</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-slate-500">เครดิต</p>
                  <p className="text-xl font-bold text-blue-700">{fmt(summary.creditSales)} ฿</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">จำนวนบิล</p>
                  <p className="text-xl font-bold text-slate-900">{summary.invoiceCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">จำนวนสินค้า</p>
                  <p className="text-xl font-bold text-slate-900">{summary.itemCount}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2 px-3 font-medium">ประเภท</th>
                      <th className="py-2 px-3 font-medium text-right">ยอดขาย</th>
                      <th className="py-2 px-3 font-medium text-right">ต้นทุน</th>
                      <th className="py-2 px-3 font-medium text-right">กำไร</th>
                      <th className="py-2 px-3 font-medium text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'เงินสด', sales: summary.cashSales, cost: summary.cashCost, profit: summary.cashProfit },
                      { label: 'ธนาคาร', sales: summary.transferSales, cost: summary.transferCost, profit: summary.transferProfit },
                      { label: 'พร้อมเพย์', sales: summary.qrSales, cost: summary.qrCost, profit: summary.qrProfit },
                      { label: 'เครดิต', sales: summary.creditSales, cost: summary.creditCost, profit: summary.creditProfit },
                    ].map((row) => {
                      const margin = row.sales > 0 ? ((row.profit / row.sales) * 100) : 0
                      return (
                        <tr key={row.label} className="border-t">
                          <td className="py-2 px-3">{row.label}</td>
                          <td className="py-2 px-3 text-right">{fmt(row.sales)} ฿</td>
                          <td className="py-2 px-3 text-right">{fmt(row.cost)} ฿</td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-700">{fmt(row.profit)} ฿</td>
                          <td className="py-2 px-3 text-right">{fmt(margin)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'bestSellers' && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">สินค้าขายดีตามช่วงเวลา</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={bsFrom}
              onChange={(e) => setBsFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
            <input
              type="date"
              value={bsTo}
              onChange={(e) => setBsTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
            <button
              onClick={loadBestSellers}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              ดู
            </button>
          </div>

          {bestSellers.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">ไม่มีข้อมูลสินค้าขายดีในช่วงเวลานี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-3 font-medium">ลำดับ</th>
                    <th className="py-3 font-medium">รหัส</th>
                    <th className="py-3 font-medium">สินค้า</th>
                    <th className="py-3 font-medium">หมวดหมู่</th>
                    <th className="py-3 font-medium text-right">จำนวนขาย</th>
                    <th className="py-3 font-medium text-right">ยอดรวม</th>
                    <th className="py-3 font-medium text-right">กำไร</th>
                    <th className="py-3 font-medium text-right">Margin</th>
                    <th className="py-3 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((b, idx) => (
                    <tr key={b.product.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                      <td className="py-3 text-slate-600">{idx + 1}</td>
                      <td className="py-3 font-medium text-slate-900">{b.product.code}</td>
                      <td className="py-3 text-slate-900">{b.product.name}</td>
                      <td className="py-3 text-slate-600">{b.product.category?.name ?? '-'}</td>
                      <td className="py-3 text-right font-medium text-slate-900">{fmt(b.totalQuantity)} {b.product.baseUnit?.name ?? ''}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{fmt(b.totalAmount)} ฿</td>
                      <td className="py-3 text-right text-emerald-700">{fmt(b.profit)} ฿</td>
                      <td className="py-3 text-right">{fmt(b.marginPercent)}%</td>
                      <td className="py-3 text-right">
                        <Link href={`/products/${b.product.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">ดู</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'stock' && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">สินค้าใกล้หมด</h2>
          </div>

          {lowStock.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">ไม่มีสินค้าใกล้หมด</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-3 font-medium">รหัส</th>
                    <th className="py-3 font-medium">สินค้า</th>
                    <th className="py-3 font-medium text-right">คงเหลือ</th>
                    <th className="py-3 font-medium text-right">ขั้นต่ำ</th>
                    <th className="py-3 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                      <td className="py-3 font-medium text-slate-900">{p.code}</td>
                      <td className="py-3 text-slate-900">{p.name}</td>
                      <td className="py-3 text-right font-medium text-red-600">{p.stock} {p.baseUnit.name}</td>
                      <td className="py-3 text-right text-slate-600">{p.minStock} {p.baseUnit.name}</td>
                      <td className="py-3 text-right">
                        <Link href={`/products/${p.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">ดู</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'receivables' && receivables && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-rose-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">ลูกหนี้ค้างชำระ</h2>
          </div>

          <div className="rounded-xl bg-rose-50 p-5">
            <p className="text-sm text-slate-500">ลูกหนี้ค้างรับรวม</p>
            <p className="text-2xl font-bold text-rose-600">{fmt(receivables.total)} ฿</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-3 font-medium">รหัสลูกค้า</th>
                  <th className="py-3 font-medium">ชื่อ</th>
                  <th className="py-3 font-medium text-right">ค้างชำระ</th>
                  <th className="py-3 font-medium text-right">บิลค้าง</th>
                  <th className="py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {receivables.customers.map((c: ReceivableCustomer) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                    <td className="py-3 font-medium text-slate-900">{c.code}</td>
                    <td className="py-3 text-slate-900">{c.name}</td>
                    <td className="py-3 text-right font-bold text-rose-600">{fmt(Number(c.outstandingDebt))} ฿</td>
                    <td className="py-3 text-right text-slate-700">{c.saleInvoices.length}</td>
                    <td className="py-3 text-right">
                      <Link href={`/customers/${c.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">ดู</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
