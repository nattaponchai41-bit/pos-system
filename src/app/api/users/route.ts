import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuthPermission, parseJson } from '@/lib/api'
import { createUserSchema } from '@/lib/validation'
import { listUsers, createUser } from '@/lib/services/user'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_USER')
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? undefined
    const take = Number(searchParams.get('take') ?? '50')
    const skip = Number(searchParams.get('skip') ?? '0')

    const users = await listUsers({ search, take, skip })
    return successResponse(users)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthPermission('MANAGE_USER')
    const body = await parseJson(request)
    const data = createUserSchema.parse(body)

    const user = await createUser(data, session)
    return successResponse(user, 201)
  } catch (error) {
    return handleError(error)
  }
}
