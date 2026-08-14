import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { updateUserSchema } from '@/lib/validation'
import { getUserById, updateUser, deactivateUser } from '@/lib/services/user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_USER')
    const { id } = await params
    const user = await getUserById(id)
    if (!user) {
      return successResponse(null, 404)
    }
    return successResponse(user)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_USER')
    const { id } = await params
    const body = await parseJson(request)
    const data = updateUserSchema.parse(body)

    const user = await updateUser(id, data, session)
    return successResponse(user)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuthPermission('MANAGE_USER')
    const { id } = await params
    const user = await deactivateUser(id, session)
    return successResponse(user)
  } catch (error) {
    return handleError(error)
  }
}
