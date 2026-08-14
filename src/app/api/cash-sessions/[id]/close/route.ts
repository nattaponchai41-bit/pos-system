import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { cashSessionCloseSchema } from '@/lib/validation'
import { closeCashSession } from '@/lib/services/cash-session'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_SESSION')
    const { id } = await params
    const body = await parseJson(request)
    const data = cashSessionCloseSchema.parse(body)

    const cashSession = await closeCashSession(id, data, session)
    return successResponse(cashSession)
  } catch (error) {
    return handleError(error)
  }
}
