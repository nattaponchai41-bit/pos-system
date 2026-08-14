'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Receipt, Search, Eye, Printer } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
  status: string
  total: number
  paidAmount: number
  customer?: { code: string; name: string }
  createdAt: string
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadge(status: string) {
  if (status === 'COMPLETED')
    return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">สำเร็จ</span>
  if (status === 'CANCELLED')
    return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">ยกเลิก</span>
  if (status === 'REFUNDED')
    return <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">คืนเงิน</span>
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{status}</span>
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    fetch(`/api/sales/invoices?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setInvoices(json.data)
      })
    return () => { cancelled = true }
  }, [type, status, search])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">บิลขาย</h1>
        <p className="text-sm text-slate-500">ค้นหาและดูประวัติบิลขายทั้งเงินสดและเครดิต</p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-cyan-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">รายการบิล</h2>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white">
            <option value="">ทุกประเภท</option>
            <option value="CASH">เงินสด</option>
            <option value="TRANSFER">ธนาคาร</option>
            <option value="QR">พร้อมเพย์</option>
            <option value="CREDIT">เครดิต</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white">
            <option value="">ทุกสถานะ</option>
            <option value="COMPLETED">สำเร็จ</option>
            <option value="CANCELLED">ยกเลิก</option>
            <option value="REFUNDED">คืนเงิน</option>
          </select>
          <div className="relative flex-1 min-w-[12rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขบิล/ลูกค้า"
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3 font-medium">เลขบิล</th>
                <th className="py-3 font-medium">ประเภท</th>
                <th className="py-3 font-medium">สถานะ</th>
                <th className="py-3 font-medium">ลูกค้า</th>
                <th className="py-3 font-medium">ยอด</th>
                <th className="py-3 font-medium">จ่ายแล้ว</th>
                <th className="py-3 font-medium">คงเหลือ</th>
                <th className="py-3 font-medium">วันที่</th>
                <th className="py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const remaining = Number(inv.total) - Number(inv.paidAmount)
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                    <td className="py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 text-slate-600">{inv.type === 'CASH' ? 'เงินสด' : inv.type === 'TRANSFER' ? 'ธนาคาร' : inv.type === 'QR' ? 'พร้อมเพย์' : 'เครดิต'}</td>
                    <td className="py-3">{statusBadge(inv.status)}</td>
                    <td className="py-3 text-slate-600">{inv.customer ? `${inv.customer.code} - ${inv.customer.name}` : '-'}</td>
                    <td className="py-3 text-slate-900">{fmt(Number(inv.total))} ฿</td>
                    <td className="py-3 text-green-600">{fmt(Number(inv.paidAmount))} ฿</td>
                    <td className="py-3 font-medium text-rose-600">{fmt(remaining)} ฿</td>
                    <td className="py-3 text-slate-600">{new Date(inv.createdAt).toLocaleString('th-TH')}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                        >
                          <Eye className="w-4 h-4" />
                          ดู
                        </Link>
                        <Link
                          href={`/invoice-a4/${inv.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
                        >
                          <Printer className="w-4 h-4" />
                          A4
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">ไม่พบบิล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
