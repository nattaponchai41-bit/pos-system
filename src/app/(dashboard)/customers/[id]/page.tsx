'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { User, Wallet, Receipt, Banknote } from 'lucide-react'

interface Customer {
  id: string
  code: string
  name: string
  phone?: string
  address?: string
  branch?: string
  taxId?: string
  creditLimit: number
  creditDays: number
  outstandingDebt: number
  totalPurchased: number
  totalPaid: number
  isActive: boolean
}

interface Invoice {
  id: string
  invoiceNumber: string
  type: string
  total: number
  paidAmount: number
  remainingAmount: number
  dueDate?: string
  createdAt: string
  note?: string
  items: {
    id: string
    quantity: number
    unitPrice: number
    total: number
    product: { name: string; code: string }
    productUnit: { unit: { name: string } }
  }[]
  debtPayments: {
    id: string
    amount: number
    remainingAfter: number
    method: string
    createdAt: string
    reference?: string
    note?: string
  }[]
}

interface TransactionData {
  customer: Customer
  invoices: Invoice[]
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<TransactionData | null>(null)
  const [payment, setPayment] = useState({ invoiceId: '', amount: '', method: 'CASH', reference: '', note: '' })

  useEffect(() => {
    fetchTransactions()
  }, [id])

  async function fetchTransactions() {
    const res = await fetch(`/api/customers/${id}/transactions`)
    const json = await res.json()
    if (json.success) setData(json.data)
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/debt-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saleInvoiceId: payment.invoiceId,
        customerId: id,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        note: payment.note,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setPayment({ invoiceId: '', amount: '', method: 'CASH', reference: '', note: '' })
      fetchTransactions()
    } else {
      alert(json.message)
    }
  }

  if (!data) return <p className="p-4 text-slate-500">กำลังโหลด...</p>

  const { customer, invoices } = data

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
            <User className="w-7 h-7" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
              {customer.isActive ? (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
              )}
            </div>
            <p className="text-slate-600">รหัส: <span className="font-medium text-slate-900">{customer.code}</span></p>
            <p className="text-slate-600">โทรศัพท์: {customer.phone ?? '-'}</p>
            {customer.address && <p className="text-slate-600">ที่อยู่: {customer.address}</p>}
            {customer.branch && <p className="text-slate-600">สาขา: {customer.branch}</p>}
            {customer.taxId && <p className="text-slate-600">เลขผู้เสียภาษี: {customer.taxId}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">วงเงินเครดิต</p>
            <p className="text-lg font-bold text-slate-900">{fmt(customer.creditLimit)} ฿</p>
          </div>
          <div className="rounded-lg bg-rose-50 p-4">
            <p className="text-xs text-slate-500">ยอดค้าง</p>
            <p className="text-lg font-bold text-rose-600">{fmt(customer.outstandingDebt)} ฿</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-slate-500">ซื้อรวม</p>
            <p className="text-lg font-bold text-slate-900">{fmt(customer.totalPurchased)} ฿</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-xs text-slate-500">จ่ายแล้ว</p>
            <p className="text-lg font-bold text-green-700">{fmt(customer.totalPaid)} ฿</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">รับชำระหนี้</h2>
        </div>

        <form onSubmit={handlePayment} className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">บิล</label>
            <select
              value={payment.invoiceId}
              onChange={(e) => setPayment({ ...payment, invoiceId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
              required
            >
              <option value="">เลือกบิล</option>
              {invoices
                .filter((inv) => Number(inv.remainingAmount) > 0)
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (คงเหลือ {fmt(Number(inv.remainingAmount))})
                  </option>
                ))}
            </select>
          </div>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขที่อ้างอิง</label>
            <input
              value={payment.reference}
              onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              placeholder="เลขที่อ้างอิง"
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
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            บันทึก
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-cyan-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ประวัติธุรกรรม</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-slate-500">ไม่มีรายการ</p>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{inv.type === 'CASH' ? 'เงินสด' : 'เครดิต'}</span>
                    </div>
                    <p className="text-sm text-slate-500">{new Date(inv.createdAt).toLocaleString('th-TH')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-700">ยอด <span className="font-medium">{fmt(Number(inv.total))} ฿</span> | จ่ายแล้ว <span className="font-medium">{fmt(Number(inv.paidAmount))} ฿</span></p>
                    <p className="font-bold text-rose-600">คงเหลือ {fmt(Number(inv.remainingAmount))} ฿</p>
                    {inv.dueDate && <p className="text-sm text-slate-500">ครบกำหนด {new Date(inv.dueDate).toLocaleDateString('th-TH')}</p>}
                  </div>
                </div>

                {inv.items.length > 0 && (
                  <ul className="mt-3 text-sm text-slate-600 divide-y">
                    {inv.items.map((item) => (
                      <li key={item.id} className="py-1">
                        {item.product.name} ({item.quantity} {item.productUnit.unit.name}) × {fmt(item.unitPrice)} = {fmt(item.total)} ฿
                      </li>
                    ))}
                  </ul>
                )}

                {inv.debtPayments.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm font-medium text-slate-700 mb-1">การชำระ:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {inv.debtPayments.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{p.method}</span>
                          {new Date(p.createdAt).toLocaleString('th-TH')} — {fmt(p.amount)} ฿ — คงเหลือ {fmt(p.remainingAfter)}
                          {p.reference && <span className="text-slate-400">(อ้างอิง {p.reference})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
