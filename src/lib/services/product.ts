import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { validateProductUnits } from '@/lib/services/unit'
import type { ProductInput, ProductUnitInput } from '@/lib/validation'
import type { Session } from 'next-auth'
import { ApiError } from '@/lib/api'

async function validateProductBarcodesAndSkus(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  data: { units: ProductUnitInput[] },
  excludeProductId?: string
) {
  const skus: string[] = []
  const barcodes: string[] = []

  for (const unit of data.units) {
    const sku = unit.sku.trim()
    if (!sku) throw new ApiError('SKU ต้องไม่ว่าง', 400)
    if (skus.includes(sku)) throw new ApiError(`SKU ซ้ำภายในสินค้า: ${sku}`, 409)
    skus.push(sku)

    const unitBarcodes = [unit.barcode, ...unit.barcodes].filter((b): b is string => !!b && b.trim().length > 0).map((b) => b.trim())
    for (const barcode of unitBarcodes) {
      if (barcodes.includes(barcode)) throw new ApiError(`บาร์โค้ดซ้ำภายในสินค้า: ${barcode}`, 409)
      barcodes.push(barcode)
    }
  }

  if (barcodes.length > 0) {
    const existingBarcodes = await tx.productBarcode.findMany({
      where: {
        barcode: { in: barcodes },
        isActive: true,
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { barcode: true, productId: true },
    })
    if (existingBarcodes.length > 0) {
      throw new ApiError(`บาร์โค้ดซ้ำกับสินค้าอื่น: ${existingBarcodes.map((b) => b.barcode).join(', ')}`, 409)
    }

    const existingUnitBarcodes = await tx.productUnit.findMany({
      where: {
        barcode: { in: barcodes },
        isActive: true,
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { barcode: true, productId: true },
    })
    if (existingUnitBarcodes.length > 0) {
      throw new ApiError(`บาร์โค้ดซ้ำกับสินค้าอื่น: ${existingUnitBarcodes.map((b) => b.barcode).filter(Boolean).join(', ')}`, 409)
    }
  }

  if (skus.length > 0) {
    const existingSkus = await tx.productUnit.findMany({
      where: {
        sku: { in: skus },
        isActive: true,
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { sku: true, productId: true },
    })
    if (existingSkus.length > 0) {
      throw new ApiError(`SKU ซ้ำกับสินค้าอื่น: ${existingSkus.map((u) => u.sku).join(', ')}`, 409)
    }
  }
}

export async function createProduct(data: ProductInput, session: Session) {
  validateProductUnits(data.units)

  return prisma.$transaction(async (tx) => {
    await validateProductBarcodesAndSkus(tx, data)

    const existingCode = await tx.product.findUnique({ where: { code: data.code } })
    if (existingCode) throw new ApiError(`รหัสสินค้า ${data.code} ซ้ำ`, 409)
    const product = await tx.product.create({
      data: {
        code: data.code,
        name: data.name,
        categoryId: data.categoryId || null,
        baseUnitId: data.baseUnitId,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        stock: data.initialStock.toString(),
        minStock: data.minStock.toString(),
        isActive: data.isActive,
      },
      include: { baseUnit: true },
    })

    const unitIdToRecord = new Map<string, string>()
    for (const unitInput of data.units) {
      const unit = await tx.productUnit.create({
        data: {
          productId: product.id,
          unitId: unitInput.unitId,
          sku: unitInput.sku,
          barcode: unitInput.barcode?.trim() || null,
          conversionFactor: unitInput.conversionFactor.toString(),
          costPrice: unitInput.costPrice?.toString() ?? null,
          salePrice: unitInput.salePrice.toString(),
          wholesalePrice: unitInput.wholesalePrice?.toString() ?? null,
          isActive: unitInput.isActive,
          isDefault: unitInput.isDefault,
        },
      })
      unitIdToRecord.set(unitInput.unitId, unit.id)

      for (const barcode of unitInput.barcodes) {
        await tx.productBarcode.create({
          data: {
            productId: product.id,
            productUnitId: unit.id,
            barcode: barcode.trim(),
          },
        })
      }
    }

    if (new Decimal(data.initialStock).greaterThan(0)) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          productUnitId: unitIdToRecord.get(data.baseUnitId) ?? null,
          type: 'INITIAL',
          quantity: data.initialStock.toString(),
          baseQuantity: data.initialStock.toString(),
          beforeStock: '0',
          afterStock: data.initialStock.toString(),
          referenceType: 'PRODUCT',
          referenceId: product.id,
          note: 'สต็อกเริ่มต้น',
          createdById: session.user.id,
        },
      })
    }

    return tx.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        baseUnit: true,
        productUnits: { include: { unit: true, barcodes: true } },
        barcodes: true,
      },
    })
  })
}

