import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { categorySchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/services/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_CATEGORY')
    const { id } = await params
    const body = await parseJson(request)
    const data = categorySchema.partial().parse(body)

    const category = await prisma.category.update({ where: { id }, data })
    await createAuditLog(session, 'CATEGORY_UPDATE', 'Category', category.id, { name: category.name }, request)

    return successResponse(category)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_CATEGORY')
    const { id } = await params

    const category = await prisma.category.update({
      where: { id },
      data: { isActive: false },
    })
    await createAuditLog(session, 'CATEGORY_DELETE', 'Category', category.id, { name: category.name }, request)

    return successResponse(category)
  } catch (error) {
    return handleError(error)
  }
}
