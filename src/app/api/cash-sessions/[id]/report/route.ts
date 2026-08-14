import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { getSessionReport } from '@/lib/services/cash-session'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_SESSION') && !hasPermission(session, 'VIEW_REPORT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_SESSION หรือ VIEW_REPORT จึงจะดำเนินการได้')
    }

    const { id } = await params
    const data = await getSessionReport(id)
    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
