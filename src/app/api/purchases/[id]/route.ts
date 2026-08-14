import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission } from '@/lib/api'
import { getPurchaseOrderById } from '@/lib/services/purchase'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthPermission('PRODUCT_VIEW')
    const { id } = await params
    const order = await getPurchaseOrderById(id)
    return successResponse(order)
  } catch (error) {
    return handleError(error)
  }
}
