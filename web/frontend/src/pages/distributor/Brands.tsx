import { useEffect, useState } from 'react'
import api from '@/api/axios'
import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Brand {
  id: number
  brandName: string
  category: string | null
  createdAt?: string
  updatedAt?: string
}

export default function Brands() {
  const [items, setItems] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  // filters
  const [filterBrand, setFilterBrand] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // add modal
  const [addOpen, setAddOpen] = useState(false)
  const [brandName, setBrandName] = useState('')
  // For adding multiple categories at once, accept comma-separated values
  const [categoriesText, setCategoriesText] = useState('')
  const [adding, setAdding] = useState(false)

  // edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editBrandName, setEditBrandName] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/brands')
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load brands')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const resetAdd = () => { setBrandName(''); setCategoriesText(''); setError(null) }
  const resetEdit = () => { setEditId(null); setEditBrandName(''); setEditCategory('') }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = brandName.trim()
    if (!name) { setError('Brand name is required'); return }
    try {
      setAdding(true)
      // Build categories array from comma-separated input
      const categories = categoriesText
        .split(',')
        .map(c => c.trim())
        .filter((c, i, arr) => c.length > 0 && arr.indexOf(c) === i)

      const payload = categories.length
        ? { brandName: name, categories }
        : { brandName: name } // backend will insert a single row with NULL category

      const { data } = await api.post('/brands', payload)
      const inserted = Array.isArray(data?.inserted) ? data.inserted : []
      const duplicates = Array.isArray(data?.duplicates) ? data.duplicates : []
      if (inserted.length) {
        setItems(prev => [...inserted, ...prev])
      }
      if (duplicates.length && inserted.length === 0) {
        setError('Brand with these categories already exists')
      } else if (duplicates.length && inserted.length) {
        setSuccess(`Added ${inserted.length} item(s). Skipped ${duplicates.length} duplicate(s).`)
      } else {
        setSuccess('Brand added successfully')
      }
      setTimeout(() => setSuccess(''), 2000)
      setAddOpen(false)
      resetAdd()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add brand')
    } finally { setAdding(false) }
  }

  const onEdit = (row: Brand) => {
    setEditId(row.id)
    setEditBrandName(row.brandName)
    setEditCategory(row.category || '')
    setEditOpen(true)
  }

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    setError(null)
    const name = editBrandName.trim()
    if (!name) { setError('Brand name is required'); return }
    try {
      const { data } = await api.put(`/brands/${editId}`, { brandName: name, category: editCategory.trim() || null })
      setItems(prev => prev.map(it => it.id === editId ? data : it))
      setSuccess('Brand updated successfully')
      setTimeout(() => setSuccess(''), 2000)
      setEditOpen(false)
      resetEdit()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update brand')
    }
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this brand?')) return
    try {
      await api.delete(`/brands/${id}`)
      setItems(prev => prev.filter(it => it.id !== id))
      setSuccess('Brand deleted')
      setTimeout(() => setSuccess(''), 1500)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete brand')
    }
  }

  const filtered = items.filter(it =>
    (filterBrand ? it.brandName.toLowerCase().includes(filterBrand.toLowerCase()) : true) &&
    (filterCategory ? (it.category || '').toLowerCase().includes(filterCategory.toLowerCase()) : true)
  )

  return (
    <Shell>
      <PageHeader
        title="Brands"
        subtitle="Manage brands and their categories."
        actions={(
          <div className="flex gap-2">
            <Button onClick={load}>Refresh</Button>
            <Button variant="primary" onClick={() => setAddOpen(true)}>Add New</Button>
          </div>
        )}
      />

      {success && (
        <div className="mb-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Filter by Brand" placeholder="e.g. Nike" value={filterBrand} onChange={(e: any)=>setFilterBrand(e.target.value)} />
          <Input label="Filter by Category" placeholder="e.g. Sports" value={filterCategory} onChange={(e: any)=>setFilterCategory(e.target.value)} />
          <div className="flex items-end"><Button variant="outline" className="w-full" onClick={()=>{ setFilterBrand(''); setFilterCategory('') }}>Clear</Button></div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">S.No</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Brand</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td className="px-4 py-3" colSpan={4}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-3" colSpan={4}>No brands found</td></tr>
                ) : (
                  filtered.map((b, i) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2">{b.brandName}</td>
                      <td className="px-4 py-2">{b.category || '-'}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => onEdit(b)}>Edit</Button>
                          <Button variant="warning" onClick={() => onDelete(b.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAddOpen(false); resetAdd() }} />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add New Brand</h2>
            <form className="mt-3 grid gap-3" onSubmit={onAdd}>
              <Input label="Brand Name" placeholder="e.g. Nike" value={brandName} onChange={(e:any)=>setBrandName(e.target.value)} />
              <Input label="Categories (comma separated)" placeholder="e.g. Sports, Casual, Formal" value={categoriesText} onChange={(e:any)=>setCategoriesText(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setAddOpen(false); resetAdd() }}>Cancel</Button>
                <Button type="submit" loading={adding}>Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEditOpen(false); resetEdit() }} />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Edit Brand</h2>
            <form className="mt-3 grid gap-3" onSubmit={onUpdate}>
              <Input label="Brand Name" value={editBrandName} onChange={(e:any)=>setEditBrandName(e.target.value)} />
              <Input label="Category" value={editCategory} onChange={(e:any)=>setEditCategory(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditOpen(false); resetEdit() }}>Cancel</Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
