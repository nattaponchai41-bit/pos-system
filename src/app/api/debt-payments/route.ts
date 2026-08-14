import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { debtPaymentSchema } from '@/lib/validation'
import { recordDebtPayment } from '@/lib/services/debt'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('RECEIVE_DEBT')
    const body = await parseJson(request)
    const data = debtPaymentSchema.parse(body)

    const payment = await recordDebtPayment(data, session)
    return successResponse(payment, 201)
  } catch (error) {
    return handleError(error)
  }
}
