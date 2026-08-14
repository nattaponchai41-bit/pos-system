import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api'
import Decimal from 'decimal.js'
import type { CashSessionOpenInput, CashSessionCloseInput, CashMovementInput } from '@/lib/validation'
import type { Session } from 'next-auth'
import type { Prisma } from '@/generated/prisma/client'
import { createAuditLog } from '@/lib/services/audit'

export async function listCashSessions() {
  return prisma.cashSession.findMany({
    orderBy: { openedAt: 'desc' },
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    },
  })
}

export async function getOpenSession() {
  return prisma.cashSession.findFirst({
    where: { status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    include: {
      openedBy: { select: { id: true, name: true } },
    },
  })
}

export async function requireOpenSession() {
  const openSession = await getOpenSession()
  if (!openSession) {
    throw new Error('ไม่พบเซสชั่นเงินสดที่เปิดอยู่')
  }
  return openSession
}

export async function openCashSession(data: CashSessionOpenInput, session: Session) {
  const existing = await getOpenSession()
  if (existing) {
    throw new Error('มีเซสชั่นเงินสดเปิดอยู่แล้ว')
  }

  const created = await prisma.cashSession.create({
    data: {
      openedById: session.user.id,
      openingCash: new Decimal(data.openingCash).toString(),
      expectedCash: new Decimal(data.openingCash).toString(),
      status: 'OPEN',
    },
  })

  await createAuditLog(session, 'SESSION_OPEN', 'CashSession', created.id, {
    openingCash: data.openingCash.toString(),
  })

  return created
}

export async function closeCashSession(id: string, data: CashSessionCloseInput, session: Session) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cashSession.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('ไม่พบเซสชั่น')
    }
    if (existing.status !== 'OPEN') {
      throw new Error('เซสชั่นนี้ถูกปิดแล้ว')
    }

    const actualCash = new Decimal(data.actualCash)
    const expectedCash = new Decimal(existing.expectedCash)
    const difference = actualCash.minus(expectedCash)

    const closed = await tx.cashSession.update({
      where: { id },
      data: {
        closedById: session.user.id,
        closedAt: new Date(),
        actualCash: actualCash.toString(),
        difference: difference.toString(),
        status: 'CLOSED',
      },
    })

    await createAuditLog(session, 'SESSION_CLOSE', 'CashSession', id, {
      expectedCash: existing.expectedCash.toString(),
      actualCash: actualCash.toString(),
      difference: difference.toString(),
    })

    return closed
  })
}

const OUTFLOW_TYPES = new Set<CashMovementType>(['CASH_OUT', 'EXPENSE', 'REFUND'])
type CashMovementType = 'EXPENSE' | 'CASH_IN' | 'CASH_OUT' | 'REFUND' | 'DEBT_PAYMENT'

export async function addCashMovement(
  tx: Prisma.TransactionClient,
  sessionId: string,
  type: CashMovementType,
  amount: Decimal,
  reason: string,
  createdById?: string
) {
  const signedAmount = OUTFLOW_TYPES.has(type) ? amount.negated() : amount

  await tx.cashMovement.create({
    data: {
      sessionId,
      type,
      amount: signedAmount.toString(),
      reason,
      createdById: createdById ?? null,
    },
  })

  await tx.cashSession.update({
    where: { id: sessionId },
    data: {
      expectedCash: { increment: signedAmount.toString() },
    },
  })
}

export async function recordCashMovement(sessionId: string, data: CashMovementInput, session: Session) {
  return prisma.$transaction(async (tx) => {
    const cashSession = await tx.cashSession.findUnique({ where: { id: sessionId } })
    if (!cashSession) throw new Error('ไม่พบเซสชั่น')
    if (cashSession.status !== 'OPEN') throw new Error('เซสชั่นถูกปิดแล้ว')

    const amount = new Decimal(data.amount)
    if (amount.lessThanOrEqualTo(0)) throw new ApiError('จำนวนเงินต้องมากกว่า 0', 400)

    await addCashMovement(tx, sessionId, data.type, amount, data.reason ?? '', session.user.id)

    await createAuditLog(session, 'CASH_MOVEMENT', 'CashSession', sessionId, {
      type: data.type,
      amount: amount.toString(),
      reason: data.reason,
    })

    return tx.cashMovement.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } }, session: true },
    })
  })
}

