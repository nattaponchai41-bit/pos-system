import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { listCashSessions } from '@/lib/services/cash-session'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_SESSION') && !hasPermission(session, 'VIEW_REPORT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_SESSION หรือ VIEW_REPORT จึงจะดำเนินการได้')
    }

    const sessions = await listCashSessions()
    return successResponse(sessions)
  } catch (error) {
    return handleError(error)
  }
}
