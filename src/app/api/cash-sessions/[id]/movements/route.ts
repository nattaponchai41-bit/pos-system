import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { cashMovementSchema } from '@/lib/validation'
import { recordCashMovement } from '@/lib/services/cash-session'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_SESSION')
    const { id } = await params
    const body = await parseJson(request)
    const data = cashMovementSchema.parse(body)

    const movement = await recordCashMovement(id, data, session)
    return successResponse(movement, 201)
  } catch (error) {
    return handleError(error)
  }
}
