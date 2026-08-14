import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import type { Session } from 'next-auth'
export { hasPermission, requirePermission, PermissionError } from '@/lib/permissions'
import { hasPermission, requirePermission, PermissionError, type PermissionCode } from '@/lib/permissions'

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400, errors?: unknown) {
  return Response.json({ success: false, message, errors }, { status })
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.isActive) {
    throw new ApiError('Unauthorized', 401)
  }
  return session
}

export async function requireAuthPermission(code: PermissionCode): Promise<Session> {
  const session = await requireAuth()
  requirePermission(session, code)
  return session
}

export function checkPermission(session: Session | null, code: PermissionCode): boolean {
  return hasPermission(session, code)
}

export async function parseJson<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiError('Invalid JSON body', 400)
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.status)
  }
  if (error instanceof PermissionError) {
    return errorResponse(error.message, 403)
  }
  if (error instanceof Error) {
    console.error(error)
    return errorResponse(error.message, 500)
  }
  console.error(error)
  return errorResponse('Unknown error', 500)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return undefined
}
