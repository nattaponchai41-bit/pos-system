'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Search, Plus, Eye, Power, PowerOff, Box } from 'lucide-react'
import ProductModal from './_components/ProductModal'

interface Product {
  id: string
  code: string
  name: string
  stock: number
  minStock: number
  isActive: boolean
  category?: { name: string }
  baseUnit?: { name: string }
  productUnits: { unit: { name: string }; salePrice: number }[]
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status === 'active') params.set('isActive', 'true')
      if (status === 'inactive') params.set('isActive', 'false')
      const res = await fetch(`/api/products?${params.toString()}`)
      const json = await res.json()
      if (json.success) setProducts(json.data)
    }
    load()
  }, [search, status, refresh])

  async function toggleStatus(id: string, isActive: boolean) {
    const action = isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`${action}สินค้านี้?`)) return
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const json = await res.json()
    if (json.success) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !isActive } : p)))
    } else {
      alert(json.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">สินค้า</h1>
          <p className="text-sm text-slate-500">จัดการสินค้า หน่วย บาร์โค้ด และสต็อก</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มสินค้า
        </button>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">รายการสินค้า</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า"
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
          </div>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            {[
              { key: 'active', label: 'ใช้งาน' },
              { key: 'inactive', label: 'ปิด' },
              { key: 'all', label: 'ทั้งหมด' },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatus(s.key as typeof status)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  status === s.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                <th className="py-3 px-3 font-medium rounded-tl-lg">รหัส</th>
                <th className="py-3 px-3 font-medium">ชื่อ</th>
                <th className="py-3 px-3 font-medium">หมวดหมู่</th>
                <th className="py-3 px-3 font-medium">สต็อก</th>
                <th className="py-3 px-3 font-medium">หน่วยขาย / ราคา</th>
                <th className="py-3 px-3 font-medium">สถานะ</th>
                <th className="py-3 px-3 font-medium text-right rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-medium text-slate-900">{p.code}</td>
                  <td className="py-3 px-3 text-slate-900">{p.name}</td>
                  <td className="py-3 px-3 text-slate-600">{p.category?.name ?? '-'}</td>
                  <td className="py-3 px-3">
                    <span className={p.stock <= p.minStock ? 'text-red-600 font-medium' : 'text-slate-700'}>
                      {p.stock} {p.baseUnit?.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {p.productUnits.map((u) => (
                      <span key={u.unit.name} className="inline-block mr-3">
                        {u.unit.name}: <span className="font-medium text-slate-900">{fmt(u.salePrice)} ฿</span>
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-3">
                    {p.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      ดู
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleStatus(p.id, p.isActive)}
                      className={`inline-flex items-center gap-1 text-sm font-medium transition ${
                        p.isActive
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {p.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {p.isActive ? 'ปิด' : 'เปิด'}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Box className="w-10 h-10 mb-2 text-slate-300" />
                      <p className="font-medium">ไม่พบสินค้า</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefresh((n) => n + 1)}
      />
    </div>
  )
}
