import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import type { CustomerInput, CustomerUpdateInput } from '@/lib/validation'
import type { Prisma } from '@/generated/prisma/client'
import { createAuditLog } from '@/lib/services/audit'
import type { Session } from 'next-auth'

export async function createCustomer(data: CustomerInput, session: Session) {
  const customer = await prisma.customer.create({
    data: {
      code: data.code,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email || null,
      address: data.address ?? null,
      branch: data.branch ?? null,
      taxId: data.taxId ?? null,
      creditLimit: new Decimal(data.creditLimit).toString(),
      creditDays: data.creditDays,
      outstandingDebt: '0',
      totalPurchased: '0',
      totalPaid: '0',
      isActive: data.isActive,
    },
  })

  await createAuditLog(session, 'CUSTOMER_CREATE', 'Customer', customer.id, {
    code: customer.code,
    name: customer.name,
    creditLimit: data.creditLimit,
  })

  return customer
}

export async function updateCustomer(id: string, data: CustomerUpdateInput, session: Session) {
  const existing = await prisma.customer.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('ไม่พบลูกค้า')
  }

  const updateData: Prisma.CustomerUpdateInput = {}
  if (data.code !== undefined) updateData.code = data.code
  if (data.name !== undefined) updateData.name = data.name
  if (data.phone !== undefined) updateData.phone = data.phone ?? null
  if (data.email !== undefined) updateData.email = data.email || null
  if (data.address !== undefined) updateData.address = data.address ?? null
  if (data.branch !== undefined) updateData.branch = data.branch ?? null
  if (data.taxId !== undefined) updateData.taxId = data.taxId ?? null
  if (data.creditLimit !== undefined) updateData.creditLimit = new Decimal(data.creditLimit).toString()
  if (data.creditDays !== undefined) updateData.creditDays = data.creditDays
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  const updated = await prisma.customer.update({ where: { id }, data: updateData })

  await createAuditLog(session, 'CUSTOMER_UPDATE', 'Customer', id, {
    changes: data,
    previousCode: existing.code,
  })

  return updated
}

export async function deactivateCustomer(id: string) {
  return prisma.customer.update({ where: { id }, data: { isActive: false } })
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } })
}

export async function getCustomerByCode(code: string) {
  return prisma.customer.findUnique({ where: { code } })
}

export async function listCustomers(options: { isActive?: boolean; search?: string; take?: number; skip?: number } = {}) {
  const { isActive, search, take = 50, skip = 0 } = options

  return prisma.customer.findMany({
    where: {
      isActive,
      OR: search
        ? [
            { name: { contains: search } },
            { code: { contains: search } },
            { phone: { contains: search } },
          ]
        : undefined,
    },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCustomerTransactions(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    throw new Error('ไม่พบลูกค้า')
  }

  const invoices = await prisma.saleInvoice.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, code: true } },
          productUnit: { include: { unit: { select: { name: true } } } },
        },
      },
      payments: true,
      debtPayments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, amount: true, remainingAfter: true, method: true, createdAt: true, reference: true, note: true },
      },
    },
  })

  return {
    customer,
    invoices: invoices.map((inv) => ({
      ...inv,
      remainingAmount: new Decimal(inv.total).minus(new Decimal(inv.paidAmount)).toString(),
    })),
  }
}
