'use client'

import { useEffect, useState, useRef } from 'react'
import { Store, Receipt, CreditCard, Package, Hash, Save, Loader2, Upload, X } from 'lucide-react'

interface StoreSetting {
  storeName: string
  storeAddress?: string | null
  storePhone?: string | null
  storeTaxId?: string | null
  logoUrl?: string | null
  currency: string
  currencySymbol: string
  invoicePrefix: string
  invoiceNextNumber: number
  purchaseOrderPrefix: string
  purchaseOrderNextNumber: number
  allowCreditSale: boolean
  allowNegativeStock: boolean
  sessionRequired: boolean
  receiptWidth: '58mm' | '80mm'
  showLogo: boolean
  showQr: boolean
  showCashier: boolean
  showTaxId: boolean
  receiptFooter?: string | null
  qrPaymentPhone?: string | null
  qrPaymentPayload?: string | null
  enableCashPayment: boolean
  enableTransferPayment: boolean
  enableQrPayment: boolean
  transferAsCashIn: boolean
  qrAsCashIn: boolean
  bankName?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  invoiceTitle: string
  receiptTitle: string
}

const TABS = [
  { id: 'store', label: 'ข้อมูลร้านค้า', icon: Store },
  { id: 'receipt', label: 'ใบเสร็จ/บิล', icon: Receipt },
  { id: 'payment', label: 'การชำระเงิน', icon: CreditCard },
  { id: 'sale', label: 'การขาย', icon: Package },
  { id: 'numbering', label: 'เลขที่เอกสาร', icon: Hash },
]

