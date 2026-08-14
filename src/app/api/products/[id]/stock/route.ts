import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { stockAdjustmentSchema } from '@/lib/validation'
import { adjustStock } from '@/lib/services/stock'
import { createAuditLog } from '@/lib/services/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('ADJUST_STOCK')
    const { id } = await params
    const body = await parseJson(request)
    const data = stockAdjustmentSchema.parse(body)

    const result = await adjustStock({
      productId: id,
      type: data.type,
      quantity: data.quantity,
      productUnitId: data.productUnitId,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      note: data.note,
      session,
    })

    await createAuditLog(
      session,
      data.type === 'STOCK_COUNT' ? 'STOCK_ADJUST' : 'STOCK_ADJUST',
      'Product',
      id,
      { type: data.type, quantity: data.quantity, beforeStock: result.movement.beforeStock.toString(), afterStock: result.movement.afterStock.toString() },
      request
    )

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}


