import { useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Button from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { useOrg } from '@/context/org'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'

export default function Outlets() {
  const { outlets } = useOrg()

  type Row = { id: string; name: string; email?: string; code: string; stock: number; remaining: number }
  const initialData: Row[] = useMemo(() => outlets.map((o, i) => ({ id: o.id, name: o.name, code: o.code, stock: 1000 - i * 120, remaining: 1000 - i * 120 })), [outlets])
  const [rows, setRows] = useState<Row[]>(initialData)

  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [stock, setStock] = useState('')
  const [errors, setErrors] = useState<{ code?: string; name?: string; email?: string; stock?: string }>({})

  const columns: Column<Row>[] = [
    { header: 'Code', key: 'code' },
    { header: 'Outlet', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Stock', key: 'stock' },
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
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add Outlet</Button>}
      />
      <Card>
        <SimpleTable columns={columns} data={rows} />
      </Card>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add Outlet</h2>
            <p className="mt-1 text-sm text-gray-500">Create a new outlet with initial stock figures.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const errs: typeof errors = {}
                if (!code) errs.code = 'Code is required'
                if (!name) errs.name = 'Outlet name is required'
                if (!email) errs.email = 'Email is required'
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
                const stockNum = Number(stock)
                if (!stock) errs.stock = 'Stock is required'
                else if (Number.isNaN(stockNum) || stockNum < 0) errs.stock = 'Enter a valid non-negative number'
                setErrors(errs)
                if (Object.keys(errs).length) return

                const remaining = stockNum
                const id = `out-${Date.now()}`
                setRows(prev => [...prev, { id, name, email, code, stock: stockNum, remaining }])
                setOpen(false)
                setCode('')
                setName('')
                setEmail('')
                setStock('')
                setErrors({})
              }}
            >
              <Input label="Code" value={code} onChange={(e: any) => setCode(e.target.value)} placeholder="S03" error={errors.code} />
              <Input label="Outlet Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Outlet 03" error={errors.name} />
              <Input label="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="outlet@example.com" error={errors.email} />
              <Input label="Stock" value={stock} onChange={(e: any) => setStock(e.target.value)} placeholder="0" error={errors.stock} />
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
