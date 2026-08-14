import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { getInvoiceById } from '@/lib/services/sale'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'
import { generatePromptPayPayload } from '@/lib/promptpay'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_CUSTOMER') && !hasPermission(session, 'SALE_CREATE') && !hasPermission(session, 'RECEIVE_DEBT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_CUSTOMER, SALE_CREATE หรือ RECEIVE_DEBT จึงจะดำเนินการได้')
    }

    const { id } = await params
    const invoice = await getInvoiceById(id)
    if (!invoice) {
      return errorResponse('ไม่พบบิล', 404)
    }

    const store = await prisma.storeSetting.findUnique({ where: { id: 'default' } })

    let qrDataUrl: string | null = null
    if (store?.showQr) {
      let payload: string | null = store.qrPaymentPayload || null
      // Regenerate from saved phone/id if payload is missing
      if (!payload && store.qrPaymentPhone) {
        try {
          payload = generatePromptPayPayload(store.qrPaymentPhone)
        } catch {
          payload = null
        }
      }
      if (payload) {
        try {
          qrDataUrl = await QRCode.toDataURL(payload, {
            width: store.receiptWidth === '58mm' ? 120 : 160,
            margin: 1,
            errorCorrectionLevel: 'M',
          })
        } catch {
          qrDataUrl = null
        }
      }
    }

    return successResponse({ invoice, store, qrDataUrl })
  } catch (error) {
    return handleError(error)
  }
}
