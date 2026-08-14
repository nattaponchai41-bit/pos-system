import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'MANAGE_CUSTOMER') && !hasPermission(session, 'RECEIVE_DEBT') && !hasPermission(session, 'VIEW_REPORT')) {
      throw new PermissionError('ต้องมีสิทธิ์ MANAGE_CUSTOMER, RECEIVE_DEBT หรือ VIEW_REPORT')
    }

    const customers = await prisma.customer.findMany({
      where: { isActive: true, outstandingDebt: { gt: 0 } },
      orderBy: { outstandingDebt: 'desc' },
      take: 50,
      include: {
        saleInvoices: {
          where: { type: 'CREDIT', status: { not: 'CANCELLED' } },
          select: { id: true, invoiceNumber: true, total: true, paidAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    const total = customers.reduce((sum, c) => sum + Number(c.outstandingDebt), 0)

    return successResponse({ total, customers })
  } catch (error) {
    return handleError(error)
  }
}
