import React from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import PageHeader from '@/components/layout/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function CentralInventory() {
  type Row = { id: string; sku: string; name: string; totalStock: number; totalSold: number; remaining: number }
  const data: Row[] = [
    { id: 'p1', sku: 'SKU-001', name: 'Running Shoes', totalStock: 500, totalSold: 140, remaining: 360 },
    { id: 'p2', sku: 'SKU-002', name: 'Casual Sneakers', totalStock: 420, totalSold: 120, remaining: 300 },
    { id: 'p3', sku: 'SKU-003', name: 'Leather Boots', totalStock: 250, totalSold: 55, remaining: 195 },
    { id: 'p4', sku: 'SKU-004', name: 'Trail Runners', totalStock: 330, totalSold: 80, remaining: 250 },
    { id: 'p5', sku: 'SKU-005', name: 'Sandals', totalStock: 280, totalSold: 60, remaining: 220 },
  ]

  const columns: Column<Row>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Product', key: 'name' },
    { header: 'Total Stock', key: 'totalStock' },
    { header: 'Total Sold', key: 'totalSold' },
    { header: 'Remaining', key: 'remaining' },
  ]

  // Stock Count workflow state
  type CountLine = { id: string; sku: string; name: string; expected: number; counted: number; variance: number }
  const stockMap = React.useMemo(() => Object.fromEntries(data.map(d => [d.sku, d])), [data])
  const [scanSku, setScanSku] = React.useState('')
  const [countLines, setCountLines] = React.useState<CountLine[]>([])

  const addCountLine = (sku: string) => {
    const skuKey = sku.trim().toUpperCase()
    if (!skuKey) return
    const prod = stockMap[skuKey]
    if (!prod) return
    setCountLines(prev => {
      const idx = prev.findIndex(l => l.sku === skuKey)
      if (idx >= 0) {
        const next = [...prev]
        const line = next[idx]
        const newCounted = line.counted + 1
        next[idx] = { ...line, counted: newCounted, variance: newCounted - line.expected }
        return next
      }
      const expected = prod.remaining
      return [...prev, { id: crypto.randomUUID(), sku: skuKey, name: prod.name, expected, counted: 1, variance: 1 - expected }]
    })
  }

  const updateCounted = (id: string, val: number) => {
    setCountLines(prev => prev.map(l => l.id === id ? ({ ...l, counted: Math.max(0, val), variance: Math.max(0, val) - l.expected }) : l))
  }
  const removeCountLine = (id: string) => setCountLines(prev => prev.filter(l => l.id !== id))
  const clearCount = () => setCountLines([])
  const submitCount = () => {
    // placeholder submit; integrate API here later
    clearCount()
    alert('Stock count submitted.')
  }

  // Receive Shipment workflow state
  type ReceiveLine = { id: string; sku: string; name: string; qty: number; cost: number }
  const [supplier, setSupplier] = React.useState('')
  const [grn, setGrn] = React.useState('')
  const [recvSku, setRecvSku] = React.useState('')
  const [recvLines, setRecvLines] = React.useState<ReceiveLine[]>([])

  const addRecvLine = (sku: string) => {
    const skuKey = sku.trim().toUpperCase()
    if (!skuKey) return
    const prod = stockMap[skuKey]
    if (!prod) return
    setRecvLines(prev => {
      const idx = prev.findIndex(l => l.sku === skuKey)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { id: crypto.randomUUID(), sku: skuKey, name: prod.name, qty: 1, cost: 0 }]
    })
  }
  const updateRecv = (id: string, patch: Partial<ReceiveLine>) => {
    setRecvLines(prev => prev.map(l => l.id === id ? ({ ...l, ...patch }) : l))
  }
  const removeRecvLine = (id: string) => setRecvLines(prev => prev.filter(l => l.id !== id))
  const clearRecv = () => { setSupplier(''); setGrn(''); setRecvLines([]) }
  const submitRecv = () => {
    // placeholder submit; integrate API here later
    clearRecv()
    alert('Shipment received recorded.')
  }

  return (
    <Shell>
      <PageHeader
        title="Centralized Inventory"
        subtitle="Aggregated stock across all outlets."
      />

      {/* Stat overview */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total SKUs" value={String(data.length)} />
        <StatCard title="Total Stock" value={String(data.reduce((s, r) => s + r.totalStock, 0))} />
        <StatCard title="Total Sold" value={String(data.reduce((s, r) => s + r.totalSold, 0))} />
        <StatCard title="Remaining" value={String(data.reduce((s, r) => s + r.remaining, 0))} />
      </div>

      <Card title="Inventory by Product">
        <SimpleTable columns={columns} data={data} />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Low Stock (Top 5)" className="lg:col-span-1">
          <ul className="list-inside list-disc text-sm text-gray-700">
            {data
              .slice()
              .sort((a, b) => a.remaining - b.remaining)
              .slice(0, 5)
              .map((r) => (
                <li key={r.id}>{r.name} — {r.remaining}</li>
              ))}
          </ul>
        </Card>
        <Card title="Fast Movers" className="lg:col-span-2">
          <div className="text-sm text-gray-500">Charts coming soon… integrate your analytics data here.</div>
        </Card>
      </div>

      {/* Operational workflows */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Stock Count */}
        <Card title="Stock Count" actions={<Button variant="outline" onClick={submitCount} disabled={countLines.length===0}>Submit</Button>}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input label="Scan/Enter SKU" placeholder="e.g., SKU-001" value={scanSku} onChange={e=>setScanSku(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ addCountLine(scanSku); setScanSku('') } }} />
            <Button className="md:self-end" variant="outline" onClick={()=>{ addCountLine(scanSku); setScanSku('') }}>Add</Button>
            <Button className="md:self-end" variant="ghost" onClick={clearCount} disabled={countLines.length===0}>Clear</Button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Expected</th>
                  <th className="px-3 py-2 text-center">Counted</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {countLines.map(line => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{line.sku}</td>
                    <td className="px-3 py-2">{line.name}</td>
                    <td className="px-3 py-2 text-right">{line.expected}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button className="h-7 w-7 rounded border" onClick={()=>updateCounted(line.id, Math.max(0, line.counted-1))}>-</button>
                        <input className="w-16 rounded border px-2 py-1 text-center" type="number" value={line.counted} onChange={e=>updateCounted(line.id, Number(e.target.value))} />
                        <button className="h-7 w-7 rounded border" onClick={()=>updateCounted(line.id, line.counted+1)}>+</button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{line.variance}</td>
                    <td className="px-3 py-2 text-right"><button className="text-xs text-red-600" onClick={()=>removeCountLine(line.id)}>Remove</button></td>
                  </tr>
                ))}
                {countLines.length===0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No items counted</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Receive Shipment */}
        <Card title="Receive Shipment" actions={<Button variant="outline" onClick={submitRecv} disabled={recvLines.length===0 || !supplier || !grn}>Submit</Button>}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="Supplier" placeholder="e.g., ABC Traders" value={supplier} onChange={e=>setSupplier(e.target.value)} />
            <Input label="GRN / Ref" placeholder="e.g., GRN-2025-001" value={grn} onChange={e=>setGrn(e.target.value)} />
            <Input label="Scan/Enter SKU" placeholder="e.g., SKU-001" value={recvSku} onChange={e=>setRecvSku(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ addRecvLine(recvSku); setRecvSku('') } }} />
            <Button className="md:self-end" variant="outline" onClick={()=>{ addRecvLine(recvSku); setRecvSku('') }}>Add</Button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Cost/Unit</th>
                  <th className="px-3 py-2 text-right">Line Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {recvLines.map(line => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{line.sku}</td>
                    <td className="px-3 py-2">{line.name}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="h-7 w-7 rounded border" onClick={()=>updateRecv(line.id, { qty: Math.max(0, line.qty-1) })}>-</button>
                        <input className="w-16 rounded border px-2 py-1 text-center" type="number" value={line.qty} onChange={e=>updateRecv(line.id, { qty: Number(e.target.value) })} />
                        <button className="h-7 w-7 rounded border" onClick={()=>updateRecv(line.id, { qty: line.qty+1 })}>+</button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input className="w-24 rounded border px-2 py-1 text-right" type="number" value={line.cost} onChange={e=>updateRecv(line.id, { cost: Number(e.target.value) })} />
                    </td>
                    <td className="px-3 py-2 text-right">₹ {(line.qty * (line.cost || 0)).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right"><button className="text-xs text-red-600" onClick={()=>removeRecvLine(line.id)}>Remove</button></td>
                  </tr>
                ))}
                {recvLines.length===0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No items added</td></tr>
                )}
              </tbody>
            </table>
            {recvLines.length>0 && (
              <div className="mt-2 text-right text-sm text-gray-700">
                <span className="mr-4">Total Qty: {recvLines.reduce((s,l)=>s+l.qty,0)}</span>
                <span>Total Value: ₹ {recvLines.reduce((s,l)=>s + l.qty * (l.cost||0),0).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={clearRecv} disabled={recvLines.length===0 && !supplier && !grn}>Clear</Button>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
