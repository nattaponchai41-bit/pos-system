import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api'
import Decimal from 'decimal.js'
import type { CreditSaleInput, CashSaleInput } from '@/lib/validation'
import type { Session } from 'next-auth'
import { toBaseQuantity } from '@/lib/services/unit'
import { addCashMovement, getOpenSession } from '@/lib/services/cash-session'
import { Prisma } from '@/generated/prisma/client'
import { createAuditLog } from '@/lib/services/audit'

export async function createCreditSale(data: CreditSaleInput, session: Session) {
  return prisma.$transaction(async (tx) => {
    const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })
    if (!setting?.allowCreditSale) {
      throw new Error('ระบบไม่อนุญาตให้ขายเครดิต')
    }

    const customer = await tx.customer.findUnique({ where: { id: data.customerId } })
    if (!customer) {
      throw new Error('ไม่พบลูกค้า')
    }
    if (!customer.isActive) {
      throw new Error('ลูกค้าถูกปิดใช้งาน')
    }

    let subtotal = new Decimal(0)
    let totalCost = new Decimal(0)
    const saleItems: {
      productId: string
      productUnitId: string
      quantity: Decimal
      baseQuantity: Decimal
      unitPrice: Decimal
      costPrice?: Decimal
      discount: Decimal
      total: Decimal
    }[] = []

    for (const item of data.items) {
      const productUnit = await tx.productUnit.findUnique({
        where: { id: item.productUnitId },
        include: { product: true, unit: true },
      })
      if (!productUnit) {
        throw new Error('ไม่พบหน่วยสินค้า')
      }
      if (productUnit.productId !== item.productId) {
        throw new Error('หน่วยสินค้าไม่ตรงกับสินค้า')
      }
      if (!productUnit.product.isActive) {
        throw new Error(`สินค้า ${productUnit.product.name} ถูกปิดใช้งาน`)
      }

      const quantity = new Decimal(item.quantity)
      const unitPrice = new Decimal(item.unitPrice)
      const discount = new Decimal(item.discount ?? 0)
      const total = quantity.mul(unitPrice).minus(discount)
      if (total.lessThan(0)) {
        throw new Error('ยอดรายการติดลบ')
      }

      const baseQuantity = toBaseQuantity(quantity, productUnit.conversionFactor)
      const averageCost = productUnit.product.averageCost ? new Decimal(productUnit.product.averageCost) : undefined
      const fallbackCost = productUnit.costPrice ? new Decimal(productUnit.costPrice) : undefined
      const costPrice = averageCost ?? fallbackCost

      saleItems.push({
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity,
        baseQuantity,
        unitPrice,
        costPrice,
        discount,
        total,
      })

      subtotal = subtotal.plus(total)
      if (costPrice) {
        totalCost = totalCost.plus(baseQuantity.mul(costPrice))
      }
    }

    const discount = new Decimal(data.discount ?? 0)
    const tax = new Decimal(data.tax ?? 0)
    const total = subtotal.minus(discount).plus(tax)
    if (total.lessThan(0)) {
      throw new Error('ยอดรวมติดลบ')
    }

    const creditLimit = new Decimal(customer.creditLimit)
    const outstandingDebt = new Decimal(customer.outstandingDebt)
    if (creditLimit.greaterThan(0) && outstandingDebt.plus(total).greaterThan(creditLimit)) {
      throw new ApiError('เกินวงเงินเครดิตที่กำหนด', 400)
    }

    const invoiceNumber = await generateInvoiceNumber(tx)
    const dueDate = customer.creditDays > 0 ? new Date(Date.now() + customer.creditDays * 24 * 60 * 60 * 1000) : null

    const invoice = await tx.saleInvoice.create({
      data: {
        invoiceNumber,
        type: 'CREDIT',
        customerId: data.customerId,
        subtotal: subtotal.toString(),
        discount: discount.toString(),
        tax: tax.toString(),
        total: total.toString(),
        totalCost: totalCost.toString(),
        paidAmount: '0',
        dueDate,
        note: data.note ?? null,
        createdById: session.user.id,
      },
    })

    for (const item of saleItems) {
      await tx.saleItem.create({
        data: {
          saleInvoiceId: invoice.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity.toString(),
          baseQuantity: item.baseQuantity.toString(),
          unitPrice: item.unitPrice.toString(),
          costPrice: item.costPrice?.toString() ?? null,
          discount: item.discount.toString(),
          total: item.total.toString(),
        },
      })

      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new Error('ไม่พบสินค้า')
      const beforeStock = new Decimal(product.stock)
      const afterStock = beforeStock.minus(item.baseQuantity)

      if (!setting.allowNegativeStock && afterStock.lessThan(0)) {
        throw new Error(`Stock ไม่เพียงพอสำหรับ ${product.name}`)
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: afterStock.toString() },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          productUnitId: item.productUnitId,
          type: 'CREDIT_SALE',
          quantity: item.quantity.negated().toString(),
          baseQuantity: item.baseQuantity.negated().toString(),
          beforeStock: beforeStock.toString(),
          afterStock: afterStock.toString(),
          referenceType: 'SALE',
          referenceId: invoice.id,
          note: `ขายเครดิต ${invoice.invoiceNumber}`,
          createdById: session.user.id,
        },
      })
    }

    await tx.customer.update({
      where: { id: data.customerId },
      data: {
        outstandingDebt: { increment: total.toString() },
        totalPurchased: { increment: total.toString() },
      },
    })

    await createAuditLog(session, 'SALE_CREATE', 'SaleInvoice', invoice.id, {
      invoiceNumber,
      type: 'CREDIT',
      total: total.toString(),
      customerId: data.customerId,
    })

    return tx.saleInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: { include: { product: true, productUnit: { include: { unit: true } } } },
        customer: true,
        debtPayments: true,
      },
    })
  })
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })
  if (!setting) throw new Error('ไม่พบการตั้งค่าร้านค้า')

  const nextNumber = setting.invoiceNextNumber
  const prefix = setting.invoicePrefix
  const invoiceNumber = `${prefix}-${nextNumber.toString().padStart(6, '0')}`

  await tx.storeSetting.update({
    where: { id: 'default' },
    data: { invoiceNextNumber: { increment: 1 } },
  })

  return invoiceNumber
}

