import { useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { useOrg } from '@/context/org'

type StockItem = {
  id: string
  name: string
  category: string
  brand: string
  colour: string
  size: string
  itemCode: string
  qty: number
  reorderLevel?: number
}

export default function OutletTotalStock() {
  const { selectedOutlet } = useOrg()
  // Demo dataset; replace with API data for the selected outlet
  const [items] = useState<StockItem[]>([
    { id: '1', name: 'Runner Max', category: 'Shoes', brand: 'Fleet', colour: 'Black', size: '42', itemCode: 'SKU-001', qty: 12, reorderLevel: 10 },
    { id: '2', name: 'Urban Slide', category: 'Sandals', brand: 'WalkIt', colour: 'Blue', size: '40', itemCode: 'SKU-002', qty: 4, reorderLevel: 8 },
    { id: '3', name: 'Trail Pro', category: 'Boots', brand: 'Terra', colour: 'Brown', size: '44', itemCode: 'SKU-003', qty: 18, reorderLevel: 6 },
    { id: '4', name: 'Cozy Step', category: 'Slippers', brand: 'Comfy', colour: 'White', size: '41', itemCode: 'SKU-004', qty: 3, reorderLevel: 5 },
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
    return [{ label: '-- Select --', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  const sizeOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.size), ...sizeFixed])).sort()
    return [{ label: '-- Select --', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])
  const colourOptions = useMemo(() => {
    const set = Array.from(new Set([...items.map(i => i.colour), ...colourFixed])).sort()
    return [{ label: '-- Select --', value: '' }, ...set.map(v => ({ label: v, value: v }))]
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(i => {
      const nameOk = !nameFilter || i.name.toLowerCase().includes(nameFilter.toLowerCase())
      const catOk = !categoryFilter || i.category === categoryFilter
      const sizeOk = !sizeFilter || i.size === sizeFilter
      const colourOk = !colourFilter || i.colour === colourFilter
      return nameOk && catOk && sizeOk && colourOk
    })
  }, [items, nameFilter, categoryFilter, sizeFilter, colourFilter])

  const columns: Column<StockItem>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Brand', key: 'brand' },
    { header: 'Colour', key: 'colour' },
    { header: 'Size', key: 'size' },
    { header: 'Item Code', key: 'itemCode' },
    { header: 'Qty', key: 'qty', className: 'text-right', render: (r) => (
      <span className={r.reorderLevel && r.qty <= r.reorderLevel ? 'text-red-600 font-medium' : ''}>{r.qty}</span>
    ) },
  ]

  return (
    <Shell>
      <PageHeader
        title={selectedOutlet ? `${selectedOutlet.name} — Total Stock` : 'Total Stock'}
        subtitle="View full outlet stock with filters."
      />

      <Card title="Filters">
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
    </Shell>
  )
}
