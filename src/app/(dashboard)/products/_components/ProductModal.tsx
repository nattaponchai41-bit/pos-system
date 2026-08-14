'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Save, Loader2, ImageIcon, X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Category {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
}

interface UnitForm {
  unitId: string
  sku: string
  barcode: string
  conversionFactor: string
  costPrice: string
  salePrice: string
  wholesalePrice: string
  isDefault: boolean
  barcodes: string
}

interface ImportRow {
  code: string
  name: string
  categoryName?: string
  baseUnitName?: string
  initialStock?: number
  minStock?: number
  sku?: string
  unitName?: string
  conversionFactor?: number
  salePrice?: number
  costPrice?: number
  barcode?: string
  description?: string
}

interface ImportResult {
  code: string
  success: boolean
  message?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ProductModal({ open, onClose, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual')
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    baseUnitId: '',
    description: '',
    initialStock: '0',
    minStock: '0',
  })
  const [unitForms, setUnitForms] = useState<UnitForm[]>([
    {
      unitId: '',
      sku: '',
      barcode: '',
      conversionFactor: '1',
      costPrice: '',
      salePrice: '',
      wholesalePrice: '',
      isDefault: true,
      barcodes: '',
    },
  ])

  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/categories')
      .then((r) => r.json())
      .then((j) => j.success && setCategories(j.data))
    fetch('/api/units')
      .then((r) => r.json())
      .then((j) => j.success && setUnits(j.data))
  }, [open])

  function close() {
    setActiveTab('manual')
    setForm({
      code: '',
      name: '',
      categoryId: '',
      baseUnitId: '',
      description: '',
      initialStock: '0',
      minStock: '0',
    })
    setUnitForms([
      {
        unitId: '',
        sku: '',
        barcode: '',
        conversionFactor: '1',
        costPrice: '',
        salePrice: '',
        wholesalePrice: '',
        isDefault: true,
        barcodes: '',
      },
    ])
    setImageFile(null)
    setImagePreview(null)
    setImportFile(null)
    setParsedRows([])
    setImportResults(null)
    onClose()
  }

  function handleImageChange(file: File | null) {
    setImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) return undefined
    const fd = new FormData()
    fd.append('image', imageFile)
    const res = await fetch('/api/upload/product-image', { method: 'POST', body: fd })
    const json = await res.json()
    return json.success ? json.data.url : undefined
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const uploadedUrl = await uploadImage()
      const payload = {
        ...form,
        imageUrl: uploadedUrl,
        initialStock: Number(form.initialStock),
        minStock: Number(form.minStock),
        units: unitForms.map((u) => ({
          unitId: u.unitId,
          sku: u.sku,
          barcode: u.barcode || undefined,
          conversionFactor: Number(u.conversionFactor),
          costPrice: u.costPrice ? Number(u.costPrice) : undefined,
          salePrice: Number(u.salePrice),
          wholesalePrice: u.wholesalePrice ? Number(u.wholesalePrice) : undefined,
          isDefault: u.isDefault,
          barcodes: u.barcodes.split(',').map((b) => b.trim()).filter(Boolean),
        })),
      }
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        onSuccess()
        close()
      } else {
        alert(json.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function updateUnit(index: number, field: keyof UnitForm, value: string | boolean) {
    setUnitForms((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'isDefault' && value === true) {
        next.forEach((u, i) => {
          if (i !== index) u.isDefault = false
        })
      }
      return next
    })
  }

  function addUnit() {
    setUnitForms((prev) => [
      ...prev,
      {
        unitId: '',
        sku: '',
        barcode: '',
        conversionFactor: '1',
        costPrice: '',
        salePrice: '',
        wholesalePrice: '',
        isDefault: false,
        barcodes: '',
      },
    ])
  }

  function removeUnit(index: number) {
    setUnitForms((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleImportFile(file: File | null) {
    if (!file) {
      setImportFile(null)
      setParsedRows([])
      return
    }
    setImportFile(file)
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
    if (json.length < 2) {
      setParsedRows([])
      return
    }
    const rawHeaders = (json[0] as (string | undefined)[]).map((h) =>
      String(h ?? '').trim()
    )
    const colIndex = (names: string[]) => {
      for (let i = 0; i < rawHeaders.length; i++) {
        const h = rawHeaders[i].toLowerCase().replace(/\s+/g, '')
        if (names.some((n) => n.toLowerCase().replace(/\s+/g, '') === h)) return i
      }
      return -1
    }
    const idx = {
      code: colIndex(['code', 'รหัสสินค้า', 'รหัส']),
      name: colIndex(['name', 'ชื่อสินค้า', 'ชื่อ']),
      category: colIndex(['category', 'หมวดหมู่']),
      baseUnit: colIndex(['baseunit', 'หน่วยพื้นฐาน', 'หน่วยหลัก']),
      initialStock: colIndex(['initialstock', 'สต็อกเริ่มต้น']),
      minStock: colIndex(['minstock', 'สต็อกขั้นต่ำ']),
      sku: colIndex(['sku']),
      unit: colIndex(['unit', 'หน่วย']),
      conversionFactor: colIndex(['conversionfactor', 'ตัวคูณ']),
      salePrice: colIndex(['saleprice', 'ราคาขาย']),
      costPrice: colIndex(['costprice', 'ต้นทุน']),
      barcode: colIndex(['barcode', 'บาร์โค้ด']),
      description: colIndex(['description', 'รายละเอียด']),
    }

    const rows: ImportRow[] = []
    for (let r = 1; r < json.length; r++) {
      const row = json[r] as (string | number | undefined)[]
      const get = (i: number) => (i >= 0 ? row[i] : undefined)
      const code = String(get(idx.code) ?? '').trim()
      const name = String(get(idx.name) ?? '').trim()
      if (!code || !name) continue
      rows.push({
        code,
        name,
        categoryName: String(get(idx.category) ?? '').trim() || undefined,
        baseUnitName: String(get(idx.baseUnit) ?? '').trim() || undefined,
        initialStock: get(idx.initialStock) !== undefined ? Number(get(idx.initialStock)) : 0,
        minStock: get(idx.minStock) !== undefined ? Number(get(idx.minStock)) : 0,
        sku: String(get(idx.sku) ?? '').trim() || undefined,
        unitName: String(get(idx.unit) ?? '').trim() || undefined,
        conversionFactor: get(idx.conversionFactor) !== undefined ? Number(get(idx.conversionFactor)) : 1,
        salePrice: get(idx.salePrice) !== undefined ? Number(get(idx.salePrice)) : undefined,
        costPrice: get(idx.costPrice) !== undefined ? Number(get(idx.costPrice)) : undefined,
        barcode: String(get(idx.barcode) ?? '').trim() || undefined,
        description: String(get(idx.description) ?? '').trim() || undefined,
      })
    }
    setParsedRows(rows)
  }

  async function handleImport() {
    if (parsedRows.length === 0) return
    setImportLoading(true)
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsedRows }),
      })
      const json = await res.json()
      if (json.success) {
        setImportResults(json.data.results)
        const imported = json.data.results.filter((r: ImportResult) => r.success).length
        if (imported > 0) onSuccess()
      } else {
        alert(json.message)
      }
    } finally {
      setImportLoading(false)
    }
  }

  function downloadSampleFile() {
    const rows = [
      {
        รหัสสินค้า: 'P001',
        ชื่อสินค้า: 'น้ำดื่ม 500ml',
        หมวดหมู่: 'เครื่องดื่ม',
        หน่วยพื้นฐาน: 'ขวด',
        สต็อกเริ่มต้น: 100,
        สต็อกขั้นต่ำ: 10,
        SKU: 'P001-BTL',
        หน่วย: 'ขวด',
        ตัวคูณ: 1,
        ราคาขาย: 10,
        ต้นทุน: 6,
        Barcode: '885123456001',
        รายละเอียด: 'น้ำดื่ม 500 มล.',
      },
      {
        รหัสสินค้า: 'P002',
        ชื่อสินค้า: 'น้ำดื่ม 1.5L',
        หมวดหมู่: 'เครื่องดื่ม',
        หน่วยพื้นฐาน: 'ขวด',
        สต็อกเริ่มต้น: 50,
        สต็อกขั้นต่ำ: 5,
        SKU: 'P002-BTL',
        หน่วย: 'ขวด',
        ตัวคูณ: 1,
        ราคาขาย: 18,
        ต้นทุน: 12,
        Barcode: '885123456002',
        รายละเอียด: 'น้ำดื่ม 1.5 ลิตร',
      },
      {
        รหัสสินค้า: 'P003',
        ชื่อสินค้า: 'กระดาษ A4',
        หมวดหมู่: 'เครื่องเขียน',
        หน่วยพื้นฐาน: 'รีม',
        สต็อกเริ่มต้น: 30,
        สต็อกขั้นต่ำ: 3,
        SKU: 'P003-REAM',
        หน่วย: 'รีม',
        ตัวคูณ: 1,
        ราคาขาย: 120,
        ต้นทุน: 90,
        Barcode: '885123456003',
        รายละเอียด: 'กระดาษถ่ายเอกสาร A4 500 แผ่น',
      },
      {
        รหัสสินค้า: 'P004',
        ชื่อสินค้า: 'ขนมปังแผ่น',
        หมวดหมู่: 'อาหาร',
        หน่วยพื้นฐาน: 'ชิ้น',
        สต็อกเริ่มต้น: 200,
        สต็อกขั้นต่ำ: 20,
        SKU: 'P004-PCS',
        หน่วย: 'ชิ้น',
        ตัวคูณ: 1,
        ราคาขาย: 12,
        ต้นทุน: 7,
        Barcode: '885123456004',
        รายละเอียด: 'ขนมปังแผ่นสำหรับเบอร์เกอร์',
      },
      {
        รหัสสินค้า: 'P005',
        ชื่อสินค้า: 'สบู่ก้อน',
        หมวดหมู่: 'ของใช้',
        หน่วยพื้นฐาน: 'ก้อน',
        สต็อกเริ่มต้น: 80,
        สต็อกขั้นต่ำ: 8,
        SKU: 'P005-BAR',
        หน่วย: 'ก้อน',
        ตัวคูณ: 1,
        ราคาขาย: 35,
        ต้นทุน: 22,
        Barcode: '885123456005',
        รายละเอียด: 'สบู่ก้อน 80 กรัม',
      },
      {
        รหัสสินค้า: 'P006',
        ชื่อสินค้า: 'น้ำดื่มแพ็ค',
        หมวดหมู่: 'เครื่องดื่ม',
        หน่วยพื้นฐาน: 'ขวด',
        สต็อกเริ่มต้น: 120,
        สต็อกขั้นต่ำ: 12,
        SKU: 'P006-PACK',
        หน่วย: 'แพ็ค',
        ตัวคูณ: 6,
        ราคาขาย: 55,
        ต้นทุน: 36,
        Barcode: '885123456006',
        รายละเอียด: 'น้ำดื่ม 500ml แพ็ค 6 ขวด',
      },
    ]
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ตัวอย่างสินค้า')
    XLSX.writeFile(workbook, 'products-sample.xlsx')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">เพิ่มสินค้า</h2>
              <p className="text-sm text-slate-500">เพิ่มด้วยตนเองหรือนำเข้าจาก Excel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b bg-slate-50 px-6">
          <div className="flex gap-2">
            {[
              { key: 'manual', label: 'กรอกเอง', icon: Package },
              { key: 'import', label: 'นำเข้า Excel', icon: FileSpreadsheet },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === t.key
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4">ข้อมูลทั่วไป</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสสินค้า</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="เช่น P-001"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อสินค้า</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="ชื่อสินค้า"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">หมวดหมู่</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
                    >
                      <option value="">ไม่มีหมวดหมู่</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">หน่วยพื้นฐาน</label>
                    <select
                      value={form.baseUnitId}
                      onChange={(e) => setForm({ ...form, baseUnitId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
                      required
                    >
                      <option value="">เลือกหน่วยพื้นฐาน</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">รายละเอียด</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="รายละเอียดเพิ่มเติม"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">รูปสินค้า</label>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition">
                        <ImageIcon className="w-4 h-4" />
                        เลือกรูป
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                      </label>
                      {imageFile && <span className="text-sm text-slate-600">{imageFile.name}</span>}
                    </div>
                    {imagePreview && (
                      <div className="mt-3 relative inline-block">
                        <img src={imagePreview} alt="preview" className="h-32 w-32 rounded-lg border object-cover" />
                        <button
                          type="button"
                          onClick={() => handleImageChange(null)}
                          className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">สต็อกเริ่มต้น (หน่วยพื้นฐาน)</label>
                    <input
                      type="number"
                      value={form.initialStock}
                      onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">สต็อกขั้นต่ำ</label>
                    <input
                      type="number"
                      value={form.minStock}
                      onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      min={0}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-slate-900">หน่วยสินค้า</h3>
                  <button
                    type="button"
                    onClick={addUnit}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มหน่วย
                  </button>
                </div>

                <div className="space-y-4">
                  {unitForms.map((u, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">หน่วยที่ {i + 1}</span>
                        {unitForms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUnit(i)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">หน่วย</label>
                          <select
                            value={u.unitId}
                            onChange={(e) => updateUnit(i, 'unitId', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
                            required
                          >
                            <option value="">เลือกหน่วย</option>
                            {units.map((unit) => (
                              <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
                          <input
                            value={u.sku}
                            onChange={(e) => updateUnit(i, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">ตัวคูณ → หน่วยพื้นฐาน</label>
                          <input
                            type="number"
                            value={u.conversionFactor}
                            onChange={(e) => updateUnit(i, 'conversionFactor', e.target.value)}
                            placeholder="ตัวคูณ"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                            min={0.0001}
                            step="any"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">ราคาขาย</label>
                          <input
                            type="number"
                            value={u.salePrice}
                            onChange={(e) => updateUnit(i, 'salePrice', e.target.value)}
                            placeholder="ราคาขาย"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                            min={0}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">ต้นทุน</label>
                          <input
                            type="number"
                            value={u.costPrice}
                            onChange={(e) => updateUnit(i, 'costPrice', e.target.value)}
                            placeholder="ต้นทุน"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                            min={0}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Barcode หลัก</label>
                          <input
                            value={u.barcode}
                            onChange={(e) => updateUnit(i, 'barcode', e.target.value)}
                            placeholder="Barcode หลัก"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Barcode เพิ่มเติม (คั่นด้วย ,)</label>
                          <input
                            value={u.barcodes}
                            onChange={(e) => updateUnit(i, 'barcodes', e.target.value)}
                            placeholder="เช่น 123456,234567"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                          />
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.isDefault}
                          onChange={(e) => updateUnit(i, 'isDefault', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        />
                        เป็นหน่วยเริ่มต้นสำหรับขาย
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                disabled={loading}
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
                    บันทึกสินค้า
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-2">เลือกไฟล์ Excel (.xlsx / .xls)</p>
                <p className="text-xs text-slate-500 mb-4">
                  คอลัมน์: รหัสสินค้า, ชื่อสินค้า, หมวดหมู่, หน่วยพื้นฐาน, สต็อกเริ่มต้น, สต็อกขั้นต่ำ, SKU, หน่วย, ตัวคูณ, ราคาขาย, ต้นทุน, Barcode
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800 transition cursor-pointer">
                  <Upload className="w-4 h-4" />
                  เลือกไฟล์
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={downloadSampleFile}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลดตัวอย่าง
                </button>
              </div>
                {importFile && <p className="mt-3 text-sm text-slate-600">{importFile.name}</p>}
              </div>

              {parsedRows.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="py-2 px-3 font-medium">รหัส</th>
                          <th className="py-2 px-3 font-medium">ชื่อ</th>
                          <th className="py-2 px-3 font-medium">หมวดหมู่</th>
                          <th className="py-2 px-3 font-medium">หน่วย</th>
                          <th className="py-2 px-3 font-medium text-right">ราคาขาย</th>
                          <th className="py-2 px-3 font-medium text-right">ต้นทุน</th>
                          <th className="py-2 px-3 font-medium text-right">สต็อก</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="py-2 px-3">{row.code}</td>
                            <td className="py-2 px-3">{row.name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.categoryName ?? '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{row.baseUnitName ?? row.unitName ?? '-'}</td>
                            <td className="py-2 px-3 text-right">{row.salePrice?.toLocaleString() ?? '-'}</td>
                            <td className="py-2 px-3 text-right">{row.costPrice?.toLocaleString() ?? '-'}</td>
                            <td className="py-2 px-3 text-right">{row.initialStock ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 50 && (
                    <p className="text-xs text-slate-500">แสดง 50 รายการแรกจาก {parsedRows.length} รายการ</p>
                  )}
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importLoading}
                    className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังนำเข้า...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        นำเข้า {parsedRows.length} รายการ
                      </>
                    )}
                  </button>
                </>
              )}

              {importResults && (
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <h4 className="font-bold text-slate-900 mb-3">ผลการนำเข้า</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importResults.map((r) => (
                      <div key={r.code} className="flex items-start gap-2 text-sm">
                        {r.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <span className="font-medium">{r.code}</span>
                          {r.success ? (
                            <span className="text-green-700 ml-2">สำเร็จ</span>
                          ) : (
                            <span className="text-red-700 ml-2">{r.message}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