export async function createCashSale(data: CashSaleInput, session: Session) {
  return prisma.$transaction(async (tx) => {
    const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })

    const openSession = await tx.cashSession.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    })

    if (setting?.sessionRequired && !openSession) {
      throw new ApiError('ไม่พบเซสชั่นเงินสดที่เปิดอยู่', 400)
    }

    let subtotal = new Decimal(0)
    let totalCost = new Decimal(0)
    const saleItems: {
      productId: string
      productUnitId: string
      quantity: Decimal
      baseQuantity: Decimal
      unitPrice: Decimal
      costPrice?: Decimal
      discount: Decimal
      total: Decimal
    }[] = []

    for (const item of data.items) {
      const productUnit = await tx.productUnit.findUnique({
        where: { id: item.productUnitId },
        include: { product: true, unit: true },
      })
      if (!productUnit) {
        throw new Error('ไม่พบหน่วยสินค้า')
      }
      if (productUnit.productId !== item.productId) {
        throw new Error('หน่วยสินค้าไม่ตรงกับสินค้า')
      }
      if (!productUnit.product.isActive) {
        throw new Error(`สินค้า ${productUnit.product.name} ถูกปิดใช้งาน`)
      }

      const quantity = new Decimal(item.quantity)
      const unitPrice = new Decimal(item.unitPrice)
      const discount = new Decimal(item.discount ?? 0)
      const total = quantity.mul(unitPrice).minus(discount)
      if (total.lessThan(0)) {
        throw new Error('ยอดรายการติดลบ')
      }

      const baseQuantity = toBaseQuantity(quantity, productUnit.conversionFactor)
      const averageCost = productUnit.product.averageCost ? new Decimal(productUnit.product.averageCost) : undefined
      const fallbackCost = productUnit.costPrice ? new Decimal(productUnit.costPrice) : undefined
      const costPrice = averageCost ?? fallbackCost

      saleItems.push({
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity,
        baseQuantity,
        unitPrice,
        costPrice,
        discount,
        total,
      })

      subtotal = subtotal.plus(total)
      if (costPrice) {
        totalCost = totalCost.plus(baseQuantity.mul(costPrice))
      }
    }

    const discount = new Decimal(data.discount ?? 0)
    const tax = new Decimal(data.tax ?? 0)
    const total = subtotal.minus(discount).plus(tax)
    if (total.lessThan(0)) {
      throw new Error('ยอดรวมติดลบ')
    }

    const totalPayments = data.payments.reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0))
    if (!totalPayments.equals(total)) {
      throw new ApiError('ยอดชำระไม่เท่ากับยอดรวม', 400)
    }

    for (const payment of data.payments) {
      if (payment.method === 'TRANSFER' && !setting?.enableTransferPayment) {
        throw new ApiError('วิธีการชำระเงินธนาคารถูกปิดใช้งาน', 400)
      }
      if (payment.method === 'QR' && !setting?.enableQrPayment) {
        throw new ApiError('วิธีการชำระเงินพร้อมเพย์ถูกปิดใช้งาน', 400)
      }
      if (payment.method === 'CASH' && !setting?.enableCashPayment) {
        throw new ApiError('วิธีการชำระเงินเงินสดถูกปิดใช้งาน', 400)
      }
    }

    const paymentMethods = new Set(data.payments.map((p) => p.method))
    if (paymentMethods.size > 1) {
      throw new ApiError('บิลเงินสดต้องใช้วิธีชำระเดียวกัน', 400)
    }
    const invoiceType = data.payments[0]?.method ?? 'CASH'

    const invoiceNumber = await generateInvoiceNumber(tx)

    const invoice = await tx.saleInvoice.create({
      data: {
        invoiceNumber,
        type: invoiceType,
        sessionId: openSession?.id ?? null,
        customerId: data.customerId ?? null,
        subtotal: subtotal.toString(),
        discount: discount.toString(),
        tax: tax.toString(),
        total: total.toString(),
        totalCost: totalCost.toString(),
        paidAmount: total.toString(),
        note: data.note ?? null,
        createdById: session.user.id,
      },
    })

    for (const item of saleItems) {
      await tx.saleItem.create({
        data: {
          saleInvoiceId: invoice.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity.toString(),
          baseQuantity: item.baseQuantity.toString(),
          unitPrice: item.unitPrice.toString(),
          costPrice: item.costPrice?.toString() ?? null,
          discount: item.discount.toString(),
          total: item.total.toString(),
        },
      })

      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new Error('ไม่พบสินค้า')
      const beforeStock = new Decimal(product.stock)
      const afterStock = beforeStock.minus(item.baseQuantity)

      if (!setting?.allowNegativeStock && afterStock.lessThan(0)) {
        throw new Error(`Stock ไม่เพียงพอสำหรับ ${product.name}`)
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: afterStock.toString() },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          productUnitId: item.productUnitId,
          type: 'SALE',
          quantity: item.quantity.negated().toString(),
          baseQuantity: item.baseQuantity.negated().toString(),
          beforeStock: beforeStock.toString(),
          afterStock: afterStock.toString(),
          referenceType: 'SALE',
          referenceId: invoice.id,
          note: `ขาย${invoiceType === 'CASH' ? 'เงินสด' : invoiceType === 'TRANSFER' ? 'โอนเงิน' : 'พร้อมเพย์'} ${invoice.invoiceNumber}`,
          createdById: session.user.id,
        },
      })
    }

    for (const payment of data.payments) {
      const amount = new Decimal(payment.amount)
      const received = payment.received !== undefined ? new Decimal(payment.received) : amount
      if (payment.method === 'CASH' && received.lessThan(amount)) {
        throw new ApiError('รับเงินไม่เพียงพอ', 400)
      }
      const change = received.minus(amount)

      await tx.salePayment.create({
        data: {
          saleInvoiceId: invoice.id,
          method: payment.method,
          amount: amount.toString(),
          received: payment.method === 'CASH' ? received.toString() : null,
          change: payment.method === 'CASH' ? change.toString() : null,
          reference: payment.reference ?? null,
        },
      })

      const shouldRecordCashIn =
        openSession &&
        ((payment.method === 'CASH') ||
          (payment.method === 'TRANSFER' && setting?.transferAsCashIn) ||
          (payment.method === 'QR' && setting?.qrAsCashIn))

      if (shouldRecordCashIn) {
        await addCashMovement(
          tx,
          openSession.id,
          'CASH_IN',
          amount,
          `ขาย${invoiceType === 'CASH' ? 'เงินสด' : invoiceType === 'TRANSFER' ? 'โอนเงิน' : 'พร้อมเพย์'} ${invoice.invoiceNumber}`,
          session.user.id
        )
      }
    }

    if (data.customerId) {
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          totalPurchased: { increment: total.toString() },
        },
      })
    }

    await createAuditLog(session, 'SALE_CREATE', 'SaleInvoice', invoice.id, {
      invoiceNumber,
      type: invoiceType,
      total: total.toString(),
      customerId: data.customerId ?? null,
    })

    return tx.saleInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: { include: { product: true, productUnit: { include: { unit: true } } } },
        customer: true,
        payments: true,
        session: true,
      },
    })
  })
}

