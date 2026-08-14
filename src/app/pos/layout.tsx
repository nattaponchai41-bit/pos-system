import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { getOpenSession } from '@/lib/services/cash-session'

export default async function PosLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, 'SALE_CREATE')) {
    redirect('/dashboard')
  }

  const openSession = await getOpenSession()
  if (!openSession) {
    redirect('/cash-sessions')
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100">{children}</div>
  )
}
