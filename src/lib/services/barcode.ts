import { prisma } from '@/lib/prisma'

export async function findProductByBarcode(barcode: string) {
  const trimmed = barcode.trim()
  if (!trimmed) return null

  const barcodeRow = await prisma.productBarcode.findUnique({
    where: { barcode: trimmed },
    include: {
      product: {
        include: {
          category: true,
          baseUnit: true,
          productUnits: {
            include: { unit: true, barcodes: true },
          },
        },
      },
      productUnit: { include: { unit: true } },
    },
  })

  if (barcodeRow?.isActive && barcodeRow.product.isActive) {
    return {
      product: barcodeRow.product,
      matchedUnit: barcodeRow.productUnit,
    }
  }

  const productUnit = await prisma.productUnit.findUnique({
    where: { barcode: trimmed },
    include: {
      product: {
        include: {
          category: true,
          baseUnit: true,
          productUnits: {
            include: { unit: true, barcodes: true },
          },
        },
      },
      unit: true,
    },
  })

  if (productUnit?.isActive && productUnit.product.isActive) {
    return {
      product: productUnit.product,
      matchedUnit: productUnit,
    }
  }

  return null
}
