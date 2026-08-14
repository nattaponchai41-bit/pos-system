import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission } from '@/lib/api'
import { getCustomerTransactions } from '@/lib/services/customer'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthPermission('MANAGE_CUSTOMER')
    const { id } = await params
    const data = await getCustomerTransactions(id)
    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
