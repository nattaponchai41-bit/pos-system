import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_PRODUCT') && !hasPermission(session, 'VIEW_REPORT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_PRODUCT หรือ VIEW_REPORT')
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: prisma.product.fields.minStock },
      },
      include: { baseUnit: true, category: true },
      orderBy: { stock: 'asc' },
      take: 50,
    })

    return successResponse(products)
  } catch (error) {
    return handleError(error)
  }
}
