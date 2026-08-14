'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function InstallPage() {
  const router = useRouter()
  const [status, setStatus] = useState<{
    loading: boolean
    connected?: boolean
    installed?: boolean
    hasAdmin?: boolean
    error?: string
  }>({ loading: true })

  const [form, setForm] = useState({
    storeName: 'ร้านค้า POS',
    storeAddress: '',
    storePhone: '',
    storeTaxId: '',
    adminEmail: 'admin@pos.local',
    adminPassword: '',
    qrPaymentPhone: '',
    enableCashPayment: true,
    enableTransferPayment: true,
    enableQrPayment: true,
    allowCreditSale: true,
    transferAsCashIn: false,
    qrAsCashIn: false,
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetch('/api/install')
      .then((res) => res.json())
      .then((json) => {
        const connected = json.success && json.data?.connected
        setStatus({
          loading: false,
          connected,
          installed: json.success && json.data?.installed,
          hasAdmin: json.success && json.data?.hasAdmin,
          error: connected
            ? undefined
            : (json.data?.message ?? json.message ?? 'ไม่สามารถตรวจสอบสถานะได้'),
        })
      })
      .catch((err) => {
        setStatus({ loading: false, error: err.message })
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (json.success) {
      router.push('/login')
    } else {
      setSubmitError(json.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2">ติดตั้ง POS System</h1>
        <p className="text-center text-slate-500 mb-6">เริ่มต้นใช้งานระบบบนเครื่องนี้</p>

        {status.loading && <p className="text-center">กำลังตรวจสอบฐานข้อมูล...</p>}

        {status.error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm mb-4">
            {status.error}
          </div>
        )}

        {!status.loading && status.connected && status.installed && (
          <div className="text-center space-y-4">
            <p className="text-green-600 font-medium">ระบบพร้อมใช้งานแล้ว</p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-slate-900 text-white px-4 py-2"
            >
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        )}

        {!status.loading && status.connected && !status.installed && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อร้าน</label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ที่อยู่ร้าน</label>
                <input
                  type="text"
                  value={form.storeAddress}
                  onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="ที่อยู่ร้านค้า"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">เบอร์โทรร้าน</label>
                  <input
                    type="text"
                    value={form.storePhone}
                    onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="เบอร์โทรศัพท์ร้าน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">เลขผู้เสียภาษีร้าน</label>
                  <input
                    type="text"
                    value={form.storeTaxId}
                    onChange={(e) => setForm({ ...form, storeTaxId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="เลขประจำตัวผู้เสียภาษี"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">อีเมล Admin</label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">รหัสผ่าน Admin</label>
              <input
                type="password"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
                minLength={6}
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-4 space-y-4">
              <p className="text-sm font-semibold text-slate-800">วิธีการชำระเงินเริ่มต้น</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'enableCashPayment', label: 'เงินสด' },
                  { key: 'enableTransferPayment', label: 'ธนาคาร' },
                  { key: 'enableQrPayment', label: 'พร้อมเพย์ QR' },
                ].map((item) => (
                  <label key={item.key} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[item.key as keyof typeof form] as boolean}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowCreditSale}
                  onChange={(e) => setForm({ ...form, allowCreditSale: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm font-semibold text-slate-800">เปิดใช้งานการขายเครดิต</span>
              </label>
            </div>

            {form.enableTransferPayment && (
              <div className="rounded-lg bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800">บัญชีธนาคารสำหรับโอนเงิน (ไม่บังคับ)</p>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.transferAsCashIn}
                    onChange={(e) => setForm({ ...form, transferAsCashIn: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-slate-700">นับเงินโอนเข้าลิ้นชักเงินสด</span>
                </label>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ธนาคาร</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="เช่น กสิกรไทย"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อบัญชี</label>
                  <input
                    type="text"
                    value={form.bankAccountName}
                    onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="ชื่อบัญชี"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">เลขที่บัญชี</label>
                  <input
                    type="text"
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="เลขที่บัญชี"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์ PromptPay (ไม่บังคับ)</label>
              <input
                type="text"
                value={form.qrPaymentPhone}
                onChange={(e) => setForm({ ...form, qrPaymentPhone: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="เช่น 0801234567"
              />
              <p className="text-xs text-slate-500 mt-1">ระบบจะสร้าง QR Code PromptPay ให้อัตโนมัติ (รองรับเบอร์โทร 10 หลัก หรือบัตรประชาชน 13 หลัก)</p>
            </div>
            {form.enableQrPayment && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.qrAsCashIn}
                  onChange={(e) => setForm({ ...form, qrAsCashIn: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-700">นับ QR เข้าลิ้นชักเงินสด</span>
              </label>
            )}
            {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium disabled:opacity-50"
            >
              {submitting ? 'กำลังติดตั้ง...' : 'ติดตั้งและสร้าง Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
