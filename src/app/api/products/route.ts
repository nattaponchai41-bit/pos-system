import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, requireAuthPermission, requireAuth, parseJson } from '@/lib/api'
import { productSchema } from '@/lib/validation'
import { createProduct, listProducts } from '@/lib/services/product'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthPermission('PRODUCT_VIEW')
    const { searchParams } = new URL(request.url)

    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined
    const categoryId = searchParams.get('categoryId') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const take = Number(searchParams.get('take') ?? '50')
    const skip = Number(searchParams.get('skip') ?? '0')

    const products = await listProducts({ isActive, categoryId, search, take, skip })
    return successResponse(products)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const body = await parseJson(request)
    const data = productSchema.parse(body)

    const existing = await prisma.product.findUnique({ where: { code: data.code } })
    if (existing) {
      return errorResponse('รหัสสินค้าซ้ำ', 409)
    }

    const product = await createProduct(data, session)
    await createAuditLog(session, 'PRODUCT_CREATE', 'Product', product!.id, { code: product!.code, name: product!.name }, request)

    return successResponse(product, 201)
  } catch (error) {
    return handleError(error)
  }
}
