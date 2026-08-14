import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { unitSchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/services/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const { id } = await params
    const body = await parseJson(request)
    const data = unitSchema.partial().parse(body)

    const unit = await prisma.unit.update({ where: { id }, data })
    await createAuditLog(session, 'UNIT_UPDATE', 'Unit', unit.id, { name: unit.name }, request)

    return successResponse(unit)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const { id } = await params

    const unit = await prisma.unit.update({
      where: { id },
      data: { isActive: false },
    })
    await createAuditLog(session, 'UNIT_DELETE', 'Unit', unit.id, { name: unit.name }, request)

    return successResponse(unit)
  } catch (error) {
    return handleError(error)
  }
}
