import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { categorySchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined

    const categories = await prisma.category.findMany({
      where: { isActive },
      orderBy: { sortOrder: 'asc' },
    })
    return successResponse(categories)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_CATEGORY')
    const body = await parseJson(request)
    const data = categorySchema.parse(body)

    const category = await prisma.category.create({ data })
    await createAuditLog(session, 'CATEGORY_CREATE', 'Category', category.id, { name: category.name }, request)

    return successResponse(category, 201)
  } catch (error) {
    return handleError(error)
  }
}
