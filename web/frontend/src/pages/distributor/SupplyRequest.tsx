import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Alert from '@/components/ui/Alert'
import api from '@/api/axios'
import { useOrg } from '@/context/org'
import BarcodeScanner from '@/components/scan/BarcodeScanner'

// Minimal item shape for searching/adding lines
type Item = {
  id: string
  itemCode: string
  name: string
  size?: string | number
  stockId?: string
}

type Line = { id: string; itemId: string; sku: string; name: string; size?: string; qty: number }

export default function SupplyRequest() {
  const { outlets } = useOrg()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Form state
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [sku, setSku] = useState('')
  const [itemName, setItemName] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [saving, setSaving] = useState(false)
  const [priority, setPriority] = useState('Normal')
  const [note, setNote] = useState('')

  // Load items once for quick lookup
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/items')
        const arr: Item[] = (Array.isArray(data) ? data : []).map((r: any) => ({
          id: String(r.id),
          itemCode: String(r.itemCode || ''),
          name: String(r.itemCodeDesc || ''),
          size: r.size != null ? String(r.size) : '',
          stockId: r.stockId || '',
        }))
        setItems(arr)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Load items error', e)
      } finally { setLoading(false) }
    })()
  }, [])

  // Item lookup helpers
  const foundItem = useMemo(() => {
    const bySku = items.find(i => i.itemCode.toLowerCase() === sku.trim().toLowerCase())
    if (bySku) return bySku
    if (itemName.trim()) {
      const nm = itemName.trim().toLowerCase()
      return items.find(i => i.name.toLowerCase().includes(nm) && (!size || String(i.size) === String(size))) || null
    }
    return null
  }, [items, sku, itemName, size]) as Item | null

  const addLine = () => {
    setErrorMsg('')
    const qn = Number(qty)
    if (!foundItem) { setErrorMsg('Item not found'); return }
    if (!Number.isFinite(qn) || qn <= 0) { setErrorMsg('Invalid qty'); return }
    const id = `ln-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
    setLines(prev => [{ id, itemId: foundItem.id, sku: foundItem.itemCode, name: foundItem.name, size: String(foundItem.size || ''), qty: qn }, ...prev])
    setSku(''); setItemName(''); setSize(''); setQty('')
  }

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))

  const save = async () => {
    try {
      setErrorMsg('')
      if (!fromId || !toId) { setErrorMsg('Select Transfer From and To'); return }
      if (fromId === toId) { setErrorMsg('Transfer From and To cannot be the same'); return }
      if (!lines.length) { setErrorMsg('Add at least one line'); return }
      setSaving(true)
      const body = {
        fromOutletId: Number(fromId || 0),
        toOutletId: Number(toId || 0),
        date: new Date().toISOString().slice(0, 10),
        remarks: note || null,
        items: lines.map(l => ({ itemId: Number(l.itemId), qty: Number(l.qty) })),
      }
      const { data } = await api.post('/transfers/bulk', body)
      const batch = data?.batchNo ? ` — Batch ${data.batchNo}` : ''
      setSuccessMsg(`Request submitted (${priority}) with ${lines.length} item(s)${batch}`) 
      setTimeout(() => setSuccessMsg(''), 4000)
      setLines([])
      setNote('')
      setPriority('Normal')
      setFromId('')
      setToId('')
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Submit request failed', e)
      setErrorMsg(e?.response?.data?.message || 'Submit failed')
    } finally { setSaving(false) }
  }

  const columns: Column<Line>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Item', key: 'name' },
    { header: 'Size', key: 'size' },
    { header: 'Qty', key: 'qty' },
    { header: 'Actions', key: 'actions', render: (r) => (
      <Button variant="warning" className="px-2 py-1 text-xs" onClick={() => removeLine(r.id)}>Remove</Button>
    )},
  ]

  return (
    <Shell>
      <PageHeader
        title="Request Stock"
        subtitle="Create a stock request to your distributor. Requests can be forwarded to HO or other outlets by the distributor."
      />

      {successMsg && (
        <div className="mb-3"><Alert variant="success" title={successMsg} /></div>
      )}
      {errorMsg && (
        <div className="mb-3"><Alert variant="warning" title={errorMsg} /></div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Add Item" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Transfer From (Outlet)"
              value={fromId}
              onChange={(e: any) => setFromId(e.target.value)}
              options={[{ label: 'Select Outlet', value: '' }, ...outlets.map(o => ({ label: o.name, value: String(o.id) }))]}
            />
            <Select
              label="Transfer To (Outlet)"
              value={toId}
              onChange={(e: any) => setToId(e.target.value)}
              options={[{ label: 'Select Outlet', value: '' }, ...outlets.map(o => ({ label: o.name, value: String(o.id) }))]}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div>
              <Input label="SKU" value={sku} onChange={(e: any) => setSku(e.target.value)} placeholder="e.g., SH-1001" />
              <div className="mt-1">
                <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => setScannerOpen(true)}>Scan</Button>
              </div>
            </div>
            <Input label="Item Name" value={itemName} onChange={(e: any) => setItemName(e.target.value)} placeholder="Runner Pro" />
            <Input label="Size (optional)" value={size} onChange={(e: any) => setSize(e.target.value)} placeholder="UK 8" />
            <div className="flex items-end gap-2">
              <Input label="Qty" value={qty} onChange={(e: any) => setQty(e.target.value)} placeholder="0" />
              <Button onClick={addLine} disabled={loading}>Add</Button>
            </div>
          </div>

          <div className="mt-4">
            <SimpleTable columns={columns} data={lines} keyField="id" density="compact" />
            {!lines.length && (
              <div className="p-3 text-sm text-gray-500">No data</div>
            )}
          </div>
        </Card>

        <Card title="Request Details">
          <div className="grid gap-3">
            <Select label="Priority" value={priority} onChange={(e: any) => setPriority(e.target.value)}
              options={[{ label: 'Normal', value: 'Normal' }, { label: 'High', value: 'High' }, { label: 'Urgent', value: 'Urgent' }]}
            />
            <Input label="Note" value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Reason / context" />
            <Button onClick={save} loading={saving} disabled={!lines.length}>Submit Request</Button>
          </div>
        </Card>
      </div>
      {scannerOpen && (
        <BarcodeScanner
          onDetected={(text) => { setSku(text); setScannerOpen(false) }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </Shell>
  )
}
