import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuthPermission } from '@/lib/api'
import { getStockMovements } from '@/lib/services/stock'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthPermission('PRODUCT_VIEW')
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const take = Number(searchParams.get('take') ?? '50')
    const skip = Number(searchParams.get('skip') ?? '0')

    const movements = await getStockMovements(id, take, skip)
    return successResponse(movements)
  } catch (error) {
    return handleError(error)
  }
}
