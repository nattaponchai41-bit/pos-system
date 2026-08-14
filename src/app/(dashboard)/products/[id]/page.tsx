'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Package, History, SlidersHorizontal, ImageIcon, Edit3 } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  code: string
  name: string
  stock: number
  minStock: number
  averageCost?: number
  isActive: boolean
  imageUrl?: string
  category?: { name: string }
  baseUnit?: { name: string }
  productUnits: {
    id: string
    unit: { id: string; name: string }
    sku: string
    barcode?: string
    conversionFactor: number
    salePrice: number
    costPrice?: number
    barcodes: { barcode: string }[]
  }[]
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  baseQuantity: number
  beforeStock: number
  afterStock: number
  note?: string
  createdAt: string
  productUnit?: { unit: { name: string } }
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [adjust, setAdjust] = useState({ type: 'ADJUSTMENT', quantity: '', note: '' })
  const [unitId, setUnitId] = useState('')

  useEffect(() => {
    fetchProduct()
    fetchMovements()
  }, [id])

  async function fetchProduct() {
    const res = await fetch(`/api/products/${id}`)
    const json = await res.json()
    if (json.success) {
      const data = json.data as Product
      setProduct(data)
      if (data.productUnits?.[0]) setUnitId(data.productUnits[0].id)
    }
  }

  async function fetchMovements() {
    const res = await fetch(`/api/products/${id}/stock-movements`)
    const json = await res.json()
    if (json.success) setMovements(json.data)
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/products/${id}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: adjust.type,
        quantity: Number(adjust.quantity),
        productUnitId: unitId || undefined,
        note: adjust.note,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setAdjust({ type: 'ADJUSTMENT', quantity: '', note: '' })
      fetchProduct()
      fetchMovements()
    } else {
      alert(json.message)
    }
  }

  if (!product) return <p className="p-4 text-slate-500">กำลังโหลด...</p>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-6">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-28 w-28 rounded-xl border object-cover"
            />
          ) : (
            <div className="h-28 w-28 rounded-xl border bg-slate-50 flex items-center justify-center text-slate-400">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
              {product.isActive ? (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
              )}
              <Link
                href={`/products/${id}/edit`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Edit3 className="w-4 h-4" />
                แก้ไข
              </Link>
            </div>
            <p className="text-slate-600">รหัส: <span className="font-medium text-slate-900">{product.code}</span></p>
            <p className="text-slate-600">หมวดหมู่: {product.category?.name ?? '-'}</p>
            <p className="text-slate-600">
              สต็อก: <span className={product.stock <= product.minStock ? 'text-red-600 font-medium' : 'font-medium text-slate-900'}>
                {product.stock} {product.baseUnit?.name}
              </span>
              {' '} (ขั้นต่ำ {product.minStock})
            </p>
            <p className="text-slate-600">
              ต้นทุนเฉลี่ย: <span className="font-medium text-slate-900">{product.averageCost !== undefined ? `${fmt(product.averageCost)} ฿ / ${product.baseUnit?.name}` : '-'}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">หน่วยสินค้า</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3 font-medium">หน่วย</th>
                <th className="py-3 font-medium">SKU</th>
                <th className="py-3 font-medium">ตัวคูณ</th>
                <th className="py-3 font-medium">ราคาขาย</th>
                <th className="py-3 font-medium">ต้นทุน</th>
                <th className="py-3 font-medium">Barcode</th>
              </tr>
            </thead>
            <tbody>
              {product.productUnits.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3">
                    {u.unit.name}
                    {u.id === unitId && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">เริ่มต้น</span>
                    )}
                  </td>
                  <td className="py-3 font-medium text-slate-900">{u.sku}</td>
                  <td className="py-3 text-slate-600">{u.conversionFactor}</td>
                  <td className="py-3 font-medium text-slate-900">{fmt(u.salePrice)} ฿</td>
                  <td className="py-3 text-slate-600">{u.costPrice ? `${fmt(u.costPrice)} ฿` : '-'}</td>
                  <td className="py-3 text-slate-600">
                    {[u.barcode, ...(u.barcodes ?? []).map((b) => b.barcode)].filter(Boolean).join(', ') || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ปรับ Stock</h2>
        </div>

        <form onSubmit={handleAdjust} className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภท</label>
            <select
              value={adjust.type}
              onChange={(e) => setAdjust({ ...adjust, type: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
            >
              <option value="ADJUSTMENT">ปรับยอด</option>
              <option value="PURCHASE">ซื้อเข้า</option>
              <option value="RETURN">คืนสินค้า</option>
              <option value="DAMAGE">เสียหาย</option>
              <option value="STOCK_COUNT">นับสต็อก</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">หน่วย</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
            >
              {product.productUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.unit.name}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวน (+/-)</label>
            <input
              type="number"
              value={adjust.quantity}
              onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })}
              placeholder="จำนวน"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              step="any"
              required
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ</label>
            <input
              value={adjust.note}
              onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              placeholder="หมายเหตุ"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition">
            บันทึก
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <History className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ประวัติ Stock</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3 font-medium">วันที่</th>
                <th className="py-3 font-medium">ประเภท</th>
                <th className="py-3 font-medium">จำนวน</th>
                <th className="py-3 font-medium">Base</th>
                <th className="py-3 font-medium">ก่อน/หลัง</th>
                <th className="py-3 font-medium">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 text-slate-600">{new Date(m.createdAt).toLocaleString('th-TH')}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{m.type}</span>
                  </td>
                  <td className="py-3 text-slate-700">
                    {m.quantity} {m.productUnit?.unit.name ?? product.baseUnit?.name}
                  </td>
                  <td className="py-3 text-slate-700">{m.baseQuantity}</td>
                  <td className="py-3 font-medium text-slate-900">{m.beforeStock} → {m.afterStock}</td>
                  <td className="py-3 text-slate-600">{m.note ?? '-'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">ไม่มีประวัติ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
