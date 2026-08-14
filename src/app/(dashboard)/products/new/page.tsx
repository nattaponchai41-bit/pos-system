'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, Save, Loader2, ImageIcon, X } from 'lucide-react'

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

export default function NewProductPage() {
  const router = useRouter()
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

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((j) => j.success && setCategories(j.data))
    fetch('/api/units')
      .then((r) => r.json())
      .then((j) => j.success && setUnits(j.data))
  }, [])

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

  async function handleSubmit(e: React.FormEvent) {
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
        router.push('/products')
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">เพิ่มสินค้า</h1>
        <p className="text-sm text-slate-500">กรอกข้อมูลสินค้า หน่วย และบาร์โค้ด</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลทั่วไป</h2>
          </div>

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
                {imageFile && (
                  <span className="text-sm text-slate-600">{imageFile.name}</span>
                )}
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">หน่วยสินค้า</h2>
            </div>
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
    </div>
  )
}
