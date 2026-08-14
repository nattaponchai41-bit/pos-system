import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'ROLE_UPDATE'
  | 'CATEGORY_CREATE'
  | 'CATEGORY_UPDATE'
  | 'CATEGORY_DELETE'
  | 'UNIT_CREATE'
  | 'UNIT_UPDATE'
  | 'UNIT_DELETE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE'
  | 'PURCHASE_CREATE'
  | 'SALE_CREATE'
  | 'SALE_CANCEL'
  | 'SALE_REFUND'
  | 'DEBT_PAYMENT'
  | 'STOCK_ADJUST'
  | 'SESSION_OPEN'
  | 'SESSION_CLOSE'
  | 'CASH_MOVEMENT'
  | 'SETTING_UPDATE'
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_UPDATE'

export async function createAuditLog(
  session: Session | null,
  action: AuditAction,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
  request?: NextRequest
) {
  return prisma.auditLog.create({
    data: {
      userId: session?.user?.id ?? null,
      action,
      entityType,
      entityId,
      details: details as Prisma.InputJsonValue,
      ipAddress: request
        ? (request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null)
        : null,
      userAgent: request?.headers.get('user-agent') ?? null,
    },
  })
}