export async function getInvoices(options: {
  type?: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
  status?: 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  customerId?: string
  search?: string
  take?: number
  skip?: number
} = {}) {
  const { type, status, customerId, search, take = 50, skip = 0 } = options

  return prisma.saleInvoice.findMany({
    where: {
      type,
      status,
      customerId,
      OR: search
        ? [
            { invoiceNumber: { contains: search } },
            { customer: { name: { contains: search } } },
            { customer: { code: { contains: search } } },
          ]
        : undefined,
    },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, code: true, name: true, outstandingDebt: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, code: true, name: true } },
          productUnit: { include: { unit: { select: { name: true } } } },
        },
      },
      payments: true,
      debtPayments: {
        orderBy: { createdAt: 'asc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      session: { select: { id: true, status: true } },
    },
  })
}

export async function getInvoiceById(id: string) {
  return prisma.saleInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: true,
          productUnit: { include: { unit: true } },
        },
      },
      payments: true,
      debtPayments: {
        orderBy: { createdAt: 'asc' },
        include: { createdBy: { select: { id: true, name: true } }, session: { select: { id: true, status: true } } },
      },
      session: true,
    },
  })
}

export async function getBestSellingProducts(limit = 10, from?: Date, to?: Date) {
  const startOfDay = from ? new Date(from) : null
  const endOfDay = to ? new Date(to) : null
  if (startOfDay) startOfDay.setHours(0, 0, 0, 0)
  if (endOfDay) endOfDay.setHours(23, 59, 59, 999)

  const conditions = [Prisma.sql`inv.status != 'CANCELLED'`]
  if (startOfDay) conditions.push(Prisma.sql`inv.created_at >= ${startOfDay}`)
  if (endOfDay) conditions.push(Prisma.sql`inv.created_at <= ${endOfDay}`)
  const where = Prisma.join(conditions, ' AND ')

  const rows = await prisma.$queryRaw<
    Array<{ productId: string; totalQty: string; totalAmount: string; totalCost: string }>
  >(
    Prisma.sql`
      SELECT si.product_id AS productId,
             SUM(si.base_quantity) AS totalQty,
             SUM(si.total) AS totalAmount,
             SUM(si.base_quantity * COALESCE(si.cost_price, 0)) AS totalCost
      FROM sale_items si
      JOIN sale_invoices inv ON inv.id = si.sale_invoice_id
      WHERE ${where}
      GROUP BY si.product_id
      ORDER BY totalQty DESC
      LIMIT ${limit}
    `
  )

  const productIds = rows.map((r) => r.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: {
      baseUnit: true,
      category: true,
      productUnits: { include: { unit: true } },
    },
  })

  const productMap = new Map(products.map((p) => [p.id, p]))
  return rows
    .map((r) => {
      const totalAmount = Number(r.totalAmount)
      const totalCost = Number(r.totalCost)
      return {
        product: productMap.get(r.productId),
        totalQuantity: Number(r.totalQty),
        totalAmount,
        totalCost,
        profit: totalAmount - totalCost,
        marginPercent: totalAmount > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0,
      }
    })
    .filter((r): r is { product: NonNullable<typeof r.product>; totalQuantity: number; totalAmount: number; totalCost: number; profit: number; marginPercent: number } => !!r.product)
}

