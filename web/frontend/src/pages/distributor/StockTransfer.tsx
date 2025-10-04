import { useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { useOrg } from '@/context/org'

type Status = 'Pending' | 'Shipped' | 'Received' | 'Confirmed'

type Transfer = {
  id: string
  date: string
  category: string
  product: string
  sku: string
  stockId: string
  size: string
  colour: string
  from: string
  to: string
  qty: number
  status: Status
  remarks?: string
}

type RequestRow = {
  id: string
  date: string
  outletId: string
  product: string
  category: string
  sku: string
  stockId: string
  size: string
  colour: string
  qty: number
  remarks?: string
}

export default function StockTransfer() {
  const { outlets, role, selectedOutlet } = useOrg()

  // Mock availability by product at HQ
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({
    'Running Shoes': 80,
    'Casual Sneakers': 35,
    'Leather Boots': 20,
  })

  // Transfers list
  const initialTransfers: Transfer[] = useMemo(() => ([
    { id: 't1', date: '2025-09-01', category: 'Shoes', product: 'Running Shoes', sku: 'SKU-1001', stockId: 'STK-2001', size: '42', colour: 'Black', from: 'HQ', to: 'S01', qty: 20, status: 'Confirmed', remarks: 'Seasonal replenishment' },
    { id: 't2', date: '2025-09-05', category: 'Shoes', product: 'Casual Sneakers', sku: 'SKU-1002', stockId: 'STK-2002', size: '41', colour: 'White', from: 'S01', to: 'S02', qty: 10, status: 'Pending' },
    { id: 't3', date: '2025-09-07', category: 'Boots', product: 'Leather Boots', sku: 'SKU-1003', stockId: 'STK-2003', size: '44', colour: 'Brown', from: 'HQ', to: 'S02', qty: 8, status: 'Shipped' },
  ]), [])
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers)

  // Incoming requests from outlets
  const [requests, setRequests] = useState<RequestRow[]>([
    { id: 'r1', date: '2025-09-10', outletId: 'store-01', product: 'Running Shoes', category: 'Shoes', sku: 'SKU-1001', stockId: 'STK-2001', size: '42', colour: 'Black', qty: 12, remarks: 'Weekend promo' },
    { id: 'r2', date: '2025-09-11', outletId: 'store-02', product: 'Leather Boots', category: 'Boots', sku: 'SKU-1003', stockId: 'STK-2003', size: '44', colour: 'Brown', qty: 4 },
  ])

  // New transfer modal state
  const [open, setOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [fromOutlet, setFromOutlet] = useState('')
  const [toOutlet, setToOutlet] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [product, setProduct] = useState('')
  const [sku, setSku] = useState('')
  const [stockId, setStockId] = useState('')
  const [size, setSize] = useState('')
  const [colour, setColour] = useState('')
  const [qty, setQty] = useState('')
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const columns: Column<Transfer>[] = [
    { header: 'Date', key: 'date' },
    { header: 'Category', key: 'category', className: 'hidden lg:table-cell' },
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    { header: 'Stock ID', key: 'stockId', className: 'hidden xl:table-cell' },
    { header: 'Size', key: 'size', className: 'hidden xl:table-cell' },
    { header: 'Colour', key: 'colour', className: 'hidden xl:table-cell' },
    { header: 'From', key: 'from' },
    { header: 'To', key: 'to' },
    { header: 'Qty', key: 'qty', className: 'text-right' },
    { header: 'Status', key: 'status', render: (r) => (
      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
        r.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
        r.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
        r.status === 'Received' ? 'bg-purple-100 text-purple-800' :
        'bg-green-100 text-green-800'
      }`}>{r.status}</span>
    ) },
    { header: 'Actions', key: 'actions', render: (r) => (
      <div className="flex gap-2">
        {r.status === 'Pending' && (
          <Button className="px-2 py-1 text-xs" onClick={() => ship(r.id)}>Ship</Button>
        )}
        {r.status === 'Shipped' && (
          <Button className="px-2 py-1 text-xs" variant="outline" onClick={() => markReceived(r.id)}>Mark Received</Button>
        )}
        {r.status === 'Received' && (
          <Button className="px-2 py-1 text-xs" variant="warning" onClick={() => confirmTransfer(r.id)}>Confirm</Button>
        )}
      </div>
    ) },
  ]

  // Actions for status transitions
  const ship = (id: string) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Shipped' } : t))
  }
  const markReceived = (id: string) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Received' } : t))
  }
  const confirmTransfer = (id: string) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Confirmed' } : t))
  }

  // Approve/Ship a request (availability check from HQ)
  const approveAndShip = (req: RequestRow) => {
    const avail = availableStock[req.product] ?? 0
    if (avail < req.qty) {
      alert(`Insufficient stock at HQ. Available ${avail}, needs ${req.qty}.`)
      return
    }
    setAvailableStock(prev => ({ ...prev, [req.product]: avail - req.qty }))
    const toCode = outlets.find(o => o.id === req.outletId)?.code || req.outletId
    const id = `tx-${Date.now()}`
    setTransfers(prev => [
      { id, date: req.date, category: req.category, product: req.product, sku: req.sku, stockId: req.stockId, size: req.size, colour: req.colour, from: 'HQ', to: toCode, qty: req.qty, status: 'Shipped', remarks: req.remarks },
      ...prev,
    ])
    setRequests(prev => prev.filter(r => r.id !== req.id))
  }

  const rejectRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  // CSV export
  const exportCsv = () => {
    const headers = ['ID', 'Date', 'Category', 'Product', 'From', 'To', 'Qty', 'Status']
    const rows = transfers.map(t => [t.id, t.date, t.category, t.product, t.from, t.to, String(t.qty), t.status])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-transfers-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Visibility filters by role/outlet
  const isMaster = role === 'master'
  const visibleRequests = isMaster ? requests : requests.filter(r => r.outletId === selectedOutlet?.id)
  const visibleTransfers = isMaster ? transfers : transfers.filter(t => t.from === selectedOutlet?.code || t.to === selectedOutlet?.code)

  return (
    <Shell>
      <PageHeader
        title="Supply"
        subtitle="Handle outlet requests and track transfer status."
        actions={(
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setRequestsOpen(true)}>
              Incoming Requests
              <span className="ml-2 inline-flex items-center rounded-full bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">
                {visibleRequests.length}
              </span>
            </Button>
            <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
            <Button variant="primary" onClick={() => setOpen(true)}>New Transfer</Button>
          </div>
        )}
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Transfers" value={String(transfers.length)} />
        <StatCard title="Pending" value={String(transfers.filter(d => d.status === 'Pending').length)} />
        <StatCard title="Shipped" value={String(transfers.filter(d => d.status === 'Shipped').length)} />
        <StatCard title="Received/Confirmed" value={String(transfers.filter(d => d.status === 'Received' || d.status === 'Confirmed').length)} />
      </div>

      <div className="space-y-4">
        <Card title="Transfers">
          <SimpleTable columns={columns} data={visibleTransfers} noScroll stickyHeader density="compact" />
        </Card>
      </div>

      {/* New Transfer Modal */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">New Transfer</h2>
            <p className="mt-1 text-sm text-gray-500">Create a manual transfer between locations.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const eobj: { [k: string]: string } = {}
                if (!fromOutlet) eobj.fromOutlet = 'From outlet is required'
                if (!toOutlet) eobj.toOutlet = 'To outlet is required'
                if (fromOutlet && toOutlet && fromOutlet === toOutlet) eobj.toOutlet = 'Choose a different outlet'
                if (!date) eobj.date = 'Date is required'
                if (!category) eobj.category = 'Category is required'
                if (!product.trim()) eobj.product = 'Item name is required'
                if (!sku.trim()) eobj.sku = 'SKU is required'
                if (!stockId.trim()) eobj.stockId = 'Stock ID is required'
                if (!size) eobj.size = 'Size is required'
                if (!colour) eobj.colour = 'Colour is required'
                const qn = Number(qty)
                if (!qty) eobj.qty = 'Quantity is required'
                else if (Number.isNaN(qn) || qn <= 0) eobj.qty = 'Enter a positive number'
                setErrors(eobj)
                if (Object.keys(eobj).length) return
                const fromCode = outlets.find(o => o.id === fromOutlet)?.code || fromOutlet
                const toCode = outlets.find(o => o.id === toOutlet)?.code || toOutlet
                const id = `tx-${Date.now()}`
                setTransfers(prev => [{ id, date, category, product, sku, stockId, size, colour, from: fromCode, to: toCode, qty: Number(qty), status: 'Pending', remarks }, ...prev])
                setOpen(false)
                setFromOutlet('')
                setToOutlet('')
                setDate('')
                setCategory('')
                setProduct('')
                setSku('')
                setStockId('')
                setSize('')
                setColour('')
                setQty('')
                setRemarks('')
                setErrors({})
              }}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <Select
                label="From Outlet"
                value={fromOutlet}
                onChange={(e: any) => setFromOutlet(e.target.value)}
                options={outlets.map(o => ({ label: `${o.name} (${o.code})`, value: o.id }))}
                error={errors.fromOutlet}
              />
              <Select
                label="To Outlet"
                value={toOutlet}
                onChange={(e: any) => setToOutlet(e.target.value)}
                options={outlets.map(o => ({ label: `${o.name} (${o.code})`, value: o.id }))}
                error={errors.toOutlet}
              />
              <Input label="Date" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} error={errors.date} />
              <Select
                label="Category"
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                options={[{ label: 'Shoes', value: 'Shoes' }, { label: 'Sandals', value: 'Sandals' }, { label: 'Boots', value: 'Boots' }, { label: 'Slippers', value: 'Slippers' }]}
                error={errors.category}
              />
              <Input label="Item Name" value={product} onChange={(e: any) => setProduct(e.target.value)} placeholder="Running Shoes" error={errors.product} />
              <Input label="SKU" value={sku} onChange={(e: any) => setSku(e.target.value)} placeholder="SKU-xxxx" error={errors.sku} />
              <Input label="Stock ID" value={stockId} onChange={(e: any) => setStockId(e.target.value)} placeholder="STK-xxxx" error={errors.stockId} />
              <Select
                label="Size"
                value={size}
                onChange={(e: any) => setSize(e.target.value)}
                options={[{ label: '38', value: '38' }, { label: '39', value: '39' }, { label: '40', value: '40' }, { label: '41', value: '41' }, { label: '42', value: '42' }, { label: '43', value: '43' }, { label: '44', value: '44' }]}
                error={errors.size}
              />
              <Select
                label="Colour"
                value={colour}
                onChange={(e: any) => setColour(e.target.value)}
                options={[{ label: 'Black', value: 'Black' }, { label: 'White', value: 'White' }, { label: 'Blue', value: 'Blue' }, { label: 'Red', value: 'Red' }, { label: 'Brown', value: 'Brown' }, { label: 'Grey', value: 'Grey' }]}
                error={errors.colour}
              />
              <Input label="Quantity" value={qty} onChange={(e: any) => setQty(e.target.value)} placeholder="0" error={errors.qty} />
              <Input label="Remarks" value={remarks} onChange={(e: any) => setRemarks(e.target.value)} placeholder="Optional note" />
              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incoming Requests Modal */}
      {requestsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRequestsOpen(false)} />
          <div className="relative z-50 w-full max-w-5xl rounded-xl bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Incoming Requests</h2>
                <p className="mt-1 text-sm text-gray-500">Review outlet requests and approve or reject.</p>
              </div>
              <Button variant="outline" onClick={() => setRequestsOpen(false)}>Close</Button>
            </div>
            <div className="mt-4">
              <SimpleTable
                columns={[
                  { header: 'Date', key: 'date' },
                  { header: 'Outlet', key: 'outlet', render: (r: RequestRow) => outlets.find(o => o.id === r.outletId)?.name || r.outletId },
                  { header: 'Category', key: 'category', className: 'hidden lg:table-cell' },
                  { header: 'Product', key: 'product' },
                  { header: 'SKU', key: 'sku' },
                  { header: 'Stock ID', key: 'stockId', className: 'hidden xl:table-cell' },
                  { header: 'Size', key: 'size', className: 'hidden xl:table-cell' },
                  { header: 'Colour', key: 'colour', className: 'hidden xl:table-cell' },
                  { header: 'Qty', key: 'qty', className: 'text-right' },
                  { header: 'Remarks', key: 'remarks', className: 'hidden xl:table-cell' },
                  { header: 'Actions', key: 'actions', render: (r: RequestRow) => (
                    <div className="flex gap-2">
                      <Button className="px-2 py-1 text-xs" onClick={() => approveAndShip(r)}>Approve & Ship</Button>
                      <Button className="px-2 py-1 text-xs" variant="warning" onClick={() => rejectRequest(r.id)}>Reject</Button>
                    </div>
                  ) },
                ]}
                data={visibleRequests}
                keyField="id"
                noScroll
                stickyHeader
                density="compact"
              />
              <div className="mt-3 text-xs text-gray-500">HQ availability (mock): {Object.entries(availableStock).map(([k,v]) => `${k}: ${v}`).join(' | ')}</div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
