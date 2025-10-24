import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import ResetPassword from '@/pages/ResetPassword'
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
import SupplyRequest from '@/pages/distributor/SupplyRequest'
import OutletStockTransfer from '@/pages/outlet/StockTransfer'
import OutletEmployees from '@/pages/outlet/Employees'
import OutletBilling from '@/pages/outlet/Billing'
import OutletTotalStock from '@/pages/outlet/TotalStock'
import DistributorReports from '@/pages/distributor/Reports'
import OutletReports from '@/pages/outlet/Reports'
import DistributorMessages from '@/pages/distributor/Messages'
import OutletMessages from '@/pages/outlet/Messages'
import AcceptItems from '@/pages/outlet/AcceptItems'
import Profile from '@/pages/Profile'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import EditProfile from '@/pages/EditProfile'
import Distributors from '@/pages/Distributors'
import { useOrg } from '@/context/org'
import AddItems from '@/pages/AddItems'
import Categories from '@/pages/Categories'
import Colours from '@/pages/distributor/Colours'
import Brands from '@/pages/distributor/Brands'

export const RouterProvider = () => {
  const { role } = useOrg()
  const mustChange = (() => {
    try { return localStorage.getItem('mustChangePassword') === 'true' } catch { return false }
  })()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={mustChange ? <ResetPassword /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'admin' ? <OutletDashboard /> : role === 'salers' ? <SellerDashboard /> : <DistributorDashboard />)} />
      <Route path="/stock" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'admin' ? <OutletStock /> : role === 'salers' ? <Navigate to="/dashboard" replace /> : <DistributorStock />)} />
      <Route path="/sales" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'master' ? <Navigate to="/dashboard" replace /> : <Sales />)} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/add-items" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'master' ? <Navigate to="/dashboard" replace /> : <AddItems />)} />
      <Route path="/categories" element={mustChange ? <Navigate to="/reset-password" replace /> : ((role === 'master' || role === 'admin') ? <Navigate to="/dashboard" replace /> : <Categories />)} />
      <Route path="/support" element={<Support />} />
      <Route path="/messages" element={mustChange ? <Navigate to="/reset-password" replace /> : ((role === 'admin' || role === 'salers') ? <OutletMessages /> : <DistributorMessages />)} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={mustChange ? <Navigate to="/reset-password" replace /> : <Settings />} />
      <Route path="/outlets" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'master' ? <Outlets /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/outlets/:id" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'master' ? <OutletDetail /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/distributors" element={<Distributors />} />
      <Route path="/central-inventory" element={<CentralInventory />} />
      <Route path="/stock-transfer" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'admin' ? <OutletStockTransfer /> : role === 'salers' ? <Navigate to="/dashboard" replace /> : <DistributorStockTransfer />)} />
      <Route path="/accept-items" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'admin' ? <AcceptItems /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/supply" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'distributor' ? <SupplyRequest /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/employees" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'admin' ? <OutletEmployees /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/billing" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'admin' ? <OutletBilling /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/total-stock" element={mustChange ? <Navigate to="/reset-password" replace /> : ((role === 'admin' || role === 'salers') ? <OutletTotalStock /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/reports" element={mustChange ? <Navigate to="/reset-password" replace /> : ((role === 'admin' || role === 'salers') ? <OutletReports /> : <DistributorReports />)} />
      <Route path="/colours" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'distributor' ? <Colours /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/brands" element={mustChange ? <Navigate to="/reset-password" replace /> : (role === 'distributor' ? <Brands /> : <Navigate to="/dashboard" replace />)} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

