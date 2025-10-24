import React from 'react'
import Button from '@/components/ui/Button'
import { useUI } from '@/context/ui'
import { Link } from 'react-router-dom'

export default function Header() {
  const { toggleSidebar, toggleSidebarCollapsed } = useUI()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])
  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between px-4 shadow-soft bg-black text-white">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 hover:bg-white/10"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-white"><path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/></svg>
        </button>
        <button
          className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 hover:bg-white/10"
          onClick={toggleSidebarCollapsed}
          aria-label="Collapse/expand sidebar"
          title="Collapse/expand sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-white"><path fill="currentColor" d="M7 7h2v10H7V7m4 0h2v10h-2V7m4 0h2v10h-2V7Z"/></svg>
        </button>
        {/* brand/logo and search removed per request */}
      </div>
      <div className="flex items-center gap-2 relative" ref={menuRef}>
        <Link to="/support" className="inline-flex">
          <Button variant="outline" className="!bg-transparent !border-white/30 !text-white hover:!bg-white/10">Support</Button>
        </Link>
        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 hover:bg-white/10" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-white"><path fill="currentColor" d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2m6-6v-5a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z"/></svg>
        </button>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-2 hover:bg-white/10"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="inline-block h-6 w-6 rounded-full bg-white/90" />
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-white"><path fill="currentColor" d="M7 10l5 5l5-5z"/></svg>
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-12 z-30 w-48 rounded-md bg-white py-1 shadow-lg text-gray-800">
            <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/profile/edit" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setMenuOpen(false)}>Edit Profile</Link>
            <Link to="/notifications" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setMenuOpen(false)}>Notifications</Link>
            <Link to="/settings" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setMenuOpen(false)}>Settings</Link>
            <Link to="/login" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setMenuOpen(false)}>Sign out</Link>
          </div>
        )}
      </div>
    </header>
  )
}
