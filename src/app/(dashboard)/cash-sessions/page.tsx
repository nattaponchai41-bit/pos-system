'use client'

import { useEffect, useState } from 'react'
import { Banknote, Unlock, Lock, ArrowDownLeft, ArrowUpRight, Receipt, TrendingUp, Download, History, Loader2 } from 'lucide-react'
import { downloadSessionPDF } from '@/lib/pdf'

interface CashSession {
  id: string
  openedAt: string
  closedAt?: string
  openingCash: number
  expectedCash: number
  actualCash?: number
  difference?: number
  status: string
  openedBy: { name: string }
  closedBy?: { name: string }
}

interface SessionReport {
  session: CashSession
  movements: Record<string, { sum: number; count: number }>
  movementDetails: {
    id: string
    type: string
    amount: number
    reason: string | null
    createdAt: string
    createdBy: string
  }[]
  recomputedExpected: number
  cashSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  transferSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  qrSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  creditSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  debtPayments: {
    count: number
    total: number
    items: {
      invoiceNumber: string
      customerName: string
      amount: number
      method: string
      reference: string | null
      createdAt: string
    }[]
  }
  itemizedSales: {
    productId: string
    productCode: string
    productName: string
    unitName: string
    quantity: number
    total: number
    cost: number
    profit: number
  }[]
  invoiceList: {
    id: string
    invoiceNumber: string
    type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
    total: number
    createdAt: string
    customer?: { name: string }
    createdBy?: { name: string }
    items: {
      product: { code: string; name: string }
      productUnit: { unit: { name: string } }
      quantity: number
      unitPrice: number
      total: number
    }[]
    payments: { method: string; amount: number }[]
  }[]
}

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
  CASH_IN: <ArrowDownLeft className="w-4 h-4 text-green-600" />,
  CASH_OUT: <ArrowUpRight className="w-4 h-4 text-red-600" />,
  EXPENSE: <ArrowUpRight className="w-4 h-4 text-amber-600" />,
  REFUND: <ArrowUpRight className="w-4 h-4 text-rose-600" />,
  DEBT_PAYMENT: <ArrowDownLeft className="w-4 h-4 text-emerald-600" />,
}

