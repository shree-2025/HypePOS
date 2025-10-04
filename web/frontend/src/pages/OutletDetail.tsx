import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { useParams } from 'react-router-dom'
import { useOrg } from '@/context/org'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import SalesChart from '@/components/charts/SalesChart'

export default function OutletDetail() {
  const { id } = useParams<{ id: string }>()
  const { outlets } = useOrg()
  const outlet = outlets.find(o => o.id === id)

  type Row = { id: string; sku: string; name: string; stock: number; sold: number; remaining: number; price: string }
  const data: Row[] = [
    { id: 'p1', sku: 'SKU-001', name: 'Running Shoes', stock: 120, sold: 45, remaining: 75, price: '₹ 2,499' },
    { id: 'p2', sku: 'SKU-002', name: 'Casual Sneakers', stock: 90, sold: 30, remaining: 60, price: '₹ 1,999' },
    { id: 'p3', sku: 'SKU-003', name: 'Leather Boots', stock: 60, sold: 12, remaining: 48, price: '₹ 3,499' },
  ]

  const columns: Column<Row>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Product', key: 'name' },
    { header: 'Stock', key: 'stock' },
    { header: 'Sold', key: 'sold' },
    { header: 'Remaining', key: 'remaining' },
    { header: 'Unit Price', key: 'price' },
  ]

  return (
    <Shell>
      <PageHeader
        title={`Outlet: ${outlet?.name || id}`}
        subtitle="View stock, sold qty, price and remaining inventory for this outlet."
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="SKUs" value={String(data.length)} />
        <StatCard title="Total Stock" value={String(data.reduce((s, r) => s + r.stock, 0))} />
        <StatCard title="Sold" value={String(data.reduce((s, r) => s + r.sold, 0))} />
        <StatCard title="Remaining" value={String(data.reduce((s, r) => s + r.remaining, 0))} />
      </div>

      <Card title="Products at this Outlet">
        <SimpleTable columns={columns} data={data} />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sales Trend" className="lg:col-span-2">
          <SalesChart />
        </Card>
        <Card title="Notes">
          <div className="text-sm text-gray-600">Add operational notes, delivery schedules, or special promos for this outlet.</div>
        </Card>
      </div>
    </Shell>
  )
}
