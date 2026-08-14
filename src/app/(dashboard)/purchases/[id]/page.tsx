'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Truck, FileDown, Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { downloadPurchaseOrderPDF } from '@/lib/pdf'

interface PurchaseOrder {
  id: string
  orderNumber: string
  total: number
  note?: string | null
  createdAt: string
  supplier: { code: string; name: string } | null
  createdBy: { name: string } | null
  items: {
    product: { code: string; name: string }
    productUnit: { unit: { name: string } }
    quantity: number
    unitPrice: number
    total: number
  }[]
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/purchases/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrder(json.data)
        else setError(json.message || 'โหลดไม่สำเร็จ')
      })
  }, [id])

  if (error) return <p className="p-4 text-red-600">{error}</p>
  if (!order) return <p className="p-4">กำลังโหลด...</p>

  async function handleDownloadPDF() {
    if (!order) return
    setDownloading(true)
    try {
      await downloadPurchaseOrderPDF(order)
    } catch (err) {
      console.error(err)
      alert('ดาวน์โหลด PDF ไม่สำเร็จ')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:max-w-none">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายละเอียดใบซื้อ</h1>
          <p className="text-sm text-slate-500">{order.orderNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer className="w-4 h-4" />
            พิมพ์
          </button>
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
                <FileDown className="w-4 h-4" />
                ดาวน์โหลด PDF
              </>
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => history.back()}
        className="no-print inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้าประวัติการซื้อ
      </button>

      <section className="rounded-xl border bg-white p-6 shadow-sm print:shadow-none print:border-none">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{order.orderNumber}</h2>
            <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('th-TH')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-slate-500">ผู้ขาย</p>
            <p className="font-medium text-slate-900">{order.supplier ? `${order.supplier.code} - ${order.supplier.name}` : '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">บันทึกโดย</p>
            <p className="font-medium text-slate-900">{order.createdBy?.name ?? '-'}</p>
          </div>
          {order.note && (
            <div className="sm:col-span-2">
              <p className="text-slate-500">หมายเหตุ</p>
              <p className="font-medium text-slate-900">{order.note}</p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-2 px-3 font-medium">สินค้า</th>
                <th className="py-2 px-3 font-medium text-right">จำนวน</th>
                <th className="py-2 px-3 font-medium text-right">ราคาซื้อ/หน่วย</th>
                <th className="py-2 px-3 font-medium text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-2 px-3">
                    <p className="font-medium text-slate-900">{item.product.name}</p>
                    <p className="text-xs text-slate-500">{item.product.code}</p>
                  </td>
                  <td className="py-2 px-3 text-right">{Number(item.quantity)} {item.productUnit.unit.name}</td>
                  <td className="py-2 px-3 text-right">{fmt(Number(item.unitPrice))} ฿</td>
                  <td className="py-2 px-3 text-right font-medium">{fmt(Number(item.total))} ฿</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan={3} className="py-2 px-3 text-right">ยอดรวม</td>
                <td className="py-2 px-3 text-right">{fmt(Number(order.total))} ฿</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>


      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
