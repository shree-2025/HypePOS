import { NavLink } from 'react-router-dom'
import { useUI } from '@/context/ui'
import { useOrg } from '@/context/org'
import logo from '@/public/hype_logo.png'
import {
  HiOutlineHome,
  HiOutlineShoppingCart,
  HiOutlineTag,
  HiOutlineSupport,
  HiOutlineOfficeBuilding,
  HiOutlineDocumentReport,
  HiOutlineRefresh,
  HiOutlineCube,
  HiOutlineChat
} from 'react-icons/hi'

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useUI()
  const { role, selectedOutlet } = useOrg()
  const roleLabel = role === 'admin' ? 'Outlet Admin' : role === 'master' ? 'Master' : role === 'distributor' ? 'Distributor' : role === 'salers' ? 'Seller' : 'User'
  const widthClass = sidebarCollapsed ? 'w-16' : 'w-64'
  const iconFor = (name: string) => {
    switch (name) {
      case 'Dashboard':
        return (<HiOutlineHome size={18} />)
      case 'Sales':
        return (<HiOutlineShoppingCart size={18} />)
      case 'Inventory':
        return (<HiOutlineCube size={18} />)
      case 'Stock':
      case 'Stock Management':
      case 'Item Master':
        return (<HiOutlineCube size={18} />)
      case 'Add Items':
        return (<HiOutlineCube size={18} />)
      case 'Categories':
        return (<HiOutlineTag size={18} />)
      case 'Colors':
        return (<HiOutlineTag size={18} />)
      case 'Brands':
        return (<HiOutlineTag size={18} />)
      case 'Employees':
        return (<HiOutlineOfficeBuilding size={18} />)
      case 'Billing':
        return (<HiOutlineShoppingCart size={18} />)
      case 'Promotions':
        return (<HiOutlineTag size={18} />)
      case 'Support':
        return (<HiOutlineSupport size={18} />)
      case 'Messages':
        return (<HiOutlineChat size={18} />)
      case 'Outlets':
        return (<HiOutlineOfficeBuilding size={18} />)
      case 'Distributors':
        return (<HiOutlineOfficeBuilding size={18} />)
      case 'Central Inventory':
        return (<HiOutlineCube size={18} />)
      case 'Supply':
        return (<HiOutlineRefresh size={18} />)
      case 'Reports':
        return (<HiOutlineDocumentReport size={18} />)
      case 'Total Stock':
        return (<HiOutlineCube size={18} />)
      default:
        return (<span className="inline-block h-4 w-4 rounded-sm bg-gray-300" />)
    }
  }

  const links = (() => {
    if (role === 'salers') {
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/sales', label: 'Sales' },
        { to: '/total-stock', label: 'Total Stock' },
        { to: '/messages', label: 'Messages' },
        { to: '/reports', label: 'Reports' },
      ]
    }
    if (role === 'master') {
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/outlets', label: 'Outlets' },
        { to: '/distributors', label: 'Distributors' },
        { to: '/central-inventory', label: 'Central Inventory' },
        { to: '/reports', label: 'Reports' },
        { to: '/messages', label: 'Messages' },
      ]
    }
    // admin/distributor/master default
    if (role === 'admin') {
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/stock', label: 'Stock Management' },
        { to: '/accept-items', label: 'Accept Items' },
        { to: '/total-stock', label: 'Total Stock' },
        { to: '/billing', label: 'Sales' },
        { to: '/stock-transfer', label: 'Supply' },
        { to: '/employees', label: 'Employees' },
        { to: '/messages', label: 'Messages' },
        { to: '/reports', label: 'Reports' },
      ]
    }
    return [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/colours', label: 'Colors' },
      { to: '/brands', label: 'Brands' },
      { to: '/stock', label: 'Stock Management' },
      { to: '/stock-transfer', label: 'Supply' },
      { to: '/messages', label: 'Messages' },
      { to: '/reports', label: 'Reports' },
    ]
  })()
  const content = (
    <div className={`flex h-full ${widthClass} flex-col border-r border-black bg-black shadow-soft transition-[width] duration-200`}>
      {/* Logo block */}
      <div className={`px-4 pt-5 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="HypePOS" className="h-16 w-16 object-contain" />
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-semibold text-white">HYPEPOS</div>
              <div className="text-xs text-gray-400">Inventory & Billing</div>
            </div>
          )}
        </div>
      </div>
      {/* Org/user block */}
      <div className={`px-4 py-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gray-700" />
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-medium text-white">{(role === 'distributor') ? 'Distribution Center' : roleLabel}</div>
              <div className="text-[11px] text-gray-400">{selectedOutlet?.name || 'Store'}</div>
            </div>
          )}
        </div>
      </div>
      {!sidebarCollapsed && (
        <div className="px-4 pb-2 text-[11px] uppercase tracking-wide text-accent">Menu</div>
      )}
      <nav className="flex-1 px-2 py-3 space-y-1.5">
        {links
          .map((l) => {
            const displayLabel = (role === 'distributor' && l.to === '/stock') ? 'Item Master' : l.label
            return (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => setSidebarOpen(false)}
            title={displayLabel}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                isActive
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-accent hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-inherit">{iconFor(displayLabel)}</span>
            <span className={`${sidebarCollapsed ? 'hidden' : 'inline-block'}`}>{displayLabel}</span>
          </NavLink>
        )})}
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