export async function getSessionReport(sessionId: string) {
  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    },
  })
  if (!cashSession) throw new Error('ไม่พบเซสชั่น')

  const movementDetails = await prisma.cashMovement.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  const movements = await prisma.cashMovement.groupBy({
    by: ['type'],
    where: { sessionId },
    _sum: { amount: true },
    _count: { amount: true },
  })

  const cashSales = await prisma.saleInvoice.aggregate({
    where: { sessionId, type: 'CASH', status: { not: 'CANCELLED' } },
    _count: { id: true },
    _sum: { total: true, totalCost: true },
  })

  const transferSales = await prisma.saleInvoice.aggregate({
    where: { sessionId, type: 'TRANSFER', status: { not: 'CANCELLED' } },
    _count: { id: true },
    _sum: { total: true, totalCost: true },
  })

  const qrSales = await prisma.saleInvoice.aggregate({
    where: { sessionId, type: 'QR', status: { not: 'CANCELLED' } },
    _count: { id: true },
    _sum: { total: true, totalCost: true },
  })

  const creditSales = await prisma.saleInvoice.aggregate({
    where: { sessionId, type: 'CREDIT', status: { not: 'CANCELLED' } },
    _count: { id: true },
    _sum: { total: true, totalCost: true },
  })

  const debtPaymentsAgg = await prisma.debtPayment.aggregate({
    where: { sessionId },
    _count: { id: true },
    _sum: { amount: true },
  })

  const debtPaymentDetails = await prisma.debtPayment.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    include: {
      saleInvoice: { select: { invoiceNumber: true } },
      customer: { select: { name: true } },
    },
  })

  const itemizedSales = await prisma.saleItem.findMany({
    where: {
      saleInvoice: {
        sessionId,
        status: { not: 'CANCELLED' },
      },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      product: { select: { id: true, code: true, name: true } },
      productUnit: { include: { unit: { select: { name: true } } } },
      saleInvoice: { select: { invoiceNumber: true, type: true, createdAt: true } },
    },
  })

  const salesByProduct = new Map<
    string,
    {
      productId: string
      productCode: string
      productName: string
      unitName: string
      quantity: number
      total: number
      cost: number
      profit: number
    }
  >()
  for (const item of itemizedSales) {
    const key = `${item.productId}-${item.productUnitId}`
    const existing = salesByProduct.get(key)
    const qty = Number(item.quantity)
    const total = Number(item.total)
    const cost = Number(item.costPrice ?? 0) * Number(item.baseQuantity)
    const profit = total - cost
    if (existing) {
      existing.quantity += qty
      existing.total += total
      existing.cost += cost
      existing.profit += profit
    } else {
      salesByProduct.set(key, {
        productId: item.productId,
        productCode: item.product.code,
        productName: item.product.name,
        unitName: item.productUnit.unit.name,
        quantity: qty,
        total,
        cost,
        profit,
      })
    }
  }

  const invoiceList = await prisma.saleInvoice.findMany({
    where: { sessionId, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, code: true, name: true } },
          productUnit: { include: { unit: { select: { name: true } } } },
        },
      },
      payments: true,
      debtPayments: true,
    },
  })

  const totals = Object.fromEntries(
    movements.map((m) => [m.type, { sum: Number(m._sum.amount ?? 0), count: m._count.amount }])
  )

  const recomputedExpected = Number(cashSession.openingCash) + movementDetails.reduce((sum, m) => sum + Number(m.amount), 0)

  function salesSummary(agg: typeof cashSales) {
    const total = Number(agg._sum.total ?? 0)
    const cost = Number(agg._sum.totalCost ?? 0)
    return {
      count: agg._count.id,
      total,
      cost,
      profit: total - cost,
      marginPercent: total > 0 ? ((total - cost) / total) * 100 : 0,
    }
  }

  return {
    session: cashSession,
    movements: totals,
    recomputedExpected,
    movementDetails: movementDetails.map((m) => ({
      id: m.id,
      type: m.type,
      amount: Number(m.amount),
      reason: m.reason,
      createdAt: m.createdAt.toISOString(),
      createdBy: m.createdBy?.name ?? '-',
    })),
    cashSales: salesSummary(cashSales),
    transferSales: salesSummary(transferSales),
    qrSales: salesSummary(qrSales),
    creditSales: salesSummary(creditSales),
    debtPayments: {
      count: debtPaymentsAgg._count.id,
      total: Number(debtPaymentsAgg._sum.amount ?? 0),
      items: debtPaymentDetails.map((dp) => ({
        invoiceNumber: dp.saleInvoice.invoiceNumber,
        customerName: dp.customer.name,
        amount: Number(dp.amount),
        method: dp.method,
        reference: dp.reference,
        createdAt: dp.createdAt.toISOString(),
      })),
    },
    itemizedSales: Array.from(salesByProduct.values()).sort((a, b) => b.total - a.total),
    invoiceList,
  }
}
