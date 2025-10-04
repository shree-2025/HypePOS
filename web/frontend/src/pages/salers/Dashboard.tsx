import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import StatCard from '@/components/dashboard/StatCard'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { Link } from 'react-router-dom'
import { useOrg } from '@/context/org'

export default function SellerDashboard() {
  const { selectedOutlet } = useOrg()

  // Mocked data; in real app, fetch seller KPIs and outlet stock total from API
  const totalOutletStock = 1240
  const todayRevenue = '₹ 18,750'
  const orders = 36
  const avgBasket = '₹ 521'

  type Perf = { id: string; metric: string; value: string }
  const performance: Perf[] = [
    { id: 'p1', metric: 'Bills Today', value: String(orders) },
    { id: 'p2', metric: 'Revenue Today', value: todayRevenue },
    { id: 'p3', metric: 'Items Sold', value: '84' },
  ]
  const perfCols: Column<Perf>[] = [
    { header: 'Metric', key: 'metric' },
    { header: 'Value', key: 'value', className: 'text-right' },
  ]

  return (
    <Shell>
      <PageHeader
        title={selectedOutlet ? `${selectedOutlet.name} — Seller Dashboard` : 'Seller Dashboard'}
        subtitle="Focused view for sales: outlet stock total and your performance."
        actions={(
          <div className="flex gap-2">
            <Link to="/sales"><Button variant="primary">Open Register</Button></Link>
            <Link to="/reports"><Button variant="outline">Sales Report</Button></Link>
          </div>
        )}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today Revenue" value={todayRevenue} />
        <StatCard title="Orders" value={String(orders)} />
        <StatCard title="Avg Basket" value={avgBasket} />
        <StatCard title="Total Outlet Stock" value={String(totalOutletStock)} />
      </div>

      {/* Performance table */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Your Performance" className="lg:col-span-2">
          <SimpleTable columns={perfCols} data={performance} />
        </Card>
        <Card title="Shortcuts">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/sales"><Button variant="outline">New Sale</Button></Link>
            <Link to="/reports"><Button variant="outline">Daily Report</Button></Link>
          </div>
        </Card>
      </div>

      {/* Info card about stock visibility restrictions */}
      <div className="mt-6">
        <Card title="Stock Visibility">
          <p className="text-sm text-gray-600">
            You can view only the total stock available for your outlet. For detailed stock management or transfers,
            please contact your outlet admin.
          </p>
        </Card>
      </div>
    </Shell>
  )
}
