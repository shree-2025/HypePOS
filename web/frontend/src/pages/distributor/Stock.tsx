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
  stockNo?: string
  itemCode: string
  itemCodeDesc: string
  category: string
  brand: string
  colour: string
  colourCode?: string
  size: string
  stockId: string
  description?: string
  retailPrice?: number | null
  dealerPrice?: number | null
  costPrice?: number | null
  lastPurchasePrice?: number | null
  sole?: string | null
  material?: string | null
  hsnCode?: string | null
  imageId?: string | null
  taxCode?: string | null
}

export default function Stock() {
  const { outlets } = useOrg()
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string>('')
  const [saving, setSaving] = useState(false)
  // Colours master list (from /colours)
  type ColourRec = { id: number; colorCode: number | string; colorDesc: string | null }
  const [colours, setColours] = useState<ColourRec[]>([])

  // Brands master list (from /brands). Each row is a brand+category pair
  type BrandRec = { id: number; brandName: string; category: string | null }
  const [brands, setBrands] = useState<BrandRec[]>([])

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/items')
      const mapped: StockItem[] = (data || []).map((r: any) => ({
        id: String(r.id),
        stockNo: r.stockNo,
        itemCode: r.itemCode,
        itemCodeDesc: r.itemCodeDesc || '',
        category: r.category || '',
        brand: r.brand || '',
        colour: r.colorName || '',
        colourCode: r.colorCode || '',
        size: String(r.size ?? ''),
        stockId: r.stockId,
        description: r.description || '',
        retailPrice: r.retailPrice ?? null,
        dealerPrice: r.dealerPrice ?? null,
        costPrice: r.costPrice ?? null,
        lastPurchasePrice: r.lastPurchasePrice ?? null,
        sole: r.sole ?? null,
        material: r.material ?? null,
        hsnCode: r.hsnCode ?? null,
        imageId: r.imageId ?? null,
        taxCode: r.taxCode ?? null,
      }))
      setItems(mapped)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load items', err)
    } finally {
      setLoading(false)
    }
  }
  // Bulk upload state and handlers
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState<any[]>([])
  const [bulkText, setBulkText] = useState<string>('')
  const [bulkParseError, setBulkParseError] = useState<string>('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ inserted: number; errors: Array<{ index: number; message: string }> } | null>(null)

  const downloadSampleCsv = () => {
    const header = [
      'brand','category','colorCode','size','itemCodeDesc','description','retailPrice','dealerPrice','costPrice','lastPurchasePrice','sole','material','hsnCode','imageId'
    ]
    const rows = [
      ['EGOSS','Boots Laceup','BEG+GOLD','42','Runner Pro','Comfort sneaker','787','564','121','216','Rubber','Leather','6403',''],
      ['EGOSS','Casual','RANI','39','HYPE Classic','','544','505','505','505','','Leather','6403','']
    ]
    const csv = [header.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '')
      return (/[",\n]/.test(s)) ? '"' + s.replace(/"/g, '""') + '"' : s
    }).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'items-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCsv(text: string): { headers: string[]; rows: string[][] } {
    const out: string[][] = []
    const lines: string[] = []
    // Normalize newlines
    text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').forEach(l => lines.push(l))
    const parseLine = (line: string): string[] => {
      const cells: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') { cur += '"'; i += 1 } else { inQuotes = false }
          } else { cur += ch }
        } else if (ch === ',') {
          cells.push(cur); cur = ''
        } else if (ch === '"') { inQuotes = true }
        else { cur += ch }
      }
      cells.push(cur)
      return cells.map(c => c.trim())
    }
    for (const l of lines) { out.push(parseLine(l)) }
    const headers = (out.shift() || []).map(h => h.trim())
    return { headers, rows: out }
  }

  const applyParsedText = (text: string) => {
    try {
      setBulkParseError('')
      setBulkResult(null)
      const { headers, rows } = parseCsv(text)
      const reqKeys = ['brand','category','colorCode','size','itemCodeDesc']
      const lowerHeaders = headers.map(h => h.trim())
      const missing = reqKeys.filter(k => !lowerHeaders.includes(k))
      if (missing.length) {
        setBulkParseError(`Missing required columns: ${missing.join(', ')}`)
        setBulkRows([])
        return
      }
      const idx: Record<string, number> = {}
      lowerHeaders.forEach((h, i) => { idx[h] = i })
      const mapped = rows
        .filter(r => r && r.some(c => String(c).trim() !== ''))
        .map((r) => ({
          brand: r[idx.brand] ?? '',
          category: r[idx.category] ?? '',
          colorCode: r[idx.colorCode] ?? '',
          size: r[idx.size] ?? '',
          itemCodeDesc: r[idx.itemCodeDesc] ?? '',
          description: r[idx.description] ?? '',
          retailPrice: r[idx.retailPrice] ?? '',
          dealerPrice: r[idx.dealerPrice] ?? '',
          costPrice: r[idx.costPrice] ?? '',
          lastPurchasePrice: r[idx.lastPurchasePrice] ?? '',
          sole: r[idx.sole] ?? '',
          material: r[idx.material] ?? '',
          hsnCode: r[idx.hsnCode] ?? '',
          imageId: r[idx.imageId] ?? '',
        }))
      setBulkRows(mapped)
    } catch (err: any) {
      setBulkParseError(err?.message || 'Failed to parse CSV')
      setBulkRows([])
    }
  }

  const onCsvFile = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setBulkText(text)
    applyParsedText(text)
  }

  const submitBulk = async () => {
    try {
      if (!bulkRows.length) return
      setBulkSaving(true)
      setBulkResult(null)
      const { data } = await api.post('/items/bulk', { rows: bulkRows })
      setBulkResult(data)
      await loadItems()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Bulk upload failed', err)
      setBulkParseError('Upload failed')
    } finally {
      setBulkSaving(false)
    }
  }
  

  useEffect(() => { loadItems() }, [])

  // Load colours master for code/desc linkage
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/colours')
        const arr: ColourRec[] = Array.isArray(data) ? data : []
        setColours(arr)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load colours', err)
      }
    })()
  }, [])

  // Load brands master for brand/category linkage
  const loadBrands = async () => {
    try {
      const { data } = await api.get('/brands')
      setBrands(Array.isArray(data) ? data : [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load brands', err)
    }
  }
  useEffect(() => { loadBrands() }, [])

  // Filters
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [colourFilter, setColourFilter] = useState('')

  // Fixed dropdown options (non-brand dependent)
  const sizeFixed = ['38', '39', '40', '41', '42', '43', '44']
  const colourFixed = ['Black', 'White', 'Blue', 'Red', 'Brown', 'Grey']

  // Options derived from dataset
  // Category filter options still come from dataset (independent of form linkage)
  const categoryOptions = useMemo(() => {
    const set = Array.from(new Set(items.map(i => i.category).filter(v => !!v && String(v).trim().length > 0))).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  const sizeOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.size).filter(v => !!v && String(v).trim().length > 0), ...sizeFixed])).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  const colourOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.colour).filter(v => !!v && String(v).trim().length > 0), ...colourFixed])).sort()
    return [{ label: 'All', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  // Build brand -> categories map from brands master
  const brandsByName = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const b of brands) {
      const name = b.brandName
      const cat = (b.category || '').trim()
      if (!map[name]) map[name] = []
      if (cat && !map[name].includes(cat)) map[name].push(cat)
    }
    // Sort categories per brand
    for (const k of Object.keys(map)) map[k].sort()
    return map
  }, [brands])

  const brandSelectOptions = useMemo(() => {
    const names = Object.keys(brandsByName).sort()
    return names.map(n => ({ label: n, value: n }))
  }, [brandsByName])
  const colourCodeOptions = useMemo(() => {
    const options = colours
      .slice()
      .sort((a, b) => Number(a.colorCode) - Number(b.colorCode))
      .map(c => ({ label: String(c.colorCode), value: String(c.colorCode) }))
    return [{ label: 'All', value: '' }, ...options]
  }, [colours])

  const columns: Column<StockItem>[] = [
    { header: 'Stock No', key: 'stockNo' },
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Item Code Desc', key: 'itemCodeDesc' },
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
    { header: 'Retailer Price', key: 'retailPrice', render: (r) => r.retailPrice != null ? `₹ ${Number(r.retailPrice).toLocaleString('en-IN')}` : '-' },
    { header: 'Dealer Price', key: 'dealerPrice', render: (r) => r.dealerPrice != null ? `₹ ${Number(r.dealerPrice).toLocaleString('en-IN')}` : '-' },
    { header: 'Cost Price', key: 'costPrice', render: (r) => r.costPrice != null ? `₹ ${Number(r.costPrice).toLocaleString('en-IN')}` : '-' },
    { header: 'Last Purchase Price', key: 'lastPurchasePrice', render: (r) => r.lastPurchasePrice != null ? `₹ ${Number(r.lastPurchasePrice).toLocaleString('en-IN')}` : '-' },
    { header: 'Sole', key: 'sole', render: (r) => r.sole || '-' },
    { header: 'Material', key: 'material', render: (r) => r.material || '-' },
    { header: 'HSN', key: 'hsnCode', render: (r) => r.hsnCode || '-' },
    { header: 'Tax Code', key: 'taxCode', render: (r) => r.taxCode || '-' },
    { header: 'Actions', key: 'actions', render: (row) => (
      <div className="flex gap-2">
        <Button type="button" className="px-2 py-1 text-xs" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
        <Button type="button" className="px-2 py-1 text-xs" variant="warning" onClick={() => onDelete(row.id)}>Delete</Button>
      </div>
    ) },
  ]

  const filtered = useMemo(() => {
    return items.filter(i => {
      const nameOk = !nameFilter || i.itemCodeDesc.toLowerCase().includes(nameFilter.toLowerCase())
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
    itemCode: '', itemCodeDesc: '', category: '', brand: '', colour: '', colourCode: '', size: '',
    description: '', retailPrice: '', dealerPrice: '', costPrice: '', lastPurchasePrice: '',
    sole: '', material: '', hsnCode: '', taxCode: '', imageId: '',
  })
  // Item Description dropdown options from existing items
  const descOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => {
      if (i.description && String(i.description).trim()) set.add(String(i.description).trim())
      else if ((i as any).itemCodeDesc && String((i as any).itemCodeDesc).trim()) set.add(String((i as any).itemCodeDesc).trim())
    })
    const arr = Array.from(set).sort()
    return [{ label: 'LADIES FOOTWEAR', value: 'LADIES FOOTWEAR' }, ...arr.map(v => ({ label: v, value: v })), { label: 'Add New…', value: '__NEW__' }]
  }, [items])
  const [descChoice, setDescChoice] = useState('')
  const [descCustom, setDescCustom] = useState('')
  // Derived: Stock No from Item Code + 155 + Colour Code + Size
  const stockNo = useMemo(() => {
    const code = (form as any)?.itemCode ? String((form as any).itemCode).trim() : ''
    const col = String((form as any)?.colourCode || '').trim()
    const sz = String((form as any)?.size || '').trim()
    if (!code || !col || !sz) return ''
    const nsz = Number(sz)
    return `${code}155${col}${Number.isFinite(nsz) ? nsz : sz}`
  }, [form])
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
    setForm({ itemCode: '', itemCodeDesc: '', category: '', brand: '', colour: '', colourCode: '', size: '', description: '', retailPrice: '', dealerPrice: '', costPrice: '', lastPurchasePrice: '', sole: '', material: '', hsnCode: '', taxCode: '', imageId: '' })
    setErrors({})
    setDescChoice('')
    setDescCustom('')
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
  const openAdd = () => { setEditingId(null); resetForm(); loadBrands(); setOpen(true) }
  const openEdit = (row: StockItem) => {
    setEditingId(row.id)
    setForm({
      itemCode: row.itemCode || '',
      itemCodeDesc: row.itemCodeDesc,
      category: row.category,
      brand: row.brand,
      colour: row.colour,
      colourCode: row.colourCode || '',
      size: row.size,
      description: row.description || '',
      retailPrice: row.retailPrice != null ? String(row.retailPrice) : '',
      dealerPrice: row.dealerPrice != null ? String(row.dealerPrice) : '',
      costPrice: row.costPrice != null ? String(row.costPrice) : '',
      lastPurchasePrice: row.lastPurchasePrice != null ? String(row.lastPurchasePrice) : '',
      sole: row.sole || '',
      material: row.material || '',
      hsnCode: row.hsnCode || '',
      taxCode: row.taxCode || '',
      imageId: row.imageId || '',
    })
    setDescChoice(row.description || '')
    setDescCustom('')
    // If colour code present, ensure colour name matches master
    try {
      if (row.colourCode) {
        const found = colours.find(c => String(c.colorCode) === String(row.colourCode))
        if (found && found.colorDesc) setForm(f => ({ ...f, colour: found.colorDesc as string }))
      }
    } catch {}
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
    const colour = form.colour
    const colourCode = colourCodeMode === 'new' ? newColourCode.trim() : form.colourCode
    if (!form.itemCodeDesc.trim()) eobj.itemCodeDesc = 'Required'
    if (!(form as any).itemCode || !(String((form as any).itemCode).trim())) eobj.itemCode = 'Required'
    if (!category) eobj.category = 'Required'
    if (!brand) eobj.brand = 'Required'
    if (!colourCode) eobj.colourCode = 'Required'
    // Ensure colour description is derived from selected code
    if (colourCode && !colour) eobj.colourCode = 'Invalid colour code'
    if (!size) eobj.size = 'Required'
    // itemCode and stockId are auto-generated on backend; no validation here
    setErrors(eobj)
    if (Object.keys(eobj).length) return
    try {
      setSaving(true)
      // Ensure brand+category exists in brand master; create if missing
      const knownCats = brandsByName[brand] || []
      if (!knownCats.includes(category)) {
        try { await api.post('/brands', { brandName: brand, categories: [category] }) } catch {}
        await loadBrands()
      }
      const finalDescription = (descChoice === '__NEW__' ? descCustom : (descChoice || form.description)) || null
      if (editingId) {
        await api.put(`/items/${editingId}` , {
          itemCodeDesc: form.itemCodeDesc,
          category,
          brand,
          colorCode: colourCode || null,
          size: Number(size),
          description: finalDescription,
          retailPrice: form.retailPrice ? Number(form.retailPrice) : null,
          dealerPrice: form.dealerPrice ? Number(form.dealerPrice) : null,
          costPrice: form.costPrice ? Number(form.costPrice) : null,
          lastPurchasePrice: form.lastPurchasePrice ? Number(form.lastPurchasePrice) : null,
          sole: form.sole || null,
          material: form.material || null,
          hsnCode: form.hsnCode || null,
          taxCode: form.taxCode || null,
          imageId: form.imageId || null,
          itemCode: (form as any).itemCode || null,
        })
      } else {
        await api.post('/items', {
          itemCodeDesc: form.itemCodeDesc,
          category,
          brand,
          colorCode: colourCode || null,
          size: Number(size),
          description: finalDescription,
          retailPrice: form.retailPrice ? Number(form.retailPrice) : null,
          dealerPrice: form.dealerPrice ? Number(form.dealerPrice) : null,
          costPrice: form.costPrice ? Number(form.costPrice) : null,
          lastPurchasePrice: form.lastPurchasePrice ? Number(form.lastPurchasePrice) : null,
          sole: form.sole || null,
          material: form.material || null,
          hsnCode: form.hsnCode || null,
          taxCode: form.taxCode || null,
          imageId: form.imageId || null,
          itemCode: (form as any).itemCode || null,
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
    } finally { setSaving(false) }
  }

  // Assignment state
  type AssignRow = { id: string; itemId: string; outletId: string; qty: number }
  const [assignments, setAssignments] = useState<AssignRow[]>([])
  const [assignItemId, setAssignItemId] = useState('')
  const [assignOutletId, setAssignOutletId] = useState('')
  const [assignQty, setAssignQty] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const uploadItemImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    setUploadingImage(true)
    try {
      const { data } = await api.post('/items/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (data?.url) {
        setForm(f => ({ ...f, imageId: data.url }))
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Image upload failed', e)
      alert('Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }
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
            <Button variant="outline" onClick={() => setBulkOpen(true)}>Bulk Upload</Button>
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
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-white p-5 shadow-soft max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Item' : 'Add Item'}</h2>
            <p className="mt-1 text-sm text-gray-500">Fields aligned to HYPE MASTER. Item Code auto-generates; Stock No derives from Item Code + 155 + Colour Code + Size.</p>
            <form onSubmit={handleSubmit} className="mt-3 grid gap-3 md:grid-cols-3">
              <Input label="Item Code" value={(form as any).itemCode} onChange={(e: any) => setForm(f => ({ ...f, itemCode: e.target.value }))} />
              <Input label="Item Code Desc" value={form.itemCodeDesc} onChange={(e: any) => setForm(f => ({ ...f, itemCodeDesc: e.target.value }))} error={errors.itemCodeDesc} />
              <Input label="Stock No" value={stockNo} onChange={() => {}} placeholder="Auto (ItemCode+155+ColourCode+Size)" disabled />
              {brandMode === 'select' ? (
                <div>
                  <Select
                    label="Brand"
                    value={form.brand}
                    onChange={(e: any) => {
                      const v = e.target.value
                      if (v === '__new__') { setBrandMode('new'); setForm(f => ({ ...f, brand: '' })) }
                      else {
                        setForm(f => ({ ...f, brand: v }))
                        // Reset category if it no longer belongs to selected brand
                        if (v && form.category && !(brandsByName[v] || []).includes(form.category)) {
                          setForm(f => ({ ...f, category: '' }))
                        }
                      }
                    }}
                    options={[...brandSelectOptions, { label: 'Add new…', value: '__new__' }]}
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
                    options={[
                      ...(
                        form.brand && brandsByName[form.brand]
                          ? brandsByName[form.brand].map(c => ({ label: c, value: c }))
                          : []
                      ),
                      { label: 'Add new…', value: '__new__' }
                    ]}
                    error={errors.category}
                  />
                </div>
              ) : (
                <div>
                  <Input label="New Category" value={newCategory} onChange={(e: any) => setNewCategory(e.target.value)} error={errors.category} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setCategoryMode('select')}>Choose existing instead</div>
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
                      else {
                        setForm(f => ({ ...f, colourCode: v }))
                        const found = colours.find(c => String(c.colorCode) === String(v))
                        if (found && found.colorDesc) {
                          setForm(f => ({ ...f, colour: found.colorDesc as string }))
                        }
                        if (!found) {
                          setForm(f => ({ ...f, colour: '' }))
                        }
                      }
                    }}
                    options={[...colourCodeOptions.slice(1), { label: 'Add new…', value: '__new__' }]}
                    error={errors.colourCode}
                  />
                  {form.colourCode && (
                    <div className="mt-1 text-xs text-gray-600">Selected description: {colours.find(c => String(c.colorCode) === String(form.colourCode))?.colorDesc || '-'}</div>
                  )}
                </div>
              ) : (
                <div>
                  <Input label="New Colour Code" value={newColourCode} onChange={(e: any) => setNewColourCode(e.target.value)} />
                  <div className="mt-1 text-xs text-blue-600 cursor-pointer" onClick={() => setColourCodeMode('select')}>Choose existing instead</div>
                </div>
              )}
              <div>
                <Input label="Colour" value={form.colour} placeholder="Auto from Colour Code" readOnly error={errors.colour} />
                <div className="mt-1 text-xs text-gray-600">Select a Colour Code to auto-fill this field.</div>
              </div>
              {/* Item Code and Unique Stock ID are generated by backend and shown only in table */}

              {/* Item Description in grid (single column) */}
              <Select label="Item Description" value={descChoice} onChange={(e: any) => setDescChoice(e.target.value)} options={descOptions} />
              {descChoice === '__NEW__' && (
                <Input label="New Description" value={descCustom} onChange={(e: any) => setDescCustom(e.target.value)} placeholder="Type new description" />
              )}
              <Input label="Retail Price" type="number" value={form.retailPrice} onChange={(e: any) => setForm(f => ({ ...f, retailPrice: e.target.value }))} placeholder="1999" />
              <Input label="Dealer Price" type="number" value={form.dealerPrice} onChange={(e: any) => setForm(f => ({ ...f, dealerPrice: e.target.value }))} placeholder="1799" />
              <Input label="Cost Price" type="number" value={form.costPrice} onChange={(e: any) => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="1500" />
              <Input label="Last Purc. Price" type="number" value={form.lastPurchasePrice} onChange={(e: any) => setForm(f => ({ ...f, lastPurchasePrice: e.target.value }))} placeholder="1600" />
              <Input label="Sole" value={form.sole} onChange={(e: any) => setForm(f => ({ ...f, sole: e.target.value }))} placeholder="Rubber" />
              <Input label="Material" value={form.material} onChange={(e: any) => setForm(f => ({ ...f, material: e.target.value }))} placeholder="Leather" />
              <Input label="HSN Code" value={form.hsnCode} onChange={(e: any) => setForm(f => ({ ...f, hsnCode: e.target.value }))} placeholder="" />
              <Input label="Tax Code" value={(form as any).taxCode} onChange={(e: any) => setForm(f => ({ ...f, taxCode: e.target.value }))} placeholder="" />
              <div>
                <label className="mb-1 block text-xs text-gray-600">Item Image</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={(e: any) => { const f = e.target.files?.[0]; if (f) uploadItemImage(f) }} />
                  {uploadingImage && <span className="text-xs text-gray-500">Uploading...</span>}
                </div>
                {form.imageId && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageId} alt="preview" className="h-16 w-16 rounded object-cover" />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Add Item'}</Button>
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
                    options={items.map(i => ({ label: `${i.itemCodeDesc} (${i.stockId})`, value: i.id }))}
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
                    { header: 'Item', key: 'item', render: (r: any) => items.find(i => i.id === r.itemId)?.itemCodeDesc || r.itemId },
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

      {/* Bulk Upload Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBulkOpen(false)} />
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-white p-5 shadow-soft max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Items (CSV)</h2>
                <p className="mt-1 text-sm text-gray-500">Paste CSV or choose file. Columns: <code>brand,category,colorCode,size,itemCodeDesc</code> and optional pricing, taxes, flags, and specs.</p>
              </div>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>Close</Button>
            </div>
            <div className="mt-4 grid gap-4">
              <div>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={6}
                  placeholder={"brand,category,colorCode,size,itemCodeDesc,description,retailPrice,dealerPrice,costPrice,lastPurchasePrice,sole,material,hsnCode,imageId\nEGOSS,Casual,RANI,39,HYPE Classic,,544,505,505,505,,Leather,6403,"}
                  value={bulkText}
                  onChange={(e: any) => { setBulkText(e.target.value); applyParsedText(e.target.value) }}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadSampleCsv}>Download Sample CSV</Button>
                <label className="inline-flex items-center gap-3 text-sm">
                  <input type="file" accept=".csv" onChange={onCsvFile} />
                </label>
              </div>
              <div className="flex items-center gap-3">
                {bulkParseError && <Alert variant="warning" title={bulkParseError} />}
                {!bulkParseError && (
                  <div className="text-sm text-gray-700">Parsed: <strong>{bulkRows.length}</strong> rows</div>
                )}
              </div>
              {/* Preview Table */}
              {!!bulkRows.length && !bulkParseError && (
                <Card title="Preview">
                  <SimpleTable
                    columns={[
                      { header: 'Item Code Desc', key: 'itemCodeDesc' },
                      { header: 'Category', key: 'category' },
                      { header: 'Brand', key: 'brand' },
                      { header: 'Colour Code', key: 'colorCode' },
                      { header: 'Size', key: 'size' },
                      { header: 'Retail Price', key: 'retailPrice' },
                      { header: 'Dealer Price', key: 'dealerPrice' },
                      { header: 'Cost Price', key: 'costPrice' },
                      { header: 'Last Purchase Price', key: 'lastPurchasePrice' },
                      { header: 'Sole', key: 'sole' },
                      { header: 'Material', key: 'material' },
                      { header: 'HSN', key: 'hsnCode' },
                      { header: 'ImageId', key: 'imageId' },
                    ] as Column<any>[]}
                    data={bulkRows.map((r, i) => ({ __k: String(i), ...r }))}
                    keyField="__k"
                    stickyHeader
                    density="compact"
                  />
                </Card>
              )}
              <div className="flex justify-end">
                <Button onClick={submitBulk} loading={bulkSaving} disabled={!bulkRows.length}>Upload</Button>
              </div>
              {bulkResult && (
                <Alert variant="success" title={`Inserted ${bulkResult.inserted}. ${bulkResult.errors?.length || 0} errors.`} />
              )}
              {!!(bulkResult?.errors?.length) && (
                <div className="max-h-48 overflow-auto text-xs text-red-600">
                  {bulkResult.errors.map((e: any, i: number) => (
                    <div key={i}>Row {Number(e.index) + 2}: {e.message}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
  
}

