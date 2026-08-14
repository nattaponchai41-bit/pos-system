import { NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleError } from '@/lib/api'
import { generatePromptPayPayload, validatePromptPayId } from '@/lib/promptpay'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return successResponse({
      connected: false,
      reason: 'MISSING_DATABASE_URL',
      message: 'ยังไม่ได้ตั้งค่า DATABASE_URL กรุณาคัดลอก .env.example เป็น .env และตั้งค่า MySQL',
      hasAdmin: false,
      hasStoreSetting: false,
      installed: false,
    })
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    const userCount = await prisma.user.count()
    const setting = await prisma.storeSetting.findUnique({ where: { id: 'default' } })

    return successResponse({
      connected: true,
      hasAdmin: userCount > 0,
      hasStoreSetting: !!setting,
      installed: userCount > 0 && !!setting,
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    console.error('[install/check]', details)

    return successResponse({
      connected: false,
      reason: 'DATABASE_CONNECTION_FAILED',
      message: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาเปิด XAMPP MySQL และตรวจสอบ DATABASE_URL',
      details,
      hasAdmin: false,
      hasStoreSetting: false,
      installed: false,
    })
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return errorResponse('ยังไม่ได้ตั้งค่า DATABASE_URL กรุณาตรวจสอบไฟล์ .env', 400)
  }

  try {
    const body = await request.json()
    const {
      adminEmail,
      adminPassword,
      storeName,
      storeAddress,
      storePhone,
      storeTaxId,
      qrPaymentPhone,
      enableCashPayment,
      enableTransferPayment,
      enableQrPayment,
      allowCreditSale,
      bankName,
      bankAccountName,
      bankAccountNumber,
      transferAsCashIn,
      qrAsCashIn,
    } = body

    if (!adminEmail || !adminPassword || adminPassword.length < 6) {
      return errorResponse('กรุณากรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร', 400)
    }

    let qrPaymentPayload: string | null = null
    if (qrPaymentPhone) {
      const validation = validatePromptPayId(qrPaymentPhone)
      if (!validation.valid) {
        return errorResponse(validation.message ?? 'เบอร์ PromptPay ไม่ถูกต้อง', 400)
      }
      qrPaymentPayload = generatePromptPayPayload(validation.clean!)
    }

    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return errorResponse('ระบบถูกติดตั้งแล้ว', 400)
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
    if (!adminRole) {
      return errorResponse('ไม่พบบทบาท Admin กรุณา seed ฐานข้อมูลก่อน', 500)
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: {
        code: 'ADMIN001',
        name: 'ผู้ดูแลระบบ',
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole.id,
        isActive: true,
      },
    })

    await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        storeName: storeName || 'ร้านค้า POS',
        storeAddress: storeAddress || null,
        storePhone: storePhone || null,
        storeTaxId: storeTaxId || null,
        currency: 'THB',
        currencySymbol: '฿',
        invoicePrefix: 'INV',
        invoiceNextNumber: 1,
        purchaseOrderPrefix: 'PO',
        purchaseOrderNextNumber: 1,
        allowCreditSale: typeof allowCreditSale === 'boolean' ? allowCreditSale : true,
        allowNegativeStock: false,
        sessionRequired: true,
        receiptWidth: '80mm',
        showLogo: true,
        showQr: true,
        showCashier: true,
        showTaxId: true,
        receiptFooter: 'ขอบคุณที่ใช้บริการ',
        qrPaymentPhone: qrPaymentPhone || null,
        qrPaymentPayload,
        enableCashPayment: typeof enableCashPayment === 'boolean' ? enableCashPayment : true,
        enableTransferPayment: typeof enableTransferPayment === 'boolean' ? enableTransferPayment : true,
        enableQrPayment: typeof enableQrPayment === 'boolean' ? enableQrPayment : true,
        transferAsCashIn: typeof transferAsCashIn === 'boolean' ? transferAsCashIn : false,
        qrAsCashIn: typeof qrAsCashIn === 'boolean' ? qrAsCashIn : false,
        bankName: bankName || null,
        bankAccountName: bankAccountName || null,
        bankAccountNumber: bankAccountNumber || null,
      },
    })

    return successResponse({ installed: true })
  } catch (error) {
    return handleError(error)
  }
}
