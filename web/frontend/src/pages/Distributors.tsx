import { useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Input from '@/components/ui/Input'

export default function Distributors() {
  type Distributor = {
    id: string
    name: string
    email: string
    location: string
    totalStock: number
  }

  const [distributors, setDistributors] = useState<Distributor[]>([
    { id: 'd1', name: 'Alpha Distributors', email: 'alpha@distrib.example', location: 'Mumbai, MH', totalStock: 1240 },
    { id: 'd2', name: 'Beta Footwear Supply', email: 'beta@supply.example', location: 'Pune, MH', totalStock: 780 },
    { id: 'd3', name: 'Gamma Trade Co', email: 'gamma@trade.example', location: 'Surat, GJ', totalStock: 560 },
  ])

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [totalStock, setTotalStock] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; location?: string; totalStock?: string }>({})

  const columns: Column<Distributor>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Location', key: 'location' },
    { header: 'Total Stock', key: 'totalStock', className: 'text-right' },
  ]

  const onAddDistributor = () => setOpen(true)

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!name) errs.name = 'Name is required'
    if (!email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
    if (!location) errs.location = 'Location is required'
    const stockNum = Number(totalStock)
    if (!totalStock) errs.totalStock = 'Total stock is required'
    else if (Number.isNaN(stockNum) || stockNum < 0) errs.totalStock = 'Enter a valid non-negative number'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const id = `d${Date.now()}`
    setDistributors(prev => [...prev, { id, name, email, location, totalStock: stockNum }])
    setOpen(false)
    setName('')
    setEmail('')
    setLocation('')
    setTotalStock('')
    setErrors({})
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Distributors</h1>
          <p className="text-sm text-gray-500">Manage distributors and their inventory allocations.</p>
        </div>
        <Button onClick={onAddDistributor}>Add Distributor</Button>
      </div>

      <div className="mt-6">
        <Card title="All Distributors">
          <SimpleTable columns={columns} data={distributors} />
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add Distributor</h2>
            <p className="mt-1 text-sm text-gray-500">Enter distributor details below.</p>
            <form className="mt-4 space-y-3" onSubmit={onSave}>
              <Input label="Name" value={name} onChange={(e: any) => setName(e.target.value)} error={errors.name} />
              <Input label="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} error={errors.email} />
              <Input label="Location" value={location} onChange={(e: any) => setLocation(e.target.value)} error={errors.location} />
              <Input label="Total Stock" value={totalStock} onChange={(e: any) => setTotalStock(e.target.value)} placeholder="0" error={errors.totalStock} />
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
