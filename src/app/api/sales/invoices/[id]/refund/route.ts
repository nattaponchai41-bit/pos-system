import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { refundSaleInvoice } from '@/lib/services/sale'
import { refundSchema } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'BILL_CANCEL')) {
      throw new PermissionError('ต้องมีสิทธิ์ BILL_CANCEL จึงจะคืนเงินได้')
    }

    const { id } = await params
    const body = await request.json()
    const data = refundSchema.parse(body)

    const invoice = await refundSaleInvoice(id, data.items, data.method, data.reference, data.note, session)
    return successResponse(invoice)
  } catch (error) {
    return handleError(error)
  }
}
