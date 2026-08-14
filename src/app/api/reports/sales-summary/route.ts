import { NextRequest } from 'next/server'
import { successResponse, handleError, requireAuth, hasPermission, PermissionError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!hasPermission(session, 'SALE_CREATE') && !hasPermission(session, 'VIEW_REPORT') && !hasPermission(session, 'MANAGE_CUSTOMER')) {
      throw new PermissionError('ต้องมีสิทธิ์ SALE_CREATE, VIEW_REPORT หรือ MANAGE_CUSTOMER')
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const startOfDay = from ? new Date(from) : new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = to ? new Date(to) : new Date(startOfDay)
    endOfDay.setHours(23, 59, 59, 999)

    const invoices = await prisma.saleInvoice.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { items: true, payments: true },
    })

    let totalSales = new Decimal(0)
    let totalCost = new Decimal(0)
    let cashSales = new Decimal(0)
    let cashCost = new Decimal(0)
    let transferSales = new Decimal(0)
    let transferCost = new Decimal(0)
    let qrSales = new Decimal(0)
    let qrCost = new Decimal(0)
    let creditSales = new Decimal(0)
    let creditCost = new Decimal(0)
    let invoiceCount = 0
    let itemCount = 0

    for (const inv of invoices) {
      invoiceCount++
      const total = new Decimal(inv.total)
      const cost = new Decimal(inv.totalCost ?? 0)
      totalSales = totalSales.plus(total)
      totalCost = totalCost.plus(cost)
      if (inv.type === 'CASH') {
        cashSales = cashSales.plus(total)
        cashCost = cashCost.plus(cost)
      }
      if (inv.type === 'TRANSFER') {
        transferSales = transferSales.plus(total)
        transferCost = transferCost.plus(cost)
      }
      if (inv.type === 'QR') {
        qrSales = qrSales.plus(total)
        qrCost = qrCost.plus(cost)
      }
      if (inv.type === 'CREDIT') {
        creditSales = creditSales.plus(total)
        creditCost = creditCost.plus(cost)
      }
      itemCount += inv.items.reduce((sum, item) => sum + Number(item.quantity), 0)
    }

    const profit = totalSales.minus(totalCost)
    const marginPercent = totalSales.greaterThan(0) ? profit.dividedBy(totalSales).times(100).toNumber() : 0

    return successResponse({
      from: startOfDay.toISOString(),
      to: endOfDay.toISOString(),
      totalSales: totalSales.toNumber(),
      totalCost: totalCost.toNumber(),
      profit: profit.toNumber(),
      marginPercent,
      cashSales: cashSales.toNumber(),
      cashCost: cashCost.toNumber(),
      cashProfit: cashSales.minus(cashCost).toNumber(),
      transferSales: transferSales.toNumber(),
      transferCost: transferCost.toNumber(),
      transferProfit: transferSales.minus(transferCost).toNumber(),
      qrSales: qrSales.toNumber(),
      qrCost: qrCost.toNumber(),
      qrProfit: qrSales.minus(qrCost).toNumber(),
      creditSales: creditSales.toNumber(),
      creditCost: creditCost.toNumber(),
      creditProfit: creditSales.minus(creditCost).toNumber(),
      invoiceCount,
      itemCount,
    })
  } catch (error) {
    return handleError(error)
  }
}
