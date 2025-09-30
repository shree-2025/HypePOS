import { useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Button from '@/components/ui/Button'
import { useOrg } from '@/context/org'

export type StockItem = {
  id: string
  name: string
  category: string
  brand: string
  colour: string
  size: string
  itemCode: string
  stockId: string
  qty: number
}

export default function Stock() {
  const { outlets } = useOrg()
  // Demo dataset; replace with API data later
  const [items, setItems] = useState<StockItem[]>([
    { id: '1', name: 'Runner Max', category: 'Shoes', brand: 'Fleet', colour: 'Black', size: '42', itemCode: 'SKU-001', stockId: 'STK-1001', qty: 50 },
    { id: '2', name: 'Urban Slide', category: 'Sandals', brand: 'WalkIt', colour: 'Blue', size: '40', itemCode: 'SKU-002', stockId: 'STK-1002', qty: 30 },
    { id: '3', name: 'Trail Pro', category: 'Boots', brand: 'Terra', colour: 'Brown', size: '44', itemCode: 'SKU-003', stockId: 'STK-1003', qty: 18 },
    { id: '4', name: 'Cozy Step', category: 'Slippers', brand: 'Comfy', colour: 'White', size: '41', itemCode: 'SKU-004', stockId: 'STK-1004', qty: 40 },
    { id: '5', name: 'City Runner', category: 'Shoes', brand: 'Fleet', colour: 'Red', size: '42', itemCode: 'SKU-005', stockId: 'STK-1005', qty: 22 },
  ])

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

  const columns: Column<StockItem>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Brand', key: 'brand' },
    { header: 'Colour', key: 'colour' },
    { header: 'Size', key: 'size' },
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Stock ID', key: 'stockId' },
    { header: 'Qty', key: 'qty', className: 'text-right' },
    { header: 'Actions', key: 'actions', render: (row) => (
      <div className="flex gap-2">
        <Button className="px-2 py-1 text-xs" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
        <Button className="px-2 py-1 text-xs" variant="warning" onClick={() => onDelete(row.id)}>Delete</Button>
      </div>
    ) },
  ]

  const filtered = useMemo(() => {
    return items.filter(i => {
      const nameOk = !nameFilter || i.name.toLowerCase().includes(nameFilter.toLowerCase())
      const catOk = !categoryFilter || i.category === categoryFilter
      const sizeOk = !sizeFilter || i.size === sizeFilter
      const colourOk = !colourFilter || i.colour === colourFilter
      return nameOk && catOk && sizeOk && colourOk
    })
  }, [items, nameFilter, categoryFilter, sizeFilter, colourFilter])

  // Modal state for add/edit
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', category: '', brand: '', colour: '', size: '', itemCode: '', stockId: '', qty: '' as any as number,
  })
  const [errors, setErrors] = useState<{[k: string]: string}>({})
  const [categoryMode, setCategoryMode] = useState<'select' | 'new'>('select')
  const [newCategory, setNewCategory] = useState('')

  const resetForm = () => {
    setForm({ name: '', category: '', brand: '', colour: '', size: '', itemCode: '', stockId: '', qty: '' as any as number })
    setErrors({})
    setCategoryMode('select')
    setNewCategory('')
  }
  const openAdd = () => { setEditingId(null); resetForm(); setOpen(true) }
  const openEdit = (row: StockItem) => {
    setEditingId(row.id)
    setForm({ name: row.name, category: row.category, brand: row.brand, colour: row.colour, size: row.size, itemCode: row.itemCode, stockId: row.stockId, qty: row.qty })
    setOpen(true)
  }
  const onDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const eobj: {[k: string]: string} = {}
    const category = categoryMode === 'new' ? newCategory.trim() : form.category
    if (!form.name.trim()) eobj.name = 'Required'
    if (!category) eobj.category = 'Required'
    if (!form.brand.trim()) eobj.brand = 'Required'
    if (!form.colour) eobj.colour = 'Required'
    if (!form.size) eobj.size = 'Required'
    if (!form.itemCode.trim()) eobj.itemCode = 'Required'
    if (!form.stockId.trim()) eobj.stockId = 'Required'
    const qn = Number(form.qty)
    if (!form.qty && form.qty !== 0) eobj.qty = 'Required'
    else if (Number.isNaN(qn) || qn < 0) eobj.qty = 'Enter 0 or a positive number'
    setErrors(eobj)
    if (Object.keys(eobj).length) return
    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...form, category, qty: qn } : i))
    } else {
      const id = `itm-${Date.now()}`
      setItems(prev => [{ id, ...form, category, qty: qn }, ...prev])
    }
    setOpen(false)
    resetForm()
  }

  // Assignment state
  type AssignRow = { id: string; itemId: string; outletId: string; qty: number }
  const [assignments, setAssignments] = useState<AssignRow[]>([])
  const [assignItemId, setAssignItemId] = useState('')
  const [assignOutletId, setAssignOutletId] = useState('')
  const [assignQty, setAssignQty] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const addAssignment = () => {
    const qn = Number(assignQty)
    if (!assignItemId || !assignOutletId || Number.isNaN(qn) || qn <= 0) return
    const id = `as-${Date.now()}`
    setAssignments(prev => [{ id, itemId: assignItemId, outletId: assignOutletId, qty: qn }, ...prev])
    setAssignItemId(''); setAssignOutletId(''); setAssignQty('')
  }

  return (
    <Shell>
      <PageHeader
        title="Stock Management"
        subtitle="Add items, manage inventory, and assign stock to outlets."
        actions={(
          <div className="flex gap-2">
            <Button variant="primary" onClick={openAdd}>Add Item</Button>
            <Button variant="primary" onClick={() => setAssignOpen(true)}>
              Assign Stock
              <span className="ml-2 inline-flex items-center rounded-full bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">
                {assignments.length}
              </span>
            </Button>
          </div>
        )}
      />
      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Item Name" value={nameFilter} onChange={(e: any) => setNameFilter(e.target.value)} placeholder="Search by name" />
          <Select label="Category" value={categoryFilter} onChange={(e: any) => setCategoryFilter(e.target.value)} options={categoryOptions} />
          <Select label="Size" value={sizeFilter} onChange={(e: any) => setSizeFilter(e.target.value)} options={sizeOptions} />
          <Select label="Colour" value={colourFilter} onChange={(e: any) => setColourFilter(e.target.value)} options={colourOptions} />
        </div>
        <div className="mt-4">
          <SimpleTable columns={columns} data={filtered} keyField="id" />
        </div>
      </Card>

      {/* Assign modal trigger above; inline section removed */}

      {/* Add/Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Item' : 'Add Item'}</h2>
            <p className="mt-1 text-sm text-gray-500">Fill item details. You can add a new category if it does not exist.</p>
            <form onSubmit={handleSubmit} className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Item Name" value={form.name} onChange={(e: any) => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} />
              <Input label="Brand" value={form.brand} onChange={(e: any) => setForm(f => ({ ...f, brand: e.target.value }))} error={errors.brand} />

              {categoryMode === 'select' ? (
                <div>
                  <Select
                    label="Category"
                    value={form.category}
                    onChange={(e: any) => {
                      const v = e.target.value
                      if (v === '__new__') { setCategoryMode('new'); setForm(f => ({ ...f, category: '' })) }
                      else setForm(f => ({ ...f, category: v }))
                    }}
                    options={[...categoryOptions.slice(1), { label: 'Add new…', value: '__new__' }]}
                    error={errors.category}
                  />
                </div>
              ) : (
                <div>
                  <Input label="New Category" value={newCategory} onChange={(e: any) => setNewCategory(e.target.value)} error={errors.category} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setCategoryMode('select')}>Choose existing instead</div>
                </div>
              )}

              <Select
                label="Colour"
                value={form.colour}
                onChange={(e: any) => setForm(f => ({ ...f, colour: e.target.value }))}
                options={colourFixed.map(c => ({ label: c, value: c }))}
                error={errors.colour}
              />
              <Select
                label="Size"
                value={form.size}
                onChange={(e: any) => setForm(f => ({ ...f, size: e.target.value }))}
                options={sizeFixed.map(s => ({ label: s, value: s }))}
                error={errors.size}
              />
              <Input label="Item Code (SKU)" value={form.itemCode} onChange={(e: any) => setForm(f => ({ ...f, itemCode: e.target.value }))} error={errors.itemCode} />
              <Input label="Unique Stock ID" value={form.stockId} onChange={(e: any) => setForm(f => ({ ...f, stockId: e.target.value }))} error={errors.stockId} />
              <Input label="Quantity" value={String(form.qty ?? '')} onChange={(e: any) => setForm(f => ({ ...f, qty: e.target.value }))} error={errors.qty} />

              <div className="md:col-span-2 mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update' : 'Add Item'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Stock Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignOpen(false)} />
          <div className="relative z-50 w-full max-w-4xl rounded-xl bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assign Stock to Outlet</h2>
                <p className="mt-1 text-sm text-gray-500">Choose an item and outlet, set quantity, and record assignments.</p>
              </div>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Close</Button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card title="New Assignment">
                <div className="grid gap-3">
                  <Select
                    label="Item"
                    value={assignItemId}
                    onChange={(e: any) => setAssignItemId(e.target.value)}
                    options={items.map(i => ({ label: `${i.name} (${i.stockId})`, value: i.id }))}
                  />
                  <Select
                    label="Outlet"
                    value={assignOutletId}
                    onChange={(e: any) => setAssignOutletId(e.target.value)}
                    options={outlets.map(o => ({ label: `${o.name} (${o.code})`, value: o.id }))}
                  />
                  <Input label="Quantity" value={assignQty} onChange={(e: any) => setAssignQty(e.target.value)} placeholder="0" />
                  <div className="flex justify-end">
                    <Button onClick={addAssignment}>Assign</Button>
                  </div>
                </div>
              </Card>
              <Card title="Assigned Stock" className="lg:col-span-2">
                <SimpleTable
                  columns={[
                    { header: 'Item', key: 'item', render: (r: any) => items.find(i => i.id === r.itemId)?.name || r.itemId },
                    { header: 'Outlet', key: 'outlet', render: (r: any) => outlets.find(o => o.id === r.outletId)?.name || r.outletId },
                    { header: 'Qty', key: 'qty' },
                  ]}
                  data={assignments}
                  keyField="id"
                  stickyHeader
                  density="compact"
                />
              </Card>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

