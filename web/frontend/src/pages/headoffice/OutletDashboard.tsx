import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import StatCard from '@/components/dashboard/StatCard'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { Link } from 'react-router-dom'
import { useOrg } from '@/context/org'

export default function OutletDashboard() {
  const { selectedOutlet } = useOrg()

  type Task = { id: string; title: string; due: string; status: string }
  const tasks: Task[] = [
    { id: 't1', title: 'Receive shipment SHP-482', due: 'Today', status: 'Pending' },
    { id: 't2', title: 'Price update: Casual Sneakers', due: 'Today', status: 'In Progress' },
    { id: 't3', title: 'Cycle count — Aisle 2', due: 'Tomorrow', status: 'Scheduled' },
  ]
  const taskCols: Column<Task>[] = [
    { header: 'Task', key: 'title' },
    { header: 'Due', key: 'due' },
    { header: 'Status', key: 'status' },
  ]

  type LowStock = { id: string; product: string; sku: string; size: string; stock: number }
  const lowStock: LowStock[] = [
    { id: 'ls1', product: 'Runner Pro', sku: 'SH-1001', size: 'UK 8', stock: 2 },
    { id: 'ls2', product: 'Urban Walk', sku: 'SH-1204', size: 'UK 7', stock: 1 },
  ]
  const lowCols: Column<LowStock>[] = [
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    { header: 'Size', key: 'size' },
    { header: 'Stock', key: 'stock', className: 'text-right' },
  ]

  return (
    <Shell>
      <PageHeader
        title={selectedOutlet ? `${selectedOutlet.name} — Outlet Dashboard` : 'Outlet Dashboard'}
        subtitle="Your daily store overview: sales, stock health, and actions."
        actions={(
          <div className="flex gap-2">
            <Link to="/sales"><Button variant="primary">Open Register</Button></Link>
            <Link to="/stock-transfer"><Button variant="outline">Request Stock</Button></Link>
            <Link to="/messages"><Button variant="outline">Contact Distributor</Button></Link>
          </div>
        )}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today Revenue" value="₹ 32,450" />
        <StatCard title="Orders" value="48" />
        <StatCard title="Avg Basket" value="₹ 676" />
        <StatCard title="Low Stock" value={String(lowStock.length)} />
      </div>

      {/* Action panel and tasks */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Quick Actions" className="xl:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/stock"><Button variant="outline">Stock Check</Button></Link>
            <Link to="/stock-transfer"><Button variant="outline">Receive Shipment</Button></Link>
            <Link to="/reports"><Button variant="outline">Sales Report</Button></Link>
            <Link to="/messages"><Button variant="outline">Team Chat</Button></Link>
          </div>
        </Card>
        <Card title="Store Tasks" className="xl:col-span-2">
          <SimpleTable columns={taskCols} data={tasks} />
        </Card>
      </div>

      {/* Low stock */}
      <div className="mt-6">
        <Card title="Low Stock Alerts">
          <SimpleTable columns={lowCols} data={lowStock} />
        </Card>
      </div>
    </Shell>
  )
}
