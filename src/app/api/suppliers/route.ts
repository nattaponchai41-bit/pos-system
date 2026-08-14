import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { supplierSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAuthPermission('PRODUCT_VIEW')
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return successResponse(suppliers)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const body = await parseJson(request)
    const data = supplierSchema.parse(body)

    const existing = await prisma.supplier.findUnique({ where: { code: data.code } })
    if (existing) {
      return successResponse({ message: 'รหัสผู้ขายซ้ำ' }, 409)
    }

    const supplier = await prisma.supplier.create({ data })
    return successResponse(supplier, 201)
  } catch (error) {
    return handleError(error)
  }
}
