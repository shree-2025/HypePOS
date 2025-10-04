import React, { createContext, useContext, useState, PropsWithChildren } from 'react'

type UIContextType = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const toggleSidebar = () => setSidebarOpen((s) => !s)
  const toggleSidebarCollapsed = () => setSidebarCollapsed((c) => !c)
  return (
    <UIContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar, sidebarCollapsed, setSidebarCollapsed, toggleSidebarCollapsed }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
