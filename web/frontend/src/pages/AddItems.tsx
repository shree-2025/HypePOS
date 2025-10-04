import { useEffect, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Select from '@/components/ui/Select'
import api from '@/api/axios'
import Alert from '@/components/ui/Alert'

export default function AddItems() {
  type Item = { id: number; name: string; category: string; brand: string; colorName?: string; colorCode?: string; size: number | null; itemCode: string; stockId: string }
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [colour, setColour] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [size, setSize] = useState('')
  const [itemCode, setItemCode] = useState('')
  const [stockId, setStockId] = useState('')
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const validate = () => {
    const e: { [k: string]: string } = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!category.trim()) e.category = 'Category is required'
    if (!brand.trim()) e.brand = 'Brand is required'
    if (!colour.trim()) e.colour = 'Colour is required'
    if (!size.trim()) e.size = 'Size is required'
    if (!itemCode.trim()) e.itemCode = 'Item code is required'
    if (!stockId.trim()) e.stockId = 'Stock ID is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const columns: Column<Item>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Brand', key: 'brand' },
    { header: 'Colour', key: 'colorName' },
    { header: 'Colour Code', key: 'colorCode', render: (row) => (
      <div className="flex items-center gap-2">
        {row.colorCode ? <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: row.colorCode }} /> : null}
        <span>{row.colorCode || ''}</span>
      </div>
    ) },
    { header: 'Size', key: 'size' },
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Stock ID', key: 'stockId' },
    { header: 'Actions', key: 'id', render: (row) => (
      <div className="flex gap-2">
        {/* Edit can be implemented later */}
        <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => onDelete(row.id)}>Delete</Button>
      </div>
    ) },
  ]

  // Simple preset options; we can later fetch these from API or context
  const categoryOptions = [
    { label: 'Shoes', value: 'Shoes' },
    { label: 'Sandals', value: 'Sandals' },
    { label: 'Boots', value: 'Boots' },
    { label: 'Slippers', value: 'Slippers' },
  ]
  const colourOptions = [
    { label: 'Black', value: 'Black' },
    { label: 'White', value: 'White' },
    { label: 'Blue', value: 'Blue' },
    { label: 'Red', value: 'Red' },
    { label: 'Green', value: 'Green' },
  ]

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/items')
      setItems(data)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load items', err)
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: number) => {
    try {
      await api.delete(`/items/${id}`)
      await loadItems()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete item', err)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <Shell>
      <PageHeader
        title="Add Items"
        subtitle="Create a new item and review all items below."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add Item</Button>}
      />
      <Card>
        <SimpleTable columns={columns} data={items} keyField="id" />
        {loading && <div className="p-3 text-sm text-gray-500">Loading...</div>}
      </Card>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add Item</h2>
            <p className="mt-1 text-sm text-gray-500">Enter basic attributes for the new item.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!validate()) return
                try {
                  await api.post('/items', {
                    name,
                    category,
                    brand,
                    colorName: colour,
                    colorCode: colorCode || null,
                    size: Number(size),
                    itemCode,
                    stockId,
                  })
                  await loadItems()
                  setOpen(false)
                  setName('')
                  setCategory('')
                  setBrand('')
                  setColour('')
                  setColorCode('')
                  setSize('')
                  setItemCode('')
                  setStockId('')
                  setErrors({})
                  setSuccessMsg('Item added successfully')
                  setTimeout(() => setSuccessMsg(''), 3000)
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('Failed to create item', err)
                }
              }}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <Input label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Sneaker X" error={errors.name} />
              <Select label="Category" value={category} onChange={(e: any) => setCategory(e.target.value)} options={categoryOptions} error={errors.category} />
              <Input label="Brand" value={brand} onChange={(e: any) => setBrand(e.target.value)} placeholder="Brand Co" error={errors.brand} />
              <Select label="Colour" value={colour} onChange={(e: any) => setColour(e.target.value)} options={colourOptions} error={errors.colour} />
              <Input label="Colour Code" value={colorCode} onChange={(e: any) => setColorCode(e.target.value)} placeholder="#000000" />
              <Input label="Size" value={size} onChange={(e: any) => setSize(e.target.value)} placeholder="42" error={errors.size} />
              <Input label="Item Code" value={itemCode} onChange={(e: any) => setItemCode(e.target.value)} placeholder="SKU-001" error={errors.itemCode} />
              <Input label="Stock ID" value={stockId} onChange={(e: any) => setStockId(e.target.value)} placeholder="STK-1001" error={errors.stockId} />
              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false) }}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}

