import { useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Select from '@/components/ui/Select'

export default function AddItems() {
  type Item = { id: string; name: string; category: string; brand: string; colour: string; size: string; itemCode: string }
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [colour, setColour] = useState('')
  const [size, setSize] = useState('')
  const [itemCode, setItemCode] = useState('')
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const validate = () => {
    const e: { [k: string]: string } = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!category.trim()) e.category = 'Category is required'
    if (!brand.trim()) e.brand = 'Brand is required'
    if (!colour.trim()) e.colour = 'Colour is required'
    if (!size.trim()) e.size = 'Size is required'
    if (!itemCode.trim()) e.itemCode = 'Item code is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const columns: Column<Item>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Brand', key: 'brand' },
    { header: 'Colour', key: 'colour' },
    { header: 'Size', key: 'size' },
    { header: 'Item Code', key: 'itemCode' },
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

  return (
    <Shell>
      <PageHeader
        title="Add Items"
        subtitle="Create a new item and review all items below."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add Item</Button>}
      />
      <Card>
        <SimpleTable columns={columns} data={items} keyField="id" />
      </Card>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add Item</h2>
            <p className="mt-1 text-sm text-gray-500">Enter basic attributes for the new item.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!validate()) return
                const id = `itm-${Date.now()}`
                setItems(prev => [...prev, { id, name, category, brand, colour, size, itemCode }])
                setOpen(false)
                setName('')
                setCategory('')
                setBrand('')
                setColour('')
                setSize('')
                setItemCode('')
                setErrors({})
              }}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <Input label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Sneaker X" error={errors.name} />
              <Select label="Category" value={category} onChange={(e: any) => setCategory(e.target.value)} options={categoryOptions} error={errors.category} />
              <Input label="Brand" value={brand} onChange={(e: any) => setBrand(e.target.value)} placeholder="Brand Co" error={errors.brand} />
              <Select label="Colour" value={colour} onChange={(e: any) => setColour(e.target.value)} options={colourOptions} error={errors.colour} />
              <Input label="Size" value={size} onChange={(e: any) => setSize(e.target.value)} placeholder="42" error={errors.size} />
              <Input label="Item Code" value={itemCode} onChange={(e: any) => setItemCode(e.target.value)} placeholder="SKU-001" error={errors.itemCode} />
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

