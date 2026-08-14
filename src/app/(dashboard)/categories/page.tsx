'use client'

import { useEffect, useState } from 'react'
import { Tags, Plus, Power, PowerOff, FolderOpen } from 'lucide-react'

interface Category {
  id: string
  name: string
  color?: string
  isActive: boolean
  sortOrder: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({ name: '', color: '#3b82f6' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')

  useEffect(() => {
    fetchCategories()
  }, [status])

  async function fetchCategories() {
    const params = new URLSearchParams()
    if (status === 'active') params.set('isActive', 'true')
    if (status === 'inactive') params.set('isActive', 'false')
    const res = await fetch(`/api/categories?${params.toString()}`)
    const json = await res.json()
    if (json.success) setCategories(json.data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)
    if (json.success) {
      setForm({ name: '', color: '#3b82f6' })
      fetchCategories()
    } else {
      alert(json.message)
    }
  }

  async function toggleStatus(id: string, isActive: boolean) {
    const action = isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`ต้องการ${action}หมวดหมู่นี้?`)) return
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const json = await res.json()
    if (json.success) fetchCategories()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">หมวดหมู่สินค้า</h1>
        <p className="text-sm text-slate-500">จัดการหมวดหมู่และสีประจำกลุ่มสินค้า</p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อหมวดหมู่</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="เช่น เครื่องดื่ม"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">สี</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-2 py-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-sm text-slate-600">{form.color}</span>
            </div>
          </div>
          <div className="self-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              เพิ่ม
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Tags className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">รายการหมวดหมู่</h2>
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
                <th className="py-3 px-3 font-medium rounded-tl-lg">ชื่อ</th>
                <th className="py-3 px-3 font-medium">สี</th>
                <th className="py-3 px-3 font-medium">สถานะ</th>
                <th className="py-3 px-3 font-medium text-right rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 px-3">
                    <span
                      className="inline-block h-5 w-5 rounded-full border border-slate-200"
                      style={{ backgroundColor: c.color }}
                    />
                  </td>
                  <td className="py-3 px-3">
                    {c.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => toggleStatus(c.id, c.isActive)}
                      className={`inline-flex items-center gap-1 text-sm font-medium transition ${
                        c.isActive
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {c.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {c.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FolderOpen className="w-10 h-10 mb-2 text-slate-300" />
                      <p className="font-medium">ไม่พบหมวดหมู่</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
