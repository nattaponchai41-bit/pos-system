'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserCog, Plus, Edit3, Ban } from 'lucide-react'
import UserModal from './_components/UserModal'

interface Role {
  id: string
  name: string
  label: string
}

interface User {
  id: string
  code: string
  name: string
  email: string
  phone?: string
  isActive: boolean
  role: Role
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const res = await fetch('/api/users')
    const json = await res.json()
    if (json.success) setUsers(json.data)
  }

  async function deactivate(id: string) {
    if (!confirm('ปิดใช้งานผู้ใช้นี้?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) fetchUsers()
    else alert(json.message)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ผู้ใช้งาน</h1>
          <p className="text-sm text-slate-500">จัดการพนักงาน บทบาท และสิทธิ์การใช้งาน</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-teal-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">รายชื่อผู้ใช้</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3 font-medium">รหัส</th>
                <th className="py-3 font-medium">ชื่อ</th>
                <th className="py-3 font-medium">อีเมล</th>
                <th className="py-3 font-medium">บทบาท</th>
                <th className="py-3 font-medium">สถานะ</th>
                <th className="py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                  <td className="py-3 font-medium text-slate-900">{u.code}</td>
                  <td className="py-3 text-slate-900">{u.name}</td>
                  <td className="py-3 text-slate-600">{u.email}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{u.role.label}</span>
                  </td>
                  <td className="py-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">ใช้งาน</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">ปิด</span>
                    )}
                  </td>
                  <td className="py-3 text-right space-x-3">
                    <Link
                      href={`/users/${u.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                      แก้ไข
                    </Link>
                    {u.isActive && (
                      <button
                        onClick={() => deactivate(u.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition"
                      >
                        <Ban className="w-4 h-4" />
                        ปิด
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">ไม่มีข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchUsers()}
      />
    </div>
  )
}
