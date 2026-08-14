import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { cancelSaleInvoice } from '@/lib/services/sale'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'BILL_CANCEL')) {
      throw new PermissionError('ต้องมีสิทธิ์ BILL_CANCEL จึงจะยกเลิกบิลได้')
    }

    const { id } = await params
    const invoice = await cancelSaleInvoice(id, session)
    return successResponse(invoice)
  } catch (error) {
    return handleError(error)
  }
}
