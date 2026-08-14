import Decimal from 'decimal.js'
import { prisma } from '@/lib/prisma'
import { toBaseQuantity } from '@/lib/services/unit'
import type { Session } from 'next-auth'
import type { StockMovementType } from '@/generated/prisma/client'

type DecimalInput = string | number | Decimal

export interface StockChangeInput {
  productId: string
  type: StockMovementType
  quantity: DecimalInput
  productUnitId?: string
  referenceType?: string
  referenceId?: string
  note?: string
  session: Session
}

const OUTBOUND_TYPES: StockMovementType[] = ['DAMAGE', 'RETURN']

export async function adjustStock(input: StockChangeInput) {
  const signedQuantity = OUTBOUND_TYPES.includes(input.type)
    ? new Decimal(input.quantity).negated()
    : new Decimal(input.quantity)

  const baseQuantity = input.productUnitId
    ? await computeBaseQuantity(input.productUnitId, signedQuantity)
    : signedQuantity

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      include: { baseUnit: true },
    })

    if (!product) {
      throw new Error('ไม่พบสินค้า')
    }

    const beforeStock = new Decimal(product.stock)
    const afterStock = beforeStock.plus(baseQuantity)

    const setting = await tx.storeSetting.findUnique({ where: { id: 'default' } })
    if (!setting?.allowNegativeStock && afterStock.lessThan(0)) {
      throw new Error('Stock ไม่เพียงพอ')
    }

    await tx.product.update({
      where: { id: input.productId },
      data: { stock: afterStock.toString() },
    })

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        productUnitId: input.productUnitId ?? null,
        type: input.type,
        quantity: signedQuantity.toString(),
        baseQuantity: baseQuantity.toString(),
        beforeStock: beforeStock.toString(),
        afterStock: afterStock.toString(),
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        note: input.note ?? null,
        createdById: input.session.user.id,
      },
    })

    return { product: await tx.product.findUnique({ where: { id: input.productId } }), movement }
  })
}

async function computeBaseQuantity(productUnitId: string, quantity: DecimalInput): Promise<Decimal> {
  const unit = await prisma.productUnit.findUnique({ where: { id: productUnitId } })
  if (!unit) {
    throw new Error('ไม่พบหน่วยสินค้า')
  }
  return toBaseQuantity(quantity, unit.conversionFactor)
}

export async function getStockMovements(productId: string, take = 50, skip = 0) {
  return prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: {
      productUnit: { include: { unit: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
}
