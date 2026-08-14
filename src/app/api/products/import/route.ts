import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { importProducts, type ImportProductRow } from '@/lib/services/product'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_PRODUCT')
    const body = await parseJson(request) as { products?: unknown[] }
    const rows = (Array.isArray(body?.products) ? body.products : []) as ImportProductRow[]
    if (rows.length === 0) {
      return successResponse({ results: [], imported: 0, failed: 0 })
    }

    const results = await importProducts(rows, session)
    const imported = results.filter((r) => r.success).length
    const failed = results.length - imported

    return successResponse({ results, imported, failed })
  } catch (error) {
    return handleError(error)
  }
}
