import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcrypt'

const PERMISSIONS = [
  { code: 'SALE_CREATE', label: 'ขายสินค้า', category: 'การขาย' },
  { code: 'BILL_CANCEL', label: 'ยกเลิกบิล', category: 'การขาย' },
  { code: 'BILL_EDIT', label: 'แก้ไขบิล', category: 'การขาย' },
  { code: 'APPLY_DISCOUNT', label: 'ให้ส่วนลด', category: 'การขาย' },
  { code: 'CHANGE_PRICE', label: 'เปลี่ยนราคาสินค้า', category: 'การขาย' },
  { code: 'VIEW_COST', label: 'ดูต้นทุน', category: 'สินค้า' },
  { code: 'PRODUCT_VIEW', label: 'ดูรายการสินค้า', category: 'สินค้า' },
  { code: 'MANAGE_PRODUCT', label: 'จัดการสินค้า', category: 'สินค้า' },
  { code: 'MANAGE_CATEGORY', label: 'จัดการหมวดหมู่', category: 'สินค้า' },
  { code: 'ADJUST_STOCK', label: 'ปรับ Stock', category: 'สินค้า' },
  { code: 'VIEW_REPORT', label: 'ดูรายงาน', category: 'รายงาน' },
  { code: 'RECEIVE_DEBT', label: 'รับชำระหนี้', category: 'ลูกหนี้' },
  { code: 'MANAGE_CUSTOMER', label: 'จัดการลูกค้า', category: 'ลูกหนี้' },
  { code: 'MANAGE_USER', label: 'จัดการ User', category: 'ระบบ' },
  { code: 'MANAGE_SESSION', label: 'จัดการ Session', category: 'ระบบ' },
  { code: 'SYSTEM_SETTING', label: 'ตั้งค่าระบบ', category: 'ระบบ' },
  { code: 'VIEW_AUDIT_LOG', label: 'ดูบันทึกกิจกรรม', category: 'ระบบ' },
]

const ROLES = [
  { name: 'OWNER', label: 'เจ้าของร้าน' },
  { name: 'ADMIN', label: 'ผู้ดูแลระบบ' },
  { name: 'MANAGER', label: 'ผู้จัดการ' },
  { name: 'CASHIER', label: 'พนักงานขาย' },
  { name: 'STOCK', label: 'พนักงานสต็อก' },
]

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: PERMISSIONS.map((p) => p.code),
  ADMIN: PERMISSIONS.map((p) => p.code),
  MANAGER: [
    'SALE_CREATE',
    'BILL_CANCEL',
    'BILL_EDIT',
    'APPLY_DISCOUNT',
    'CHANGE_PRICE',
    'VIEW_COST',
    'PRODUCT_VIEW',
    'MANAGE_PRODUCT',
    'MANAGE_CATEGORY',
    'ADJUST_STOCK',
    'VIEW_REPORT',
    'RECEIVE_DEBT',
    'MANAGE_CUSTOMER',
    'MANAGE_SESSION',
    'VIEW_AUDIT_LOG',
  ],
  CASHIER: [
    'SALE_CREATE',
    'APPLY_DISCOUNT',
    'PRODUCT_VIEW',
    'RECEIVE_DEBT',
    'MANAGE_SESSION',
  ],
  STOCK: [
    'VIEW_COST',
    'PRODUCT_VIEW',
    'MANAGE_PRODUCT',
    'MANAGE_CATEGORY',
    'ADJUST_STOCK',
  ],
}

const UNITS = [
  { name: 'ชิ้น', abbreviation: 'pcs' },
  { name: 'โหล', abbreviation: 'doz' },
  { name: 'แพ็ก', abbreviation: 'pack' },
  { name: 'ลัง', abbreviation: 'ctn' },
]

const CATEGORIES = [
  { name: 'เครื่องดื่ม', color: '#3b82f6' },
  { name: 'ขนม', color: '#f59e0b' },
  { name: 'อาหาร', color: '#10b981' },
  { name: 'ทั่วไป', color: '#6b7280' },
]

