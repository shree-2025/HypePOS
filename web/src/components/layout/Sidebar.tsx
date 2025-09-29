import { NavLink } from 'react-router-dom'
import { useUI } from '@/context/ui'
import { useOrg } from '@/context/org'
import {
  HiOutlineHome,
  HiOutlineShoppingCart,
  HiOutlineTag,
  HiOutlineSupport,
  HiOutlineOfficeBuilding,
  HiOutlineDocumentReport,
  HiOutlineRefresh,
  HiOutlineCube
} from 'react-icons/hi'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/sales', label: 'Sales' },
  { to: '/promotions', label: 'Promotions' },
  { to: '/support', label: 'Support' },
  // master-only
  { to: '/outlets', label: 'Outlets' },
  { to: '/central-inventory', label: 'Central Inventory' },
  { to: '/stock-transfer', label: 'Stock Transfer' },
  { to: '/reports', label: 'Reports' },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useUI()
  const { role } = useOrg()
  const widthClass = sidebarCollapsed ? 'w-16' : 'w-64'
  const iconFor = (name: string) => {
    switch (name) {
      case 'Dashboard':
        return (<HiOutlineHome size={18} />)
      case 'Sales':
        return (<HiOutlineShoppingCart size={18} />)
      case 'Inventory':
        return (<HiOutlineCube size={18} />)
      case 'Promotions':
        return (<HiOutlineTag size={18} />)
      case 'Support':
        return (<HiOutlineSupport size={18} />)
      case 'Outlets':
        return (<HiOutlineOfficeBuilding size={18} />)
      case 'Central Inventory':
        return (<HiOutlineCube size={18} />)
      case 'Stock Transfer':
        return (<HiOutlineRefresh size={18} />)
      case 'Reports':
        return (<HiOutlineDocumentReport size={18} />)
      default:
        return (<span className="inline-block h-4 w-4 rounded-sm bg-gray-300" />)
    }
  }
  const content = (
    <div className={`flex h-full ${widthClass} flex-col border-r bg-sidebarBg shadow-soft dark:bg-gray-900 dark:border-gray-800 transition-[width] duration-200`}>
      {/* Logo block */}
      <div className={`px-4 pt-4 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-headerBlue/90" />
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-semibold text-headerBlue">Retail POS</div>
              <div className="text-xs text-gray-700/70">Inventory & Billing</div>
            </div>
          )}
        </div>
      </div>
      {/* Org/user block */}
      <div className={`px-4 py-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gray-200" />
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-medium text-gray-800">Store HQ</div>
              <div className="text-[11px] text-gray-500">Admin</div>
            </div>
          )}
        </div>
      </div>
      {!sidebarCollapsed && (
        <div className="px-4 pb-2 text-[11px] uppercase tracking-wide text-gray-400">Menu</div>
      )}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {links
          .filter(l => {
            const masterOnly = ['/outlets', '/central-inventory', '/stock-transfer', '/reports']
            if (masterOnly.includes(l.to)) return role === 'master'
            return true
          })
          .map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => setSidebarOpen(false)}
            title={l.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                isActive
                  ? 'bg-white text-headerBlue shadow-soft dark:bg-gray-800'
                  : 'text-headerBlue hover:bg-white/70 dark:text-gray-200 dark:hover:bg-gray-800'
              }`
            }
          >
            <span className="text-inherit">{iconFor(l.label)}</span>
            <span className={`${sidebarCollapsed ? 'hidden' : 'inline-block'}`}>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block" aria-label="Sidebar desktop">
        {content}
      </aside>
      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 z-40 animate-slide-in">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
