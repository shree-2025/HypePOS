import React, { createContext, useContext, useMemo, useState, PropsWithChildren, useEffect } from 'react'

export type Role = 'master' | 'admin' | 'distributor' | 'salers'

export type Outlet = {
  id: string
  name: string
  code: string
}

type OrgContextType = {
  role: Role
  setRole: (r: Role) => void
  outlets: Outlet[]
  setOutlets: (list: Outlet[]) => void
  selectedOutletId: string
  setSelectedOutletId: (id: string) => void
  selectedOutlet: Outlet | undefined
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrgProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role>(() => {
    try {
      return (localStorage.getItem('org_role') as Role) || 'master'
    } catch {
      return 'master'
    }
  })
  const [outlets, _setOutlets] = useState<Outlet[]>(() => {
    try {
      const raw = localStorage.getItem('org_outlets')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    try {
      return localStorage.getItem('org_selected_outlet') || ''
    } catch {
      return ''
    }
  })
  const selectedOutlet = useMemo(() => outlets.find(o => o.id === selectedOutletId), [outlets, selectedOutletId])

  useEffect(() => {
    try { localStorage.setItem('org_role', role) } catch {}
  }, [role])

  useEffect(() => {
    try { localStorage.setItem('org_selected_outlet', selectedOutletId) } catch {}
  }, [selectedOutletId])

  const setOutlets = (list: Outlet[]) => {
    _setOutlets(list)
    try { localStorage.setItem('org_outlets', JSON.stringify(list)) } catch {}
    // ensure a valid selection exists
    if (!list.find(o => o.id === selectedOutletId)) {
      setSelectedOutletId(list[0]?.id || '')
    }
  }

  const value = { role, setRole, outlets, setOutlets, selectedOutletId, setSelectedOutletId, selectedOutlet }
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
