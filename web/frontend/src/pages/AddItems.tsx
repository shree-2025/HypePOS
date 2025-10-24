import { useEffect, useMemo, useState } from 'react'
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
  type Item = {
    id: number
    brand: string
    category: string
    itemCode: string
    itemCodeDesc: string
    colorName?: string
    colorCode?: string
    size: number | null
    description?: string
    retailPrice?: number
    dealerPrice?: number
    costPrice?: number
    lastPurchasePrice?: number
    sole?: string
    material?: string
    hsnCode?: string
    taxCode?: string
    imageId?: string
    
    stockNo?: string
    stockId?: string
  }
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [itemCodeDesc, setItemCodeDesc] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [colour, setColour] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [size, setSize] = useState('')
  const [itemCode, setItemCode] = useState('')
  const [stockId, setStockId] = useState('')
  const [description, setDescription] = useState('')
  const [descChoice, setDescChoice] = useState('')
  const [descCustom, setDescCustom] = useState('')
  const [retailPrice, setRetailPrice] = useState('')
  const [dealerPrice, setDealerPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [lastPurchasePrice, setLastPurchasePrice] = useState('')
  const [sole, setSole] = useState('')
  const [material, setMaterial] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const stockNo = useMemo(() => {
    const code = (itemCode || '').toString().trim()
    const col = (colorCode || '').toString().trim()
    const sz = (size || '').toString().trim()
    if (!code || !col || !sz) return ''
    const nsz = Number(sz)
    return `${code}155${col}${Number.isFinite(nsz) ? nsz : sz}`
  }, [itemCode, colorCode, size])

  const validate = () => {
    const e: { [k: string]: string } = {}
    if (!itemCodeDesc.trim()) e.itemCodeDesc = 'Item Code Desc is required'
    if (!category.trim()) e.category = 'Category is required'
    if (!brand.trim()) e.brand = 'Brand is required'
    if (!colorCode.trim()) e.colorCode = 'Colour Code is required'
    if (!size.trim()) e.size = 'Size is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const columns = useMemo(() => {
    const base: Column<Item>[] = [
      { header: 'Brand', key: 'brand' },
      { header: 'Category', key: 'category' },
      { header: 'Item Code', key: 'itemCode' },
      { header: 'Item Code Desc.', key: 'itemCodeDesc' },
      { header: 'Colour Code', key: 'colorCode', render: (row) => (
        <div className="flex items-center gap-2">
          {row.colorCode ? <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: row.colorCode }} /> : null}
          <span>{row.colorCode || ''}</span>
        </div>
      ) },
      { header: 'Colour Desc.', key: 'colorName' },
      { header: 'Size', key: 'size' },
      { header: 'Item Description', key: 'description' },
      { header: 'Retail Price', key: 'retailPrice', render: (r) => r.retailPrice != null ? `₹ ${r.retailPrice}` : '' },
      { header: 'Dealer Price', key: 'dealerPrice', render: (r) => r.dealerPrice != null ? `₹ ${r.dealerPrice}` : '' },
      { header: 'Cost Price', key: 'costPrice', render: (r) => r.costPrice != null ? `₹ ${r.costPrice}` : '' },
      { header: 'Last Purchase Price', key: 'lastPurchasePrice', render: (r) => r.lastPurchasePrice != null ? `₹ ${r.lastPurchasePrice}` : '' },
      { header: 'Sole', key: 'sole' },
      { header: 'Material', key: 'material' },
      { header: 'HSN Code', key: 'hsnCode' },
      { header: 'Tax Code', key: 'taxCode' },
      { header: 'Image', key: 'imageId', render: (r) => r.imageId ? <img src={r.imageId} alt="img" className="h-8 w-8 rounded object-cover" /> : '' },
      { header: 'Actions', key: 'id', render: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => onDelete(row.id)}>Delete</Button>
        </div>
      ) },
    ]
    // Filter out columns that have no data across all items
    return base.filter(col => {
      if (col.key === 'id') return true // always show actions
      return items.some(item => item[col.key as keyof Item] != null && item[col.key as keyof Item] !== '')
    })
  }, [items])

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

  // Build Item Description dropdown options from existing items
  const descOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => {
      if (i.description && i.description.trim()) set.add(i.description.trim())
      else if (i.itemCodeDesc && i.itemCodeDesc.trim()) set.add(i.itemCodeDesc.trim())
    })
    const arr = Array.from(set).sort()
    return [{ label: 'LADIES FOOTWEAR', value: 'LADIES FOOTWEAR' }, ...arr.map(v => ({ label: v, value: v })), { label: 'Add New…', value: '__NEW__' }]
  }, [items])

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
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-white p-5 shadow-soft max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900">Add Item</h2>
            <p className="mt-1 text-sm text-gray-500">Enter basic attributes for the new item.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!validate()) return
                try {
                  await api.post('/items', {
                    category,
                    brand,
                    colorCode: colorCode || null,
                    size: Number(size),
                    itemCodeDesc,
                    itemCode: itemCode || null,
                    stockId: stockId || undefined,
                    description: (descChoice === '__NEW__' ? descCustom : (descChoice || description)) || null,
                    retailPrice: retailPrice ? Number(retailPrice) : null,
                    dealerPrice: dealerPrice ? Number(dealerPrice) : null,
                    costPrice: costPrice ? Number(costPrice) : null,
                    lastPurchasePrice: lastPurchasePrice ? Number(lastPurchasePrice) : null,
                    sole: sole || null,
                    material: material || null,
                    hsnCode: hsnCode || null,
                    taxCode: taxCode || null,
                  })
                  await loadItems()
                  setOpen(false)
                  setItemCodeDesc('')
                  setCategory('')
                  setBrand('')
                  setColour('')
                  setColorCode('')
                  setSize('')
                  setItemCode('')
                  setStockId('')
                  setDescription('')
                  setDescChoice('')
                  setDescCustom('')
                  setRetailPrice('')
                  setDealerPrice('')
                  setCostPrice('')
                  setLastPurchasePrice('')
                  setSole('')
                  setMaterial('')
                  setHsnCode('')
                  setTaxCode('')
                  setErrors({})
                  setSuccessMsg('Item added successfully')
                  setTimeout(() => setSuccessMsg(''), 3000)
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('Failed to create item', err)
                }
              }}
              className="mt-3 grid gap-3 md:grid-cols-3"
            >
              <Input label="Item Code Desc." value={itemCodeDesc} onChange={(e: any) => setItemCodeDesc(e.target.value)} placeholder="e.g., SPORT RUNNER" error={errors.itemCodeDesc} />
              <Input label="Item Code" value={itemCode} onChange={(e: any) => setItemCode(e.target.value)} placeholder="Enter item code (e.g., 00001)" />
              <Input label="Stock No" value={stockNo} onChange={() => {}} placeholder="Auto (ItemCode+155+ColourCode+Size)" disabled />
              <Select label="Category" value={category} onChange={(e: any) => setCategory(e.target.value)} options={categoryOptions} error={errors.category} />
              <Input label="Brand" value={brand} onChange={(e: any) => setBrand(e.target.value)} placeholder="Brand Co" error={errors.brand} />
              <Select label="Colour" value={colour} onChange={(e: any) => setColour(e.target.value)} options={colourOptions} error={errors.colour} />
              <Input label="Colour Code" value={colorCode} onChange={(e: any) => setColorCode(e.target.value)} placeholder="#000000" error={errors.colorCode} />
              <Input label="Size" value={size} onChange={(e: any) => setSize(e.target.value)} placeholder="42" error={errors.size} />

              {/* Item Description dropdown with Add New - inline in grid */}
              <Select label="Item Description" value={descChoice} onChange={(e: any) => setDescChoice(e.target.value)} options={descOptions} />
              {descChoice === '__NEW__' && (
                <Input label="New Description" value={descCustom} onChange={(e: any) => setDescCustom(e.target.value)} placeholder="Type new description" />
              )}

              <Input label="Retail Price" type="number" value={retailPrice} onChange={(e: any) => setRetailPrice(e.target.value)} placeholder="1999" />
              <Input label="Dealer Price" type="number" value={dealerPrice} onChange={(e: any) => setDealerPrice(e.target.value)} placeholder="1799" />
              <Input label="Cost Price" type="number" value={costPrice} onChange={(e: any) => setCostPrice(e.target.value)} placeholder="1500" />
              <Input label="Last Purchase Price" type="number" value={lastPurchasePrice} onChange={(e: any) => setLastPurchasePrice(e.target.value)} placeholder="1600" />
              <Input label="Sole" value={sole} onChange={(e: any) => setSole(e.target.value)} placeholder="Rubber" />
              <Input label="Material" value={material} onChange={(e: any) => setMaterial(e.target.value)} placeholder="Leather" />
              {/* Last row: HSN Code, Tax Code, Item Image */}
              <Input label="HSN Code" value={hsnCode} onChange={(e: any) => setHsnCode(e.target.value)} placeholder="e.g., 6404" />
              <Input label="Tax Code" value={taxCode} onChange={(e: any) => setTaxCode(e.target.value)} placeholder="e.g., GST-12" />
              <div>
                <label className="mb-1 block text-xs text-gray-600">Item Image</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={async (e: any) => { const f = e.target.files?.[0]; if (!f) return; try { const fd = new FormData(); fd.append('file', f); const { data } = await api.post('/items/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); if (data?.url) { /* no preview state in this page */ } } catch {} }} />
                </div>
              </div>
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