import { successResponse, handleError, requireAuth } from '@/lib/api'
import { getOpenSession } from '@/lib/services/cash-session'

export async function GET() {
  try {
    await requireAuth()
    const session = await getOpenSession()
    return successResponse(session)
  } catch (error) {
    return handleError(error)
  }
}
