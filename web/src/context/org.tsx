import React, { createContext, useContext, useMemo, useState, PropsWithChildren } from 'react'

export type Role = 'master' | 'admin'

export type Outlet = {
  id: string
  name: string
  code: string
}

type OrgContextType = {
  role: Role
  setRole: (r: Role) => void
  outlets: Outlet[]
  selectedOutletId: string
  setSelectedOutletId: (id: string) => void
  selectedOutlet: Outlet | undefined
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrgProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role>('master')
  const [outlets] = useState<Outlet[]>([
    { id: 'hq', name: 'Head Office', code: 'HQ' },
    { id: 'store-01', name: 'Outlet 01', code: 'S01' },
    { id: 'store-02', name: 'Outlet 02', code: 'S02' },
  ])
  const [selectedOutletId, setSelectedOutletId] = useState<string>('hq')
  const selectedOutlet = useMemo(() => outlets.find(o => o.id === selectedOutletId), [outlets, selectedOutletId])

  const value = { role, setRole, outlets, selectedOutletId, setSelectedOutletId, selectedOutlet }
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
