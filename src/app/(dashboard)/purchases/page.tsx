'use client'

import { useEffect, useState } from 'react'
import { Truck, Plus, Save, Loader2, Search, X, FileText, Package } from 'lucide-react'

interface Product {
  id: string
  code: string
  name: string
  baseUnit: { id: string; name: string }
  productUnits: { id: string; unitId: string; unit: { name: string }; conversionFactor: number; salePrice: number }[]
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface PurchaseItem {
  id: string
  productId: string
  productUnitId: string
  quantity: string
  unitPrice: string
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  total: number
  note?: string
  createdAt: string
  supplier?: { code: string; name: string }
  createdBy?: { name: string }
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

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ code: '', name: '', phone: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/products?take=1000'),
      fetch('/api/suppliers'),
      fetch('/api/purchases'),
    ]).then(async ([productsRes, suppliersRes, ordersRes]) => {
      const productsJson = await productsRes.json()
      const suppliersJson = await suppliersRes.json()
      const ordersJson = await ordersRes.json()
      if (productsJson.success) setProducts(productsJson.data)
      if (suppliersJson.success) setSuppliers(suppliersJson.data)
      if (ordersJson.success) setOrders(ordersJson.data)
    })
  }, [])

  const filteredProducts = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
    : []

  function addItem(product: Product) {
    const defaultUnit = product.productUnits[0]
    if (!defaultUnit) return
    setItems((prev) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      return [
        ...prev,
        {
          id,
          productId: product.id,
          productUnitId: defaultUnit.id,
          quantity: '1',
          unitPrice: '0',
        },
      ]
    })
    setSearch('')
  }

  function updateItem(id: string, field: keyof PurchaseItem, value: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function itemTotal(item: PurchaseItem) {
    return Number(item.quantity || 0) * Number(item.unitPrice || 0)
  }

  const grandTotal = items.reduce((sum, item) => sum + itemTotal(item), 0)

  async function loadData() {
    const [productsRes, suppliersRes, ordersRes] = await Promise.all([
      fetch('/api/products?take=1000'),
      fetch('/api/suppliers'),
      fetch('/api/purchases'),
    ])
    const productsJson = await productsRes.json()
    const suppliersJson = await suppliersRes.json()
    const ordersJson = await ordersRes.json()
    if (productsJson.success) setProducts(productsJson.data)
    if (suppliersJson.success) setSuppliers(suppliersJson.data)
    if (ordersJson.success) setOrders(ordersJson.data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการสินค้า')
      return
    }
    setLoading(true)
    try {
      const payload = {
        supplierId: supplierId || undefined,
        note: note || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      }
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setItems([])
        setSupplierId('')
        setNote('')
        loadData()
      } else {
        alert(json.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...supplierForm, isActive: true }),
    })
    const json = await res.json()
    if (json.success) {
      setSuppliers((prev) => [...prev, json.data])
      setSupplierId(json.data.id)
      setAddingSupplier(false)
      setSupplierForm({ code: '', name: '', phone: '' })
    } else {
      alert(json.message || 'เพิ่มผู้ขายไม่สำเร็จ')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ซื้อของเข้า</h1>
        <p className="text-sm text-slate-500">บันทึกใบซื้อสินค้าและอัปเดตต้นทุนเฉลี่ย</p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">สร้างใบซื้อใหม่</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full sm:w-64">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ผู้ขาย / ซัพพลายเออร์</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
              >
                <option value="">ไม่ระบุ</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setAddingSupplier(true)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              เพิ่มผู้ขาย
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ค้นหาสินค้า</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ชื่อหรือรหัสสินค้า"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              />
            </div>
            {search.trim() && (
              <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto bg-white">
                {filteredProducts.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">ไม่พบสินค้า</p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>{p.code} - {p.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 font-medium">สินค้า</th>
                    <th className="py-2 px-3 font-medium">หน่วย</th>
                    <th className="py-2 px-3 font-medium text-right">จำนวน</th>
                    <th className="py-2 px-3 font-medium text-right">ราคาซื้อ/หน่วย</th>
                    <th className="py-2 px-3 font-medium text-right">รวม</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const product = products.find((p) => p.id === item.productId)
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 px-3">{product?.code} - {product?.name}</td>
                        <td className="py-2 px-3">
                          <select
                            value={item.productUnitId}
                            onChange={(e) => updateItem(item.id, 'productUnitId', e.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1 bg-white"
                          >
                            {product?.productUnits.map((u) => (
                              <option key={u.id} value={u.id}>{u.unit.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right"
                            min={0}
                            step="any"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right"
                            min={0}
                            step="any"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{fmt(itemTotal(item))} ฿</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="หมายเหตุ (ถ้ามี)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">ยอดรวม</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(grandTotal)} ฿</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                บันทึกใบซื้อ
              </>
            )}
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ประวัติการซื้อ</h2>
        </div>

        {orders.length === 0 ? (
          <p className="text-slate-500 text-sm">ยังไม่มีประวัติการซื้อ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-3 px-3 font-medium">เลขใบซื้อ</th>
                  <th className="py-3 px-3 font-medium">ผู้ขาย</th>
                  <th className="py-3 px-3 font-medium">วันที่</th>
                  <th className="py-3 px-3 font-medium text-right">ยอดรวม</th>
                  <th className="py-3 px-3 font-medium">บันทึกโดย</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <a href={`/purchases/${order.id}`} className="text-blue-600 hover:text-blue-700 transition">
                        {order.orderNumber}
                      </a>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{order.supplier ? `${order.supplier.code} - ${order.supplier.name}` : '-'}</td>
                    <td className="py-3 px-3 text-slate-600">{new Date(order.createdAt).toLocaleString('th-TH')}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{fmt(order.total)} ฿</td>
                    <td className="py-3 px-3 text-slate-600">{order.createdBy?.name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {addingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">เพิ่มผู้ขาย</h3>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผู้ขาย</label>
                <input
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อผู้ขาย</label>
                <input
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">โทรศัพท์</label>
                <input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAddingSupplier(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
