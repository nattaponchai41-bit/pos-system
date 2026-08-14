'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Receipt, Printer, XCircle, Undo2, Banknote, Package } from 'lucide-react'

interface AuthSession {
  user?: {
    id: string
    name?: string
    permissions: string[]
  }
}

interface Invoice {
  id: string
  invoiceNumber: string
  type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
  status: string
  total: number
  paidAmount: number
  refundAmount: number
  subtotal: number
  discount: number
  tax: number
  note?: string
  createdAt: string
  dueDate?: string
  customer?: {
    id: string
    code: string
    name: string
    creditLimit: number
    outstandingDebt: number
  }
  createdBy?: { name: string }
  session?: { id: string; status: string }
  items: {
    id: string
    quantity: number
    returnedQuantity: number
    unitPrice: number
    discount: number
    total: number
    product: { code: string; name: string }
    productUnit: { unit: { name: string } }
  }[]
  payments: {
    id: string
    method: string
    amount: number
    received?: number
    change?: number
    reference?: string
    createdAt: string
  }[]
  debtPayments: {
    id: string
    amount: number
    remainingAfter: number
    method: string
    reference?: string
    note?: string
    createdAt: string
    session?: { id: string; status: string }
  }[]
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

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [payment, setPayment] = useState({ amount: '', method: 'CASH', reference: '', note: '' })
  const [refundItems, setRefundItems] = useState<Record<string, string>>({})
  const [refundMethod, setRefundMethod] = useState('CASH')
  const [refundReference, setRefundReference] = useState('')

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((json) => setSession(json))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/sales/invoices/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setInvoice(json.data)
      })
    return () => { cancelled = true }
  }, [id])

  function can(permission: string) {
    return !!session?.user?.permissions?.includes(permission)
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!invoice?.customer) return
    const res = await fetch('/api/debt-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saleInvoiceId: id,
        customerId: invoice.customer.id,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        note: payment.note,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setPayment({ amount: '', method: 'CASH', reference: '', note: '' })
      refreshInvoice()
    } else {
      alert(json.message)
    }
  }

  async function refreshInvoice() {
    const res = await fetch(`/api/sales/invoices/${id}`)
    const json = await res.json()
    if (json.success) setInvoice(json.data)
  }

  async function handleCancel() {
    if (!confirm('ยกเลิกบิลนี้? ระบบจะคืนสต็อกและย้อนรายการเงิน')) return
    const res = await fetch(`/api/sales/invoices/${id}/cancel`, { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      refreshInvoice()
    } else {
      alert(json.message)
    }
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault()
    if (!invoice) return
    const items = Object.entries(refundItems)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([saleItemId, quantity]) => ({ saleItemId, quantity: Number(quantity) }))
    if (items.length === 0) return alert('กรุณาระบุจำนวนที่คืน')

    const res = await fetch(`/api/sales/invoices/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        method: refundMethod,
        reference: refundReference,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setRefundItems({})
      setRefundReference('')
      refreshInvoice()
    } else {
      alert(json.message)
    }
  }

  function setRefundQty(itemId: string, qty: string) {
    setRefundItems((prev) => ({ ...prev, [itemId]: qty }))
  }

  function methodLabel(method: string) {
    if (method === 'CASH') return 'เงินสด'
    if (method === 'TRANSFER') return 'ธนาคาร'
    if (method === 'QR') return 'พร้อมเพย์'
    return method
  }

  if (!invoice) return <p className="p-4 text-slate-500">กำลังโหลด...</p>

  const remaining = Number(invoice.total) - Number(invoice.paidAmount)
  const isFinal = invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
              <p className="text-sm text-slate-500">{new Date(invoice.createdAt).toLocaleString('th-TH')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(invoice.status)}
            <Link
              href={`/receipt/${invoice.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="w-4 h-4" />
              ใบเสร็จ
            </Link>
            <Link
              href={`/invoice-a4/${invoice.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="w-4 h-4" />
              A4
            </Link>
            {!isFinal && can('BILL_CANCEL') && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                <XCircle className="w-4 h-4" />
                ยกเลิกบิล
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-slate-500">ประเภท</p>
            <p className="font-medium text-slate-900">{invoice.type === 'CASH' ? 'เงินสด' : invoice.type === 'TRANSFER' ? 'ธนาคาร' : invoice.type === 'QR' ? 'พร้อมเพย์' : 'เครดิต'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500">สถานะ</p>
            <p className="font-medium text-slate-900">{statusBadge(invoice.status)} {Number(invoice.refundAmount) > 0 && <span className="text-amber-600">(คืนแล้ว {fmt(Number(invoice.refundAmount))} ฿)</span>}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500">ลูกค้า</p>
            <p className="font-medium text-slate-900">{invoice.customer ? `${invoice.customer.code} - ${invoice.customer.name}` : '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500">พนักงาน</p>
            <p className="font-medium text-slate-900">{invoice.createdBy?.name ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500">เซสชั่น</p>
            <p className="font-medium text-slate-900">{invoice.session?.status ?? '-'}</p>
          </div>
          {invoice.dueDate && (
            <div className="space-y-1">
              <p className="text-slate-500">ครบกำหนด</p>
              <p className="font-medium text-slate-900">{new Date(invoice.dueDate).toLocaleDateString('th-TH')}</p>
            </div>
          )}
          {invoice.note && (
            <div className="sm:col-span-2 space-y-1">
              <p className="text-slate-500">หมายเหตุ</p>
              <p className="font-medium text-slate-900">{invoice.note}</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">รายการสินค้า</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3 font-medium">สินค้า</th>
                <th className="py-3 font-medium">จำนวน</th>
                <th className="py-3 font-medium">หน่วย</th>
                <th className="py-3 font-medium">ราคา</th>
                <th className="py-3 font-medium">ส่วนลด</th>
                <th className="py-3 font-medium text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 font-medium text-slate-900">{item.product.name}</td>
                  <td className="py-3">
                    {item.quantity}
                    {Number(item.returnedQuantity) > 0 && (
                      <span className="ml-2 text-red-600 text-xs">(คืน {item.returnedQuantity})</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-600">{item.productUnit.unit.name}</td>
                  <td className="py-3">{fmt(Number(item.unitPrice))} ฿</td>
                  <td className="py-3">{fmt(Number(item.discount))} ฿</td>
                  <td className="py-3 text-right font-medium text-slate-900">{fmt(Number(item.total))} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t pt-4 space-y-1 text-right">
          <p className="text-slate-600">รวม: <span className="font-medium text-slate-900">{fmt(Number(invoice.subtotal))} ฿</span></p>
          <p className="text-slate-600">ส่วนลด: <span className="font-medium text-slate-900">{fmt(Number(invoice.discount))} ฿</span></p>
          <p className="text-slate-600">ภาษี: <span className="font-medium text-slate-900">{fmt(Number(invoice.tax))} ฿</span></p>
          <p className="text-lg font-bold text-slate-900">ยอดสุทธิ: {fmt(Number(invoice.total))} ฿</p>
          <p className="text-slate-600">จ่ายแล้ว: <span className="font-medium text-green-600">{fmt(Number(invoice.paidAmount))} ฿</span></p>
          {Number(invoice.refundAmount) > 0 && <p className="text-amber-600">คืนเงินแล้ว: {fmt(Number(invoice.refundAmount))} ฿</p>}
          <p className={`text-lg font-bold ${remaining > 0 ? 'text-rose-600' : 'text-green-600'}`}>คงเหลือ: {fmt(remaining)} ฿</p>
        </div>
      </section>

      {!isFinal && invoice.type === 'CREDIT' && remaining > 0 && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">รับชำระหนี้ (คงเหลือ {fmt(remaining)} ฿)</h2>
          </div>

          <form onSubmit={handlePayment} className="flex flex-wrap items-end gap-3">
            <div className="w-36">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวนเงิน</label>
              <input
                type="number"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                placeholder="จำนวนเงิน"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                step="any"
                required
              />
            </div>
            <div className="w-36">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ช่องทาง</label>
              <select
                value={payment.method}
                onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
              >
                <option value="CASH">เงินสด</option>
                <option value="TRANSFER">โอน</option>
                <option value="QR">QR</option>
              </select>
            </div>
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขอ้างอิง</label>
              <input
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                placeholder="เลขอ้างอิง"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              />
            </div>
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ</label>
              <input
                value={payment.note}
                onChange={(e) => setPayment({ ...payment, note: e.target.value })}
                placeholder="หมายเหตุ"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              />
            </div>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition">
              บันทึก
            </button>
          </form>
        </section>
      )}

      {!isFinal && can('BILL_CANCEL') && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Undo2 className="w-5 h-5 text-rose-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">คืนสินค้า/คืนเงิน</h2>
          </div>

          <form onSubmit={handleRefund} className="space-y-4">
            <div className="space-y-3">
              {invoice.items.map((item) => {
                const maxReturn = Number(item.quantity) - Number(item.returnedQuantity)
                return (
                  <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="flex-1 text-sm font-medium text-slate-900">{item.product.name}</span>
                    <span className="text-xs text-slate-500">คืนได้สูงสุด {maxReturn} {item.productUnit.unit.name}</span>
                    <input
                      type="number"
                      min={0}
                      max={maxReturn}
                      step="any"
                      value={refundItems[item.id] ?? ''}
                      onChange={(e) => setRefundQty(item.id, e.target.value)}
                      placeholder="จำนวนคืน"
                      className="w-28 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36">
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
                >
                  <option value="CASH">เงินสด</option>
                  <option value="TRANSFER">โอน</option>
                  <option value="QR">QR</option>
                </select>
              </div>
              <div className="flex-1 min-w-[10rem]">
                <input
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="เลขอ้างอิง"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                />
              </div>
              <button type="submit" className="rounded-lg bg-red-600 px-4 py-2.5 text-white font-medium hover:bg-red-700 transition">
                คืนเงิน
              </button>
            </div>
          </form>
        </section>
      )}

      {invoice.payments.length > 0 && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">การชำระเงินสด</h2>
          </div>
          <div className="space-y-2 text-sm">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-100 p-3">
                <span className="text-slate-700">
                  {new Date(p.createdAt).toLocaleString('th-TH')} — <span className="font-medium">{methodLabel(p.method)}</span> {fmt(Number(p.amount))} ฿
                  {p.received !== undefined && p.received !== null && (
                    <span className="text-slate-500 ml-2">
                      (รับ {fmt(Number(p.received))} ทอน {fmt(Number(p.change ?? 0))})
                    </span>
                  )}
                </span>
                {p.reference && <span className="text-slate-500">อ้างอิง {p.reference}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {invoice.debtPayments.length > 0 && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">ประวัติชำระหนี้</h2>
          </div>
          <div className="space-y-2 text-sm">
            {invoice.debtPayments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-100 p-3">
                <span className="text-slate-700">
                  {new Date(p.createdAt).toLocaleString('th-TH')} — <span className="font-medium">{methodLabel(p.method)}</span> {fmt(Number(p.amount))} ฿ — คงเหลือ {fmt(Number(p.remainingAfter))}
                  {p.session && <span className="text-slate-500 ml-2">(เซสชั่น {p.session.status})</span>}
                </span>
                {p.reference && <span className="text-slate-500">อ้างอิง {p.reference}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
