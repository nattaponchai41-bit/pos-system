import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import type { CreateUserInput, UpdateUserInput } from '@/lib/validation'
import type { Session } from 'next-auth'
import { createAuditLog } from '@/lib/services/audit'
import { ApiError } from '@/lib/api'

export async function listUsers(options: { search?: string; take?: number; skip?: number } = {}) {
  const { search, take = 50, skip = 0 } = options
  return prisma.user.findMany({
    where: {
      OR: search
        ? [{ name: { contains: search } }, { email: { contains: search } }, { code: { contains: search } }]
        : undefined,
    },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
    include: { role: { select: { id: true, name: true, label: true } } },
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: { select: { id: true, name: true, label: true } } },
  })
}

export async function createUser(data: CreateUserInput, session: Session) {
  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingEmail) {
    throw new ApiError('อีเมลซ้ำ', 409)
  }
  const existingCode = await prisma.user.findUnique({ where: { code: data.code } })
  if (existingCode) {
    throw new ApiError('รหัสพนักงานซ้ำ', 409)
  }

  const role = await prisma.role.findUnique({ where: { id: data.roleId } })
  if (!role) {
    throw new ApiError('ไม่พบบทบาท', 400)
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)
  const user = await prisma.user.create({
    data: {
      code: data.code,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      password: hashedPassword,
      roleId: data.roleId,
      isActive: data.isActive,
    },
    include: { role: { select: { id: true, name: true, label: true } } },
  })

  await createAuditLog(session, 'USER_CREATE', 'User', user.id, {
    code: user.code,
    name: user.name,
    email: user.email,
    roleId: data.roleId,
  })

  return user
}

export async function updateUser(id: string, data: UpdateUserInput, session: Session) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('ไม่พบผู้ใช้', 404)
  }

  if (data.email && data.email !== existing.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } })
    if (existingEmail) {
      throw new ApiError('อีเมลซ้ำ', 409)
    }
  }
  if (data.code && data.code !== existing.code) {
    const existingCode = await prisma.user.findUnique({ where: { code: data.code } })
    if (existingCode) {
      throw new ApiError('รหัสพนักงานซ้ำ', 409)
    }
  }

  const updateData: Record<string, unknown> = {}
  if (data.code !== undefined) updateData.code = data.code
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone ?? null
  if (data.roleId !== undefined) updateData.roleId = data.roleId
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { role: { select: { id: true, name: true, label: true } } },
  })

  await createAuditLog(session, 'USER_UPDATE', 'User', id, {
    code: user.code,
    name: user.name,
    changes: { roleId: data.roleId, isActive: data.isActive },
    passwordChanged: !!data.password,
  })

  return user
}

export async function deactivateUser(id: string, session: Session) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('ไม่พบผู้ใช้', 404)
  }
  if (existing.id === session.user.id) {
    throw new ApiError('ไม่สามารถปิดใช้งานตัวเองได้', 400)
  }

  const user = await prisma.user.update({ where: { id }, data: { isActive: false } })

  await createAuditLog(session, 'USER_UPDATE', 'User', id, {
    code: user.code,
    name: user.name,
    isActive: false,
  })

  return user
}

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { permissions: { include: { permission: { select: { code: true, label: true, category: true } } } } },
  })
}
