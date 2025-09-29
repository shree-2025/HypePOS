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
import Reports from '@/pages/Reports'
import Profile from '@/pages/Profile'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import EditProfile from '@/pages/EditProfile'

export const RouterProvider = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/support" element={<Support />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/outlets" element={<Outlets />} />
      <Route path="/outlets/:id" element={<OutletDetail />} />
      <Route path="/central-inventory" element={<CentralInventory />} />
      <Route path="/stock-transfer" element={<StockTransfer />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