async function main() {
  // Permissions
  const permissionByCode = new Map<string, string>()
  for (const p of PERMISSIONS) {
    const upserted = await prisma.permission.upsert({
      where: { code: p.code },
      update: { label: p.label, category: p.category },
      create: { code: p.code, label: p.label, category: p.category },
    })
    permissionByCode.set(upserted.code, upserted.id)
  }

  // Roles + role permissions
  const roleByName = new Map<string, string>()
  for (const r of ROLES) {
    const upserted = await prisma.role.upsert({
      where: { name: r.name },
      update: { label: r.label },
      create: { name: r.name, label: r.label },
    })
    roleByName.set(upserted.name, upserted.id)

    // Wipe then re-assign permissions for idempotency
    await prisma.rolePermission.deleteMany({ where: { roleId: upserted.id } })
    const codes = ROLE_PERMISSIONS[r.name] ?? []
    const data = codes
      .map((code) => {
        const permissionId = permissionByCode.get(code)
        if (!permissionId) return null
        return { roleId: upserted.id, permissionId }
      })
      .filter((x): x is { roleId: string; permissionId: string } => x !== null)

    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data })
    }
  }

  // Default admin user
  const adminRoleId = roleByName.get('ADMIN')!
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@pos.local' },
    update: {},
    create: {
      code: 'ADMIN001',
      name: 'ผู้ดูแลระบบ',
      email: 'admin@pos.local',
      password: hashedPassword,
      roleId: adminRoleId,
      isActive: true,
    },
  })

  // Test cashier user
  const cashierRoleId = roleByName.get('CASHIER')!
  const cashierPassword = await bcrypt.hash('cashier123', 10)
  await prisma.user.upsert({
    where: { email: 'cashier@pos.local' },
    update: {},
    create: {
      code: 'CASH001',
      name: 'พนักงานขาย',
      email: 'cashier@pos.local',
      password: cashierPassword,
      roleId: cashierRoleId,
      isActive: true,
    },
  })

  // Test stock user
  const stockRoleId = roleByName.get('STOCK')!
  const stockPassword = await bcrypt.hash('stock123', 10)
  await prisma.user.upsert({
    where: { email: 'stock@pos.local' },
    update: {},
    create: {
      code: 'STOCK001',
      name: 'พนักงานสต็อก',
      email: 'stock@pos.local',
      password: stockPassword,
      roleId: stockRoleId,
      isActive: true,
    },
  })

  // Store settings
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'ร้านค้า POS',
      storeAddress: '',
      storePhone: '',
      storeTaxId: '',
      currency: 'THB',
      currencySymbol: '฿',
      invoicePrefix: 'INV',
      invoiceNextNumber: 1,
      purchaseOrderPrefix: 'PO',
      purchaseOrderNextNumber: 1,
      allowCreditSale: true,
      allowNegativeStock: false,
      sessionRequired: true,
      receiptWidth: '80mm',
      showLogo: true,
      showQr: true,
      showCashier: true,
      showTaxId: true,
      receiptFooter: 'ขอบคุณที่ใช้บริการ',
      invoiceTitle: 'ใบกำกับภาษี',
      receiptTitle: 'ใบเสร็จรับเงิน',
      enableCashPayment: true,
      enableTransferPayment: true,
      enableQrPayment: true,
      transferAsCashIn: false,
      qrAsCashIn: false,
      bankName: null,
      bankAccountName: null,
      bankAccountNumber: null,
    },
  })

  // Units
  for (const u of UNITS) {
    await prisma.unit.upsert({
      where: { name: u.name },
      update: { abbreviation: u.abbreviation, isActive: true },
      create: { name: u.name, abbreviation: u.abbreviation },
    })
  }

  // Categories
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { color: c.color },
      create: { name: c.name, color: c.color },
    })
  }

  console.log('Seed completed.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
