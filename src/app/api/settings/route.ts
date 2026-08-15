import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { z } from 'zod'
import { getStoreSetting, updateStoreSetting, type StoreSettingUpdateInput } from '@/lib/services/store-setting'
import { generatePromptPayPayload, validatePromptPayId } from '@/lib/promptpay'

const nullableString = z.union([z.string(), z.literal(''), z.null()]).optional()
const nullableBoolean = z.union([z.boolean(), z.literal(''), z.null()]).optional()

const settingUpdateSchema = z.object({
  // Store identity fields are intentionally omitted — they are set once during /install
  // storeName, storeAddress, storePhone, storeTaxId
  logoUrl: nullableString,
  currency: z.union([z.string(), z.literal(''), z.null()]).optional(),
  currencySymbol: z.union([z.string(), z.literal(''), z.null()]).optional(),
  invoicePrefix: z.union([z.string().min(1), z.literal(''), z.null()]).optional(),
  invoiceNextNumber: z.union([z.coerce.number().int().min(1), z.literal(''), z.null()]).optional(),
  purchaseOrderPrefix: z.union([z.string().min(1), z.literal(''), z.null()]).optional(),
  purchaseOrderNextNumber: z.union([z.coerce.number().int().min(1), z.literal(''), z.null()]).optional(),
  allowCreditSale: nullableBoolean,
  allowNegativeStock: nullableBoolean,
  sessionRequired: nullableBoolean,
  receiptWidth: z.union([z.enum(['58mm', '80mm']), z.literal(''), z.null()]).optional(),
  showLogo: nullableBoolean,
  showQr: nullableBoolean,
  showCashier: nullableBoolean,
  showTaxId: nullableBoolean,
  receiptFooter: nullableString,
  qrPaymentPhone: nullableString,
  qrPaymentPayload: nullableString,
  enableCashPayment: nullableBoolean,
  enableTransferPayment: nullableBoolean,
  enableQrPayment: nullableBoolean,
  transferAsCashIn: nullableBoolean,
  qrAsCashIn: nullableBoolean,
  bankName: nullableString,
  bankAccountName: nullableString,
  bankAccountNumber: nullableString,
  invoiceTitle: z.string().min(1).optional(),
  receiptTitle: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuthPermission('SYSTEM_SETTING')
    const setting = await getStoreSetting()
    return successResponse(setting)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuthPermission('SYSTEM_SETTING')
    const body = await parseJson(request)
    const parsed = settingUpdateSchema.parse(body)

    // Strip null/empty values so we only update fields that were actually sent/changed
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) continue
      if (value === '') {
        data[key] = null
      } else {
        data[key] = value
      }
    }

    if (data.qrPaymentPhone !== undefined) {
      const phone = String(data.qrPaymentPhone || '').trim()
      if (!phone) {
        data.qrPaymentPayload = null
      } else {
        const validation = validatePromptPayId(phone)
        if (!validation.valid) {
          return successResponse({ error: validation.message }, 400)
        }
        data.qrPaymentPayload = generatePromptPayPayload(validation.clean!)
      }
    }

    const setting = await updateStoreSetting(data as StoreSettingUpdateInput, session)
    return successResponse(setting)
  } catch (error) {
    return handleError(error)
  }
}
