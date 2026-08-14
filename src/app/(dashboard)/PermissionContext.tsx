'use client'

import { createContext, useContext } from 'react'

const PermissionContext = createContext<string[]>([])

export function usePermissions() {
  return useContext(PermissionContext)
}

export function PermissionContextProvider({
  permissions,
  children,
}: {
  permissions: string[]
  children: React.ReactNode
}) {
  return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>
}
