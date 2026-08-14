import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { getBestSellingProducts } from '@/lib/services/sale'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'SALE_CREATE') && !hasPermission(session, 'VIEW_REPORT')) {
      throw new PermissionError('ต้องมีสิทธิ์ SALE_CREATE หรือ VIEW_REPORT จึงจะดำเนินการได้')
    }

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') ?? '10')
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined

    const data = await getBestSellingProducts(
      limit,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    )
    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
