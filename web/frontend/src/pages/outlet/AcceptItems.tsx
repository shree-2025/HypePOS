import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import api from '@/api/axios'
import { useOrg } from '@/context/org'

export type InboundRow = {
  id: number
  transactionCode: string
  fromOutletId: number | null
  toOutletId: number
  status: string
  createdAt?: string
  dispatchedAt?: string | null
  acceptedAt?: string | null
  totalQty: number
  totalAmount: number
  itemCount: number
}

export default function AcceptItems() {
  const { selectedOutlet, outlets } = useOrg()
  const [rows, setRows] = useState<InboundRow[]>([])
  const [status, setStatus] = useState<'any' | 'pending' | 'accepted'>('pending')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const outletId = selectedOutlet?.id ? Number(selectedOutlet.id) : null

  const fmtINR = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return ''
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n) } catch { return `₹ ${n.toFixed(2)}` }
  }

  const inboundUrl = useMemo(() => '/api/transfers/inward', [])

  const load = async () => {
    if (!outletId) return
    try {
      setLoading(true)
      setErrorMsg('')
      const params: any = { outletId }
      if (status !== 'any') params.status = status
      const { data } = await api.get(inboundUrl, { params })
      const filtered = q.trim() ? (data as InboundRow[]).filter(r => (r.transactionCode||'').toLowerCase().includes(q.toLowerCase())) : data
      setRows(filtered)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId, status])

  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [viewData, setViewData] = useState<any>(null)
  const [discrepancy, setDiscrepancy] = useState('')

  const openView = async (id: number) => {
    try {
      setViewOpen(true)
      setViewLoading(true)
      setViewError('')
      setViewData(null)
      const { data } = await api.get(`/api/transfers/requests/${id}`)
      setViewData(data)
      setDiscrepancy('')
    } catch (e: any) {
      setViewError(e?.response?.data?.message || 'Failed to load details')
    } finally { setViewLoading(false) }
  }

  const acceptTransfer = async (id: number) => {
    if (!outletId) return
    try {
      setViewLoading(true)
      await api.put(`/api/transfers/requests/${id}`, { status: 'Confirmed', actorOutletId: outletId, discrepancyNote: discrepancy || null })
      setViewOpen(false)
      await load()
    } catch (e: any) {
      setViewError(e?.response?.data?.message || 'Failed to accept transfer')
    } finally { setViewLoading(false) }
  }

  const outletName = (id?: number | null) => {
    if (!id) return 'Distributor'
    const o = outlets.find((x:any) => String(x.id) === String(id))
    return o?.name || String(id)
  }

  const columns: Column<InboundRow>[] = [
    { header: 'Transfer ID', key: 'transactionCode', render: (r) => r.transactionCode },
    { header: 'From', key: 'fromOutletId', render: (r) => outletName(r.fromOutletId) },
    { header: 'To', key: 'toOutletId', render: (r) => outletName(r.toOutletId) },
    { header: 'Date', key: 'createdAt', render: (r) => (r.dispatchedAt || r.createdAt || '').toString().replace('T',' ').slice(0,19) },
    { header: 'Qty', key: 'totalQty', className: 'w-16 text-right', render: (r) => r.totalQty },
    { header: 'Amount', key: 'totalAmount', className: 'w-28 text-right', render: (r) => fmtINR(r.totalAmount) },
    { header: 'Status', key: 'status', className: 'w-28', render: (r) => r.acceptedAt ? 'Accepted' : r.status },
    { header: 'Accepted At', key: 'acceptedAt', className: 'w-40', render: (r) => r.acceptedAt ? String(r.acceptedAt).replace('T',' ').slice(0,19) : '-' },
    { header: 'Actions', key: 'actions', className: 'w-40', render: (r) => (
      <div className="flex gap-2">
        <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => openView(r.id)}>View</Button>
        {(!r.acceptedAt && r.status !== 'Confirmed') && (
          <Button className="px-2 py-1 text-xs" onClick={() => openView(r.id)}>Accept</Button>
        )}
      </div>
    ) },
  ]

  return (
    <Shell>
      <PageHeader title="Accept Items" subtitle="View and accept incoming stock transfers." />
      <Card title="Incoming Transfers">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input className="input-base" placeholder="Search by Transfer ID" value={q} onChange={(e)=>setQ(e.target.value)} />
          <select className="input-base" value={status} onChange={(e)=>setStatus(e.target.value as any)}>
            <option value="any">Any Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
          </select>
          <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        </div>
        {errorMsg && <div className="mb-2 text-sm text-red-600">{errorMsg}</div>}
        <SimpleTable columns={columns} data={rows} keyField="id" density="compact" />
      </Card>

      {viewOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewOpen(false)} />
          <div className="relative z-50 w-[95vw] max-w-6xl rounded-xl bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Transfer Details</h3>
              <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
            {viewLoading && <div>Loading…</div>}
            {viewError && <div className="text-sm text-red-600">{viewError}</div>}
            {!viewLoading && viewData && (
              <div>
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <Input label="Transfer ID" value={viewData.header.transactionCode} readOnly />
                  <Input label="From" value={outletName(viewData.header.fromOutletId)} readOnly />
                  <Input label="To" value={outletName(viewData.header.toOutletId)} readOnly />
                  <Input label="Status" value={viewData.header.status} readOnly />
                  <Input label="Created" value={String(viewData.header.createdAt).slice(0,19).replace('T',' ')} readOnly />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white shadow-sm">
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-3">Stock No</th>
                        <th className="py-2 pr-3">Item Code</th>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Brand</th>
                        <th className="py-2 pr-3">Colour</th>
                        <th className="py-2 pr-3">Size</th>
                        <th className="py-2 pr-3 text-right">Dealer Price</th>
                        <th className="py-2 pr-3 text-right">Qty</th>
                        <th className="py-2 pr-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.lines.map((ln:any) => (
                        <tr key={ln.id} className="border-t odd:bg-gray-50">
                          <td className="py-2 pr-3">{ln.stockNo || ''}</td>
                          <td className="py-2 pr-3">{ln.itemCode || ''}</td>
                          <td className="py-2 pr-3">{ln.itemCodeDesc || ''}</td>
                          <td className="py-2 pr-3">{ln.brand || ''}</td>
                          <td className="py-2 pr-3">{ln.colorName || ''}</td>
                          <td className="py-2 pr-3">{ln.size ?? ''}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtINR(ln.dealerPrice)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{ln.qty}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{ln.dealerPrice != null ? fmtINR(Number(ln.dealerPrice) * Number(ln.qty)) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Input label="Discrepancy (optional)" value={discrepancy} onChange={(e: any)=>setDiscrepancy(e.target.value)} placeholder="eg: short by 2 pairs, box damaged" />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                  <Button onClick={() => acceptTransfer(Number(viewData.header.id))} disabled={viewLoading}>Accept</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}
