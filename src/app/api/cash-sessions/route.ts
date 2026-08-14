import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { cashSessionOpenSchema } from '@/lib/validation'
import { openCashSession, getOpenSession } from '@/lib/services/cash-session'

export async function GET() {
  try {
    await requireAuthPermission('MANAGE_SESSION')
    const session = await getOpenSession()
    return successResponse(session)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_SESSION')
    const body = await parseJson(request)
    const data = cashSessionOpenSchema.parse(body)

    const cashSession = await openCashSession(data, session)
    return successResponse(cashSession, 201)
  } catch (error) {
    return handleError(error)
  }
}