export async function cancelSaleInvoice(id: string, session: Session) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.saleInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true, debtPayments: true, customer: true },
    })
    if (!invoice) {
      throw new ApiError('ไม่พบบิล', 404)
    }
    if (invoice.status === 'CANCELLED') {
      throw new ApiError('บิลนี้ถูกยกเลิกแล้ว', 400)
    }
    if (invoice.status === 'REFUNDED') {
      throw new ApiError('บิลนี้ถูกคืนเงินแล้ว', 400)
    }

    const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })

    for (const item of invoice.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product) continue
      const beforeStock = new Decimal(product.stock)
      const baseQty = new Decimal(item.baseQuantity)
      const afterStock = beforeStock.plus(baseQty)

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: afterStock.toString() },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          productUnitId: item.productUnitId,
          type: 'CANCEL_SALE',
          quantity: item.quantity.toString(),
          baseQuantity: baseQty.toString(),
          beforeStock: beforeStock.toString(),
          afterStock: afterStock.toString(),
          referenceType: 'SALE',
          referenceId: invoice.id,
          note: `ยกเลิกบิล ${invoice.invoiceNumber}`,
          createdById: session.user.id,
        },
      })
    }

    const total = new Decimal(invoice.total)
    const paidAmount = new Decimal(invoice.paidAmount)

    if (invoice.type !== 'CREDIT') {
      if (total.greaterThan(0)) {
        const refundSession = await resolveRefundSession(tx, invoice.sessionId, setting?.sessionRequired ?? true)
        if (refundSession) {
          await addCashMovement(
            tx,
            refundSession.id,
            'CASH_OUT',
            total,
            `คืนเงินยกเลิกบิล ${invoice.invoiceNumber}`,
            session.user.id
          )
        }
      }
      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { totalPurchased: { decrement: total.toString() } },
        })
      }
    } else {
      const remaining = total.minus(paidAmount)
      if (invoice.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } })
        if (customer) {
          const newDebt = new Decimal(customer.outstandingDebt).minus(remaining)
          const newTotalPaid = new Decimal(customer.totalPaid).minus(paidAmount)
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
              outstandingDebt: newDebt.toString(),
              totalPurchased: { decrement: total.toString() },
              totalPaid: newTotalPaid.toString(),
            },
          })
        }
      }
      if (paidAmount.greaterThan(0)) {
        const refundSession = await resolveRefundSession(tx, invoice.sessionId, setting?.sessionRequired ?? true)
        if (refundSession) {
          await addCashMovement(
            tx,
            refundSession.id,
            'CASH_OUT',
            paidAmount,
            `คืนเงินชำระหนี้ยกเลิกบิล ${invoice.invoiceNumber}`,
            session.user.id
          )
        }
      }
    }

    const cancelled = await tx.saleInvoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledById: session.user.id,
        cancelledAt: new Date(),
      },
      include: { items: true, customer: true, payments: true, debtPayments: true },
    })

    await createAuditLog(session, 'SALE_CANCEL', 'SaleInvoice', id, {
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      total: total.toString(),
      paidAmount: paidAmount.toString(),
    })

    return cancelled
  })
}

