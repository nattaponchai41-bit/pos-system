import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'
import { createAuditLog } from '@/lib/services/audit'
import { ApiError } from '@/lib/api'

export async function getStoreSetting() {
  return prisma.storeSetting.findUnique({ where: { id: 'default' } })
}

export interface StoreSettingUpdateInput {
  storeName?: string
  storeAddress?: string | null
  storePhone?: string | null
  storeTaxId?: string | null
  logoUrl?: string | null
  currency?: string
  currencySymbol?: string
  invoicePrefix?: string
  invoiceNextNumber?: number
  purchaseOrderPrefix?: string
  purchaseOrderNextNumber?: number
  allowCreditSale?: boolean
  allowNegativeStock?: boolean
  sessionRequired?: boolean
  receiptWidth?: '58mm' | '80mm'
  showLogo?: boolean
  showQr?: boolean
  showCashier?: boolean
  showTaxId?: boolean
  receiptFooter?: string | null
  qrPaymentPhone?: string | null
  qrPaymentPayload?: string | null
  enableCashPayment?: boolean
  enableTransferPayment?: boolean
  enableQrPayment?: boolean
  transferAsCashIn?: boolean
  qrAsCashIn?: boolean
  bankName?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  invoiceTitle?: string
  receiptTitle?: string
}

export async function updateStoreSetting(data: StoreSettingUpdateInput, session: Session) {
  const existing = await prisma.storeSetting.findUnique({ where: { id: 'default' } })
  if (!existing) {
    throw new ApiError('ไม่พบการตั้งค่าร้านค้า', 404)
  }

  const updateData: Record<string, unknown> = {}
  if (data.storeName !== undefined) updateData.storeName = data.storeName
  if (data.storeAddress !== undefined) updateData.storeAddress = data.storeAddress || null
  if (data.storePhone !== undefined) updateData.storePhone = data.storePhone || null
  if (data.storeTaxId !== undefined) updateData.storeTaxId = data.storeTaxId || null
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl || null
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.currencySymbol !== undefined) updateData.currencySymbol = data.currencySymbol
  if (data.invoicePrefix !== undefined) updateData.invoicePrefix = data.invoicePrefix
  if (data.invoiceNextNumber !== undefined) updateData.invoiceNextNumber = data.invoiceNextNumber
  if (data.purchaseOrderPrefix !== undefined) updateData.purchaseOrderPrefix = data.purchaseOrderPrefix
  if (data.purchaseOrderNextNumber !== undefined) updateData.purchaseOrderNextNumber = data.purchaseOrderNextNumber
  if (data.allowCreditSale !== undefined) updateData.allowCreditSale = data.allowCreditSale
  if (data.allowNegativeStock !== undefined) updateData.allowNegativeStock = data.allowNegativeStock
  if (data.sessionRequired !== undefined) updateData.sessionRequired = data.sessionRequired
  if (data.receiptWidth !== undefined) updateData.receiptWidth = data.receiptWidth
  if (data.showLogo !== undefined) updateData.showLogo = data.showLogo
  if (data.showQr !== undefined) updateData.showQr = data.showQr
  if (data.showCashier !== undefined) updateData.showCashier = data.showCashier
  if (data.showTaxId !== undefined) updateData.showTaxId = data.showTaxId
  if (data.receiptFooter !== undefined) updateData.receiptFooter = data.receiptFooter || null
  if (data.qrPaymentPhone !== undefined) updateData.qrPaymentPhone = data.qrPaymentPhone || null
  if (data.qrPaymentPayload !== undefined) updateData.qrPaymentPayload = data.qrPaymentPayload || null
  if (data.enableCashPayment !== undefined) updateData.enableCashPayment = data.enableCashPayment
  if (data.enableTransferPayment !== undefined) updateData.enableTransferPayment = data.enableTransferPayment
  if (data.enableQrPayment !== undefined) updateData.enableQrPayment = data.enableQrPayment
  if (data.transferAsCashIn !== undefined) updateData.transferAsCashIn = data.transferAsCashIn
  if (data.qrAsCashIn !== undefined) updateData.qrAsCashIn = data.qrAsCashIn
  if (data.bankName !== undefined) updateData.bankName = data.bankName || null
  if (data.bankAccountName !== undefined) updateData.bankAccountName = data.bankAccountName || null
  if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber || null
  if (data.invoiceTitle !== undefined) updateData.invoiceTitle = data.invoiceTitle
  if (data.receiptTitle !== undefined) updateData.receiptTitle = data.receiptTitle

  const updated = await prisma.storeSetting.update({
    where: { id: 'default' },
    data: updateData,
  })

  await createAuditLog(session, 'SETTING_UPDATE', 'StoreSetting', 'default', {
    changes: data,
  })

  return updated
}
