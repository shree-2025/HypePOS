import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import SalesChart from '@/components/charts/SalesChart'

export default function StockTransfer() {
  type Row = { id: string; sku: string; product: string; from: string; to: string; qty: number; status: string }
  const data: Row[] = [
    { id: 't1', sku: 'SKU-001', product: 'Running Shoes', from: 'HQ', to: 'S01', qty: 20, status: 'Completed' },
    { id: 't2', sku: 'SKU-002', product: 'Casual Sneakers', from: 'S01', to: 'S02', qty: 10, status: 'Pending' },
    { id: 't3', sku: 'SKU-003', product: 'Leather Boots', from: 'HQ', to: 'S02', qty: 8, status: 'Completed' },
  ]

  const columns: Column<Row>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Product', key: 'product' },
    { header: 'From', key: 'from' },
    { header: 'To', key: 'to' },
    { header: 'Qty', key: 'qty' },
    { header: 'Status', key: 'status' },
  ]

  return (
    <Shell>
      <PageHeader
        title="Stock Transfer"
        subtitle="Move inventory between outlets."
        actions={<Button>New Transfer</Button>}
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Transfers" value={String(data.length)} />
        <StatCard title="Pending" value={String(data.filter(d => d.status === 'Pending').length)} />
        <StatCard title="Completed" value={String(data.filter(d => d.status === 'Completed').length)} />
        <StatCard title="Units Moved" value={String(data.reduce((s, r) => s + r.qty, 0))} />
      </div>

      <Card title="Transfer History">
        <SimpleTable columns={columns} data={data} />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Transfers by Day" className="lg:col-span-2">
          <SalesChart />
        </Card>
        <Card title="Recent Activity">
          <ul className="list-disc list-inside text-sm text-gray-700">
            <li>Completed transfer t1 from HQ to S01 (20 units)</li>
            <li>Pending transfer t2 from S01 to S02 (10 units)</li>
            <li>Completed transfer t3 from HQ to S02 (8 units)</li>
          </ul>
        </Card>
      </div>
    </Shell>
  )
}
