'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface ReceiptInvoice {
  id: string
  invoiceNumber: string
  type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
  status: string
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  dueDate?: string
  note?: string
  createdAt: string
  createdBy?: { name: string }
  customer?: { code: string; name: string; taxId?: string }
  session?: { id: string }
  items: {
    id: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
    product: { name: string }
    productUnit: { unit: { name: string } }
  }[]
  payments: {
    method: string
    amount: number
    received?: number
    change?: number
    reference?: string
  }[]
  debtPayments: {
    amount: number
    remainingAfter: number
    method: string
    createdAt: string
  }[]
}

interface StoreSetting {
  storeName: string
  storeAddress?: string | null
  storePhone?: string | null
  storeTaxId?: string | null
  currencySymbol: string
  receiptWidth: string
  showCashier: boolean
  showTaxId: boolean
  showQr: boolean
  receiptFooter?: string | null
  qrPaymentPayload?: string | null
  bankName?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  invoiceTitle: string
  receiptTitle: string
}

interface ReceiptData {
  invoice: ReceiptInvoice
  store: StoreSetting | null
  qrDataUrl: string | null
}

export default function InvoiceA4Page() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<ReceiptData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/receipt/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data)
        else setError(json.message)
      })
  }, [id])

  function fmt(n: number | null | undefined) {
    if (n == null) return '-'
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtWhole(n: number | null | undefined) {
    if (n == null) return '-'
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  function typeLabel(type: string) {
    if (type === 'CASH') return 'เงินสด'
    if (type === 'TRANSFER') return 'ธนาคาร'
    if (type === 'QR') return 'พร้อมเพย์'
    if (type === 'CREDIT') return 'เครดิต'
    return type
  }

  function methodLabel(method: string) {
    if (method === 'CASH') return 'เงินสด'
    if (method === 'TRANSFER') return 'ธนาคาร'
    if (method === 'QR') return 'พร้อมเพย์'
    return method
  }

  if (error) return <p className="p-8 text-red-600">{error}</p>
  if (!data) return <p className="p-8">กำลังโหลด...</p>

  const { invoice, store, qrDataUrl } = data
  const symbol = store?.currencySymbol ?? '฿'
  const remaining = Number(invoice.total) - Number(invoice.paidAmount)

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <style jsx global>{`
        @font-face {
          font-family: 'Sarabun';
          src: url('/fonts/Sarabun-Regular.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Sarabun';
          src: url('/fonts/Sarabun-Bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        @media print {
          @page {
            margin: 15mm;
            size: A4;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .a4-page {
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
            font-family: 'Sarabun', sans-serif;
          }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-center gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-white font-medium hover:bg-slate-800"
        >
          พิมพ์ใบกำกับภาษี A4
        </button>
      </div>

      <div
        className="a4-page mx-auto max-w-[210mm] bg-white p-[15mm] shadow-sm print:shadow-none print:max-w-none"
        style={{ fontFamily: "'Sarabun', sans-serif", fontSize: '14px', lineHeight: 1.6 }}
      >
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{store?.storeName ?? 'ร้านค้า'}</h1>
            {store?.storeAddress && <p className="text-slate-600">{store.storeAddress}</p>}
            {store?.storePhone && <p className="text-slate-600">โทร {store.storePhone}</p>}
            {store?.showTaxId && store?.storeTaxId && (
              <p className="text-slate-600">เลขประจำตัวผู้เสียภาษี {store.storeTaxId}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900">{store?.invoiceTitle ?? 'ใบกำกับภาษี'} / {store?.receiptTitle ?? 'ใบเสร็จรับเงิน'}</p>
            <p className="text-slate-600">เลขที่ {invoice.invoiceNumber}</p>
            <p className="text-slate-600">วันที่ {new Date(invoice.createdAt).toLocaleString('th-TH')}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="font-bold text-slate-900">ลูกค้า</p>
            {invoice.customer ? (
              <>
                <p>{invoice.customer.code} - {invoice.customer.name}</p>
                {invoice.customer.taxId && <p>Tax ID {invoice.customer.taxId}</p>}
              </>
            ) : (
              <p>ลูกค้าเงินสด</p>
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900">ข้อมูลบิล</p>
            <p>ประเภท: {typeLabel(invoice.type)}</p>
            <p>สถานะ: {invoice.status === 'COMPLETED' ? 'สำเร็จ' : invoice.status === 'CANCELLED' ? 'ยกเลิก' : invoice.status === 'REFUNDED' ? 'คืนเงิน' : invoice.status}</p>
            {store?.showCashier && invoice.createdBy && <p>พนักงาน: {invoice.createdBy.name}</p>}
            {invoice.type === 'CREDIT' && invoice.dueDate && (
              <p>ครบกำหนด: {new Date(invoice.dueDate).toLocaleDateString('th-TH')}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900">
                <th className="py-2 px-3 text-left font-bold">ลำดับ</th>
                <th className="py-2 px-3 text-left font-bold">สินค้า</th>
                <th className="py-2 px-3 text-right font-bold">จำนวน</th>
                <th className="py-2 px-3 text-right font-bold">หน่วย</th>
                <th className="py-2 px-3 text-right font-bold">ราคา</th>
                <th className="py-2 px-3 text-right font-bold">ส่วนลด</th>
                <th className="py-2 px-3 text-right font-bold">รวม</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-3">{idx + 1}</td>
                  <td className="py-2 px-3">{item.product.name}</td>
                  <td className="py-2 px-3 text-right">{fmtWhole(Number(item.quantity))}</td>
                  <td className="py-2 px-3 text-right">{item.productUnit.unit.name}</td>
                  <td className="py-2 px-3 text-right">{fmt(Number(item.unitPrice))}</td>
                  <td className="py-2 px-3 text-right">{fmt(Number(item.discount))}</td>
                  <td className="py-2 px-3 text-right">{fmt(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-1 text-right">
            <p className="text-slate-600">รวมย่อย {fmt(Number(invoice.subtotal))} {symbol}</p>
            {Number(invoice.discount) > 0 && <p className="text-slate-600">ส่วนลด -{fmt(Number(invoice.discount))} {symbol}</p>}
            {Number(invoice.tax) > 0 && <p className="text-slate-600">ภาษี {fmt(Number(invoice.tax))} {symbol}</p>}
            <p className="border-t border-slate-900 pt-2 text-xl font-bold text-slate-900">
              ยอดสุทธิ {fmt(Number(invoice.total))} {symbol}
            </p>
          </div>
        </div>

        {invoice.type !== 'CREDIT' && invoice.payments.length > 0 && (
          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <p className="font-bold text-slate-900 mb-2">การชำระเงิน</p>
            <div className="space-y-1">
              {invoice.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{methodLabel(p.method)} {p.reference && <span className="text-slate-500">(อ้างอิง {p.reference})</span>}</span>
                  <span>{fmt(Number(p.amount))} {symbol}</span>
                </div>
              ))}
              {(invoice.type === 'TRANSFER' || invoice.payments.some((p) => p.method === 'TRANSFER')) && (store?.bankName || store?.bankAccountName || store?.bankAccountNumber) && (
                <div className="mt-2 text-sm text-slate-600">
                  {store?.bankName && <p>{store.bankName}</p>}
                  {store?.bankAccountName && <p>ชื่อบัญชี {store.bankAccountName}</p>}
                  {store?.bankAccountNumber && <p>เลขที่บัญชี {store.bankAccountNumber}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {invoice.type === 'CREDIT' && (
          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <p className="font-bold text-slate-900 mb-2">สถานะเครดิต</p>
            <div className="flex justify-between">
              <span>จ่ายแล้ว</span>
              <span>{fmt(Number(invoice.paidAmount))} {symbol}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900">
              <span>คงเหลือ</span>
              <span>{fmt(remaining)} {symbol}</span>
            </div>
          </div>
        )}

        {invoice.type === 'QR' && store?.showQr && qrDataUrl && (
          <div className="mt-6 text-center">
            <p className="font-bold text-slate-900 mb-2">ชำระผ่าน QR</p>
            <img src={qrDataUrl} alt="PromptPay QR" className="mx-auto" style={{ width: 160, height: 'auto' }} />
            {store?.qrPaymentPayload && <p className="mt-1 text-xs break-all">{store.qrPaymentPayload}</p>}
          </div>
        )}

        {invoice.note && (
          <div className="mt-6">
            <p className="font-bold text-slate-900">หมายเหตุ</p>
            <p className="text-slate-600 whitespace-pre-line">{invoice.note}</p>
          </div>
        )}

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          <p className="whitespace-pre-line">{store?.receiptFooter ?? 'ขอบคุณที่ใช้บริการ'}</p>
        </div>
      </div>
    </div>
  )
}
