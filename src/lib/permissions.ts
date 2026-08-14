import type { Session } from 'next-auth'

export const PERMISSIONS = {
  SALE_CREATE: 'SALE_CREATE',
  BILL_CANCEL: 'BILL_CANCEL',
  BILL_EDIT: 'BILL_EDIT',
  APPLY_DISCOUNT: 'APPLY_DISCOUNT',
  CHANGE_PRICE: 'CHANGE_PRICE',
  VIEW_COST: 'VIEW_COST',
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  MANAGE_PRODUCT: 'MANAGE_PRODUCT',
  MANAGE_CATEGORY: 'MANAGE_CATEGORY',
  ADJUST_STOCK: 'ADJUST_STOCK',
  VIEW_REPORT: 'VIEW_REPORT',
  RECEIVE_DEBT: 'RECEIVE_DEBT',
  MANAGE_CUSTOMER: 'MANAGE_CUSTOMER',
  MANAGE_USER: 'MANAGE_USER',
  MANAGE_SESSION: 'MANAGE_SESSION',
  SYSTEM_SETTING: 'SYSTEM_SETTING',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export function hasPermission(session: Session | null, code: PermissionCode): boolean {
  if (!session?.user?.permissions) return false
  return session.user.permissions.includes(code)
}

export function requirePermission(session: Session | null, code: PermissionCode): void {
  if (!hasPermission(session, code)) {
    throw new PermissionError(`ต้องมีสิทธิ์ ${code} จึงจะดำเนินการได้`)
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermissionError'
  }
}
