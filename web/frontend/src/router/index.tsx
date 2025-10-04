import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import DistributorDashboard from '@/pages/distributor/Dashboard'
import OutletDashboard from '@/pages/outlet/Dashboard'
import SellerDashboard from '@/pages/salers/Dashboard'
import Sales from '@/pages/Sales'
import Promotions from '@/pages/Promotions'
import Support from '@/pages/Support'
import Outlets from '@/pages/Outlets'
import OutletDetail from '@/pages/OutletDetail'
import CentralInventory from '@/pages/CentralInventory'
import DistributorStock from '@/pages/distributor/Stock'
import OutletStock from '@/pages/outlet/Stock'
import DistributorStockTransfer from '@/pages/distributor/StockTransfer'
import OutletStockTransfer from '@/pages/outlet/StockTransfer'
import OutletEmployees from '@/pages/outlet/Employees'
import OutletBilling from '@/pages/outlet/Billing'
import OutletTotalStock from '@/pages/outlet/TotalStock'
import DistributorReports from '@/pages/distributor/Reports'
import OutletReports from '@/pages/outlet/Reports'
import DistributorMessages from '@/pages/distributor/Messages'
import OutletMessages from '@/pages/outlet/Messages'
import Profile from '@/pages/Profile'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import EditProfile from '@/pages/EditProfile'
import Distributors from '@/pages/Distributors'
import { useOrg } from '@/context/org'
import AddItems from '@/pages/AddItems'
import Categories from '@/pages/Categories'

export const RouterProvider = () => {
  const { role } = useOrg()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={role === 'admin' ? <OutletDashboard /> : role === 'salers' ? <SellerDashboard /> : <DistributorDashboard />} />
      <Route path="/stock" element={role === 'admin' ? <OutletStock /> : role === 'salers' ? <Navigate to="/dashboard" replace /> : <DistributorStock />} />
      <Route path="/sales" element={role === 'master' ? <Navigate to="/dashboard" replace /> : <Sales />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/add-items" element={role === 'master' ? <Navigate to="/dashboard" replace /> : <AddItems />} />
      <Route path="/categories" element={(role === 'master' || role === 'admin') ? <Navigate to="/dashboard" replace /> : <Categories />} />
      <Route path="/support" element={<Support />} />
      <Route path="/messages" element={(role === 'admin' || role === 'salers') ? <OutletMessages /> : <DistributorMessages />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/outlets" element={role === 'master' ? <Outlets /> : <Navigate to="/dashboard" replace />} />
      <Route path="/outlets/:id" element={role === 'master' ? <OutletDetail /> : <Navigate to="/dashboard" replace />} />
      <Route path="/distributors" element={<Distributors />} />
      <Route path="/central-inventory" element={<CentralInventory />} />
      <Route path="/stock-transfer" element={role === 'admin' ? <OutletStockTransfer /> : role === 'salers' ? <Navigate to="/dashboard" replace /> : <DistributorStockTransfer />} />
      <Route path="/employees" element={role === 'admin' ? <OutletEmployees /> : <Navigate to="/dashboard" replace />} />
      <Route path="/billing" element={role === 'admin' ? <OutletBilling /> : <Navigate to="/dashboard" replace />} />
      <Route path="/total-stock" element={(role === 'admin' || role === 'salers') ? <OutletTotalStock /> : <Navigate to="/dashboard" replace />} />
      <Route path="/reports" element={(role === 'admin' || role === 'salers') ? <OutletReports /> : <DistributorReports />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

