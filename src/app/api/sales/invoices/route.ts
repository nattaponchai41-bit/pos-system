import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { getInvoices } from '@/lib/services/sale'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_CUSTOMER') && !hasPermission(session, 'SALE_CREATE') && !hasPermission(session, 'RECEIVE_DEBT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_CUSTOMER, SALE_CREATE หรือ RECEIVE_DEBT จึงจะดำเนินการได้')
    }

    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') as 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT') ?? undefined
    const status = (searchParams.get('status') as 'COMPLETED' | 'CANCELLED' | 'REFUNDED') ?? undefined
    const customerId = searchParams.get('customerId') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const take = Number(searchParams.get('take') ?? '50')
    const skip = Number(searchParams.get('skip') ?? '0')

    const invoices = await getInvoices({ type, status, customerId, search, take, skip })
    return successResponse(invoices)
  } catch (error) {
    return handleError(error)
  }
}
