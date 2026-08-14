import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import type { DebtPaymentInput } from '@/lib/validation'
import type { Session } from 'next-auth'
import { addCashMovement } from '@/lib/services/cash-session'
import { createAuditLog } from '@/lib/services/audit'

export async function recordDebtPayment(data: DebtPaymentInput, session: Session) {
  return prisma.$transaction(async (tx) => {
    const openSession = await tx.cashSession.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    })
    if (!openSession) throw new Error('ไม่พบเซสชั่นเงินสดที่เปิดอยู่')

    const invoice = await tx.saleInvoice.findUnique({
      where: { id: data.saleInvoiceId },
      include: { customer: true },
    })
    if (!invoice) {
      throw new Error('ไม่พบบิล')
    }
    if (invoice.type !== 'CREDIT') {
      throw new Error('บิลนี้ไม่ใช่บิลเครดิต')
    }
    if (invoice.status === 'CANCELLED') {
      throw new Error('บิลนี้ถูกยกเลิกแล้ว')
    }
    if (invoice.customerId !== data.customerId) {
      throw new Error('บิลไม่ตรงกับลูกค้า')
    }

    const total = new Decimal(invoice.total)
    const paidAmount = new Decimal(invoice.paidAmount)
    const remaining = total.minus(paidAmount)
    const amount = new Decimal(data.amount)

    if (amount.lessThanOrEqualTo(0)) {
      throw new Error('จำนวนเงินต้องมากกว่า 0')
    }
    if (amount.greaterThan(remaining)) {
      throw new Error('จำนวนเงินเกินยอดคงเหลือ')
    }

    const remainingAfter = remaining.minus(amount)

    const debtPayment = await tx.debtPayment.create({
      data: {
        saleInvoiceId: data.saleInvoiceId,
        customerId: data.customerId,
        sessionId: openSession?.id,
        amount: amount.toString(),
        remainingAfter: remainingAfter.toString(),
        method: data.method,
        reference: data.reference ?? null,
        note: data.note ?? null,
        createdById: session.user.id,
      },
    })

    await tx.saleInvoice.update({
      where: { id: data.saleInvoiceId },
      data: { paidAmount: paidAmount.plus(amount).toString() },
    })

    await tx.customer.update({
      where: { id: data.customerId },
      data: {
        outstandingDebt: { decrement: amount.toString() },
        totalPaid: { increment: amount.toString() },
      },
    })

    if (openSession) {
      await addCashMovement(
        tx,
        openSession.id,
        'DEBT_PAYMENT',
        amount,
        `รับชำระหนี้บิล ${invoice.invoiceNumber}`,
        session.user.id
      )
    }

    await createAuditLog(session, 'DEBT_PAYMENT', 'DebtPayment', debtPayment.id, {
      invoiceId: data.saleInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: data.customerId,
      amount: amount.toString(),
      method: data.method,
    })

    return tx.debtPayment.findUnique({
      where: { id: debtPayment.id },
      include: {
        saleInvoice: true,
        customer: { select: { id: true, name: true, outstandingDebt: true } },
        session: { select: { id: true, status: true } },
      },
    })
  })
}
