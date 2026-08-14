import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { purchaseOrderSchema } from '@/lib/validation'
import { createPurchaseOrder, getPurchaseOrders } from '@/lib/services/purchase'
import { createAuditLog } from '@/lib/services/audit'

export async function GET() {
  try {
    await requireAuthPermission('PRODUCT_VIEW')
    const orders = await getPurchaseOrders()
    return successResponse(orders)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const body = await parseJson(request)
    const data = purchaseOrderSchema.parse(body)

    const order = await createPurchaseOrder(data, session)
    await createAuditLog(session, 'PURCHASE_CREATE', 'PurchaseOrder', order!.id, {
      orderNumber: order!.orderNumber,
      total: order!.total,
      supplierId: data.supplierId ?? null,
    }, request)

    return successResponse(order, 201)
  } catch (error) {
    return handleError(error)
  }
}