interface RefundItemInput {
  saleItemId: string
  quantity: number
}

export async function refundSaleInvoice(
  id: string,
  items: RefundItemInput[],
  method: 'CASH' | 'TRANSFER' | 'QR',
  reference: string | undefined,
  note: string | undefined,
  session: Session
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.saleInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true, debtPayments: true, customer: true },
    })
    if (!invoice) {
      throw new ApiError('ไม่พบบิล', 404)
    }
    if (invoice.status === 'CANCELLED') {
      throw new ApiError('บิลนี้ถูกยกเลิกแล้ว', 400)
    }

    const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })
    const itemMap = new Map(invoice.items.map((i) => [i.id, i]))

    let refundTotal = new Decimal(0)
    const refundItems: { item: typeof invoice.items[0]; quantity: Decimal; refundAmount: Decimal; alreadyReturned: Decimal }[] = []

    for (const input of items) {
      const item = itemMap.get(input.saleItemId)
      if (!item) {
        throw new ApiError('ไม่พบรายการสินค้าในบิล', 400)
      }
      const requested = new Decimal(input.quantity)
      const alreadyReturned = new Decimal(item.returnedQuantity?.toString() ?? 0)
      const original = new Decimal(item.quantity.toString())
      if (requested.lessThanOrEqualTo(0)) {
        throw new ApiError('จำนวนคืนต้องมากกว่า 0', 400)
      }
      if (alreadyReturned.plus(requested).greaterThan(original)) {
        throw new ApiError(`คืน ${item.productId} เกินจำนวนที่ขาย`, 400)
      }

      const lineTotal = new Decimal(item.total.toString())
      const lineRefund = requested.div(original).mul(lineTotal)
      refundTotal = refundTotal.plus(lineRefund)
      refundItems.push({ item, quantity: requested, refundAmount: lineRefund, alreadyReturned })
    }

    if (refundTotal.lessThanOrEqualTo(0)) {
      throw new ApiError('ยอดคืนเงินต้องมากกว่า 0', 400)
    }

    const invoiceTotal = new Decimal(invoice.total)
    const paidAmount = new Decimal(invoice.paidAmount)
    if (refundTotal.greaterThan(invoiceTotal)) {
      refundTotal = invoiceTotal
    }

    for (const { item, quantity, alreadyReturned } of refundItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new ApiError('ไม่พบสินค้า', 404)
      const beforeStock = new Decimal(product.stock)
      const baseQty = toBaseQuantity(quantity, new Decimal(item.baseQuantity.toString()).div(new Decimal(item.quantity.toString())))
      const afterStock = beforeStock.plus(baseQty)

      await tx.saleItem.update({
        where: { id: item.id },
        data: { returnedQuantity: alreadyReturned.plus(quantity).toString() },
      })

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: afterStock.toString() },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          productUnitId: item.productUnitId,
          type: 'RETURN',
          quantity: quantity.toString(),
          baseQuantity: baseQty.toString(),
          beforeStock: beforeStock.toString(),
          afterStock: afterStock.toString(),
          referenceType: 'SALE',
          referenceId: invoice.id,
          note: `คืนสินค้าบิล ${invoice.invoiceNumber}`,
          createdById: session.user.id,
        },
      })
    }

    const newRefundAmount = new Decimal(invoice.refundAmount).plus(refundTotal)
    const allReturned = invoice.items.every(
      (item) => new Decimal(item.returnedQuantity?.toString() ?? 0).plus(refundItems.find((ri) => ri.item.id === item.id)?.quantity ?? 0).equals(new Decimal(item.quantity.toString()))
    )

    if (invoice.type !== 'CREDIT') {
      if (refundTotal.greaterThan(paidAmount.minus(new Decimal(invoice.refundAmount)))) {
        throw new ApiError('ยอดคืนเงินเกินจำนวนที่ชำระ', 400)
      }
      const refundSession = await resolveRefundSession(tx, invoice.sessionId, setting?.sessionRequired ?? true)
      if (refundSession) {
        await addCashMovement(
          tx,
          refundSession.id,
          'REFUND',
          refundTotal,
          `คืนเงินบิล ${invoice.invoiceNumber}`,
          session.user.id
        )
      }
      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { totalPurchased: { decrement: refundTotal.toString() } },
        })
      }
    } else {
      const remaining = invoiceTotal.minus(paidAmount)
      if (refundTotal.greaterThan(remaining)) {
        throw new ApiError('ยอดคืนเงินเกินยอดคงเหลือของบิลเครดิต', 400)
      }
      await tx.saleInvoice.update({
        where: { id },
        data: { paidAmount: paidAmount.plus(refundTotal).toString() },
      })
      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            outstandingDebt: { decrement: refundTotal.toString() },
            totalPurchased: { decrement: refundTotal.toString() },
          },
        })
      }
    }

    const updatedInvoice = await tx.saleInvoice.update({
      where: { id },
      data: {
        refundAmount: newRefundAmount.toString(),
        status: allReturned ? 'REFUNDED' : undefined,
      },
      include: { items: true, customer: true, payments: true, debtPayments: true },
    })

    await createAuditLog(session, 'SALE_REFUND', 'SaleInvoice', id, {
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      refundTotal: refundTotal.toString(),
      method,
      items: refundItems.map((ri) => ({ productId: ri.item.productId, quantity: ri.quantity.toString(), amount: ri.refundAmount.toString() })),
    })

    return updatedInvoice
  })
}

async function resolveRefundSession(
  tx: Prisma.TransactionClient,
  originalSessionId: string | null,
  sessionRequired: boolean
) {
  if (originalSessionId) {
    const original = await tx.cashSession.findUnique({ where: { id: originalSessionId } })
    if (original && original.status === 'OPEN') {
      return original
    }
  }
  const current = await getOpenSession()
  if (current) return current
  if (sessionRequired) {
    throw new ApiError('ต้องเปิดเซสชั่นเงินสดเพื่อคืนเงิน', 400)
  }
  return null
}
