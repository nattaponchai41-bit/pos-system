import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { listRoles } from '@/lib/services/user'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_USER') && !hasPermission(session, 'VIEW_REPORT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_USER หรือ VIEW_REPORT')
    }

    const roles = await listRoles()
    return successResponse(roles)
  } catch (error) {
    return handleError(error)
  }
}
