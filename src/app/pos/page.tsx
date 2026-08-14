'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { generatePromptPayPayload } from '@/lib/promptpay'
import {
  ShoppingCart,
  Search,
  ScanLine,
  Home,
  Banknote,
  Minus,
  Plus,
  Trash2,
  Save,
  User,
  Tag,
  Percent,
  ReceiptText,
  Printer,
  Loader2,
  AlertCircle,
  QrCode,
} from 'lucide-react'

interface AuthSession {
  user?: {
    id: string
    name?: string
    permissions: string[]
  }
}

interface Category {
  id: string
  name: string
  color?: string
}

interface ProductUnit {
  id: string
  unitId: string
  name: string
  abbreviation?: string
  salePrice: number
  conversionFactor: number
  isDefault: boolean
  barcode?: string
}

interface Product {
  id: string
  code: string
  name: string
  imageUrl?: string
  categoryId?: string
  stock: number
  productUnits: ProductUnit[]
}

interface ApiProductUnit {
  id: string
  unit: { id: string; name: string; abbreviation?: string }
  salePrice: string | number
  conversionFactor: string | number
  isDefault: boolean
  barcode?: string
}

interface ApiProduct {
  id: string
  code: string
  name: string
  imageUrl?: string
  categoryId?: string
  stock: string | number
  productUnits: ApiProductUnit[]
}

interface ApiBestSeller {
  product: ApiProduct
  totalQuantity: string | number
  totalAmount: string | number
}

interface Customer {
  id: string
  code: string
  name: string
  creditLimit: number
  outstandingDebt: number
}

interface CartItem {
  key: string
  productId: string
  productUnitId: string
  name: string
  unitName: string
  price: number
  quantity: number
  lineDiscount: number
  total: number
  imageUrl?: string
  product: Product
}

interface OpenSession {
  id: string
  status: string
  expectedCash: number
}