export async function updateProduct(id: string, data: Partial<ProductInput> & { units?: ProductUnitInput[] }) {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { productUnits: { include: { barcodes: true } }, barcodes: true },
  })

  if (!existing) {
    throw new ApiError('ไม่พบสินค้า', 404)
  }

  if (data.units) {
    validateProductUnits(data.units)
  }

  return prisma.$transaction(async (tx) => {
    if (data.units) {
      await validateProductBarcodesAndSkus(tx, { units: data.units }, id)
    }

    if (data.code !== undefined) {
      const existingCode = await tx.product.findUnique({ where: { code: data.code } })
      if (existingCode && existingCode.id !== id) throw new ApiError(`รหัสสินค้า ${data.code} ซ้ำ`, 409)
    }
    const updatePayload: Record<string, unknown> = {}
    if (data.code !== undefined) updatePayload.code = data.code
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId || null
    if (data.baseUnitId !== undefined) updatePayload.baseUnitId = data.baseUnitId
    if (data.description !== undefined) updatePayload.description = data.description ?? null
    if (data.imageUrl !== undefined) updatePayload.imageUrl = data.imageUrl ?? null
    if (data.minStock !== undefined) updatePayload.minStock = data.minStock.toString()
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive

    await tx.product.update({ where: { id }, data: updatePayload })

    if (data.units) {
      const keptIds = data.units.map((u) => u.id).filter(Boolean) as string[]
      await tx.productUnit.deleteMany({
        where: { productId: id, id: { notIn: keptIds } },
      })

      await tx.productBarcode.deleteMany({
        where: { productId: id, productUnitId: { notIn: keptIds } },
      })

      for (const unitInput of data.units) {
        if (unitInput.id) {
          await tx.productUnit.update({
            where: { id: unitInput.id },
            data: {
              unitId: unitInput.unitId,
              sku: unitInput.sku,
              barcode: unitInput.barcode ?? null,
              conversionFactor: unitInput.conversionFactor.toString(),
              costPrice: unitInput.costPrice?.toString() ?? null,
              salePrice: unitInput.salePrice.toString(),
              wholesalePrice: unitInput.wholesalePrice?.toString() ?? null,
              isActive: unitInput.isActive,
              isDefault: unitInput.isDefault,
            },
          })
          await tx.productBarcode.deleteMany({ where: { productUnitId: unitInput.id } })
          for (const barcode of unitInput.barcodes) {
            await tx.productBarcode.create({
              data: {
                productId: id,
                productUnitId: unitInput.id,
                barcode: barcode.trim(),
              },
            })
          }
        } else {
          const unit = await tx.productUnit.create({
            data: {
              productId: id,
              unitId: unitInput.unitId,
              sku: unitInput.sku,
              barcode: unitInput.barcode ?? null,
              conversionFactor: unitInput.conversionFactor.toString(),
              costPrice: unitInput.costPrice?.toString() ?? null,
              salePrice: unitInput.salePrice.toString(),
              wholesalePrice: unitInput.wholesalePrice?.toString() ?? null,
              isActive: unitInput.isActive,
              isDefault: unitInput.isDefault,
            },
          })
          for (const barcode of unitInput.barcodes) {
            await tx.productBarcode.create({
              data: {
                productId: id,
                productUnitId: unit.id,
                barcode: barcode.trim(),
              },
            })
          }
        }
      }
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        category: true,
        baseUnit: true,
        productUnits: { include: { unit: true, barcodes: true } },
        barcodes: true,
      },
    })
  })
}

export async function deactivateProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { isActive: false } })
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      baseUnit: true,
      productUnits: { include: { unit: true, barcodes: true } },
      barcodes: true,
    },
  })
}

export async function getProductByCode(code: string) {
  return prisma.product.findUnique({ where: { code } })
}

export interface ImportProductRow {
  code: string
  name: string
  categoryName?: string
  baseUnitName?: string
  initialStock?: number
  minStock?: number
  sku?: string
  unitName?: string
  conversionFactor?: number
  salePrice?: number
  costPrice?: number
  barcode?: string
  description?: string
}

export async function importProducts(rows: ImportProductRow[], session: Session) {
  const results: { code: string; success: boolean; message?: string }[] = []

  for (const row of rows) {
    try {
      let categoryId: string | undefined
      if (row.categoryName) {
        const category = await prisma.category.findUnique({ where: { name: row.categoryName } })
        if (!category) {
          throw new ApiError(`ไม่พบหมวดหมู่ "${row.categoryName}"`, 400)
        }
        categoryId = category.id
      }

      const baseUnitName = row.baseUnitName || row.unitName
      const unitName = row.unitName || row.baseUnitName
      if (!baseUnitName || !unitName) {
        throw new ApiError('ต้องระบุหน่วยพื้นฐาน', 400)
      }

      const baseUnit = await prisma.unit.findUnique({ where: { name: baseUnitName } })
        || (await prisma.unit.create({ data: { name: baseUnitName } }))

      const unit = unitName === baseUnitName
        ? baseUnit
        : (await prisma.unit.findUnique({ where: { name: unitName } }))
          || (await prisma.unit.create({ data: { name: unitName } }))

      const payload: ProductInput = {
        code: row.code,
        name: row.name,
        categoryId,
        baseUnitId: baseUnit.id,
        description: row.description,
        initialStock: row.initialStock ?? 0,
        minStock: row.minStock ?? 0,
        isActive: true,
        units: [
          {
            unitId: unit.id,
            sku: row.sku || row.code,
            barcode: row.barcode,
            conversionFactor: row.conversionFactor ?? 1,
            costPrice: row.costPrice,
            salePrice: row.salePrice ?? 0,
            wholesalePrice: undefined,
            isDefault: true,
            isActive: true,
            barcodes: [],
          },
        ],
      }

      await createProduct(payload, session)
      results.push({ code: row.code, success: true })
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'ผิดพลาด'
      results.push({ code: row.code, success: false, message })
    }
  }

  return results
}

export async function listProducts(options: { isActive?: boolean; categoryId?: string; search?: string; take?: number; skip?: number } = {}) {
  const { isActive, categoryId, search, take = 50, skip = 0 } = options

  return prisma.product.findMany({
    where: {
      isActive,
      categoryId,
      name: search ? { contains: search } : undefined,
    },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      baseUnit: true,
      productUnits: { include: { unit: true } },
    },
  })
}
