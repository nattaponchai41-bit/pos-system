import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { unitSchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined

    const units = await prisma.unit.findMany({ where: { isActive }, orderBy: { name: 'asc' } })
    return successResponse(units)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const body = await parseJson(request)
    const data = unitSchema.parse(body)

    const unit = await prisma.unit.create({ data })
    await createAuditLog(session, 'UNIT_CREATE', 'Unit', unit.id, { name: unit.name }, request)

    return successResponse(unit, 201)
  } catch (error) {
    return handleError(error)
  }
}