interface PosStoreSetting {
  allowCreditSale: boolean
  enableCashPayment: boolean
  enableTransferPayment: boolean
  enableQrPayment: boolean
  transferAsCashIn: boolean
  qrAsCashIn: boolean
  bankName?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  qrPaymentPhone?: string | null
  qrPaymentPayload?: string | null
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PosPage() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [openSession, setOpenSession] = useState<OpenSession | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [bestSellers, setBestSellers] = useState<{ product: Product; totalQuantity: number }[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [barcode, setBarcode] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [method, setMethod] = useState<'CASH' | 'TRANSFER' | 'QR'>('CASH')
  const [received, setReceived] = useState(0)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoiceNumber: string; type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT' } | null>(null)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [settings, setSettings] = useState<PosStoreSetting | null>(null)
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 250)
    return () => clearTimeout(timer)
  }, [search, activeCategory])

  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus()
    }
  }, [])

  const availableMethods = useMemo(() => {
    const methods: { id: 'CASH' | 'TRANSFER' | 'QR'; label: string }[] = []
    if (settings?.enableCashPayment !== false) methods.push({ id: 'CASH', label: 'เงินสด' })
    if (settings?.enableTransferPayment !== false) methods.push({ id: 'TRANSFER', label: 'ธนาคาร' })
    if (settings?.enableQrPayment !== false) methods.push({ id: 'QR', label: 'พร้อมเพย์' })
    return methods
  }, [settings])

  useEffect(() => {
    if (activeMethod !== 'QR') return
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return
        let payload = j.data?.qrPaymentPayload || null
        const phone = j.data?.qrPaymentPhone || null
        if (!payload && phone) {
          try {
            payload = generatePromptPayPayload(phone)
          } catch {
            payload = null
          }
        }
        setQrPayload(payload)
        if (!payload) setQrDataUrl(null)
      })
  }, [method])

  const effectiveMethod = useMemo(() => {
    if (!settings) return method
    if (availableMethods.find((m) => m.id === method)) return method
    return availableMethods[0]?.id ?? 'CASH'
  }, [availableMethods, method, settings])

  useEffect(() => {
    if (!qrPayload) return
    let cancelled = false
    QRCode.toDataURL(qrPayload, { width: 180, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => { cancelled = true }
  }, [qrPayload])

  async function loadInitial() {
    const [sess, sessRes, catRes, bests, custRes, setRes] = await Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/cash-sessions/current').then((r) => r.json()),
      fetch('/api/categories?isActive=true').then((r) => r.json()),
      fetch('/api/reports/best-sellers?limit=8').then((r) => r.json()),
      fetch('/api/customers?isActive=true&take=200').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
    setSession(sess)
    if (sessRes.success) setOpenSession(sessRes.data)
    if (catRes.success) setCategories(catRes.data)
    if (bests.success) {
      setBestSellers(
        bests.data.map((b: ApiBestSeller) => ({
          product: mapProduct(b.product),
          totalQuantity: Number(b.totalQuantity),
        }))
      )
    }
    if (custRes.success) setCustomers(custRes.data)
    if (setRes.success) {
      setSettings(setRes.data)
    }
    loadProducts()
  }

  async function loadProducts() {
    const params = new URLSearchParams()
    params.set('isActive', 'true')
    if (search) params.set('search', search)
    if (activeCategory) params.set('categoryId', activeCategory)
    params.set('take', '100')
    const res = await fetch(`/api/products?${params.toString()}`)
    const json = await res.json()
    if (json.success) {
      setProducts(
        json.data.map((p: ApiProduct) => ({
          ...p,
          stock: Number(p.stock),
          productUnits: p.productUnits.map((u: ApiProductUnit) => ({
            id: u.id,
            unitId: u.unit.id,
            name: u.unit.name,
            abbreviation: u.unit.abbreviation,
            salePrice: Number(u.salePrice),
            conversionFactor: Number(u.conversionFactor),
            isDefault: u.isDefault,
            barcode: u.barcode,
          })),
        }))
      )
    }
  }

  function can(permission: string) {
    return !!session?.user?.permissions?.includes(permission)
  }

  function defaultUnit(product: Product): ProductUnit {
    return product.productUnits.find((u) => u.isDefault) || product.productUnits[0]
  }

  function addToCart(product: Product, unitId?: string) {
    const unit = unitId
      ? product.productUnits.find((u) => u.id === unitId) || defaultUnit(product)
      : defaultUnit(product)
    const existing = cart.find((i) => i.productUnitId === unit.id)
    if (existing) {
      updateQuantity(existing.key, existing.quantity + 1)
    } else {
      const item: CartItem = {
        key: `${product.id}-${unit.id}-${Date.now()}`,
        productId: product.id,
        productUnitId: unit.id,
        name: product.name,
        unitName: unit.name,
        price: unit.salePrice,
        quantity: 1,
        lineDiscount: 0,
        total: unit.salePrice,
        imageUrl: product.imageUrl,
        product,
      }
      setCart((prev) => [...prev, item])
    }
    barcodeRef.current?.focus()
  }

  async function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !barcode.trim()) return
    const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode.trim())}`)
    const json = await res.json()
    setBarcode('')
    if (json.success && json.data) {
      const product = mapProduct(json.data.product)
      const matchedUnit = json.data.matchedUnit
      addToCart(product, matchedUnit?.id)
    } else {
      alert('ไม่พบสินค้า')
    }
  }

  function mapProduct(raw: ApiProduct): Product {
    return {
      ...raw,
      stock: Number(raw.stock),
      productUnits: raw.productUnits?.map((u: ApiProductUnit) => ({
        id: u.id,
        unitId: u.unit.id,
        name: u.unit.name,
        abbreviation: u.unit.abbreviation,
        salePrice: Number(u.salePrice),
        conversionFactor: Number(u.conversionFactor),
        isDefault: u.isDefault,
        barcode: u.barcode,
      })) || [],
    }
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.key !== key))
      return
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const total = quantity * i.price - i.lineDiscount
        return { ...i, quantity, total: Math.max(0, total) }
      })
    )
  }

  function updateUnit(key: string, unitId: string) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const unit = i.product.productUnits.find((u) => u.id === unitId)
        if (!unit) return i
        const total = i.quantity * unit.salePrice - i.lineDiscount
        return { ...i, productUnitId: unit.id, unitName: unit.name, price: unit.salePrice, total: Math.max(0, total) }
      })
    )
  }

  function updatePrice(key: string, price: number) {
    if (!can('CHANGE_PRICE')) return
    setCart((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const total = i.quantity * price - i.lineDiscount
        return { ...i, price, total: Math.max(0, total) }
      })
    )
  }

  function updateLineDiscount(key: string, discount: number) {
    if (!can('APPLY_DISCOUNT')) return
    setCart((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const total = i.quantity * i.price - discount
        return { ...i, lineDiscount: discount, total: Math.max(0, total) }
      })
    )
  }

  const activeMethod = effectiveMethod

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.total, 0), [cart])
  const total = useMemo(() => Math.max(0, subtotal - globalDiscount + tax), [subtotal, globalDiscount, tax])
  const change = useMemo(() => Math.max(0, received - total), [received, total])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  )

  function buildPayload(type: 'CASH' | 'CREDIT') {
    const items = cart.map((i) => ({
      productId: i.productId,
      productUnitId: i.productUnitId,
      quantity: i.quantity,
      unitPrice: i.price,
      discount: i.lineDiscount,
    }))
    const base = { items, discount: globalDiscount, tax, note }
    if (type === 'CASH') {
      const payment: { method: 'CASH' | 'TRANSFER' | 'QR'; amount: number; reference: string; received?: number } = {
        method: activeMethod,
        amount: total,
        reference,
      }
      if (activeMethod === 'CASH') {
        payment.received = received
      }
      return {
        ...base,
        customerId: customerId || undefined,
        payments: [payment],
      }
    }
    return { ...base, customerId }
  }

  async function submitSale(type: 'CASH' | 'CREDIT') {
    if (cart.length === 0) return alert('กรุณาเพิ่มสินค้า')
    if (type === 'CREDIT' && !customerId) return alert('กรุณาเลือกลูกค้าสำหรับขายเครดิต')
    if (type === 'CASH' && activeMethod === 'CASH' && received < total) return alert('รับเงินไม่เพียงพอ')
    if (type === 'CASH' && !openSession) return alert('ไม่พบเซสชั่นเงินสดที่เปิดอยู่')
    if (type === 'CASH' && activeMethod === 'TRANSFER' && !settings?.enableTransferPayment) return alert('วิธีการชำระเงินธนาคารถูกปิดใช้งาน')
    if (type === 'CASH' && activeMethod === 'QR' && !settings?.enableQrPayment) return alert('วิธีการชำระเงินพร้อมเพย์ถูกปิดใช้งาน')
    if (type === 'CASH' && activeMethod === 'CASH' && !settings?.enableCashPayment) return alert('วิธีการชำระเงินเงินสดถูกปิดใช้งาน')

    setLoading(true)
    const url = type === 'CASH' ? '/api/sales/cash' : '/api/sales/credit'
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(type)),
      })
      const json = await res.json()
      if (json.success) {
        const saved = { id: json.data.id, invoiceNumber: json.data.invoiceNumber, type }
        setLastInvoice(saved)
        setShowPrintDialog(true)
        clearCart(true)
        loadProducts()
        fetch('/api/cash-sessions/current')
          .then((r) => r.json())
          .then((j) => j.success && setOpenSession(j.data))
      } else {
        alert(json.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function clearCart(keepLastInvoice = false) {
    setCart([])
    setCustomerId('')
    setGlobalDiscount(0)
    setTax(0)
    setReceived(0)
    setReference('')
    setNote('')
    setMethod('CASH')
    if (!keepLastInvoice) setLastInvoice(null)
  }

  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          กำลังโหลด...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-sm">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2.5 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">ขายหน้าร้าน</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition"
            >
              <Home className="w-4 h-4" />
              แดชบอร์ด
            </Link>
            <Link
              href="/cash-sessions"
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition"
            >
              <Banknote className="w-4 h-4" />
              เงินสด
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!openSession ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
              <AlertCircle className="w-4 h-4" />
              ไม่มีเซสชั่นเงินสด
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
              <Banknote className="w-4 h-4" />
              เงินในลิ้นชัก: {fmt(Number(openSession.expectedCash))} ฿
            </span>
          )}
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
            <User className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">{session.user.name}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative w-full sm:w-72">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleBarcode}
                placeholder="สแกนบาร์โค้ด (Enter)"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              />
            </div>
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสินค้า"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === ''
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((c) => {
              const isActive = activeCategory === c.id
              const activeStyle = c.color
                ? { backgroundColor: c.color, borderColor: c.color, color: '#fff' }
                : undefined
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  style={isActive ? activeStyle : undefined}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? c.color
                        ? ''
                        : 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>

          {bestSellers.length > 0 && !search && !activeCategory && (
            <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                ขายดี
              </p>
              <div className="flex flex-wrap gap-2">
                {bestSellers.map(({ product }) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:shadow-sm transition text-left"
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto pb-20">
            {products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">
                <ShoppingCart className="w-10 h-10 mb-2 text-slate-300" />
                <p className="font-medium">ไม่พบสินค้า</p>
                <p className="text-sm">ลองค้นหาด้วยชื่อหรือสแกนบาร์โค้ด</p>
              </div>
            )}
            {products.map((p) => {
              const unit = defaultUnit(p)
              const lowStock = p.stock <= 0
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="group relative flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-md hover:border-blue-300 transition"
                >
                  <span
                    className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      lowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    คงเหลือ {p.stock}
                  </span>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="mb-2 h-28 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex h-28 w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <ShoppingCart className="w-8 h-8" />
                    </div>
                  )}
                  <p className="line-clamp-2 font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm font-medium text-blue-600">
                    {fmt(unit.salePrice)} ฿/{unit.name}
                  </p>
                </button>
              )
            })}
          </div>
        </main>

        <aside className="w-full sm:w-[420px] flex flex-col border-l bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              ตะกร้า ({cart.length})
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => clearCart()}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition"
              >
                ล้าง
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <p className="font-medium text-slate-500">ยังไม่มีสินค้าในตะกร้า</p>
                <p className="text-sm mt-1">เลือกสินค้าจากรายการหรือสแกนบาร์โค้ด</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <ShoppingCart className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{fmt(item.price)} ฿/{item.unitName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCart((prev) => prev.filter((i) => i.key !== item.key))}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="px-2.5 py-1.5 hover:bg-slate-100 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.key, Number(e.target.value))}
                          className="w-14 text-center border-x border-slate-200 py-1.5 outline-none"
                        />
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="px-2.5 py-1.5 hover:bg-slate-100 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <select
                        value={item.productUnitId}
                        onChange={(e) => updateUnit(item.key, e.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-600 outline-none"
                      >
                        {item.product.productUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({fmt(u.salePrice)})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <Percent className="w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          value={item.lineDiscount}
                          onChange={(e) => updateLineDiscount(item.key, Number(e.target.value))}
                          placeholder="ส่วนลด"
                          disabled={!can('APPLY_DISCOUNT')}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-100 outline-none focus:border-blue-600"
                        />
                      </div>

                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(item.key, Number(e.target.value))}
                        placeholder="ราคา"
                        disabled={!can('CHANGE_PRICE')}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-100 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-xs text-slate-500">รวม</span>
                      <span className="text-base font-bold text-slate-900">{fmt(item.total)} ฿</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t bg-slate-50 p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-8 py-2.5 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                >
                  <option value="">ลูกค้าเงินสด</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} (ค้าง {fmt(Number(c.outstandingDebt))})
                    </option>
                  ))}
                </select>
              </div>
              <Link
                href="/customers"
                target="_blank"
                className="flex items-center justify-center rounded-xl border border-slate-300 px-3 text-slate-700 hover:bg-white transition"
              >
                +
              </Link>
            </div>

            {selectedCustomer && (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                วงเงิน {fmt(Number(selectedCustomer.creditLimit))} ฿ | ค้าง {fmt(Number(selectedCustomer.outstandingDebt))} ฿
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                  placeholder="ส่วนลดรวม"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                />
              </div>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  placeholder="ภาษี"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">ยอดรวม</span>
                <span className="text-2xl font-bold">{fmt(total)} ฿</span>
              </div>
              {(globalDiscount > 0 || tax > 0) && (
                <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
                  <span>รวมย่อย {fmt(subtotal)} ฿</span>
                  <span>
                    {globalDiscount > 0 && `ส่วนลด -${fmt(globalDiscount)} ฿`}
                    {globalDiscount > 0 && tax > 0 && ' | '}
                    {tax > 0 && `ภาษี +${fmt(tax)} ฿`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {availableMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                    activeMethod === m.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {activeMethod === 'QR' && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                {qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="PromptPay QR" className="mx-auto h-40 w-40" />
                    <p className="mt-2 text-xs text-slate-500">สแกนเพื่อชำระเงินผ่าน PromptPay</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                    <QrCode className="w-10 h-10 mb-2" />
                    <p className="text-sm">ยังไม่ได้ตั้งค่า QR พร้อมเพย์</p>
                    <p className="text-xs">ไปที่ ตั้งค่าระบบ {'>'} การชำระเงิน</p>
                  </div>
                )}
              </div>
            )}

            {activeMethod === 'CASH' && (
              <div className="space-y-1">
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={received}
                    onChange={(e) => setReceived(Number(e.target.value))}
                    placeholder="รับเงินมา"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                  />
                </div>
                <p className="text-right font-medium text-slate-700">ทอน {fmt(change)} ฿</p>
              </div>
            )}

            {activeMethod === 'TRANSFER' && (
              <div className="space-y-2">
                {settings?.bankName && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-800">{settings.bankName}</p>
                    {settings.bankAccountName && <p className="text-slate-600">{settings.bankAccountName}</p>}
                    {settings.bankAccountNumber && <p className="text-slate-600 font-mono">{settings.bankAccountNumber}</p>}
                  </div>
                )}
                <div className="relative">
                  <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="เลขที่อ้างอิง / สลิป"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                  />
                </div>
              </div>
            )}

            {activeMethod === 'QR' && (
              <div className="relative">
                <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="เลขที่อ้างอิง"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                />
              </div>
            )}

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุ"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />

            {!can('SALE_CREATE') && cart.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                บัญชีนี้ไม่มีสิทธิ์ขายสินค้า กรุณาติดต่อผู้ดูแลระบบ
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => submitSale('CASH')}
                disabled={!can('SALE_CREATE') || loading || cart.length === 0 || availableMethods.length === 0}
                className="rounded-xl bg-emerald-600 py-3 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {activeMethod === 'CASH' ? 'ขายเงินสด' : activeMethod === 'TRANSFER' ? 'ขายโอนเงิน' : 'ขายพร้อมเพย์'}
              </button>
              <button
                onClick={() => submitSale('CREDIT')}
                disabled={!can('SALE_CREATE') || loading || cart.length === 0 || !settings?.allowCreditSale}
                className="rounded-xl bg-blue-600 py-3 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ReceiptText className="w-5 h-5" />}
                ขายเครดิต
              </button>
            </div>

            {lastInvoice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center shadow-sm">
                <p className="text-sm text-emerald-800">บันทึก {lastInvoice.type === 'CASH' ? 'ขายเงินสด' : lastInvoice.type === 'TRANSFER' ? 'ขายโอนเงิน' : lastInvoice.type === 'QR' ? 'ขายพร้อมเพย์' : 'ขายเครดิต'} สำเร็จ</p>
                <p className="font-bold text-emerald-900">{lastInvoice.invoiceNumber}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showPrintDialog && lastInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Printer className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">บันทึกการขายสำเร็จ</h2>
              <p className="text-sm text-slate-500">เลขบิล {lastInvoice.invoiceNumber}</p>
            </div>

            <div className="space-y-3">
              <Link
                href={`/receipt/${lastInvoice.id}`}
                target="_blank"
                onClick={() => setShowPrintDialog(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                <Printer className="h-4 w-4" />
                พิมพ์ใบเสร็จ (เล็ก)
              </Link>
              <Link
                href={`/invoice-a4/${lastInvoice.id}`}
                target="_blank"
                onClick={() => setShowPrintDialog(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
              >
                <Printer className="h-4 w-4" />
                พิมพ์ใบกำกับภาษี A4
              </Link>
            </div>

            <button
              onClick={() => setShowPrintDialog(false)}
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
