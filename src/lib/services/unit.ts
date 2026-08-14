import Decimal from 'decimal.js'
import type { ProductUnit } from '@/generated/prisma/client'

type DecimalInput = string | number | Decimal

export function toBaseQuantity(quantity: DecimalInput, conversionFactor: DecimalInput): Decimal {
  return new Decimal(quantity).mul(new Decimal(conversionFactor))
}

export function fromBaseQuantity(baseQuantity: DecimalInput, conversionFactor: DecimalInput): Decimal {
  return new Decimal(baseQuantity).div(new Decimal(conversionFactor))
}

export function getDefaultUnit(units: ProductUnit[]): ProductUnit | undefined {
  return units.find((u) => u.isDefault) ?? units[0]
}

export function validateProductUnits(units: { unitId: string; conversionFactor: number; isDefault: boolean }[]): void {
  if (units.length === 0) {
    throw new Error('ต้องมีอย่างน้อย 1 หน่วย')
  }

  const defaultCount = units.filter((u) => u.isDefault).length
  if (defaultCount !== 1) {
    throw new Error('ต้องมีหน่วยเริ่มต้น (default) 1 หน่วยเท่านั้น')
  }

  const unitIds = units.map((u) => u.unitId)
  if (new Set(unitIds).size !== unitIds.length) {
    throw new Error('ห้ามเลือกหน่วยซ้ำ')
  }

  for (const unit of units) {
    if (new Decimal(unit.conversionFactor).lessThanOrEqualTo(0)) {
      throw new Error('ตัวคูณหน่วยต้องมากกว่า 0')
    }
  }
}
