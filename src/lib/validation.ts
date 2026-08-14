import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const createUserSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  phone: z.string().optional(),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  roleId: z.string().min(1, 'กรุณาเลือกบทบาท'),
  isActive: z.boolean().default(true),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const changePasswordSchema = z.object({
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const categorySchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อหมวดหมู่'),
  color: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categorySchema>

export const unitSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อหน่วย'),
  abbreviation: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type UnitInput = z.infer<typeof unitSchema>

export const productUnitSchema = z.object({
  id: z.string().optional(),
  unitId: z.string().min(1, 'กรุณาเลือกหน่วย'),
  sku: z.string().min(1, 'กรุณากรอก SKU'),
  barcode: z.string().optional(),
  conversionFactor: z.coerce.number().positive('ตัวคูณต้องมากกว่า 0'),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0, 'ราคาขายต้องไม่ติดลบ'),
  wholesalePrice: z.coerce.number().min(0).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  barcodes: z.array(z.string()).default([]),
})

export type ProductUnitInput = z.infer<typeof productUnitSchema>

export const productSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสสินค้า'),
  name: z.string().min(1, 'กรุณากรอกชื่อสินค้า'),
  categoryId: z.string().optional(),
  baseUnitId: z.string().min(1, 'กรุณาเลือกหน่วยพื้นฐาน'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  initialStock: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  units: z.array(productUnitSchema).min(1, 'ต้องมีอย่างน้อย 1 หน่วย'),
})

export type ProductInput = z.infer<typeof productSchema>

export const productUpdateSchema = productSchema.partial().extend({
  units: z.array(productUnitSchema).min(1, 'ต้องมีอย่างน้อย 1 หน่วย').optional(),
})

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>

export const supplierSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสผู้ขาย'),
  name: z.string().min(1, 'กรุณากรอกชื่อผู้ขาย'),
  phone: z.string().optional(),
  email: z.string().email('อีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  address: z.string().optional(),
  contactName: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type SupplierInput = z.infer<typeof supplierSchema>

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, 'กรุณาระบุสินค้า'),
  productUnitId: z.string().min(1, 'กรุณาระบุหน่วย'),
  quantity: z.coerce.number().positive('จำนวนต้องมากกว่า 0'),
  unitPrice: z.coerce.number().min(0, 'ราคาต้องไม่ติดลบ'),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
  note: z.string().optional(),
})

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>

export const stockAdjustmentSchema = z.object({
  type: z.enum(['INITIAL', 'PURCHASE', 'RETURN', 'DAMAGE', 'STOCK_COUNT', 'ADJUSTMENT']),
  quantity: z.coerce.number(),
  productUnitId: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  note: z.string().optional(),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>

export const customerSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสลูกค้า'),
  name: z.string().min(1, 'กรุณากรอกชื่อลูกค้า'),
  phone: z.string().optional(),
  email: z.string().email('อีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  address: z.string().optional(),
  branch: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  creditDays: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export type CustomerInput = z.infer<typeof customerSchema>

export const customerUpdateSchema = customerSchema.partial()

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>

export const cashSessionOpenSchema = z.object({
  openingCash: z.coerce.number().min(0),
})

export type CashSessionOpenInput = z.infer<typeof cashSessionOpenSchema>

export const cashSessionCloseSchema = z.object({
  actualCash: z.coerce.number().min(0),
})

export type CashSessionCloseInput = z.infer<typeof cashSessionCloseSchema>

export const debtPaymentSchema = z.object({
  saleInvoiceId: z.string().min(1, 'กรุณาระบุบิล'),
  customerId: z.string().min(1, 'กรุณาระบุลูกค้า'),
  amount: z.coerce.number().positive('จำนวนเงินต้องมากกว่า 0'),
  method: z.enum(['CASH', 'TRANSFER', 'QR']),
  reference: z.string().optional(),
  note: z.string().optional(),
})

export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>

export const cashMovementSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT', 'EXPENSE', 'REFUND']),
  amount: z.coerce.number().positive('จำนวนเงินต้องมากกว่า 0'),
  reason: z.string().min(1, 'กรุณาระบุเหตุผล'),
})

export type CashMovementInput = z.infer<typeof cashMovementSchema>

export const creditSaleItemSchema = z.object({
  productId: z.string().min(1, 'กรุณาระบุสินค้า'),
  productUnitId: z.string().min(1, 'กรุณาระบุหน่วย'),
  quantity: z.coerce.number().positive('จำนวนต้องมากกว่า 0'),
  unitPrice: z.coerce.number().min(0, 'ราคาต้องไม่ติดลบ'),
  discount: z.coerce.number().min(0).default(0),
})

export const saleItemSchema = creditSaleItemSchema

export const refundItemSchema = z.object({
  saleItemId: z.string().min(1, 'กรุณาระบุรายการสินค้า'),
  quantity: z.coerce.number().positive('จำนวนคืนต้องมากกว่า 0'),
})

export const refundSchema = z.object({
  items: z.array(refundItemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการคืน'),
  method: z.enum(['CASH', 'TRANSFER', 'QR']),
  reference: z.string().optional(),
  note: z.string().optional(),
})

export type RefundInput = z.infer<typeof refundSchema>

export const creditSaleSchema = z.object({
  customerId: z.string().min(1, 'กรุณาระบุลูกค้า'),
  items: z.array(creditSaleItemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  note: z.string().optional(),
})

export type CreditSaleInput = z.infer<typeof creditSaleSchema>

export const cashSalePaymentSchema = z.object({
  method: z.enum(['CASH', 'TRANSFER', 'QR']),
  amount: z.coerce.number().min(0, 'จำนวนเงินต้องไม่ติดลบ'),
  received: z.union([z.coerce.number().min(0, 'รับมาต้องไม่ติดลบ'), z.undefined()]).optional(),
  reference: z.string().optional(),
})

export const cashSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  note: z.string().optional(),
  payments: z.array(cashSalePaymentSchema).min(1, 'ต้องมีอย่างน้อย 1 การชำระ'),
})

export type CashSaleInput = z.infer<typeof cashSaleSchema>
