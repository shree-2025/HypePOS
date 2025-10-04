import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import SalesChart from '@/components/charts/SalesChart'
import StatCard from '@/components/dashboard/StatCard'

export default function Reports() {
  type Row = { id: string; name: string; period: string; outlet: string; createdAt: string }
  const data: Row[] = [
    { id: 'r1', name: 'Monthly Sales', period: 'Aug 2025', outlet: 'All Outlets', createdAt: '2025-09-01' },
    { id: 'r2', name: 'Inventory Snapshot', period: 'Aug 2025', outlet: 'HQ', createdAt: '2025-09-01' },
    { id: 'r3', name: 'Outlet Performance', period: 'Q2 2025', outlet: 'Outlet 01', createdAt: '2025-07-01' },
  ]

  const columns: Column<Row>[] = [
    { header: 'Report', key: 'name' },
    { header: 'Period', key: 'period' },
    { header: 'Outlet', key: 'outlet' },
    { header: 'Created At', key: 'createdAt' },
  ]

  return (
    <Shell>
      <PageHeader
        title="Reports"
        subtitle="Generate and download outlet-wise and organization-wide reports."
        actions={<Button variant="outline">Generate Report</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available Reports" value={String(data.length)} />
        <StatCard title="Last 30d Reports" value="6" />
        <StatCard title="Scheduled" value="2" />
        <StatCard title="Downloads" value="124" />
      </div>

      <Card title="Recent Reports">
        <SimpleTable columns={columns} data={data} />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sales by Month" className="lg:col-span-2">
          <SalesChart />
        </Card>
        <Card title="Quick Filters">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Button variant="outline">This Month</Button>
            <Button variant="outline">Last Month</Button>
            <Button variant="outline">Quarter</Button>
            <Button variant="outline">Year</Button>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