const MOVEMENT_LABELS: Record<string, string> = {
  CASH_IN: 'เงินเข้า',
  CASH_OUT: 'เงินออก',
  EXPENSE: 'ค่าใช้จ่าย',
  REFUND: 'คืนเงิน',
  DEBT_PAYMENT: 'รับชำระหนี้',
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CashSessionsPage() {
  const [session, setSession] = useState<CashSession | null>(null)
  const [report, setReport] = useState<SessionReport | null>(null)
  const [history, setHistory] = useState<CashSession[]>([])
  const [openingCash, setOpeningCash] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [movement, setMovement] = useState<{
    type: 'CASH_IN' | 'CASH_OUT' | 'EXPENSE' | 'REFUND'
    amount: string
    reason: string
  }>({ type: 'CASH_IN', amount: '', reason: '' })

  useEffect(() => {
    fetchSession()
    fetchHistory()
  }, [])

  async function fetchSession() {
    const res = await fetch('/api/cash-sessions/current')
    const json = await res.json()
    if (json.success) {
      setSession(json.data)
      if (json.data) fetchReport(json.data.id)
    }
  }

  async function fetchHistory() {
    const res = await fetch('/api/cash-sessions/history')
    const json = await res.json()
    if (json.success) setHistory(json.data)
  }

  async function fetchReport(id: string) {
    const res = await fetch(`/api/cash-sessions/${id}/report`)
    const json = await res.json()
    if (json.success) {
      const selected = history.find((s) => s.id === id) ?? session
      if (selected) setSession(selected)
      setReport(json.data)
      setTimeout(() => {
        const el = document.getElementById('session-report')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } else {
      alert(json.message || 'โหลดรายงานไม่สำเร็จ')
    }
  }

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/cash-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openingCash: Number(openingCash) }),
    })
    const json = await res.json()
    if (json.success) {
      setOpeningCash('')
      fetchSession()
      fetchHistory()
    } else {
      alert(json.message)
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    const res = await fetch(`/api/cash-sessions/${session.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualCash: Number(actualCash) }),
    })
    const json = await res.json()
    if (json.success) {
      setActualCash('')
      fetchSession()
      fetchHistory()
    } else {
      alert(json.message)
    }
  }

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    const res = await fetch(`/api/cash-sessions/${session.id}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: movement.type,
        amount: Number(movement.amount),
        reason: movement.reason,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setMovement({ type: 'CASH_IN', amount: '', reason: '' })
      fetchSession()
    } else {
      alert(json.message)
    }
  }

  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPDF() {
    if (!report) return
    setDownloading(true)
    try {
      await downloadSessionPDF(report)
    } catch (err) {
      console.error(err)
      alert('ดาวน์โหลด PDF ไม่สำเร็จ')
    } finally {
      setDownloading(false)
    }
  }

  const historySection = (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
          <History className="w-5 h-5 text-slate-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">ประวัติเซสชั่น</h2>
      </div>

      {history.length === 0 ? (
        <p className="text-slate-500 text-sm">ยังไม่มีประวัติเซสชั่น</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3 font-medium">เปิด</th>
                <th className="py-3 font-medium">ปิด</th>
                <th className="py-3 font-medium text-right">เงินเปิด</th>
                <th className="py-3 font-medium text-right">เงินที่ควรมี</th>
                <th className="py-3 font-medium text-right">เงินที่นับได้</th>
                <th className="py-3 font-medium text-right">ต่าง</th>
                <th className="py-3 font-medium">สถานะ</th>
                <th className="py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3">
                    <div className="text-slate-900">{new Date(s.openedAt).toLocaleString('th-TH')}</div>
                    <div className="text-xs text-slate-500">{s.openedBy.name}</div>
                  </td>
                  <td className="py-3">
                    {s.closedAt ? (
                      <>
                        <div className="text-slate-900">{new Date(s.closedAt).toLocaleString('th-TH')}</div>
                        {s.closedBy && <div className="text-xs text-slate-500">{s.closedBy.name}</div>}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 text-right">{fmt(Number(s.openingCash))} ฿</td>
                  <td className="py-3 text-right">{fmt(Number(s.expectedCash))} ฿</td>
                  <td className="py-3 text-right">{s.actualCash !== null ? `${fmt(Number(s.actualCash))} ฿` : '-'}</td>
                  <td className={`py-3 text-right ${Number(s.difference ?? 0) < 0 ? 'text-red-600' : ''}`}>
                    {s.difference !== null ? `${fmt(Number(s.difference))} ฿` : '-'}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        s.status === 'OPEN'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {s.status === 'OPEN' ? 'เปิด' : 'ปิด'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => fetchReport(s.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                      ดูรายงาน
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">เซสชั่นเงินสด</h1>
          <p className="text-sm text-slate-500">เปิดลิ้นชักก่อนเริ่มขาย</p>
        </div>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">เปิดเซสชั่นใหม่</h2>
          </div>

          <form onSubmit={handleOpen} className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">เงินเปิดลิ้นชัก</label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                step="any"
                required
              />
            </div>
            <button
              type="submit"
              className="self-end rounded-lg bg-slate-900 px-5 py-2.5 text-white font-medium hover:bg-slate-800 transition"
            >
              เปิดเซสชั่น
            </button>
          </form>
        </section>

        {historySection}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">เซสชั่นเงินสด</h1>
        <p className="text-sm text-slate-500">ติดตามเงินในลิ้นชักและสรุปยอดขาย</p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">สถานะเซสชั่น</h2>
            <p className="text-sm text-slate-500">เปิดเมื่อ {new Date(session.openedAt).toLocaleString('th-TH')} โดย {session.openedBy.name}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">{session.status}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">เงินเปิด</p>
            <p className="text-lg font-bold text-slate-900">{fmt(Number(session.openingCash))} ฿</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-slate-500">เงินที่ควรมี</p>
            <p className="text-lg font-bold text-blue-700">{fmt(Number(session.expectedCash))} ฿</p>
          </div>
          {session.actualCash !== null && (
            <>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-xs text-slate-500">เงินที่นับได้</p>
                <p className="text-lg font-bold text-green-700">{fmt(Number(session.actualCash))} ฿</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs text-slate-500">ต่าง</p>
                <p className={`text-lg font-bold ${Number(session.difference ?? 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmt(Number(session.difference ?? 0))} ฿
                </p>
              </div>
            </>
          )}
        </div>

        {session.status === 'OPEN' && (
          <div className="mt-6 space-y-6 border-t pt-6">
            <form onSubmit={handleMovement} className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภท</label>
                <select
                  value={movement.type}
                  onChange={(e) => setMovement({ ...movement, type: e.target.value as 'CASH_IN' | 'CASH_OUT' | 'EXPENSE' | 'REFUND' })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
                >
                  <option value="CASH_IN">เงินเข้า</option>
                  <option value="CASH_OUT">เงินออก</option>
                  <option value="EXPENSE">ค่าใช้จ่าย</option>
                  <option value="REFUND">คืนเงิน</option>
                </select>
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวนเงิน</label>
                <input
                  type="number"
                  value={movement.amount}
                  onChange={(e) => setMovement({ ...movement, amount: e.target.value })}
                  placeholder="จำนวนเงิน"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                  step="any"
                  required
                />
              </div>
              <div className="flex-1 min-w-[12rem]">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เหตุผล</label>
                <input
                  value={movement.reason}
                  onChange={(e) => setMovement({ ...movement, reason: e.target.value })}
                  placeholder="เหตุผล"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                  required
                />
              </div>
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition">
                บันทึก
              </button>
            </form>

            <form onSubmit={handleClose} className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เงินสดที่นับได้</label>
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                  step="any"
                  required
                />
              </div>
              <button
                type="submit"
                className="self-end rounded-lg bg-red-600 px-5 py-2.5 text-white font-medium hover:bg-red-700 transition flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                ปิดเซสชั่น
              </button>
            </form>
          </div>
        )}
      </section>

      {historySection}

      {report && (
        <>
          <section id="session-report" className="rounded-xl border bg-white p-6 shadow-sm print:hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">สรุปเซสชั่น</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังสร้าง PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      ดาวน์โหลด PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="rounded-lg bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-slate-500">กำไรรวมในเซสชั่น</p>
                </div>
                <p className="text-lg font-bold text-emerald-700">{fmt(report.cashSales.profit + report.transferSales.profit + report.qrSales.profit + report.creditSales.profit)} ฿</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-slate-500">ขายเงินสด</p>
                </div>
                <p className="text-base font-bold text-green-700">{report.cashSales.count} รายการ / {fmt(report.cashSales.total)} ฿</p>
                <p className="text-xs text-emerald-600">กำไร {fmt(report.cashSales.profit)} ฿</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <p className="text-xs text-slate-500">ขายโอนเงิน</p>
                </div>
                <p className="text-base font-bold text-indigo-700">{report.transferSales.count} รายการ / {fmt(report.transferSales.total)} ฿</p>
                <p className="text-xs text-emerald-600">กำไร {fmt(report.transferSales.profit)} ฿</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  <p className="text-xs text-slate-500">ขายพร้อมเพย์</p>
                </div>
                <p className="text-base font-bold text-purple-700">{report.qrSales.count} รายการ / {fmt(report.qrSales.total)} ฿</p>
                <p className="text-xs text-emerald-600">กำไร {fmt(report.qrSales.profit)} ฿</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-slate-500">ขายเครดิต</p>
                </div>
                <p className="text-base font-bold text-blue-700">{report.creditSales.count} รายการ / {fmt(report.creditSales.total)} ฿</p>
                <p className="text-xs text-emerald-600">กำไร {fmt(report.creditSales.profit)} ฿</p>
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(report.movements).map(([type, data]) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-2">
                    {MOVEMENT_ICONS[type]}
                    <span className="text-sm font-medium text-slate-700">{MOVEMENT_LABELS[type] || type} ({data.count})</span>
                  </div>
                  <span className="font-medium text-slate-900">{fmt(data.sum)} ฿</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900 mb-3">คำนวณเงินที่ควรมี</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">เงินเปิดกะ</span>
                  <span className="font-medium">{fmt(Number(session.openingCash))} ฿</span>
                </div>
                {Object.entries(report.movements).map(([type, data]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-slate-600">{MOVEMENT_LABELS[type] || type}</span>
                    <span className={`font-medium ${data.sum < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(data.sum)} ฿</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>คำนวณได้</span>
                  <span className={report.recomputedExpected !== Number(session.expectedCash) ? 'text-red-600' : 'text-slate-900'}>{fmt(report.recomputedExpected)} ฿</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>เงินที่ควรมีในระบบ</span>
                  <span>{fmt(Number(session.expectedCash))} ฿</span>
                </div>
                {report.recomputedExpected !== Number(session.expectedCash) && (
                  <p className="text-xs text-red-600 mt-2">
                    ตัวเลขไม่ตรงกัน อาจมีการแก้ไขฐานข้อมูลโดยตรงหรือรายการคำนวณผิดพลาด
                  </p>
                )}
              </div>
            </div>

            {report.movementDetails.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-slate-900 mb-3">รายการความเคลื่อนไหวเงินสด ({report.movementDetails.length} รายการ)</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b text-slate-500">
                        <th className="px-3 py-2 font-medium">เวลา</th>
                        <th className="px-3 py-2 font-medium">ประเภท</th>
                        <th className="px-3 py-2 font-medium text-right">ยอด</th>
                        <th className="px-3 py-2 font-medium">เหตุผล</th>
                        <th className="px-3 py-2 font-medium">บันทึกโดย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.movementDetails.map((m) => (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2">{new Date(m.createdAt).toLocaleString('th-TH')}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {MOVEMENT_ICONS[m.type]}
                              <span>{MOVEMENT_LABELS[m.type] || m.type}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${m.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {fmt(m.amount)} ฿
                          </td>
                          <td className="px-3 py-2 text-slate-600">{m.reason ?? '-'}</td>
                          <td className="px-3 py-2 text-slate-600">{m.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.debtPayments.count > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-slate-900 mb-3">รายการรับชำระหนี้ ({report.debtPayments.count} รายการ)</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b text-slate-500">
                        <th className="px-3 py-2 font-medium">เลขบิล</th>
                        <th className="px-3 py-2 font-medium">ลูกค้า</th>
                        <th className="px-3 py-2 font-medium text-right">ยอด</th>
                        <th className="px-3 py-2 font-medium">วิธี</th>
                        <th className="px-3 py-2 font-medium">อ้างอิง</th>
                        <th className="px-3 py-2 font-medium">เวลา</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.debtPayments.items.map((dp) => (
                        <tr key={`${dp.invoiceNumber}-${dp.createdAt}`} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium">{dp.invoiceNumber}</td>
                          <td className="px-3 py-2">{dp.customerName}</td>
                          <td className="px-3 py-2 text-right">{fmt(dp.amount)} ฿</td>
                          <td className="px-3 py-2">
                            {dp.method === 'CASH' ? 'เงินสด' : dp.method === 'TRANSFER' ? 'ธนาคาร' : dp.method === 'QR' ? 'พร้อมเพย์' : dp.method}
                          </td>
                          <td className="px-3 py-2">{dp.reference ?? '-'}</td>
                          <td className="px-3 py-2">{new Date(dp.createdAt).toLocaleString('th-TH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="hidden print:block print:w-full print:p-0 print:shadow-none print:border-0">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">สรุปยอดปิดกะ</h2>
              <p className="text-sm text-slate-600 mt-1">
                เปิดกะ: {new Date(session.openedAt).toLocaleString('th-TH')} โดย {session.openedBy.name}
              </p>
              {session.closedAt && (
                <p className="text-sm text-slate-600">
                  ปิดกะ: {new Date(session.closedAt).toLocaleString('th-TH')} โดย {session.closedBy?.name ?? '-'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="border p-3">
                <p className="text-slate-500">เงินเปิดกะ</p>
                <p className="text-lg font-bold">{fmt(Number(session.openingCash))} ฿</p>
              </div>
              <div className="border p-3">
                <p className="text-slate-500">เงินที่ควรมี</p>
                <p className="text-lg font-bold">{fmt(Number(session.expectedCash))} ฿</p>
              </div>
              <div className="border p-3">
                <p className="text-slate-500">เงินที่นับได้</p>
                <p className="text-lg font-bold">{fmt(Number(session.actualCash ?? 0))} ฿</p>
              </div>
              <div className="border p-3">
                <p className="text-slate-500">ต่าง</p>
                <p className={`text-lg font-bold ${Number(session.difference ?? 0) < 0 ? 'text-red-600' : ''}`}>{fmt(Number(session.difference ?? 0))} ฿</p>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 mb-2">สรุปยอดขาย</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
              <div className="border p-3">
                <p className="text-slate-500">ขายเงินสด</p>
                <p className="font-bold">{report.cashSales.count} รายการ / {fmt(report.cashSales.total)} ฿</p>
                <p className="text-xs text-emerald-700">กำไร {fmt(report.cashSales.profit)} ฿</p>
              </div>
              <div className="border p-3">
                <p className="text-slate-500">ขายโอนเงิน</p>
                <p className="font-bold">{report.transferSales.count} รายการ / {fmt(report.transferSales.total)} ฿</p>
                <p className="text-xs text-emerald-700">กำไร {fmt(report.transferSales.profit)} ฿</p>
              </div>
              <div className="border p-3">
                <p className="text-slate-500">ขายพร้อมเพย์</p>
                <p className="font-bold">{report.qrSales.count} รายการ / {fmt(report.qrSales.total)} ฿</p>
                <p className="text-xs text-emerald-700">กำไร {fmt(report.qrSales.profit)} ฿</p>
              </div>
              <div className="border p-3">
                <p className="text-slate-500">ขายเครดิต</p>
                <p className="font-bold">{report.creditSales.count} รายการ / {fmt(report.creditSales.total)} ฿</p>
                <p className="text-xs text-emerald-700">กำไร {fmt(report.creditSales.profit)} ฿</p>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 mb-2">สินค้าที่ขายไป (รวม)</h3>
            <table className="w-full text-sm border mb-6">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="text-left p-2">รหัส</th>
                  <th className="text-left p-2">สินค้า</th>
                  <th className="text-left p-2">หน่วย</th>
                  <th className="text-right p-2">จำนวน</th>
                  <th className="text-right p-2">ยอดรวม</th>
                  <th className="text-right p-2">กำไร</th>
                </tr>
              </thead>
              <tbody>
                {report.itemizedSales.map((item) => (
                  <tr key={`${item.productId}-${item.unitName}`} className="border-b">
                    <td className="p-2">{item.productCode}</td>
                    <td className="p-2">{item.productName}</td>
                    <td className="p-2">{item.unitName}</td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">{fmt(item.total)} ฿</td>
                    <td className="p-2 text-right">{fmt(item.profit)} ฿</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {report.debtPayments.count > 0 && (
              <>
                <h3 className="font-bold text-slate-900 mb-2">รายการรับชำระหนี้ ({report.debtPayments.count} รายการ)</h3>
                <table className="w-full text-sm border mb-6">
                  <thead>
                    <tr className="bg-slate-100 border-b">
                      <th className="text-left p-2">เลขบิล</th>
                      <th className="text-left p-2">ลูกค้า</th>
                      <th className="text-right p-2">ยอด</th>
                      <th className="text-left p-2">วิธี</th>
                      <th className="text-left p-2">อ้างอิง</th>
                      <th className="text-left p-2">เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.debtPayments.items.map((dp) => (
                      <tr key={`print-${dp.invoiceNumber}-${dp.createdAt}`} className="border-b">
                        <td className="p-2 font-medium">{dp.invoiceNumber}</td>
                        <td className="p-2">{dp.customerName}</td>
                        <td className="p-2 text-right">{fmt(dp.amount)} ฿</td>
                        <td className="p-2">
                          {dp.method === 'CASH' ? 'เงินสด' : dp.method === 'TRANSFER' ? 'ธนาคาร' : dp.method === 'QR' ? 'พร้อมเพย์' : dp.method}
                        </td>
                        <td className="p-2">{dp.reference ?? '-'}</td>
                        <td className="p-2">{new Date(dp.createdAt).toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3 className="font-bold text-slate-900 mb-2">รายการบิล ({report.invoiceList.length} รายการ)</h3>
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="text-left p-2">เลขบิล</th>
                  <th className="text-left p-2">เวลา</th>
                  <th className="text-left p-2">ประเภท</th>
                  <th className="text-left p-2">ลูกค้า</th>
                  <th className="text-right p-2">ยอด</th>
                </tr>
              </thead>
              <tbody>
                {report.invoiceList.map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="p-2 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-2">{new Date(inv.createdAt).toLocaleString('th-TH')}</td>
                    <td className="p-2">{inv.type === 'CASH' ? 'เงินสด' : inv.type === 'TRANSFER' ? 'ธนาคาร' : inv.type === 'QR' ? 'พร้อมเพย์' : 'เครดิต'}</td>
                    <td className="p-2">{inv.customer?.name ?? '-'}</td>
                    <td className="p-2 text-right">{fmt(inv.total)} ฿</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>


        </>
      )}
    </div>
  )
}
