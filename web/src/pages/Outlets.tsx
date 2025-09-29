import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Button from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { useOrg } from '@/context/org'
import PageHeader from '@/components/layout/PageHeader'

export default function Outlets() {
  const { outlets } = useOrg()

  type Row = { id: string; name: string; code: string; stock: number; sold: number; remaining: number }
  const data: Row[] = outlets.map((o, i) => ({ id: o.id, name: o.name, code: o.code, stock: 1000 - i * 120, sold: 300 + i * 30, remaining: 700 - i * 90 }))

  const columns: Column<Row>[] = [
    { header: 'Code', key: 'code' },
    { header: 'Outlet', key: 'name' },
    { header: 'Stock', key: 'stock' },
    { header: 'Sold', key: 'sold' },
    { header: 'Remaining', key: 'remaining' },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Link to={`/outlets/${row.id}`}>
          <Button variant="outline">View</Button>
        </Link>
      )
    },
  ]

  return (
    <Shell>
      <PageHeader
        title="Outlets"
        subtitle="Manage your shops and view stock, sales and remaining inventory."
        actions={<Button variant="primary">Add Outlet</Button>}
      />
      <Card>
        <SimpleTable columns={columns} data={data} />
      </Card>
    </Shell>
  )
}
