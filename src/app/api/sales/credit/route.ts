import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { creditSaleSchema } from '@/lib/validation'
import { createCreditSale } from '@/lib/services/sale'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('SALE_CREATE')
    const body = await parseJson(request)
    const data = creditSaleSchema.parse(body)

    const invoice = await createCreditSale(data, session)
    return successResponse(invoice, 201)
  } catch (error) {
    return handleError(error)
  }
}
