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
  logoUrl?: string | null
  currencySymbol: string
  receiptWidth: string
  showLogo: boolean
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

export default function ReceiptPage() {
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

  if (error) return <p className="p-4 text-red-600">{error}</p>
  if (!data) return <p className="p-4">กำลังโหลด...</p>

  const { invoice, store, qrDataUrl } = data
  const symbol = store?.currencySymbol ?? '฿'
  const width = store?.receiptWidth === '58mm' ? '58mm' : '80mm'
  const remaining = Number(invoice.total) - Number(invoice.paidAmount)

  function fmt(n: number) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtWhole(n: number) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  function methodLabel(method: string) {
    if (method === 'CASH') return 'เงินสด'
    if (method === 'TRANSFER') return 'ธนาคาร'
    if (method === 'QR') return 'พร้อมเพย์'
    return method
  }

  return (
    <div className="min-h-screen bg-white p-4">
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
        @font-face {
          font-family: 'Sarabun';
          src: url('/fonts/Sarabun-Italic.ttf') format('truetype');
          font-weight: 400;
          font-style: italic;
        }
        @media print {
          @page {
            margin: 0;
            size: ${width} auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .receipt {
            width: ${width};
            margin: 0 auto;
            padding: 0;
            box-shadow: none;
            border: none;
            font-family: 'Sarabun', sans-serif;
          }
        }
      `}</style>

      <div className="no-print mb-4 flex justify-center gap-2">
        <button
          onClick={() => window.print()}
          className="rounded bg-slate-900 px-4 py-2 text-white"
        >
          พิมพ์ใบเสร็จ
        </button>
      </div>

      <div className="receipt mx-auto font-bold" style={{ width, fontSize: '16px', lineHeight: 1.45, fontFamily: "'Sarabun', sans-serif" }}>
        <div className="text-center">
          {store?.showLogo && store?.logoUrl && (
            <img
              src={store.logoUrl}
              alt=""
              className="mx-auto mb-2 object-contain"
              style={{
                maxHeight: store?.receiptWidth === '58mm' ? 90 : 120,
                maxWidth: store?.receiptWidth === '58mm' ? '85%' : '75%',
                width: 'auto',
              }}
            />
          )}
          <p style={{ fontSize: '20px', fontWeight: 700 }}>{store?.storeName ?? 'ร้านค้า'}</p>
          {store?.storeAddress && <p>{store.storeAddress}</p>}
          {store?.storePhone && <p>โทร {store.storePhone}</p>}
          {store?.showTaxId && store?.storeTaxId && <p>เลขประจำตัวผู้เสียภาษี {store.storeTaxId}</p>}
          <p style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>{store?.receiptTitle ?? 'ใบเสร็จรับเงิน'}</p>
        </div>

        <div className="my-2 border-b border-dashed border-black" />

        <div className="space-y-1">
          <p>เลขที่: {invoice.invoiceNumber}</p>
          <p>วันที่: {new Date(invoice.createdAt).toLocaleString('th-TH')}</p>
          <p>ประเภท: {invoice.type === 'CASH' ? 'เงินสด' : invoice.type === 'TRANSFER' ? 'ธนาคาร' : invoice.type === 'QR' ? 'พร้อมเพย์' : 'เครดิต'}</p>
          {store?.showCashier && invoice.createdBy && <p>พนักงาน: {invoice.createdBy.name}</p>}
          {invoice.customer && (
            <p>
              ลูกค้า: {invoice.customer.code} - {invoice.customer.name}
              {invoice.customer.taxId && <span> (Tax ID {invoice.customer.taxId})</span>}
            </p>
          )}
          {invoice.type === 'CREDIT' && invoice.dueDate && (
            <p>ครบกำหนด: {new Date(invoice.dueDate).toLocaleDateString('th-TH')}</p>
          )}
        </div>

        <div className="my-2 border-b border-dashed border-black" />

        <table className="w-full" style={{ fontSize: '12px', tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left" style={{ width: '46%' }}>สินค้า</th>
              <th className="py-1 text-right" style={{ width: '18%' }}>จำนวน</th>
              <th className="py-1 text-right" style={{ width: '18%' }}>ราคา</th>
              <th className="py-1 text-right" style={{ width: '18%' }}>รวม</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-0.5 break-words leading-tight">
                  {item.product.name}
                  {Number(item.discount) > 0 && <span className="block" style={{ fontSize: '10px' }}>ส่วนลด {fmt(Number(item.discount))}</span>}
                </td>
                <td className="py-0.5 text-right leading-tight">
                  {Number(item.quantity)} {item.productUnit.unit.name}
                </td>
                <td className="py-0.5 text-right leading-tight">{fmtWhole(Number(item.unitPrice))}</td>
                <td className="py-0.5 text-right leading-tight">{fmtWhole(Number(item.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-2 border-b border-dashed border-black" />

        <div className="space-y-1 text-right">
          {Number(invoice.discount) > 0 && <p>ส่วนลด -{fmt(Number(invoice.discount))} {symbol}</p>}
          {Number(invoice.tax) > 0 && <p>ภาษี {fmt(Number(invoice.tax))} {symbol}</p>}
          <p style={{ fontSize: '18px', fontWeight: 700 }}>ยอดสุทธิ {fmt(Number(invoice.total))} {symbol}</p>
        </div>

        {invoice.type !== 'CREDIT' && invoice.payments.length > 0 && (
          <>
            <div className="my-2 border-b border-dashed border-black" />
            <div className="space-y-1">
              {invoice.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{methodLabel(p.method)}</span>
                  <span>{fmt(Number(p.amount))} {symbol}</span>
                </div>
              ))}
              {(invoice.type === 'TRANSFER' || invoice.payments.some((p) => p.method === 'TRANSFER')) && (store?.bankName || store?.bankAccountName || store?.bankAccountNumber) && (
                <div className="text-left" style={{ fontSize: '13px' }}>
                  {store?.bankName && <p>{store.bankName}</p>}
                  {store?.bankAccountName && <p>{store.bankAccountName}</p>}
                  {store?.bankAccountNumber && <p>{store.bankAccountNumber}</p>}
                </div>
              )}
              {invoice.payments[0]?.received !== undefined && invoice.payments[0]?.received !== null && (
                <>
                  <div className="flex justify-between">
                    <span>รับเงิน</span>
                    <span>{fmt(Number(invoice.payments[0].received))} {symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ทอน</span>
                    <span>{fmt(Number(invoice.payments[0].change ?? 0))} {symbol}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {invoice.type === 'CREDIT' && (
          <>
            <div className="my-2 border-b border-dashed border-black" />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>จ่ายแล้ว</span>
                <span>{fmt(Number(invoice.paidAmount))} {symbol}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '18px', fontWeight: 700 }}>
                <span>คงเหลือ</span>
                <span>{fmt(remaining)} {symbol}</span>
              </div>
              {invoice.debtPayments.length > 0 && (
                <div className="mt-1">
                  {invoice.debtPayments.map((p, idx) => (
                    <p key={idx}>
                      {new Date(p.createdAt).toLocaleDateString('th-TH')} {methodLabel(p.method)} {fmt(Number(p.amount))} (คงเหลือ {fmt(Number(p.remainingAfter))})
                    </p>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {invoice.type === 'QR' && store?.showQr && qrDataUrl && (
          <>
            <div className="my-2 border-b border-dashed border-black" />
            <div className="text-center">
              <p style={{ fontSize: '18px', fontWeight: 700 }}>ชำระผ่าน QR</p>
              <img src={qrDataUrl} alt="QR" className="mx-auto" style={{ width: store?.receiptWidth === '58mm' ? 140 : 180, height: 'auto' }} />
            </div>
          </>
        )}

        <div className="my-2 border-b border-dashed border-black" />

        <div className="text-center">
          {store?.receiptFooter ? (
            <p className="whitespace-pre-line">{store.receiptFooter}</p>
          ) : (
            <p>ขอบคุณที่ใช้บริการ</p>
          )}
        </div>
      </div>
    </div>
  )
}
