import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { getInvoiceById } from '@/lib/services/sale'

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
    return successResponse(invoice)
  } catch (error) {
    return handleError(error)
  }
}
