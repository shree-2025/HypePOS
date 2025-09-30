import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Sales from '@/pages/Sales'
import Promotions from '@/pages/Promotions'
import Support from '@/pages/Support'
import Outlets from '@/pages/Outlets'
import OutletDetail from '@/pages/OutletDetail'
import CentralInventory from '@/pages/CentralInventory'
import StockTransfer from '@/pages/StockTransfer'
import Stock from '@/pages/Stock'
import Reports from '@/pages/Reports'
import Profile from '@/pages/Profile'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import EditProfile from '@/pages/EditProfile'
import Distributors from '@/pages/Distributors'
import { useOrg } from '@/context/org'
import AddItems from '@/pages/AddItems'
import Categories from '@/pages/Categories'
import Messages from '@/pages/Messages'

export const RouterProvider = () => {
  const { role } = useOrg()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/stock" element={<Stock />} />
      <Route path="/sales" element={role === 'master' ? <Navigate to="/dashboard" replace /> : <Sales />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/add-items" element={(role === 'master' || role === 'admin') ? <Navigate to="/dashboard" replace /> : <AddItems />} />
      <Route path="/categories" element={(role === 'master' || role === 'admin') ? <Navigate to="/dashboard" replace /> : <Categories />} />
      <Route path="/support" element={<Support />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/outlets" element={<Outlets />} />
      <Route path="/outlets/:id" element={<OutletDetail />} />
      <Route path="/distributors" element={<Distributors />} />
      <Route path="/central-inventory" element={<CentralInventory />} />
      <Route path="/stock-transfer" element={<StockTransfer />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

