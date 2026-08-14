import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { productUpdateSchema } from '@/lib/validation'
import { getProductById, updateProduct, deactivateProduct } from '@/lib/services/product'
import { createAuditLog } from '@/lib/services/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthPermission('PRODUCT_VIEW')
    const { id } = await params
    const product = await getProductById(id)
    if (!product) {
      return errorResponse('ไม่พบสินค้า', 404)
    }
    return successResponse(product)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const { id } = await params
    const body = await parseJson(request)
    const data = productUpdateSchema.parse(body)

    if (data.code) {
      const existing = await prisma.product.findFirst({
        where: { code: data.code, id: { not: id } },
      })
      if (existing) {
        return errorResponse('รหัสสินค้าซ้ำ', 409)
      }
    }

    const product = await updateProduct(id, data)
    await createAuditLog(session, 'PRODUCT_UPDATE', 'Product', product!.id, { code: product!.code, name: product!.name }, request)

    return successResponse(product)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const { id } = await params

    const product = await deactivateProduct(id)
    await createAuditLog(session, 'PRODUCT_DELETE', 'Product', product.id, { code: product.code, name: product.name }, request)

    return successResponse(product)
  } catch (error) {
    return handleError(error)
  }
}
