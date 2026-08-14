'use client'

import { useEffect, useState } from 'react'
import { Scale, Plus, Power, PowerOff, Ruler } from 'lucide-react'

interface Unit {
  id: string
  name: string
  abbreviation?: string
  isActive: boolean
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [form, setForm] = useState({ name: '', abbreviation: '' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')

  useEffect(() => {
    fetchUnits()
  }, [status])

  async function fetchUnits() {
    const params = new URLSearchParams()
    if (status === 'active') params.set('isActive', 'true')
    if (status === 'inactive') params.set('isActive', 'false')
    const res = await fetch(`/api/units?${params.toString()}`)
    const json = await res.json()
    if (json.success) setUnits(json.data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)
    if (json.success) {
      setForm({ name: '', abbreviation: '' })
      fetchUnits()
    } else {
      alert(json.message)
    }
  }

  async function toggleStatus(id: string, isActive: boolean) {
    const action = isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`ต้องการ${action}หน่วยนี้?`)) return
    const res = await fetch(`/api/units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const json = await res.json()
    if (json.success) fetchUnits()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">หน่วยสินค้า</h1>
        <p className="text-sm text-slate-500">จัดการหน่วยพื้นฐานสำหรับสินค้า เช่น ชิ้น ลัง แพ็ค</p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อหน่วย</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="เช่น ลัง"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ตัวย่อ</label>
            <input
              value={form.abbreviation}
              onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
              placeholder="เช่น ลก."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
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
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Scale className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">รายการหน่วย</h2>
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
                <th className="py-3 px-3 font-medium">ตัวย่อ</th>
                <th className="py-3 px-3 font-medium">สถานะ</th>
                <th className="py-3 px-3 font-medium text-right rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-medium text-slate-900">{u.name}</td>
                  <td className="py-3 px-3 text-slate-600">{u.abbreviation ?? '-'}</td>
                  <td className="py-3 px-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => toggleStatus(u.id, u.isActive)}
                      className={`inline-flex items-center gap-1 text-sm font-medium transition ${
                        u.isActive
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {u.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {u.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Ruler className="w-10 h-10 mb-2 text-slate-300" />
                      <p className="font-medium">ไม่พบหน่วยสินค้า</p>
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
