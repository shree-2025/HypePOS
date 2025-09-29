import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SalesChart from '@/components/charts/SalesChart'
import Button from '@/components/ui/Button'
import StatCard from '@/components/dashboard/StatCard'
import PageHeader from '@/components/layout/PageHeader'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  type TopSeller = { id: string; product: string; sku: string; pairs: number; revenue: string }
  type LowStock = { id: string; product: string; sku: string; size: string; stock: number }

  const topSellers: TopSeller[] = [
    { id: 'ts1', product: 'Runner Pro', sku: 'SH-1001', pairs: 28, revenue: '₹ 56,000' },
    { id: 'ts2', product: 'Urban Walk', sku: 'SH-1204', pairs: 22, revenue: '₹ 44,800' },
    { id: 'ts3', product: 'Classic Leather', sku: 'SH-1302', pairs: 16, revenue: '₹ 64,000' },
  ]
  const tsCols: Column<TopSeller>[] = [
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    { header: 'Pairs Sold', key: 'pairs', className: 'text-right' },
    { header: 'Revenue', key: 'revenue', className: 'text-right' },
  ]

  const lowStock: LowStock[] = [
    { id: 'ls1', product: 'Runner Pro', sku: 'SH-1001', size: 'UK 8', stock: 3 },
    { id: 'ls2', product: 'Urban Walk', sku: 'SH-1204', size: 'UK 7', stock: 2 },
    { id: 'ls3', product: 'Trail Max', sku: 'SH-1150', size: 'UK 9', stock: 1 },
  ]
  const lsCols: Column<LowStock>[] = [
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    { header: 'Size', key: 'size' },
    { header: 'Stock', key: 'stock', className: 'text-right' },
  ]

  return (
    <Shell>
      <PageHeader
        title="Retail POS Dashboard"
        subtitle="Overview of today’s sales and inventory health."
        actions={(
          <Link to="/sales">
            <Button variant="outline">Open Register</Button>
          </Link>
        )}
      />

      {/* POS KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today Revenue" value="₹ 1,42,350" />
        <StatCard title="Orders" value="128" />
        <StatCard title="Avg Basket" value="₹ 1,112" />
        <StatCard title="Gross Margin" value="38%" />
      </div>

      {/* Sales chart and quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Sales Performance (Last 7 days)" className="xl:col-span-2">
          <SalesChart />
        </Card>
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/sales"><Button variant="outline">New Sale</Button></Link>
            <Link to="/central-inventory"><Button variant="outline">Stock Count</Button></Link>
            <Link to="/central-inventory"><Button variant="outline">Receive Shipment</Button></Link>
            <Link to="/reports"><Button variant="outline">Low-Stock Report</Button></Link>
          </div>
        </Card>
      </div>

      {/* Top sellers and low stock */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Top Sellers (Today)" className="lg:col-span-2">
          <SimpleTable columns={tsCols} data={topSellers} />
        </Card>
        <Card title="Low Stock Alerts">
          <SimpleTable columns={lsCols} data={lowStock} />
        </Card>
      </div>
    </Shell>
  )
}
