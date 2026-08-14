'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Eye, Power, PowerOff, Search } from 'lucide-react'
import CustomerModal from './_components/CustomerModal'

interface Customer {
  id: string
  code: string
  name: string
  phone?: string
  creditLimit: number
  creditDays: number
  outstandingDebt: number
  isActive: boolean
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    fetchCustomers()
  }, [search, status, refresh])

  async function fetchCustomers() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status === 'active') params.set('isActive', 'true')
    if (status === 'inactive') params.set('isActive', 'false')
    const res = await fetch(`/api/customers?${params.toString()}`)
    const json = await res.json()
    if (json.success) setCustomers(json.data)
  }

  async function toggleStatus(id: string, isActive: boolean) {
    const action = isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`ต้องการ${action}ลูกค้านี้?`)) return
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const json = await res.json()
    if (json.success) fetchCustomers()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ลูกค้า</h1>
          <p className="text-sm text-slate-500">จัดการลูกค้า วงเงินเครดิต และยอดค้างชำระ</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มลูกค้า
        </button>
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefresh((n) => n + 1)}
      />

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">รายการลูกค้า</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาลูกค้า"
                className="w-full sm:w-56 rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                <th className="py-3 px-3 font-medium rounded-tl-lg">รหัส</th>
                <th className="py-3 px-3 font-medium">ชื่อ</th>
                <th className="py-3 px-3 font-medium">โทรศัพท์</th>
                <th className="py-3 px-3 font-medium">วงเงินเครดิต</th>
                <th className="py-3 px-3 font-medium">ยอดค้าง</th>
                <th className="py-3 px-3 font-medium">สถานะ</th>
                <th className="py-3 px-3 font-medium text-right rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-medium text-slate-900">{c.code}</td>
                  <td className="py-3 px-3 text-slate-900">{c.name}</td>
                  <td className="py-3 px-3 text-slate-600">{c.phone ?? '-'}</td>
                  <td className="py-3 px-3 text-slate-700">{fmt(c.creditLimit)} ฿</td>
                  <td className={`py-3 px-3 font-medium ${c.outstandingDebt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{fmt(c.outstandingDebt)} ฿</td>
                  <td className="py-3 px-3">
                    {c.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      ดู
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleStatus(c.id, c.isActive)}
                      className={`inline-flex items-center gap-1 text-sm font-medium transition ${
                        c.isActive
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {c.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {c.isActive ? 'ปิด' : 'เปิด'}
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-10 h-10 mb-2 text-slate-300" />
                      <p className="font-medium">ไม่พบลูกค้า</p>
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