export default function SettingsPage() {
  const [setting, setSetting] = useState<StoreSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('store')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((json) => json.success && setSetting(json.data))
      .finally(() => setLoading(false))
  }, [])

  function updateField<K extends keyof StoreSetting>(key: K, value: StoreSetting[K]) {
    if (!setting) return
    setSetting({ ...setting, [key]: value })
  }

  async function handleLogoUpload(file: File) {
    if (!setting) return
    if (!file.type.startsWith('image/')) {
      alert('ต้องเป็นไฟล์รูปภาพ')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB')
      return
    }

    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      if (setting.logoUrl) formData.append('currentUrl', setting.logoUrl)

      const res = await fetch('/api/upload/store-logo', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        updateField('logoUrl', json.data.url)
      } else {
        alert(json.message || 'อัปโหลดรูปไม่สำเร็จ')
      }
    } catch (err) {
      console.error(err)
      alert('อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setLogoUploading(false)
    }
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleLogoUpload(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!setting) return
    setSaving(true)
    setSubmitError('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setting),
    })
    const json = await res.json()
    setSaving(false)
    if (json.success) {
      setSetting(json.data)
      setSubmitError('')
      alert('บันทึกการตั้งค่าแล้ว')
    } else {
      const message = json.message || json.data?.error || 'ไม่สามารถบันทึกได้'
      setSubmitError(message)
    }
  }

  if (loading) return <p className="p-4 text-slate-500">กำลังโหลด...</p>
  if (!setting) return <p className="p-4 text-slate-500">ไม่พบการตั้งค่า</p>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
          <p className="text-sm text-slate-500">จัดการข้อมูลร้านค้า ใบเสร็จ และการตั้งค่าการขาย</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <nav className="flex overflow-x-auto border-b">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-[1px]',
                    active
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="p-6">
            {activeTab === 'store' && (
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Store className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">ข้อมูลร้านค้า</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อร้าน</label>
                    <input
                      value={setting.storeName}
                      onChange={(e) => updateField('storeName', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label>
                    <textarea
                      value={setting.storeAddress ?? ''}
                      onChange={(e) => updateField('storeAddress', e.target.value || null)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">โทรศัพท์</label>
                    <input
                      value={setting.storePhone ?? ''}
                      onChange={(e) => updateField('storePhone', e.target.value || null)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขประจำตัวผู้เสียภาษี</label>
                    <input
                      value={setting.storeTaxId ?? ''}
                      onChange={(e) => updateField('storeTaxId', e.target.value || null)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">โลโก้ร้าน</label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleLogoDrop}
                      className="flex items-start gap-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-400"
                    >
                      <div className="flex-1 space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoUpload(file)
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                        >
                          {logoUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              กำลังอัปโหลด...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              เลือกไฟล์รูปภาพ
                            </>
                          )}
                        </button>
                        <p className="text-xs text-slate-500">รองรับ PNG, JPG, WebP ขนาดไม่เกิน 5MB</p>
                      </div>

                      {setting.logoUrl ? (
                        <div className="relative">
                          <img
                            src={setting.logoUrl}
                            alt="Store logo"
                            className="h-20 w-20 object-contain rounded-lg border bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => updateField('logoUrl', null)}
                            className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white p-1 shadow hover:bg-red-700 transition"
                            title="ลบโลโก้"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 text-xs text-center">
                          ไม่มีโลโก้
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'receipt' && (
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">ใบเสร็จและบิล</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ขนาดกระดาษ</label>
                    <select
                      value={setting.receiptWidth}
                      onChange={(e) => updateField('receiptWidth', e.target.value as '58mm' | '80mm')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition bg-white"
                    >
                      <option value="58mm">58 มม.</option>
                      <option value="80mm">80 มม.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ท้ายใบเสร็จ</label>
                    <input
                      value={setting.receiptFooter ?? ''}
                      onChange={(e) => updateField('receiptFooter', e.target.value || null)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">หัวบิลใบกำกับภาษี</label>
                    <input
                      value={setting.invoiceTitle}
                      onChange={(e) => updateField('invoiceTitle', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">หัวบิลใบเสร็จรับเงิน</label>
                    <input
                      value={setting.receiptTitle}
                      onChange={(e) => updateField('receiptTitle', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'showLogo', label: 'แสดงโลโก้' },
                    { key: 'showQr', label: 'แสดง QR' },
                    { key: 'showCashier', label: 'แสดงพนักงาน' },
                    { key: 'showTaxId', label: 'แสดง Tax ID' },
                  ].map((item) => (
                    <label key={item.key} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting[item.key as keyof StoreSetting] as boolean}
                        onChange={(e) => updateField(item.key as keyof StoreSetting, e.target.checked as StoreSetting[keyof StoreSetting])}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-slate-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'payment' && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">การชำระเงิน</h2>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">วิธีการชำระเงินที่ใช้งาน</h3>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { key: 'enableCashPayment', label: 'เงินสด' },
                      { key: 'enableTransferPayment', label: 'ธนาคาร' },
                      { key: 'enableQrPayment', label: 'พร้อมเพย์ QR' },
                    ].map((item) => (
                      <label key={item.key} className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setting[item.key as keyof StoreSetting] as boolean}
                          onChange={(e) => updateField(item.key as keyof StoreSetting, e.target.checked as StoreSetting[keyof StoreSetting])}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        />
                        <span className="text-sm text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">วิธีที่ปิดจะไม่แสดงในหน้าขาย</p>
                </div>

                {setting.enableTransferPayment && (
                  <div className="rounded-lg bg-slate-50 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800">บัญชีธนาคารสำหรับโอนเงิน</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">ธนาคาร</label>
                        <input
                          value={setting.bankName ?? ''}
                          onChange={(e) => updateField('bankName', e.target.value || null)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                          placeholder="เช่น กสิกรไทย"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อบัญชี</label>
                        <input
                          value={setting.bankAccountName ?? ''}
                          onChange={(e) => updateField('bankAccountName', e.target.value || null)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                          placeholder="ชื่อบัญชี"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">เลขที่บัญชี</label>
                        <input
                          value={setting.bankAccountNumber ?? ''}
                          onChange={(e) => updateField('bankAccountNumber', e.target.value || null)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                          placeholder="เลขที่บัญชี"
                        />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.transferAsCashIn}
                        onChange={(e) => updateField('transferAsCashIn', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-slate-700">นับเงินโอนเข้าลิ้นชักเงินสด</span>
                    </label>
                  </div>
                )}

                {setting.enableQrPayment && (
                  <div className="rounded-lg bg-slate-50 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800">ตั้งค่าพร้อมเพย์ QR</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์ / เลขบัตรประชาชน PromptPay</label>
                      <input
                        value={setting.qrPaymentPhone ?? ''}
                        onChange={(e) => updateField('qrPaymentPhone', e.target.value || null)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                        placeholder="เช่น 0801234567 หรือ 1234567890123"
                      />
                      <p className="text-xs text-slate-500 mt-1">ระบบจะสร้าง QR Code PromptPay แบบ EMVCo ให้อัตโนมัติ (รองรับเบอร์โทร 10 หลัก หรือบัตรประชาชน 13 หลัก)</p>
                    </div>

                    {setting.qrPaymentPayload && (
                      <div className="rounded-lg bg-white p-3 border border-slate-200">
                        <p className="text-xs font-medium text-slate-600 mb-1">Payload ที่สร้างแล้ว</p>
                        <p className="text-xs text-slate-500 break-all font-mono">{setting.qrPaymentPayload}</p>
                      </div>
                    )}

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.qrAsCashIn}
                        onChange={(e) => updateField('qrAsCashIn', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-slate-700">นับ QR พร้อมเพย์เข้าลิ้นชักเงินสด</span>
                    </label>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'sale' && (
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">การขาย</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={setting.allowCreditSale}
                      onChange={(e) => updateField('allowCreditSale', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">อนุญาตขายเครดิต</p>
                      <p className="text-xs text-slate-500">เปิดให้บันทึกบิลค้างชำระและรับชำระหนี้ภายหลัง</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={setting.allowNegativeStock}
                      onChange={(e) => updateField('allowNegativeStock', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">อนุญาตสต็อกติดลบ</p>
                      <p className="text-xs text-slate-500">อนุญาตให้ขายสินค้าได้แม้จำนวนคงเหลือไม่พอ</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition md:col-span-2">
                    <input
                      type="checkbox"
                      checked={setting.sessionRequired}
                      onChange={(e) => updateField('sessionRequired', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">บังคับเปิดเซสชั่นก่อนขาย</p>
                      <p className="text-xs text-slate-500">พนักงานต้องเปิดกะเงินสดก่อนจึงจะสามารถบันทึกการขายได้</p>
                    </div>
                  </label>
                </div>
              </section>
            )}

            {activeTab === 'numbering' && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-rose-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">เลขที่เอกสาร</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800">เลขที่บิล</h3>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Prefix</label>
                      <input
                        value={setting.invoicePrefix}
                        onChange={(e) => updateField('invoicePrefix', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">เลขถัดไป</label>
                      <input
                        type="number"
                        value={setting.invoiceNextNumber}
                        onChange={(e) => updateField('invoiceNextNumber', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800">เลขที่ใบซื้อ</h3>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Prefix</label>
                      <input
                        value={setting.purchaseOrderPrefix}
                        onChange={(e) => updateField('purchaseOrderPrefix', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">เลขถัดไป</label>
                      <input
                        type="number"
                        value={setting.purchaseOrderNextNumber}
                        onChange={(e) => updateField('purchaseOrderNextNumber', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none transition"
                        min={1}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {submitError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{submitError}</div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-30">
          <div className="max-w-4xl mx-auto">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึกการตั้งค่า
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
