import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuth } from '@/lib/api'
import { findProductByBarcode } from '@/lib/services/barcode'

interface RouteParams {
  params: Promise<{ barcode: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { barcode } = await params
    const result = await findProductByBarcode(decodeURIComponent(barcode))

    if (!result) {
      return errorResponse('ไม่พบสินค้า', 404)
    }

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}
