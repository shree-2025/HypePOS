import { useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { useOrg } from '@/context/org'

type RequestRow = {
  id: string
  sku: string
  name: string
  size?: string
  qty: number
}

export default function OutletRequestStock() {
  const { selectedOutlet } = useOrg()
  const [rows, setRows] = useState<RequestRow[]>([])
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [note, setNote] = useState('')

  const addRow = () => {
    const qn = Number(qty)
    if (!sku.trim() || !name.trim() || Number.isNaN(qn) || qn <= 0) return
    setRows(prev => [{ id: `r-${Date.now()}`, sku: sku.trim(), name: name.trim(), size: size || undefined, qty: qn }, ...prev])
    setSku(''); setName(''); setSize(''); setQty('')
  }

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const cols: Column<RequestRow>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Item', key: 'name' },
    { header: 'Size', key: 'size' },
    { header: 'Qty', key: 'qty', className: 'text-right' },
    { header: 'Actions', key: 'actions', render: (r) => (
      <button className="text-xs text-red-600" onClick={() => removeRow(r.id)}>Remove</button>
    ) },
  ]

  const submitRequest = () => {
    if (rows.length === 0) return
    alert(`Request submitted for ${rows.length} item(s) from ${selectedOutlet?.name || 'Outlet'}\nPriority: ${priority}\nNote: ${note || '-'}`)
    setRows([]); setNote(''); setPriority('normal')
  }

  return (
    <Shell>
      <PageHeader
        title={selectedOutlet ? `${selectedOutlet.name} — Request Stock` : 'Request Stock'}
        subtitle="Create a stock request to your distributor. Requests can be forwarded to HO or other outlets by the distributor."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Add Item" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-5">
            <Input label="SKU" value={sku} onChange={(e: any) => setSku(e.target.value)} placeholder="e.g., SH-1001" />
            <Input label="Item Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Runner Pro" />
            <Input label="Size (optional)" value={size} onChange={(e: any) => setSize(e.target.value)} placeholder="UK 8" />
            <Input label="Qty" value={qty} onChange={(e: any) => setQty(e.target.value)} placeholder="0" />
            <div className="flex items-end">
              <Button className="w-full" onClick={addRow}>Add</Button>
            </div>
          </div>
          <div className="mt-4">
            <SimpleTable columns={cols} data={rows} keyField="id" />
          </div>
        </Card>
        <Card title="Request Details">
          <div className="grid gap-3">
            <Select label="Priority" value={priority} onChange={(e: any) => setPriority(e.target.value)} options={[{label:'Normal', value:'normal'},{label:'Urgent', value:'urgent'}]} />
            <Input label="Note" value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Reason / context" />
            <Button onClick={submitRequest} disabled={rows.length === 0}>Submit Request</Button>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
