import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Button from '@/components/ui/Button'
import { useOrg } from '@/context/org'
import api from '@/api/axios'
import Alert from '@/components/ui/Alert'

export type StockItem = {
  id: string
  name: string
  category: string
  brand: string
  colour: string
  colourCode?: string
  size: string
  itemCode: string
  stockId: string
}

export default function Stock() {
  const { outlets } = useOrg()
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string>('')

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/items')
      const mapped: StockItem[] = (data || []).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        category: r.category,
        brand: r.brand,
        colour: r.colorName || '',
        colourCode: r.colorCode || '',
        size: String(r.size ?? ''),
        itemCode: r.itemCode,
        stockId: r.stockId,
      }))
      setItems(mapped)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load items', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadItems() }, [])

  // Filters
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [colourFilter, setColourFilter] = useState('')

  // Fixed dropdown options
  const categoryFixed = ['Shoes', 'Sandals', 'Boots', 'Slippers']
  const sizeFixed = ['38', '39', '40', '41', '42', '43', '44']
  const colourFixed = ['Black', 'White', 'Blue', 'Red', 'Brown', 'Grey']

  // Options derived from dataset
  const categoryOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.category), ...categoryFixed])).sort()
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
  // Brand options: fixed + from items
  const brandFixed = ['Vizzano','Pepper','RedTape','MOOCHIES','Modare','HYPE','LITEEGOSS','HYPE']
  const brandOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.brand), ...brandFixed]))
    return set.map(v => ({ label: v, value: v }))
  }, [items])
  const colourCodeOptions = useMemo(() => {
    const set = Array.from(new Set(items.map(i => i.colourCode).filter(Boolean) as string[])).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])

  const columns: Column<StockItem>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Brand', key: 'brand' },
    { header: 'Colour', key: 'colour' },
    { header: 'Colour Code', key: 'colourCode', render: (r) => (
      r.colourCode ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-gray-300" style={{ backgroundColor: r.colourCode }} />
          <span>{r.colourCode}</span>
        </span>
      ) : '-' 
    ) },
    { header: 'Size', key: 'size' },
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Stock ID', key: 'stockId' },
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
    name: '', category: '', brand: '', colour: '', colourCode: '', size: '',
  })
  const [errors, setErrors] = useState<{[k: string]: string}>({})
  const [categoryMode, setCategoryMode] = useState<'select' | 'new'>('select')
  const [newCategory, setNewCategory] = useState('')
  const [brandMode, setBrandMode] = useState<'select' | 'new'>('select')
  const [newBrand, setNewBrand] = useState('')
  const [sizeMode, setSizeMode] = useState<'select' | 'new'>('select')
  const [newSize, setNewSize] = useState('')
  const [colourMode, setColourMode] = useState<'select' | 'new'>('select')
  const [newColour, setNewColour] = useState('')
  const [colourCodeMode, setColourCodeMode] = useState<'select' | 'new'>('select')
  const [newColourCode, setNewColourCode] = useState('')

  const resetForm = () => {
    setForm({ name: '', category: '', brand: '', colour: '', colourCode: '', size: '' })
    setErrors({})
    setCategoryMode('select')
    setNewCategory('')
    setBrandMode('select')
    setNewBrand('')
    setSizeMode('select')
    setNewSize('')
    setColourMode('select')
    setNewColour('')
    setColourCodeMode('select')
    setNewColourCode('')
  }
  const openAdd = () => { setEditingId(null); resetForm(); setOpen(true) }
  const openEdit = (row: StockItem) => {
    setEditingId(row.id)
    setForm({ name: row.name, category: row.category, brand: row.brand, colour: row.colour, colourCode: row.colourCode || '', size: row.size })
    setOpen(true)
  }
  const onDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await api.delete(`/items/${id}`)
      await loadItems()
      setSuccessMsg('Item deleted successfully')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete item', err)
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const eobj: {[k: string]: string} = {}
    const category = categoryMode === 'new' ? newCategory.trim() : form.category
    const brand = brandMode === 'new' ? newBrand.trim() : form.brand
    const size = sizeMode === 'new' ? newSize.trim() : form.size
    const colour = colourMode === 'new' ? newColour.trim() : form.colour
    const colourCode = colourCodeMode === 'new' ? newColourCode.trim() : form.colourCode
    if (!form.name.trim()) eobj.name = 'Required'
    if (!category) eobj.category = 'Required'
    if (!brand) eobj.brand = 'Required'
    if (!colour) eobj.colour = 'Required'
    if (!size) eobj.size = 'Required'
    // itemCode and stockId are auto-generated on backend; no validation here
    setErrors(eobj)
    if (Object.keys(eobj).length) return
    try {
      if (editingId) {
        await api.put(`/items/${editingId}` , {
          name: form.name,
          category,
          brand,
          colorName: colour,
          colorCode: colourCode || null,
          size: Number(size),
        })
      } else {
        await api.post('/items', {
          name: form.name,
          category,
          brand,
          colorName: colour,
          colorCode: colourCode || null,
          size: Number(size),
        })
      }
      await loadItems()
      setOpen(false)
      resetForm()
      setSuccessMsg(editingId ? 'Item updated successfully' : 'Item added successfully')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save item', err)
    }
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
        title="Item Master"
        subtitle="Add items, manage inventory, and assign stock to outlets."
        actions={(
          <div className="flex gap-2">
            <Button variant="primary" onClick={openAdd}>Add Item</Button>
          </div>
        )}
      />
      {successMsg && (
        <div className="mb-3">
          <Alert variant="success" title={successMsg} />
        </div>
      )}
      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Item Name" value={nameFilter} onChange={(e: any) => setNameFilter(e.target.value)} placeholder="Search by name" />
          <Select label="Category" value={categoryFilter} onChange={(e: any) => setCategoryFilter(e.target.value)} options={categoryOptions} />
          <Select label="Size" value={sizeFilter} onChange={(e: any) => setSizeFilter(e.target.value)} options={sizeOptions} />
          <Select label="Colour" value={colourFilter} onChange={(e: any) => setColourFilter(e.target.value)} options={colourOptions} />
        </div>
        <div className="mt-4">
          <SimpleTable columns={columns} data={filtered} keyField="id" />
          {loading && <div className="p-3 text-sm text-gray-500">Loading...</div>}
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
              {brandMode === 'select' ? (
                <div>
                  <Select
                    label="Brand"
                    value={form.brand}
                    onChange={(e: any) => {
                      const v = e.target.value
                      if (v === '__new__') { setBrandMode('new'); setForm(f => ({ ...f, brand: '' })) }
                      else setForm(f => ({ ...f, brand: v }))
                    }}
                    options={[...brandOptions, { label: 'Add new…', value: '__new__' }]}
                    error={errors.brand}
                  />
                </div>
              ) : (
                <div>
                  <Input label="New Brand" value={newBrand} onChange={(e: any) => setNewBrand(e.target.value)} error={errors.brand} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setBrandMode('select')}>Choose existing instead</div>
                </div>
              )}

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

              {colourMode === 'select' ? (
                <div>
                  <Select
                    label="Colour"
                    value={form.colour}
                    onChange={(e: any) => {
                      const v = e.target.value
                      if (v === '__new__') { setColourMode('new'); setForm(f => ({ ...f, colour: '' })) }
                      else setForm(f => ({ ...f, colour: v }))
                    }}
                    options={[...colourOptions.slice(1), { label: 'Add new…', value: '__new__' }]}
                    error={errors.colour}
                  />
                </div>
              ) : (
                <div>
                  <Input label="New Colour" value={newColour} onChange={(e: any) => setNewColour(e.target.value)} error={errors.colour} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setColourMode('select')}>Choose existing instead</div>
                </div>
              )}

              {sizeMode === 'select' ? (
                <div>
                  <Select
                    label="Size"
                    value={form.size}
                    onChange={(e: any) => {
                      const v = e.target.value
                      if (v === '__new__') { setSizeMode('new'); setForm(f => ({ ...f, size: '' })) }
                      else setForm(f => ({ ...f, size: v }))
                    }}
                    options={[...sizeOptions.slice(1), { label: 'Add new…', value: '__new__' }]}
                    error={errors.size}
                  />
                </div>
              ) : (
                <div>
                  <Input label="New Size" value={newSize} onChange={(e: any) => setNewSize(e.target.value)} error={errors.size} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setSizeMode('select')}>Choose existing instead</div>
                </div>
              )}

              {colourCodeMode === 'select' ? (
                <div>
                  <Select
                    label="Colour Code"
                    value={form.colourCode}
                    onChange={(e: any) => {
                      const v = e.target.value
                      if (v === '__new__') { setColourCodeMode('new'); setForm(f => ({ ...f, colourCode: '' })) }
                      else setForm(f => ({ ...f, colourCode: v }))
                    }}
                    options={[...colourCodeOptions.slice(1), { label: 'Add new…', value: '__new__' }]}
                  />
                </div>
              ) : (
                <div>
                  <Input label="New Colour Code" value={newColourCode} onChange={(e: any) => setNewColourCode(e.target.value)} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setColourCodeMode('select')}>Choose existing instead</div>
                </div>
              )}
              {/* Item Code and Unique Stock ID are generated by backend and shown only in table */}

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

