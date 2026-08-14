import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, requireAuthPermission, parseJson, hasPermission, PermissionError } from '@/lib/api'
import { customerSchema } from '@/lib/validation'
import { createCustomer, listCustomers } from '@/lib/services/customer'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_CUSTOMER') && !hasPermission(session, 'SALE_CREATE')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_CUSTOMER หรือ SALE_CREATE จึงจะดำเนินการได้')
    }

    const { searchParams } = new URL(request.url)

    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined
    const search = searchParams.get('search') ?? undefined
    const take = Number(searchParams.get('take') ?? '50')
    const skip = Number(searchParams.get('skip') ?? '0')

    const customers = await listCustomers({ isActive, search, take, skip })
    return successResponse(customers)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_CUSTOMER')
    const body = await parseJson(request)
    const data = customerSchema.parse(body)

    const customer = await createCustomer(data, session)

    return successResponse(customer, 201)
  } catch (error) {
    return handleError(error)
  }
}
