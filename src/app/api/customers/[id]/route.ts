import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { customerUpdateSchema } from '@/lib/validation'
import { getCustomerById, updateCustomer, deactivateCustomer } from '@/lib/services/customer'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthPermission('MANAGE_CUSTOMER')
    const { id } = await params
    const customer = await getCustomerById(id)
    if (!customer) {
      return successResponse(null, 404)
    }
    return successResponse(customer)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_CUSTOMER')
    const { id } = await params
    const body = await parseJson(request)
    const data = customerUpdateSchema.parse(body)

    const customer = await updateCustomer(id, data, session)

    return successResponse(customer)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_CUSTOMER')
    const { id } = await params

    const customer = await deactivateCustomer(id)

    return successResponse(customer)
  } catch (error) {
    return handleError(error)
  }
}
