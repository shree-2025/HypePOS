import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { useOrg } from '@/context/org'
import Button from '@/components/ui/Button'
import api from '@/api/axios'

type StockItem = {
  id: string
  name: string
  category: string
  brand: string
  colour: string
  size: string
  itemCode: string
  qty: number
  reorderLevel?: number
}

export default function OutletStock() {
  const { selectedOutlet } = useOrg()
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stockUrlBase = useMemo(() => {
    try {
      const base = String(api.defaults.baseURL || '')
      if (/\/api\/?$/.test(base)) {
        const baseWithSlash = base.endsWith('/') ? base : base + '/'
        return new URL('stock', baseWithSlash).toString()
      }
      return '/api/stock'
    } catch { return '/api/stock' }
  }, [])
  const transfersUrlBase = useMemo(() => {
    try {
      const base = String(api.defaults.baseURL || '')
      if (/\/api\/?$/.test(base)) {
        const baseWithSlash = base.endsWith('/') ? base : base + '/'
        return new URL('transfers', baseWithSlash).toString()
      }
      return '/api/transfers'
    } catch { return '/api/transfers' }
  }, [])

  const loadStock = async (outletId?: string) => {
    if (!outletId) return
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get(`${stockUrlBase}?outletId=${encodeURIComponent(outletId)}`)
      if (Array.isArray(data)) {
        const mapped: StockItem[] = data.map((r: any) => ({
          id: String(r.id || `${r.outletId}-${r.itemId}`),
          name: r.name,
          category: r.category,
          brand: r.brand || '',
          colour: r.colour || '',
          size: String(r.size ?? ''),
          itemCode: r.itemCode,
          qty: Number(r.qty || 0),
        }))
        setItems(mapped)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedOutlet?.id) {
      loadStock(selectedOutlet.id)
    }
  }, [selectedOutlet?.id])

  // Filters
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [colourFilter, setColourFilter] = useState('')

  // Fixed dropdown options
  const sizeFixed = ['38', '39', '40', '41', '42', '43', '44']
  const colourFixed = ['Black', 'White', 'Blue', 'Red', 'Brown', 'Grey']

  // Options derived from dataset
  const categoryOptions = useMemo(() => {
    const set = Array.from(new Set(items.map(i => i.category))).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  const sizeOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.size), ...sizeFixed])).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  const colourOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.colour), ...colourFixed])).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(i => {
      const nameOk = !nameFilter || i.name.toLowerCase().includes(nameFilter.toLowerCase())
      const catOk = !categoryFilter || i.category === categoryFilter
      const sizeOk = !sizeFilter || i.size === sizeFilter
      const colourOk = !colourFilter || i.colour === colourFilter
      return nameOk && catOk && sizeOk && colourOk
    })
  }, [items, nameFilter, categoryFilter, sizeFilter, colourFilter])

  const lowStock = useMemo(() => filtered.filter(i => typeof i.reorderLevel === 'number' && i.qty <= (i.reorderLevel || 0)), [filtered])
  const totalQty = useMemo(() => filtered.reduce((s, i) => s + i.qty, 0), [filtered])

  const columns: Column<StockItem>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Brand', key: 'brand' },
    { header: 'Colour', key: 'colour' },
    { header: 'Size', key: 'size' },
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Qty', key: 'qty', className: 'text-right', render: (r) => (
      <span className={r.reorderLevel && r.qty <= r.reorderLevel ? 'text-red-600 font-medium' : ''}>{r.qty}</span>
    ) },
  ]

  // Receive Stock modal state
  type Incoming = { id: string; date: string; product: string; sku: string; stockId?: string; qty: number }
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [incoming, setIncoming] = useState<Incoming[]>([])
  const [inLoading, setInLoading] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Incoming | null>(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const openReceive = async () => {
    if (!selectedOutlet?.id) return
    setReceiveOpen(true)
    setInLoading(true)
    try {
      const { data } = await api.get(transfersUrlBase + `?toOutletId=${encodeURIComponent(selectedOutlet.id)}`)
      const list: Incoming[] = (Array.isArray(data) ? data : [])
        .filter((t: any) => t.status === 'Shipped')
        .map((t: any) => ({ id: String(t.id), date: String(t.date).slice(0,10), product: t.product, sku: t.sku, stockId: t.stockId, qty: Number(t.qty) }))
      setIncoming(list)
    } catch {}
    finally { setInLoading(false) }
  }
  const confirmOne = async () => {
    if (!selectedTransfer) return
    try {
      await api.put(`${transfersUrlBase}/${selectedTransfer.id}`, { status: 'Confirmed', remarks: reviewRemarks || undefined })
      setReviewRemarks('')
      setSelectedTransfer(null)
      // Refresh list & stock (stock is updated on Confirm at backend)
      await openReceive()
      if (selectedOutlet?.id) await loadStock(selectedOutlet.id)
    } catch {}
  }
  const rejectOne = async () => {
    if (!selectedTransfer) return
    try {
      await api.put(`${transfersUrlBase}/${selectedTransfer.id}`, { status: 'Rejected', remarks: reviewRemarks || undefined })
      setReviewRemarks('')
      setSelectedTransfer(null)
      // Just refresh list (stock is not updated on reject)
      await openReceive()
    } catch {}
  }

  const confirmRow = async (id: string) => {
    try {
      await api.put(`${transfersUrlBase}/${id}`, { status: 'Confirmed' })
      await openReceive()
      if (selectedOutlet?.id) await loadStock(selectedOutlet.id)
    } catch {}
  }

  return (
    <Shell>
      <PageHeader
        title={selectedOutlet ? `${selectedOutlet.name} — Stock` : 'Stock Management'}
        subtitle="View current outlet inventory, remaining stock, and low-stock alerts."
        actions={<Button variant="primary" onClick={openReceive}>Receive Stock</Button>}
      />

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Item Name" value={nameFilter} onChange={(e: any) => setNameFilter(e.target.value)} placeholder="Search by name" />
          <Select label="Category" value={categoryFilter} onChange={(e: any) => setCategoryFilter(e.target.value)} options={categoryOptions} />
          <Select label="Size" value={sizeFilter} onChange={(e: any) => setSizeFilter(e.target.value)} options={sizeOptions} />
          <Select label="Colour" value={colourFilter} onChange={(e: any) => setColourFilter(e.target.value)} options={colourOptions} />
        </div>
        <div className="mt-4">
          {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <SimpleTable columns={columns} data={filtered} keyField="id" />
          )}
        </div>
      </Card>

      <div className="mt-6">
        <Card title="Low Stock Alerts">
          <SimpleTable
            columns={[
              { header: 'Item', key: 'name' },
              { header: 'SKU', key: 'itemCode' },
              { header: 'Qty', key: 'qty', className: 'text-right' },
              { header: 'Reorder ≤', key: 'reorderLevel', className: 'text-right' },
            ]}
            data={lowStock}
            keyField="id"
          />
        </Card>
      </div>

      {receiveOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReceiveOpen(false)} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Incoming Transfers</h2>
            <p className="mt-1 text-sm text-gray-500">Transfers shipped to this outlet. Mark as received to update your stock.</p>
            <div className="mt-3">
              {inLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : incoming.length === 0 ? (
                <div className="text-sm text-gray-500">No incoming transfers.</div>
              ) : (
                <SimpleTable
                  columns={[
                    { header: 'Date', key: 'date' },
                    { header: 'Item', key: 'product' },
                    { header: 'SKU', key: 'sku' },
                    { header: 'Stock ID', key: 'stockId' },
                    { header: 'Qty', key: 'qty', className: 'text-right' },
                    { header: 'Actions', key: 'actions', render: (r: Incoming) => (
                      <div className="flex gap-2">
                        <Button className="px-2 py-1 text-xs" onClick={() => confirmRow(r.id)}>Confirm</Button>
                        <Button className="px-2 py-1 text-xs" variant="warning" onClick={() => { setSelectedTransfer(r); setReviewRemarks('') }}>Reject</Button>
                      </div>
                    ) },
                  ]}
                  data={incoming}
                  keyField="id"
                />
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiveOpen(false)}>Close</Button>
            </div>

            {selectedTransfer && (
              <div className="mt-4 rounded-lg border border-gray-200 p-3">
                <div className="text-sm font-medium text-gray-900">Review Transfer</div>
                <div className="mt-1 text-xs text-gray-600">{selectedTransfer.date} · {selectedTransfer.product} · {selectedTransfer.sku} · Qty {selectedTransfer.qty}</div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none"
                    placeholder="Optional note"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                  />
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button variant="warning" onClick={rejectOne}>Submit Reject</Button>
                  <Button onClick={confirmOne}>Confirm</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}
