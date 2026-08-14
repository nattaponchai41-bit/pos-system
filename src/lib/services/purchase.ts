import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api'
import Decimal from 'decimal.js'
import type { PurchaseOrderInput } from '@/lib/validation'
import type { Session } from 'next-auth'
import { toBaseQuantity } from '@/lib/services/unit'

export async function createPurchaseOrder(data: PurchaseOrderInput, session: Session) {
  return prisma.$transaction(async (tx) => {
    const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })
    const prefix = setting?.purchaseOrderPrefix ?? 'PO'
    const nextNumber = setting?.purchaseOrderNextNumber ?? 1
    const orderNumber = `${prefix}-${nextNumber.toString().padStart(6, '0')}`

    await tx.storeSetting.update({
      where: { id: 'default' },
      data: { purchaseOrderNextNumber: { increment: 1 } },
    })

    let grandTotal = new Decimal(0)
    const items: {
      productId: string
      productUnitId: string
      quantity: Decimal
      baseQuantity: Decimal
      unitPrice: Decimal
      costPrice: Decimal
      total: Decimal
    }[] = []

    for (const item of data.items) {
      const productUnit = await tx.productUnit.findUnique({
        where: { id: item.productUnitId },
        include: { product: true },
      })
      if (!productUnit) {
        throw new ApiError('ไม่พบหน่วยสินค้า', 400)
      }
      if (productUnit.productId !== item.productId) {
        throw new ApiError('หน่วยสินค้าไม่ตรงกับสินค้า', 400)
      }

      const quantity = new Decimal(item.quantity)
      const unitPrice = new Decimal(item.unitPrice)
      const total = quantity.mul(unitPrice)
      const baseQuantity = toBaseQuantity(quantity, productUnit.conversionFactor)

      items.push({
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity,
        baseQuantity,
        unitPrice,
        costPrice: unitPrice,
        total,
      })
      grandTotal = grandTotal.plus(total)
    }

    const order = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId || null,
        createdById: session.user.id,
        total: grandTotal.toString(),
        note: data.note ?? null,
      },
    })

    for (const item of items) {
      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: order.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity.toString(),
          baseQuantity: item.baseQuantity.toString(),
          unitPrice: item.unitPrice.toString(),
          costPrice: item.costPrice.toString(),
          total: item.total.toString(),
        },
      })

      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new ApiError('ไม่พบสินค้า', 404)

      const beforeStock = new Decimal(product.stock)
      const afterStock = beforeStock.plus(item.baseQuantity)

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: afterStock.toString() },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          productUnitId: item.productUnitId,
          type: 'PURCHASE',
          quantity: item.quantity.toString(),
          baseQuantity: item.baseQuantity.toString(),
          beforeStock: beforeStock.toString(),
          afterStock: afterStock.toString(),
          referenceType: 'PURCHASE',
          referenceId: order.id,
          note: `ซื้อของเข้า ${order.orderNumber}`,
          createdById: session.user.id,
        },
      })

      await updateAverageCost(tx, item.productId)
    }

    return tx.purchaseOrder.findUnique({
      where: { id: order.id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true } },
            productUnit: { include: { unit: { select: { name: true } } } },
          },
        },
      },
    })
  })
}

async function updateAverageCost(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: string
) {
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) return

  const purchaseItems = await tx.purchaseOrderItem.findMany({
    where: { productId },
    orderBy: { createdAt: 'asc' },
  })

  const currentStock = new Decimal(product.stock)
  if (currentStock.equals(0) || purchaseItems.length === 0) {
    return
  }

  let totalValue = new Decimal(0)
  let totalQty = new Decimal(0)

  for (const pi of purchaseItems) {
    const qty = new Decimal(pi.baseQuantity)
    const cost = new Decimal(pi.costPrice)
    totalQty = totalQty.plus(qty)
    totalValue = totalValue.plus(qty.mul(cost))
  }

  if (totalQty.equals(0)) return

  const averageCost = totalValue.dividedBy(totalQty)

  await tx.product.update({
    where: { id: productId },
    data: { averageCost: averageCost.toString() },
  })
}

export async function getPurchaseOrders(take = 50, skip = 0) {
  return prisma.purchaseOrder.findMany({
    take,
    skip,
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, code: true, name: true } },
          productUnit: { include: { unit: { select: { name: true } } } },
        },
      },
    },
  })
}

export async function getPurchaseOrderById(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, code: true, name: true } },
          productUnit: { include: { unit: { select: { name: true } } } },
        },
      },
    },
  })
}
